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
    const { vehicleId, description, photos, date, severity, manager_override } = await request.json()

    const vehicle = await validateVehicleInFranchise(ctx.supabase, ctx.franchiseId, vehicleId)
    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found in your franchise" }, { status: 404 })
    }

    const { data, error } = await ctx.supabase
      .from("vehicle_issues")
      .insert({
        vehicle_id: vehicle.id,
        franchise_id: ctx.franchiseId,
        description,
        severity: severity || "medium",
        photos: photos || [],
        status: "open",
        reported_date: new Date(date).toISOString().split("T")[0],
        manager_override: manager_override || false,
        created_at: new Date().toISOString(),
      })
      .select()

    if (error) {
      console.error("Error saving issue report:", error)
      return NextResponse.json({ error: "Failed to save issue report" }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Error in report issue API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
