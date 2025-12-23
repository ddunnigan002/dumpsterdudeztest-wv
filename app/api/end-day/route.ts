import { type NextRequest, NextResponse } from "next/server"
import {
  getActiveFranchiseContext,
  isContextError,
  contextErrorResponse,
  validateVehicleInFranchise,
} from "@/lib/api/franchise-context"

export async function POST(request: NextRequest) {
  const ctx = await getActiveFranchiseContext()
  if (isContextError(ctx)) {
    return contextErrorResponse(ctx)
  }

  try {
    const { vehicleId, endMileage, date } = await request.json()
    console.log("[v0] End Day API: Received request", { vehicleId, endMileage, date })

    const vehicle = await validateVehicleInFranchise(ctx.supabase, ctx.franchiseId, vehicleId)
    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found in your franchise" }, { status: 404 })
    }

    console.log("[v0] End Day API: Vehicle lookup result", { vehicle })

    const { data, error } = await ctx.supabase
      .from("daily_logs")
      .upsert(
        {
          vehicle_id: vehicle.id,
          driver_id: ctx.user.id,
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

    const { error: updateError } = await ctx.supabase
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
