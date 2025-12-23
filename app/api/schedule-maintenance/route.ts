import { type NextRequest, NextResponse } from "next/server"
import {
  getActiveFranchiseContext,
  isContextError,
  contextErrorResponse,
  validateVehicleInFranchise,
  requireManagerRole,
} from "@/lib/api/franchise-context"

export async function POST(request: NextRequest) {
  try {
    const { vehicleId, maintenanceType, description, triggerType, targetMileage, targetDate, createdDate } =
      await request.json()

    console.log("Scheduling maintenance:", { vehicleId, maintenanceType, triggerType, targetMileage, targetDate })

    const ctx = await getActiveFranchiseContext()
    if (isContextError(ctx)) {
      return contextErrorResponse(ctx)
    }

    const { supabase, franchiseId, role } = ctx

    if (!requireManagerRole(role)) {
      return NextResponse.json({ error: "Manager or owner role required to schedule maintenance" }, { status: 403 })
    }

    const vehicle = await validateVehicleInFranchise(supabase, franchiseId, vehicleId)
    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found in your franchise" }, { status: 404 })
    }

    const { data, error } = await supabase
      .from("scheduled_maintenance")
      .insert({
        vehicle_id: vehicle.id,
        maintenance_type: maintenanceType,
        description: description || null,
        due_mileage: triggerType === "mileage" ? targetMileage : null,
        due_date: triggerType === "date" ? targetDate : null,
        completed: false,
        created_at: new Date(createdDate).toISOString(),
      })
      .select()

    if (error) {
      console.error("Error scheduling maintenance:", error)
      return NextResponse.json({ error: "Failed to schedule maintenance" }, { status: 500 })
    }

    console.log("Maintenance scheduled successfully:", data)
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Error in schedule maintenance API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
