import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const vehicle = searchParams.get("vehicle")
    const date = searchParams.get("date")

    if (!vehicle || !date) {
      return NextResponse.json({ error: "Vehicle and date parameters required" }, { status: 400 })
    }

    const supabase = createClient()

    // Get vehicle ID from vehicle number
    const { data: vehicleData, error: vehicleError } = await supabase
      .from("vehicles")
      .select("id")
      .eq("vehicle_number", vehicle)
      .single()

    if (vehicleError || !vehicleData) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 })
    }

    // Fetch daily logs for the specific date
    const { data: logs, error } = await supabase
      .from("daily_logs")
      .select("*")
      .eq("vehicle_id", vehicleData.id)
      .eq("log_date", date)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Failed to fetch daily logs" }, { status: 500 })
    }

    // Add vehicle_number to each log for display
    const logsWithVehicle =
      logs?.map((log) => ({
        ...log,
        vehicle_number: vehicle,
      })) || []

    return NextResponse.json({ logs: logsWithVehicle })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const body = await request.json()

    const {
      vehicle_number,
      log_date,
      start_mileage,
      end_mileage,
      gallons_purchased,
      fuel_cost,
      notes,
      manager_override,
    } = body

    // Get vehicle ID from vehicle number
    const { data: vehicle, error: vehicleError } = await supabase
      .from("vehicles")
      .select("id")
      .eq("vehicle_number", vehicle_number)
      .single()

    if (vehicleError || !vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 })
    }

    const { data, error } = await supabase
      .from("daily_logs")
      .insert({
        vehicle_id: vehicle.id,
        driver_id: "00000000-0000-0000-0000-000000000001", // Default driver for manager overrides
        log_date,
        start_mileage,
        end_mileage,
        gallons_purchased,
        fuel_cost,
        notes,
        manager_override: manager_override || false,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Failed to save daily log" }, { status: 500 })
    }

    // Update vehicle current mileage if end_mileage is provided
    if (end_mileage) {
      await supabase.from("vehicles").update({ current_mileage: end_mileage }).eq("id", vehicle.id)
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
