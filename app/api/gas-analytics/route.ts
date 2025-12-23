import { type NextRequest, NextResponse } from "next/server"
import { getActiveFranchiseContext, isContextError, contextErrorResponse } from "@/lib/api/franchise-context"

export async function GET(request: NextRequest) {
  const ctx = await getActiveFranchiseContext()
  if (isContextError(ctx)) {
    return contextErrorResponse(ctx)
  }

  try {
    const { searchParams } = new URL(request.url)
    const days = Number.parseInt(searchParams.get("days") || "30")
    const vehicleId = searchParams.get("vehicleId")

    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(endDate.getDate() - days)

    let query = ctx.supabase
      .from("daily_logs")
      .select(`
        log_date,
        start_mileage,
        end_mileage,
        fuel_added,
        fuel_cost,
        vehicles!inner (
          vehicle_number,
          make,
          model,
          franchise_id
        )
      `)
      .eq("vehicles.franchise_id", ctx.franchiseId)
      .gte("log_date", startDate.toISOString().split("T")[0])
      .lte("log_date", endDate.toISOString().split("T")[0])
      .not("fuel_added", "is", null)
      .not("fuel_cost", "is", null)
      .order("log_date", { ascending: true })

    if (vehicleId && vehicleId !== "all") {
      const { data: vehicle } = await ctx.supabase
        .from("vehicles")
        .select("id")
        .eq("vehicle_number", vehicleId.toUpperCase())
        .eq("franchise_id", ctx.franchiseId)
        .single()

      if (vehicle) {
        query = query.eq("vehicle_id", vehicle.id)
      }
    }

    const { data: logs, error } = await query

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Failed to fetch gas data" }, { status: 500 })
    }

    // Process data for analytics
    const analytics =
      logs?.map((log: any) => {
        const milesDriven = log.end_mileage - log.start_mileage
        const mpg = log.fuel_added > 0 ? milesDriven / log.fuel_added : 0
        const costPerGallon = log.fuel_added > 0 ? log.fuel_cost / log.fuel_added : 0
        const costPerMile = milesDriven > 0 ? log.fuel_cost / milesDriven : 0

        return {
          date: log.log_date,
          vehicle: log.vehicles?.vehicle_number || "Unknown",
          gallons: Number.parseFloat(log.fuel_added),
          cost: Number.parseFloat(log.fuel_cost),
          milesDriven,
          mpg: Number.parseFloat(mpg.toFixed(2)),
          costPerGallon: Number.parseFloat(costPerGallon.toFixed(2)),
          costPerMile: Number.parseFloat(costPerMile.toFixed(2)),
        }
      }) || []

    // Calculate summary statistics
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
