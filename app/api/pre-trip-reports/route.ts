import { type NextRequest, NextResponse } from "next/server"
import { getActiveFranchiseContext, isContextError, contextErrorResponse } from "@/lib/api/franchise-context"

function toISO(d: Date) {
  return d.toISOString().split("T")[0]
}

export async function GET(request: NextRequest) {
  const ctx = await getActiveFranchiseContext()
  if (isContextError(ctx)) return contextErrorResponse(ctx)

  try {
    const { searchParams } = new URL(request.url)

    const days = searchParams.get("days")
    const startParam = searchParams.get("start")
    const endParam = searchParams.get("end")

    let startDate: Date
    let endDate: Date

    if (startParam && endParam) {
      startDate = new Date(startParam)
      endDate = new Date(endParam)
    } else {
      const daysCount = Number.parseInt(days || "7", 10)
      endDate = new Date()
      startDate = new Date()
      startDate.setDate(endDate.getDate() - daysCount)
    }

    const startISO = toISO(startDate)
    const endISO = toISO(endDate)

    const { data: reports, error: rErr } = await ctx.supabase
      .from("daily_checklists")
      .select(
        `
        id,
        vehicle_id,
        driver_id,
        checklist_date,
        overall_status,
        notes,
        tires_condition,
        lights_working,
        brakes_working,
        fluid_levels_ok,
        mirrors_clean,
        safety_equipment_present
      `
      )
      .eq("franchise_id", ctx.franchiseId)
      .gte("checklist_date", startISO)
      .lte("checklist_date", endISO)
      .order("checklist_date", { ascending: false })

    if (rErr) {
      console.error("Database error (daily_checklists):", rErr)
      return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 })
    }

    const rows = reports ?? []
    if (rows.length === 0) return NextResponse.json({ reports: [] })

    const vehicleIds = Array.from(new Set(rows.map((r: any) => r.vehicle_id).filter(Boolean)))
    const { data: vehicles, error: vErr } = await ctx.supabase
      .from("vehicles")
      .select("id, vehicle_number, make, model")
      .eq("franchise_id", ctx.franchiseId)
      .in("id", vehicleIds)

    if (vErr) {
      console.error("Database error (vehicles):", vErr)
      return NextResponse.json({ error: "Failed to fetch vehicles for reports" }, { status: 500 })
    }

    const vehicleMap = new Map((vehicles ?? []).map((v: any) => [v.id, v]))

    // driver_id references profiles(id) in your constraints, so use profiles
    const driverIds = Array.from(new Set(rows.map((r: any) => r.driver_id).filter(Boolean)))
    let driverMap = new Map<string, any>()
    if (driverIds.length) {
      const { data: drivers, error: pErr } = await ctx.supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", driverIds)

      if (pErr) {
        console.error("Database error (profiles):", pErr)
      } else {
        driverMap = new Map((drivers ?? []).map((p: any) => [p.id, p]))
      }
    }

    const transformedReports = rows.map((report: any) => {
      const vehicle = vehicleMap.get(report.vehicle_id)
      const driver = driverMap.get(report.driver_id)

      const failedItems = [
        report.tires_condition === false,
        report.lights_working === false,
        report.brakes_working === false,
        report.fluid_levels_ok === false,
        report.mirrors_clean === false,
        report.safety_equipment_present === false,
      ].filter(Boolean).length

      return {
        id: report.id,
        vehicle_number: vehicle?.vehicle_number ?? "Unknown",
        vehicle_make: vehicle?.make ?? "Unknown",
        vehicle_model: vehicle?.model ?? "Unknown",
        checklist_date: report.checklist_date,
        overall_status: report.overall_status,
        driver_name: driver?.full_name ?? "Unknown Driver",
        issues_count: failedItems,
        notes: report.notes,
      }
    })

    return NextResponse.json({ reports: transformedReports })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
