import { NextResponse } from "next/server"
import {
  getActiveFranchiseContext,
  isContextError,
  contextErrorResponse,
} from "@/lib/api/franchise-context"

export async function GET() {
  try {
    const ctx = await getActiveFranchiseContext()
    if (isContextError(ctx)) return contextErrorResponse(ctx)

    const { supabase, franchiseId } = ctx

    const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD

    // Pull open scheduled items + vehicle mileage to evaluate "due"
    const { data, error } = await supabase
      .from("scheduled_maintenance")
      .select(
        `
        id,
        vehicle_id,
        maintenance_type,
        description,
        due_date,
        due_mileage,
        completed,
        vehicles!inner (
          id,
          vehicle_number,
          current_mileage,
          franchise_id
        )
      `
      )
      .eq("franchise_id", franchiseId)
      .eq("vehicles.franchise_id", franchiseId)
      .or("completed.is.null,completed.eq.false")

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const rows = (data ?? []).map((r: any) => {
      const v = r.vehicles
      const curMiles = Number(v?.current_mileage) || 0
      const dueByDate = r.due_date ? r.due_date <= today : false
      const dueByMiles = r.due_mileage != null ? Number(r.due_mileage) <= curMiles : false
      const isDue = dueByDate || dueByMiles

      return {
        id: r.id,
        vehicle_id: r.vehicle_id,
        vehicle_number: v?.vehicle_number ?? "—",
        current_mileage: curMiles,
        maintenance_type: r.maintenance_type,
        description: r.description,
        due_date: r.due_date,
        due_mileage: r.due_mileage,
        due_reason: dueByDate && dueByMiles ? "date+mileage" : dueByDate ? "date" : dueByMiles ? "mileage" : "—",
        is_due: isDue,
      }
    })

    const dueItems = rows.filter((r) => r.is_due)

    // Vehicles due = unique vehicle_ids with any due item
    const vehiclesDueForService = new Set(dueItems.map((d) => d.vehicle_id)).size

    // Sort due items: most overdue first (mileage overage or date overdue)
    dueItems.sort((a, b) => {
      const aOverMiles = a.due_mileage != null ? (a.current_mileage - a.due_mileage) : -999999
      const bOverMiles = b.due_mileage != null ? (b.current_mileage - b.due_mileage) : -999999
      if (bOverMiles !== aOverMiles) return bOverMiles - aOverMiles
      const aDate = a.due_date ? new Date(a.due_date).getTime() : 0
      const bDate = b.due_date ? new Date(b.due_date).getTime() : 0
      return aDate - bDate
    })

    return NextResponse.json({
      vehiclesDueForService,
      dueItems: dueItems.slice(0, 50),
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 })
  }
}
