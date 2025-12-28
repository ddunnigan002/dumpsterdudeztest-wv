import { type NextRequest, NextResponse } from "next/server"
import { getActiveFranchiseContext, isContextError, contextErrorResponse } from "@/lib/api/franchise-context"

export async function GET(request: NextRequest) {
  const ctx = await getActiveFranchiseContext()
  if (isContextError(ctx)) {
    return contextErrorResponse(ctx)
  }

  try {
    const { searchParams } = new URL(request.url)
    const daysRaw = searchParams.get("days") || "30"
    const days = Number.isFinite(Number(daysRaw)) ? Number.parseInt(daysRaw, 10) : 30
    const vehicleId = searchParams.get("vehicleId") // expect UUID or "all"

    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(endDate.getDate() - Math.max(1, Math.min(days, 365))) // clamp 1..365

    let query = ctx.supabase
      .from("daily_logs")
      .select(
        `
        log_date,
        start_mileage,
        end_mileage,
        fuel_added,
        fuel_cost,
        vehicle_id,
        vehicles (
          vehicle_number,
          make,
          model,
          franchise_id
        )
      `
      )
      .eq("vehicles.franchise_id", ctx.franchiseId)
      .gte("log_date", startDate.toISOString().split("T")[0])
      .lte("log_date", endDate.toISOString().split("T")[0])
      .not("fuel_added", "is", null)
      .not("fuel_cost", "is", null)
      .order("log_date", { ascending: true })

    // ✅ Robust filter: vehicleId is the UUID from the dropdown
    if (vehicleId && vehicleId !== "all") {
      query = query.eq("vehicle_id", vehicleId)
    }

    const { data: logs, error } = await query

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Failed to fetch gas data" }, { status: 500 })
    }

    const analytics =
      logs?.map((log: any) => {
        const start = Number(log.start_mileage ?? 0)
        const end = Number(log.end_mileage ?? 0)
        const gallons = Number(log.fuel_added ?? 0)
        const cost = Number(log.fuel_cost ?? 0)

        const milesDriven = end - start
        const mpg = gallons > 0 ? milesDriven / gallons : 0
        const costPerGallon = gallons > 0 ? cost / gallons : 0
        const costPerMile = milesDriven > 0 ? cost / milesDriven : 0

        return {
          date: log.log_date,
          vehicle: log.vehicles?.vehicle_number || "Unknown",
          gallons: Number.parseFloat(gallons.toFixed(2)),
          cost: Number.parseFloat(cost.toFixed(2)),
          milesDriven,
          mpg: Number.parseFloat(mpg.toFixed(2)),
          costPerGallon: Number.parseFloat(costPerGallon.toFixed(2)),
          costPerMile: Number.parseFloat(costPerMile.toFixed(2)),
        }
      }) || []

    const totalGallons = analytics.reduce((sum, entry) => sum + entry.gallons, 0)
    const totalCost = analytics.reduce((sum, entry) => sum + entry.cost, 0)
    const totalMiles = analytics.reduce((sum, entry) => sum + entry.milesDriven, 0)
    const averageMPG = totalGallons > 0 ? totalMiles / totalGallons : 0
    const averageCostPerGallon = totalGallons > 0 ? totalCost / totalGallons : 0

    const summary = {
      totalGallons: Number.parseFloat(totalGallons.toFixed(2)),
      totalCost: Number.parseFloat(totalCost.toFixed(2)),
      totalMiles,
      averageMPG: Number.parseFloat(averageMPG.toFixed(2)),
      averageCostPerGallon: Number.parseFloat(averageCostPerGallon.toFixed(2)),
      entriesCount: analytics.length,
    }

    return NextResponse.json({ analytics, summary })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
