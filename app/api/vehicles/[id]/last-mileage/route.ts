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

    const vehicle = await validateVehicleInFranchise(supabase, franchiseId, params.id)
    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found in your franchise" }, { status: 404 })
    }

    const { data: lastLog, error } = await supabase
      .from("daily_logs")
      .select("end_mileage")
      .eq("vehicle_id", vehicle.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error("Error fetching last log:", error)
      return NextResponse.json({ error: "Failed to fetch last mileage" }, { status: 500 })
    }

    return NextResponse.json({
      lastMileage: lastLog?.end_mileage || 0,
    })
  } catch (error) {
    console.error("Error fetching last mileage:", error)
    return NextResponse.json({ error: "Failed to fetch last mileage" }, { status: 500 })
  }
}
