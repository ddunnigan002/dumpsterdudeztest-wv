import { type NextRequest, NextResponse } from "next/server"
import {
  getActiveFranchiseContext,
  isContextError,
  contextErrorResponse,
  validateVehicleInFranchise,
} from "@/lib/api/franchise-context"

export async function PUT(request: NextRequest, { params }: { params: { vehicleId: string } }) {
  try {
    const ctx = await getActiveFranchiseContext()
    if (isContextError(ctx)) {
      return contextErrorResponse(ctx)
    }

    const { supabase, franchiseId } = ctx
    const body = await request.json()
    const { vehicleId } = params

    const vehicle = await validateVehicleInFranchise(supabase, franchiseId, vehicleId)
    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found in your franchise" }, { status: 404 })
    }

    // Safety: never allow these to be updated from the client
    const { id, franchise_id, created_at, updated_at, ...safeBody } = body ?? {}

    // Update vehicle within the franchise
    const { data: updatedVehicle, error: updateError } = await supabase
      .from("vehicles")
      .update({ ...safeBody, updated_at: new Date().toISOString() })
      .eq("id", vehicle.id)
      .eq("franchise_id", franchiseId)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({ vehicle: updatedVehicle })
  } catch (error) {
    console.error("Vehicle update error:", error)
    return NextResponse.json({ error: "Failed to update vehicle" }, { status: 500 })
  }
}
