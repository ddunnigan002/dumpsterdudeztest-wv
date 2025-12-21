import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const { vehicleId, endMileage, date } = await request.json()
    console.log("[v0] End Day API: Received request", { vehicleId, endMileage, date })

    const supabase = createClient()

    // First, get the vehicle UUID from the vehicle_number
    const { data: vehicle, error: vehicleError } = await supabase
      .from("vehicles")
      .select("id, current_mileage")
      .eq("vehicle_number", vehicleId)
      .maybeSingle()

    console.log("[v0] End Day API: Vehicle lookup result", { vehicle, vehicleError })

    if (vehicleError || !vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 })
    }

    const { data, error } = await supabase
      .from("daily_logs")
      .upsert(
        {
          vehicle_id: vehicle.id,
          driver_id: null,
          start_mileage: vehicle.current_mileage,
          end_mileage: endMileage,
          log_date: new Date(date).toISOString().split("T")[0],
          created_at: new Date().toISOString(),
        },
        {
          onConflict: "vehicle_id,log_date",
        },
      )
      .select()

    console.log("[v0] End Day API: Daily log save result", { data, error })

    if (error) {
      console.error("Error saving end day:", error)
      return NextResponse.json({ error: "Failed to save end day" }, { status: 500 })
    }

    const { error: updateError } = await supabase
      .from("vehicles")
      .update({ current_mileage: endMileage })
      .eq("id", vehicle.id)

    console.log("[v0] End Day API: Vehicle mileage update result", { updateError })

    if (updateError) {
      console.error("Error updating vehicle mileage:", updateError)
    }

    console.log("[v0] End Day API: Success, returning response")
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("[v0] End Day API: Caught error", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
