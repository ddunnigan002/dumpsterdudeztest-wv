import { type NextRequest, NextResponse } from "next/server"
import {
  getActiveFranchiseContext,
  isContextError,
  contextErrorResponse,
  validateVehicleInFranchise,
} from "@/lib/api/franchise-context"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const vehicleId = params.id

    const ctx = await getActiveFranchiseContext()
    if (isContextError(ctx)) {
      return contextErrorResponse(ctx)
    }

    const { supabase, franchiseId } = ctx

    const vehicle = await validateVehicleInFranchise(supabase, franchiseId, vehicleId)
    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found in your franchise" }, { status: 404 })
    }

    // Fetch recent issues for this vehicle
    const { data: issues, error } = await supabase
      .from("vehicle_issues")
      .select("*")
      .eq("vehicle_id", vehicle.id)
      .order("created_at", { ascending: false })
      .limit(10)

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    return NextResponse.json(issues || [])
  } catch (error) {
    console.error("Error in vehicle issues API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
