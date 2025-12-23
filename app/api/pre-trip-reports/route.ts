import { type NextRequest, NextResponse } from "next/server"
import { getActiveFranchiseContext, isContextError, contextErrorResponse } from "@/lib/api/franchise-context"

export async function GET(request: NextRequest) {
  const ctx = await getActiveFranchiseContext()
  if (isContextError(ctx)) {
    return contextErrorResponse(ctx)
  }

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
      const daysCount = Number.parseInt(days || "7")
      endDate = new Date()
      startDate = new Date()
      startDate.setDate(endDate.getDate() - daysCount)
    }

    const { data: reports, error } = await ctx.supabase
      .from("daily_checklists")
      .select(`
        id,
        checklist_date,
        overall_status,
        notes,
        tires_condition,
        lights_working,
        brakes_working,
        fluid_levels_ok,
        mirrors_clean,
        safety_equipment_present,
        vehicles!inner (
          vehicle_number,
          make,
          model,
          franchise_id
        ),
        users (
          full_name
        )
      `)
      .eq("vehicles.franchise_id", ctx.franchiseId)
      .gte("checklist_date", startDate.toISOString().split("T")[0])
      .lte("checklist_date", endDate.toISOString().split("T")[0])
      .order("checklist_date", { ascending: false })

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 })
    }

    // Transform data for frontend
    const transformedReports =
      reports?.map((report: any) => {
        // Count failed items
        const failedItems = [
          !report.tires_condition,
          !report.lights_working,
          !report.brakes_working,
          !report.fluid_levels_ok,
          !report.mirrors_clean,
          !report.safety_equipment_present,
        ].filter(Boolean).length

        return {
          id: report.id,
          vehicle_number: report.vehicles?.vehicle_number || "Unknown",
          vehicle_make: report.vehicles?.make || "Unknown",
          vehicle_model: report.vehicles?.model || "Unknown",
          checklist_date: report.checklist_date,
          overall_status: report.overall_status,
          driver_name: report.users?.full_name || "Unknown Driver",
          issues_count: failedItems,
          notes: report.notes,
          tires_condition: report.tires_condition,
          lights_working: report.lights_working,
          brakes_working: report.brakes_working,
          fluid_levels_ok: report.fluid_levels_ok,
          mirrors_clean: report.mirrors_clean,
          safety_equipment_present: report.safety_equipment_present,
        }
      }) || []

    return NextResponse.json({ reports: transformedReports })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
