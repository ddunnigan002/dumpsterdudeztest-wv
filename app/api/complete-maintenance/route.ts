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
    const { vehicleId, maintenanceType, alertId, completedDate } = await request.json()

    const vehicle = await validateVehicleInFranchise(ctx.supabase, ctx.franchiseId, vehicleId)
    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found in your franchise" }, { status: 404 })
    }

    // Mark scheduled maintenance as completed
    const { error: updateError } = await ctx.supabase
      .from("scheduled_maintenance")
      .update({
        status: "completed",
        completed_date: completedDate,
        completed_by: ctx.user.id, // Use authenticated user instead of completedBy parameter
      })
      .eq("id", alertId)

    if (updateError) {
      console.error("Error updating scheduled maintenance:", updateError)
    }

    const { data: existingRecord, error: checkError } = await ctx.supabase
      .from("maintenance_records")
      .select("id, cost")
      .eq("vehicle_id", vehicle.id)
      .eq("maintenance_type", maintenanceType)
      .eq("date_performed", completedDate)
      .single()

    if (checkError && checkError.code !== "PGRST116") {
      console.error("Error checking existing maintenance record:", checkError)
    }

    if (existingRecord) {
      const { error: updateRecordError } = await ctx.supabase
        .from("maintenance_records")
        .update({
          status: "completed",
          performed_by: ctx.user.id,
        })
        .eq("id", existingRecord.id)

      if (updateRecordError) {
        console.error("Error updating existing maintenance record:", updateRecordError)
        return NextResponse.json({ error: "Failed to update maintenance record" }, { status: 500 })
      }
    } else {
      const { error: insertError } = await ctx.supabase.from("maintenance_records").insert({
        vehicle_id: vehicle.id,
        franchise_id: ctx.franchiseId,
        maintenance_type: maintenanceType,
        date_performed: completedDate,
        performed_by: ctx.user.id,
        description: `${maintenanceType} completed via dashboard`,
        cost: 0,
        status: "completed",
        service_provider: "Pending cost entry",
      })

      if (insertError) {
        console.error("Error creating maintenance record:", insertError)
        return NextResponse.json({ error: "Failed to create maintenance record" }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error completing maintenance:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
