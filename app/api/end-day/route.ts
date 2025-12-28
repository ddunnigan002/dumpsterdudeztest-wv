import { type NextRequest, NextResponse } from "next/server"
import {
  getActiveFranchiseContext,
  isContextError,
  contextErrorResponse,
  validateVehicleInFranchise,
} from "@/lib/api/franchise-context"

function toYmdFromInput(input: unknown): string {
  // Accept:
  // - "YYYY-MM-DD"
  // - ISO string
  // - Date-ish values
  if (typeof input === "string") {
    // already ymd?
    if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input
    // try ISO / date string
    const d = new Date(input)
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  }
  // fallback: today
  return new Date().toISOString().slice(0, 10)
}

export async function POST(request: NextRequest) {
  const ctx = await getActiveFranchiseContext()
  if (isContextError(ctx)) {
    return contextErrorResponse(ctx)
  }

  try {
    const body = await request.json()

    const vehicleId = body.vehicleId as string | undefined
    const endMileageRaw = body.endMileage
    const endMileage = Number.parseInt(String(endMileageRaw ?? ""), 10)

    // ✅ Support both new + old payloads:
    // new: { log_date: "YYYY-MM-DD" }
    // old: { date: "2025-12-28T..." }
    const logDate = toYmdFromInput(body.log_date ?? body.date)

    console.log("[v0] End Day API: Received request", { vehicleId, endMileage, logDate })

    if (!vehicleId) {
      return NextResponse.json({ error: "vehicleId is required" }, { status: 400 })
    }
    if (!Number.isFinite(endMileage) || endMileage <= 0) {
      return NextResponse.json({ error: "endMileage must be a positive number" }, { status: 400 })
    }

    const vehicle = await validateVehicleInFranchise(ctx.supabase, ctx.franchiseId, vehicleId)
    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found in your franchise" }, { status: 404 })
    }

    // Optional guard: prevent decreasing mileage (you can remove if not desired)
    const currentMileage = Number(vehicle.current_mileage ?? 0)
    if (currentMileage > 0 && endMileage < currentMileage) {
      return NextResponse.json(
        { error: `End mileage (${endMileage}) cannot be less than current mileage (${currentMileage}).` },
        { status: 400 }
      )
    }

    // ✅ Upsert daily log. Do NOT set created_at manually; let DB defaults handle it.
    const { data, error } = await ctx.supabase
      .from("daily_logs")
      .upsert(
        {
          vehicle_id: vehicle.id,
          driver_id: ctx.user.id,
          start_mileage: currentMileage,
          end_mileage: endMileage,
          log_date: logDate,
        },
        { onConflict: "vehicle_id,log_date" }
      )
      .select()

    console.log("[v0] End Day API: Daily log save result", { data, error })

    if (error) {
      console.error("Error saving end day:", error)
      return NextResponse.json({ error: "Failed to save end day", detail: error.message }, { status: 500 })
    }

    // Update vehicle current mileage
    const { error: updateError } = await ctx.supabase
      .from("vehicles")
      .update({ current_mileage: endMileage })
      .eq("id", vehicle.id)

    if (updateError) {
      console.error("Error updating vehicle mileage:", updateError)
      // still return success for the log save
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error("[v0] End Day API: Caught error", error)
    return NextResponse.json(
      { error: "Internal server error", detail: error?.message ?? String(error) },
      { status: 500 }
    )
  }
}
