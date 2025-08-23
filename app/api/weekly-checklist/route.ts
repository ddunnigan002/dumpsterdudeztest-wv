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
      grease_chassis_points: checklist.find((item: any) => item.id === "grease_chassis_points")?.status === "pass",
      lubricate_hooklift_points:
        checklist.find((item: any) => item.id === "lubricate_hooklift_points")?.status === "pass",
      inspect_hydraulic_cylinders:
        checklist.find((item: any) => item.id === "inspect_hydraulic_cylinders")?.status === "pass",
      inspect_hydraulic_filter:
        checklist.find((item: any) => item.id === "inspect_hydraulic_filter")?.status === "pass",
      clean_battery_terminals: checklist.find((item: any) => item.id === "clean_battery_terminals")?.status === "pass",
      check_def_fluid: checklist.find((item: any) => item.id === "check_def_fluid")?.status === "pass",
      torque_wheel_lugs: checklist.find((item: any) => item.id === "torque_wheel_lugs")?.status === "pass",
      inspect_tarp_straps: checklist.find((item: any) => item.id === "inspect_tarp_straps")?.status === "pass",
      check_door_latches: checklist.find((item: any) => item.id === "check_door_latches")?.status === "pass",
      wash_truck_clean_cab: checklist.find((item: any) => item.id === "wash_truck_clean_cab")?.status === "pass",
      overall_status: checklist.some((item: any) => item.status === "fail") ? "fail" : "pass",
      notes: notes || null,
    }

    const { data, error } = await supabase
      .from("weekly_checklists")
      .upsert(checklistData, {
        onConflict: "vehicle_id,checklist_date",
      })
      .select()
      .single()

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Failed to save weekly checklist" }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
