import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const body = await request.json()

    const { vehicleNumber, checklist, notes } = body

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
      driver_id: user.id,
      checklist_date: new Date().toISOString().split("T")[0],
      change_engine_oil: checklist.find((item: any) => item.id === "change_engine_oil")?.status === "pass",
      replace_air_filter: checklist.find((item: any) => item.id === "replace_air_filter")?.status === "pass",
      inspect_brake_system: checklist.find((item: any) => item.id === "inspect_brake_system")?.status === "pass",
      check_transmission_fluid:
        checklist.find((item: any) => item.id === "check_transmission_fluid")?.status === "pass",
      change_hydraulic_filter: checklist.find((item: any) => item.id === "change_hydraulic_filter")?.status === "pass",
      check_differential_fluid:
        checklist.find((item: any) => item.id === "check_differential_fluid")?.status === "pass",
      inspect_frame_rails: checklist.find((item: any) => item.id === "inspect_frame_rails")?.status === "pass",
      check_pto_operation: checklist.find((item: any) => item.id === "check_pto_operation")?.status === "pass",
      inspect_exhaust_system: checklist.find((item: any) => item.id === "inspect_exhaust_system")?.status === "pass",
      test_block_heater: checklist.find((item: any) => item.id === "test_block_heater")?.status === "pass",
      clean_radiator_fins: checklist.find((item: any) => item.id === "clean_radiator_fins")?.status === "pass",
      inspect_suspension_bushings:
        checklist.find((item: any) => item.id === "inspect_suspension_bushings")?.status === "pass",
      overall_status: checklist.some((item: any) => item.status === "fail") ? "fail" : "pass",
      notes: notes || null,
    }

    const { data, error } = await supabase
      .from("monthly_checklists")
      .upsert(checklistData, {
        onConflict: "vehicle_id,checklist_date",
      })
      .select()
      .single()

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Failed to save monthly checklist" }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
