import { NextResponse } from "next/server"
import {
  getActiveFranchiseContext,
  isContextError,
  contextErrorResponse,
} from "@/lib/api/franchise-context"

export async function POST() {
  const ctx = await getActiveFranchiseContext()
  if (isContextError(ctx)) return contextErrorResponse(ctx)

  const { supabase, franchiseId } = ctx

  // Load policies
  const { data: policies, error: pErr } = await supabase
    .from("maintenance_policy")
    .select("maintenance_type, default_interval_miles, default_interval_days, is_active")
    .eq("franchise_id", franchiseId)

  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 })

  const activePolicies = (policies ?? []).filter((p: any) => p.is_active)

  let updated = 0

  // Apply each policy to open scheduled rows where interval_* is null
  for (const p of activePolicies) {
    const { error: uErr, count } = await supabase
      .from("scheduled_maintenance")
      .update({
        interval_miles: p.default_interval_miles ?? null,
        interval_days: p.default_interval_days ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("franchise_id", franchiseId)
      .eq("maintenance_type", p.maintenance_type)
      .or("completed.is.null,completed.eq.false")
      .is("interval_miles", null) // only fill blanks
      .select("id", { count: "exact", head: true })

    if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 })
    updated += count ?? 0
  }

  return NextResponse.json({ updated })
}
