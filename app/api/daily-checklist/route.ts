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

    // Map checklist items to database columns
    const checklistData = {
      vehicle_id: vehicle.id,
      driver_id: user.id, // Use authenticated user ID
      checklist_date: new Date().toISOString().split("T")[0],
      tires_condition: checklist.find((item: any) => item.id === "tires")?.status === "pass",
      lights_working: checklist.find((item: any) => item.id === "lights")?.status === "pass",
      brakes_working: checklist.find((item: any) => item.id === "brakes")?.status === "pass",
      fluid_levels_ok: checklist.find((item: any) => item.id === "fluids")?.status === "pass",
      mirrors_clean: checklist.find((item: any) => item.id === "mirrors")?.status === "pass",
      safety_equipment_present: checklist.find((item: any) => item.id === "safety")?.status === "pass",
      overall_status: checklist.some((item: any) => item.status === "fail")
        ? "fail"
        : checklist.some((item: any) => item.status === "service_soon")
          ? "pending"
          : "pass",
      notes: notes || null,
    }

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
