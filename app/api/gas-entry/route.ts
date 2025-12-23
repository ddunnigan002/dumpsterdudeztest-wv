import { type NextRequest, NextResponse } from "next/server"
import {
  getActiveFranchiseContext,
  isContextError,
  contextErrorResponse,
  validateVehicleInFranchise,
} from "@/lib/api/franchise-context"

export async function POST(request: NextRequest) {
  try {
    const { vehicleId, gallons, totalCost, date } = await request.json()

    const ctx = await getActiveFranchiseContext()
    if (isContextError(ctx)) {
      return contextErrorResponse(ctx)
    }

    const { supabase, user, franchiseId } = ctx

    const vehicle = await validateVehicleInFranchise(supabase, franchiseId, vehicleId)
    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found in your franchise" }, { status: 404 })
    }

    const { data, error } = await supabase
      .from("daily_logs")
      .insert({
        vehicle_id: vehicle.id,
        driver_id: user.id, // Use authenticated user ID instead of mock
        gallons_purchased: gallons,
        fuel_cost: totalCost,
        log_date: new Date(date).toISOString().split("T")[0],
        manager_override: false,
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
