import { type NextRequest, NextResponse } from "next/server"
import {
  getActiveFranchiseContext,
  isContextError,
  contextErrorResponse,
  validateVehicleInFranchise,
} from "@/lib/api/franchise-context"

export async function GET(
  _request: NextRequest,
  { params }: { params: { vehicleId: string; issueId: string } },
) {
  try {
    const ctx = await getActiveFranchiseContext()
    if (isContextError(ctx)) return contextErrorResponse(ctx)

    const { supabase, franchiseId } = ctx
    const { vehicleId, issueId } = params

    const vehicle = await validateVehicleInFranchise(supabase, franchiseId, vehicleId)
    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found in your franchise" }, { status: 404 })
    }

    const cleanIssueId = issueId.startsWith("issue-") ? issueId.replace("issue-", "") : issueId

    const { data, error } = await supabase
      .from("vehicle_issues")
      .select("id, description, status, created_at, photos")
      .eq("id", cleanIssueId)
      .eq("vehicle_id", vehicle.id)
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ error: "Issue not found" }, { status: 404 })

    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Internal server error" }, { status: 500 })
  }
}
