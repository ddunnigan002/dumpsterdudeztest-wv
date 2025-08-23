import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const { vehicleId, endMileage, date } = await request.json()

    const supabase = createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // First, get the vehicle UUID from the vehicle_number
    const { data: vehicle, error: vehicleError } = await supabase
      .from("vehicles")
      .select("id, current_mileage")
      .eq("vehicle_number", vehicleId)
      .single()

    if (vehicleError || !vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 })
    }

    const { data, error } = await supabase
      .from("daily_logs")
      .upsert(
        {
          vehicle_id: vehicle.id,
          driver_id: user.id,
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

    if (error) {
      console.error("Error saving end day:", error)
      return NextResponse.json({ error: "Failed to save end day" }, { status: 500 })
    }

    // Update vehicle's current mileage
    const { error: updateError } = await supabase
      .from("vehicles")
      .update({ current_mileage: endMileage })
      .eq("id", vehicle.id)

    if (updateError) {
      console.error("Error updating vehicle mileage:", updateError)
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Error in end day API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
