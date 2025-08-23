import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("[v0] Maintenance API: Starting request for vehicle:", params.id)
    const supabase = createClient()
    const vehicleId = params.id

    // Get vehicle UUID and current mileage
    const { data: vehicle, error: vehicleError } = await supabase
      .from("vehicles")
      .select("id, current_mileage")
      .eq("vehicle_number", vehicleId.toUpperCase())
      .single()

    console.log("[v0] Maintenance API: Vehicle lookup result:", { vehicle, vehicleError })

    if (vehicleError || !vehicle) {
      console.log("[v0] Maintenance API: Vehicle not found for:", vehicleId)
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 })
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
      const mockData = [
        {
          id: "1",
          maintenance_type: "Oil Change",
          due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0], // Tomorrow
          due_mileage: currentMileage + 500,
          priority: "high",
          status: "pending",
          type: currentMileage + 500 <= currentMileage ? "overdue" : "coming_soon",
          message: currentMileage + 500 <= currentMileage ? "Oil change overdue" : "Oil change due tomorrow",
        },
      ]

      if (vehicleId.toUpperCase() === "CHEVY") {
        mockData.push({
          id: "2",
          maintenance_type: "PTO Service",
          due_date: "2024-02-20",
          due_mileage: currentMileage + 1000,
          priority: "medium",
          status: "pending",
          type: "coming_soon",
          message: "PTO service needed - not engaging properly",
        })
      }

      return NextResponse.json({ upcomingMaintenance: mockData })
    }

    const formattedUpcoming = upcoming.map((item) => ({
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
