import { NextResponse } from "next/server"
import {
  getActiveFranchiseContext,
  isContextError,
  contextErrorResponse,
} from "@/lib/api/franchise-context"

export async function GET() {
  const ctx = await getActiveFranchiseContext()
  if (isContextError(ctx)) return contextErrorResponse(ctx)

  const { supabase, franchiseId } = ctx

  const { data, error } = await supabase
    .from("maintenance_policy")
    .select("id, maintenance_type, default_interval_miles, default_interval_days, is_active, updated_at")
    .eq("franchise_id", franchiseId)
    .order("maintenance_type", { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: Request) {
  const ctx = await getActiveFranchiseContext()
  if (isContextError(ctx)) return contextErrorResponse(ctx)

  const { supabase, franchiseId } = ctx

  const body = await req.json().catch(() => null)
  if (!body || typeof body.maintenance_type !== "string") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
  }

  const payload = {
    franchise_id: franchiseId,
    maintenance_type: body.maintenance_type,
    default_interval_miles: body.default_interval_miles ?? null,
    default_interval_days: body.default_interval_days ?? null,
    is_active: body.is_active ?? true,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from("maintenance_policy")
    .upsert(payload, { onConflict: "franchise_id,maintenance_type" })
    .select("id, maintenance_type, default_interval_miles, default_interval_days, is_active, updated_at")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
