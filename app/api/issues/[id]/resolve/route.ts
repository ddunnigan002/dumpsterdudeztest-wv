import { NextResponse, type NextRequest } from "next/server"
import {
  getActiveFranchiseContext,
  isContextError,
  contextErrorResponse,
} from "@/lib/api/franchise-context"

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ctx = await getActiveFranchiseContext()
    if (isContextError(ctx)) return contextErrorResponse(ctx)

    const { supabase, franchiseId } = ctx
    const issueId = params.id

    // Ensure issue belongs to this franchise (via vehicle relationship)
    const { data: issue, error: issueErr } = await supabase
      .from("vehicle_issues")
      .select("id, vehicle_id, status")
      .eq("id", issueId)
      .maybeSingle()

    if (issueErr) return NextResponse.json({ error: issueErr.message }, { status: 500 })
    if (!issue) return NextResponse.json({ error: "Issue not found" }, { status: 404 })

    // Validate the vehicle belongs to this franchise
    const { data: vehicle, error: vErr } = await supabase
      .from("vehicles")
      .select("id, franchise_id")
      .eq("id", issue.vehicle_id)
      .maybeSingle()

    if (vErr) return NextResponse.json({ error: vErr.message }, { status: 500 })
    if (!vehicle || vehicle.franchise_id !== franchiseId) {
      return NextResponse.json({ error: "Not allowed" }, { status: 403 })
    }

    const { error: updErr } = await supabase
      .from("vehicle_issues")
      .update({ status: "resolved", resolved_at: new Date().toISOString() })
      .eq("id", issueId)

    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 })
  }
}
