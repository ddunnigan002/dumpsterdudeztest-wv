import { NextResponse } from "next/server"
import {
  getActiveFranchiseContext,
  isContextError,
  contextErrorResponse,
} from "@/lib/api/franchise-context"

function isoDaysAgo(days: number) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

export async function GET() {
  try {
    const ctx = await getActiveFranchiseContext()
    if (isContextError(ctx)) return contextErrorResponse(ctx)

    const { supabase, franchiseId } = ctx

    // ---- Open issues (adjust statuses if yours differ)
    const { count: openIssuesCount, error: issuesErr } = await supabase
      .from("vehicle_issues")
      .select("id", { count: "exact", head: true })
      .eq("franchise_id", franchiseId)
      .in("status", ["open", "pending", "needs_attention"])

    if (issuesErr) {
      return NextResponse.json({ error: issuesErr.message }, { status: 500 })
    }

    // ---- Total vehicles in franchise
    const { count: vehiclesCount, error: vehiclesErr } = await supabase
      .from("vehicles")
      .select("id", { count: "exact", head: true })
      .eq("franchise_id", franchiseId)

    if (vehiclesErr) {
      return NextResponse.json({ error: vehiclesErr.message }, { status: 500 })
    }

    // ---- Maintenance spend (30 / 90 days)
    // NOTE: This assumes your maintenance table is `maintenance_records` and has `cost`, `created_at` (and/or service_date).
    // If your date column is `service_date`, we’ll use created_at as fallback.
    const since30 = isoDaysAgo(30)
    const since90 = isoDaysAgo(90)

    const { data: m30, error: m30Err } = await supabase
      .from("maintenance_records")
      .select("cost, created_at, service_date")
      .eq("franchise_id", franchiseId)
      .gte("created_at", since30)

    if (m30Err) return NextResponse.json({ error: m30Err.message }, { status: 500 })

    const { data: m90, error: m90Err } = await supabase
      .from("maintenance_records")
      .select("cost, created_at, service_date")
      .eq("franchise_id", franchiseId)
      .gte("created_at", since90)

    if (m90Err) return NextResponse.json({ error: m90Err.message }, { status: 500 })

    const sumCost = (rows: any[] | null | undefined) =>
      (rows ?? []).reduce((acc, r) => acc + (Number(r?.cost) || 0), 0)

    const totalCost30 = sumCost(m30)
    const totalCost90 = sumCost(m90)

    const avgCostPerVehicle90 =
      (vehiclesCount ?? 0) > 0 ? totalCost90 / (vehiclesCount ?? 1) : 0

    // ---- Placeholder for "Vehicles due for service"
    // We'll implement real logic in Phase C (time + mileage rules).
    const vehiclesDueForService = 0

    return NextResponse.json({
      openIssuesCount: openIssuesCount ?? 0,
      vehiclesCount: vehiclesCount ?? 0,
      vehiclesDueForService,
      totalCost30,
      totalCost90,
      avgCostPerVehicle90,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 })
  }
}
