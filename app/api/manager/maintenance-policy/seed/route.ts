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

  // Pull distinct types from scheduled_maintenance for this franchise
  const { data: sched, error: sErr } = await supabase
    .from("scheduled_maintenance")
    .select("maintenance_type")
    .eq("franchise_id", franchiseId)

  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 })

  const types = Array.from(
    new Set(
      (sched ?? [])
        .map((r: any) => String(r?.maintenance_type ?? "").trim())
        .filter(Boolean)
    )
  )

  if (types.length === 0) {
    return NextResponse.json({ seeded: 0, types: [] })
  }

  const payload = types.map((t) => ({
    franchise_id: franchiseId,
    maintenance_type: t,
    default_interval_miles: null,
    default_interval_days: null,
    is_active: true,
    updated_at: new Date().toISOString(),
  }))

  const { error: upErr } = await supabase
    .from("maintenance_policy")
    .upsert(payload, { onConflict: "franchise_id,maintenance_type" })

  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

  return NextResponse.json({ seeded: payload.length, types })
}
