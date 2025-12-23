import { type NextRequest, NextResponse } from "next/server"
import {
  getActiveFranchiseContext,
  isContextError,
  contextErrorResponse,
  validateVehicleInFranchise,
} from "@/lib/api/franchise-context"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ctx = await getActiveFranchiseContext()
    if (isContextError(ctx)) {
      return contextErrorResponse(ctx)
    }

    const { supabase, franchiseId } = ctx
    const vehicleId = params.id

    const vehicle = await validateVehicleInFranchise(supabase, franchiseId, vehicleId)
    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found in your franchise" }, { status: 404 })
    }

    // Get scheduled maintenance for this vehicle that hasn't been completed
    const { data: scheduledMaintenance, error } = await supabase
      .from("scheduled_maintenance")
      .select("*")
      .eq("vehicle_id", vehicle.id)
      .eq("completed", false)
      .order("due_date", { ascending: true })

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    return NextResponse.json(scheduledMaintenance || [])
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
