import { type NextRequest, NextResponse } from "next/server"
import {
  getActiveFranchiseContext,
  isContextError,
  contextErrorResponse,
  validateVehicleInFranchise,
} from "@/lib/api/franchise-context"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("[v0] Maintenance API: Starting request for vehicle:", params.id)
    const ctx = await getActiveFranchiseContext()
    if (isContextError(ctx)) {
      return contextErrorResponse(ctx)
    }

    const { supabase, franchiseId } = ctx
    const vehicleId = params.id

    const vehicle = await validateVehicleInFranchise(supabase, franchiseId, vehicleId)
    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found in your franchise" }, { status: 404 })
    }

    const currentMileage = vehicle.current_mileage || 0
    const maxMileage = currentMileage + 10000 // Next 10k miles
    const twoMonthsFromNow = new Date()
    twoMonthsFromNow.setMonth(twoMonthsFromNow.getMonth() + 2)
    const today = new Date().toISOString().split("T")[0]

    console.log("[v0] Maintenance API: Querying scheduled_maintenance for vehicle_id:", vehicle.id)
    const { data: upcoming, error } = await supabase
      .from("scheduled_maintenance")
      .select("*")
      .eq("vehicle_id", vehicle.id)
      .eq("completed", false)
      .or(`due_mileage.lte.${maxMileage},due_date.lte.${twoMonthsFromNow.toISOString().split("T")[0]}`)
      .order("due_date", { ascending: true })

    console.log("[v0] Maintenance API: Database query result:", { upcoming, error, count: upcoming?.length || 0 })

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Failed to fetch upcoming maintenance" }, { status: 500 })
    }

    const formattedUpcoming = (upcoming || []).map((item) => ({
      ...item,
      type:
        (item.due_mileage && item.due_mileage <= currentMileage) || (item.due_date && item.due_date <= today)
          ? "overdue"
          : "coming_soon",
      message: `${item.maintenance_type} ${(item.due_mileage && item.due_mileage <= currentMileage) || (item.due_date && item.due_date <= today) ? "overdue" : "due soon"}`,
    }))

    console.log("[v0] Maintenance API: Returning formatted data:", formattedUpcoming)
    return NextResponse.json({ upcomingMaintenance: formattedUpcoming })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
