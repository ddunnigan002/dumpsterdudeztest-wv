import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  console.log("🔵 API: Daily checklist POST request received")
  
  try {
    const supabase = createClient()
    console.log("🔵 API: Supabase client created")
    
    let body
    try {
      body = await request.json()
      console.log("🔵 API: Request body parsed:", JSON.stringify(body, null, 2))
    } catch (parseError) {
      console.error("❌ API: Failed to parse request body:", parseError)
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 })
    }

    const { vehicleNumber, checklist, notes, photoUrls } = body

    // Validate required fields
    if (!vehicleNumber) {
      console.error("❌ API: Missing vehicleNumber")
      return NextResponse.json({ error: "Vehicle number is required" }, { status: 400 })
    }

    if (!checklist || !Array.isArray(checklist)) {
      console.error("❌ API: Invalid checklist data")
      return NextResponse.json({ error: "Checklist data is required and must be an array" }, { status: 400 })
    }

    console.log("🔵 API: Looking for vehicle with number:", vehicleNumber.toUpperCase())

    // Find vehicle by vehicle_number
    const { data: vehicle, error: vehicleError } = await supabase
      .from("vehicles")
      .select("id")
      .eq("vehicle_number", vehicleNumber.toUpperCase())
      .single()

    console.log("🔵 API: Vehicle query result:", { vehicle, vehicleError })

    if (vehicleError || !vehicle) {
      console.error("❌ API: Vehicle not found:", vehicleError)
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 })
    }

    console.log("🔵 API: Getting authenticated user...")

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    console.log("🔵 API: Auth result:", { user: user?.id, authError })

    if (authError || !user) {
      console.error("❌ API: Authentication failed:", authError)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Helper function to safely get checklist item status
    const getItemStatus = (itemId: string) => {
      const item = checklist.find((item: any) => item.id === itemId)
      console.log(`🔵 API: Item ${itemId} status:`, item?.status)
      return item?.status === "pass"
    }

    console.log("🔵 API: Building checklist data...")

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

    console.log("🔵 API: Base checklist data:", JSON.stringify(checklistData, null, 2))

    // Only add database columns that exist and have corresponding frontend items
    const itemMapping = {
      tires: 'tires_condition',
      lights: 'lights_working', 
      brakes: 'brakes_working',
      fluids: 'fluid_levels_ok'
    }

    // Map only the items that exist in your frontend
    Object.entries(itemMapping).forEach(([frontendId, dbColumn]) => {
      const status = getItemStatus(frontendId)
      checklistData[dbColumn] = status
      console.log(`🔵 API: Mapped ${frontendId} -> ${dbColumn} = ${status}`)
    })

    // Set default values for removed items (if columns still exist in DB)
    checklistData.mirrors_clean = true
    checklistData.safety_equipment_present = true

    console.log("🔵 API: Final checklist data:", JSON.stringify(checklistData, null, 2))

    console.log("🔵 API: Attempting to upsert to daily_checklists table...")

    const { data, error } = await supabase
      .from("daily_checklists")
      .upsert(checklistData, {
        onConflict: "vehicle_id,checklist_date",
      })
      .select()
      .single()

    console.log("🔵 API: Upsert result:", { data, error })

    if (error) {
      console.error("❌ API: Database error:", error)
      console.error("❌ API: Error details:", JSON.stringify(error, null, 2))
      return NextResponse.json({ 
        error: "Failed to save checklist", 
        details: error.message,
        hint: error.hint 
      }, { status: 500 })
    }

    console.log("✅ API: Checklist saved successfully!")
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("❌ API: Unexpected error:", error)
    console.error("❌ API: Error stack:", error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json({ 
      error: "Internal server error", 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
