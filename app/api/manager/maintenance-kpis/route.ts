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

function sumCost(rows: any[] | null | undefined) {
  return (rows ?? []).reduce((acc, r) => acc + (Number(r?.cost) || 0), 0)
}

export async function GET() {
  try {
    const ctx = await getActiveFranchiseContext()
    if (isContextError(ctx)) return contextErrorResponse(ctx)

    const { supabase, franchiseId } = ctx

    // 1) Vehicles in this franchise (source of truth)
    const { data: vehicleRows, error: vehicleErr } = await supabase
      .from("vehicles")
      .select("id,current_mileage")
      .eq("franchise_id", franchiseId)

    if (vehicleErr) return NextResponse.json({ error: vehicleErr.message }, { status: 500 })

    const vehiclesCount = (vehicleRows ?? []).length
    const vehicleIds = (vehicleRows ?? []).map((v: any) => v.id)

    // Build a mileage lookup for due calc
    const mileageByVehicle = new Map<string, number>()
    for (const v of vehicleRows ?? []) {
      mileageByVehicle.set(v.id, Number((v as any).current_mileage) || 0)
    }

    // 2) Open Issues (no embeds)
    let openIssuesCount = 0
    if (vehicleIds.length > 0) {
      const { data: issuesRows, error: issuesErr } = await supabase
        .from("vehicle_issues")
        .select("id,status,vehicle_id")
        .in("vehicle_id", vehicleIds)

      if (issuesErr) return NextResponse.json({ error: issuesErr.message }, { status: 500 })

      openIssuesCount = (issuesRows ?? []).filter((r: any) => {
        const s = String(r?.status ?? "").toLowerCase()
        return s === "open" || s === "pending" || s === "needs_attention"
      }).length
    }

    // 3) Spend 30/90 days (no embeds)
    const since30 = isoDaysAgo(30)
    const since90 = isoDaysAgo(90)

    let totalCost30 = 0
    let totalCost90 = 0

    if (vehicleIds.length > 0) {
      const { data: m30, error: m30Err } = await supabase
        .from("maintenance_records")
        .select("cost,created_at,vehicle_id")
        .in("vehicle_id", vehicleIds)
        .gte("created_at", since30)

      if (m30Err) return NextResponse.json({ error: m30Err.message }, { status: 500 })
      totalCost30 = sumCost(m30)

      const { data: m90, error: m90Err } = await supabase
        .from("maintenance_records")
        .select("cost,created_at,vehicle_id")
        .in("vehicle_id", vehicleIds)
        .gte("created_at", since90)

      if (m90Err) return NextResponse.json({ error: m90Err.message }, { status: 500 })
      totalCost90 = sumCost(m90)
    }

    const avgCostPerVehicle90 = vehiclesCount > 0 ? totalCost90 / vehiclesCount : 0

    // 4) Vehicles Due (scheduled_maintenance; no embeds)
    const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
    const dueVehicleIds = new Set<string>()

    if (vehicleIds.length > 0) {
      const { data: dueRows, error: dueErr } = await supabase
        .from("scheduled_maintenance")
        .select("vehicle_id,due_date,due_mileage,completed")
        .eq("franchise_id", franchiseId)
        .in("vehicle_id", vehicleIds)
        .or("completed.is.null,completed.eq.false")

      if (dueErr) return NextResponse.json({ error: dueErr.message }, { status: 500 })

      for (const r of dueRows ?? []) {
        const vid = (r as any).vehicle_id as string
        const curMiles = mileageByVehicle.get(vid) ?? 0

        const dueByDate = (r as any).due_date ? (r as any).due_date <= today : false
        const dueByMiles =
          (r as any).due_mileage != null ? Number((r as any).due_mileage) <= curMiles : false

        if (dueByDate || dueByMiles) dueVehicleIds.add(vid)
      }
    }

    return NextResponse.json({
      openIssuesCount,
      vehiclesCount,
      vehiclesDueForService: dueVehicleIds.size,
      totalCost30,
      totalCost90,
      avgCostPerVehicle90,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 })
  }
}
