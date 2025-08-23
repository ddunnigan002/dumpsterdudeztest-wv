import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const { vehicleId, gallons, totalCost, date } = await request.json()

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
      .select("id")
      .eq("vehicle_number", vehicleId)
      .single()

    if (vehicleError || !vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 })
    }

    const { data, error } = await supabase
      .from("daily_logs")
      .insert({
        vehicle_id: vehicle.id,
        driver_id: user.id,
        fuel_added: gallons,
        fuel_cost: totalCost,
        log_date: new Date(date).toISOString().split("T")[0],
        start_mileage: 0,
        end_mileage: 0,
        created_at: new Date().toISOString(),
      })
      .select()

    if (error) {
      console.error("Error saving gas entry:", error)
      return NextResponse.json({ error: "Failed to save gas entry" }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Error in gas entry API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
