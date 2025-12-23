import { type NextRequest, NextResponse } from "next/server"
import {
  getActiveFranchiseContext,
  isContextError,
  contextErrorResponse,
  validateVehicleInFranchise,
} from "@/lib/api/franchise-context"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const vehicle = searchParams.get("vehicle")
    const date = searchParams.get("date")

    if (!vehicle || !date) {
      return NextResponse.json({ error: "Vehicle and date parameters required" }, { status: 400 })
    }

    const ctx = await getActiveFranchiseContext()
    if (isContextError(ctx)) {
      return contextErrorResponse(ctx)
    }

    const { supabase, franchiseId } = ctx

    const vehicleData = await validateVehicleInFranchise(supabase, franchiseId, vehicle)
    if (!vehicleData) {
      return NextResponse.json({ error: "Vehicle not found in your franchise" }, { status: 404 })
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
        vehicle_number: vehicleData.vehicle_number,
      })) || []

    return NextResponse.json({ logs: logsWithVehicle })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await getActiveFranchiseContext()
    if (isContextError(ctx)) {
      return contextErrorResponse(ctx)
    }

    const { supabase, user, franchiseId } = ctx
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

    const vehicle = await validateVehicleInFranchise(supabase, franchiseId, vehicle_number)
    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found in your franchise" }, { status: 404 })
    }

    const { data, error } = await supabase
      .from("daily_logs")
      .insert({
        vehicle_id: vehicle.id,
        driver_id: user.id, // Use authenticated user ID instead of mock
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
      await supabase
        .from("vehicles")
        .update({ current_mileage: end_mileage })
        .eq("id", vehicle.id)
        .eq("franchise_id", franchiseId) // Scope update to franchise
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
