import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const body = await request.json()

    const { vehicleNumber, checklist, notes, photoUrls } = body

    // Find vehicle by vehicle_number
    const { data: vehicle, error: vehicleError } = await supabase
      .from("vehicles")
      .select("id")
      .eq("vehicle_number", vehicleNumber.toUpperCase())
      .single()

    if (vehicleError || !vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 })
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Helper function to safely get checklist item status
    const getItemStatus = (itemId: string) => {
      const item = checklist.find((item: any) => item.id === itemId)
      return item?.status === "pass"
    }

    // Build checklist data object dynamically
    const checklistData = {
      vehicle_id: vehicle.id,
      driver_id: user.id,
      checklist_date: new Date().toISOString().split("T")[0],
      overall_status: checklist.some((item: any) => item.status === "fail")
        ? "fail"
        : checklist.some((item: any) => item.status === "service_soon")
          ? "pending"
          : "pass",
      notes: notes || null,
      checklist_items: JSON.stringify(checklist), // Store the full checklist data
      photos: JSON.stringify(photoUrls || [])
    }

    // Only add database columns that exist and have corresponding frontend items
    const itemMapping = {
      tires: 'tires_condition',
      lights: 'lights_working', 
      brakes: 'brakes_working',
      fluids: 'fluid_levels_ok'
    }

    // Map only the items that exist in your frontend
    Object.entries(itemMapping).forEach(([frontendId, dbColumn]) => {
      checklistData[dbColumn] = getItemStatus(frontendId)
    })

    // Set default values for removed items (if columns still exist in DB)
    checklistData.mirrors_clean = true
    checklistData.safety_equipment_present = true

    const { data, error } = await supabase
      .from("daily_checklists")
      .upsert(checklistData, {
        onConflict: "vehicle_id,checklist_date",
      })
      .select()
      .single()

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Failed to save checklist" }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
