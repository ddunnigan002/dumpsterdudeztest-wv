import { NextResponse } from "next/server"
import {
  getActiveFranchiseContext,
  isContextError,
  contextErrorResponse,
} from "@/lib/api/franchise-context"

function parseIntSafe(v: string | null, fallback: number) {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

export async function GET(req: Request) {
  try {
    const ctx = await getActiveFranchiseContext()
    if (isContextError(ctx)) return contextErrorResponse(ctx)

    const { supabase, franchiseId } = ctx
    const url = new URL(req.url)

    const vehicleId = url.searchParams.get("vehicle_id")
    const category = url.searchParams.get("category")
    const vendor = url.searchParams.get("vendor")
    const dateFrom = url.searchParams.get("date_from") // YYYY-MM-DD
    const dateTo = url.searchParams.get("date_to") // YYYY-MM-DD

    const limit = parseIntSafe(url.searchParams.get("limit"), 25)
    const offset = parseIntSafe(url.searchParams.get("offset"), 0)

    // NOTE:
    // This assumes you have a FK relationship from maintenance_records.vehicle_id -> vehicles.id
    // and vehicles has franchise_id. We enforce franchise via vehicles!inner(...)
    let q = supabase
      .from("maintenance_records")
      .select(
        `
        id,
        vehicle_id,
        service_date,
        service_type,
        maintenance_category,
        description,
        cost,
        vendor_name,
        mileage_at_service,
        notes,
        created_at,
        vehicles!inner (
          id,
          vehicle_number,
          make,
          model,
          franchise_id
        )
      `,
        { count: "exact" }
      )
      .eq("vehicles.franchise_id", franchiseId)

    if (vehicleId) q = q.eq("vehicle_id", vehicleId)
    if (category) q = q.eq("maintenance_category", category)
    if (vendor) q = q.ilike("vendor_name", `%${vendor}%`)

    // Prefer filtering by service_date if you use it; fallback to created_at by using both if present
    if (dateFrom) q = q.gte("service_date", dateFrom)
    if (dateTo) q = q.lte("service_date", dateTo)

    q = q
      .order("service_date", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    const { data, error, count } = await q

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // flatten vehicle info for frontend convenience
    const records =
      (data ?? []).map((r: any) => ({
        ...r,
        vehicle: r.vehicles
          ? {
              id: r.vehicles.id,
              vehicle_number: r.vehicles.vehicle_number,
              make: r.vehicles.make,
              model: r.vehicles.model,
            }
          : null,
        vehicles: undefined,
      })) ?? []

    return NextResponse.json({
      records,
      count: count ?? 0,
      limit,
      offset,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 })
  }
}
