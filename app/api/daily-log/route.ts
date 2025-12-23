import { type NextRequest, NextResponse } from "next/server"
import {
  getActiveFranchiseContext,
  isContextError,
  contextErrorResponse,
  validateVehicleInFranchise,
} from "@/lib/api/franchise-context"

export async function POST(request: NextRequest) {
  try {
    const ctx = await getActiveFranchiseContext()
    if (isContextError(ctx)) {
      return contextErrorResponse(ctx)
    }

    const { supabase, user, franchiseId } = ctx
    const body = await request.json()

    const { vehicleId, startMileage, endMileage, fuelAdded, fuelCost, issuesReported, photos } = body

    const vehicle = await validateVehicleInFranchise(supabase, franchiseId, vehicleId)
    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found in your franchise" }, { status: 404 })
    }

    // Insert daily log
    const { data, error } = await supabase
      .from("daily_logs")
      .insert({
        vehicle_id: vehicle.id,
        driver_id: user.id, // Use authenticated user ID instead of mock
        log_date: new Date().toISOString().split("T")[0],
        start_mileage: Number.parseInt(startMileage),
        end_mileage: Number.parseInt(endMileage),
        fuel_added: fuelAdded ? Number.parseFloat(fuelAdded) : null,
        fuel_cost: fuelCost ? Number.parseFloat(fuelCost) : null,
        issues_reported: issuesReported || null,
        photos: photos || [],
      })
      .select()
      .single()

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Failed to save daily log" }, { status: 500 })
    }

    // Update vehicle current mileage
    if (endMileage) {
      await supabase
        .from("vehicles")
        .update({ current_mileage: Number.parseInt(endMileage) })
        .eq("id", vehicle.id)
        .eq("franchise_id", franchiseId) // Scope update to franchise
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
