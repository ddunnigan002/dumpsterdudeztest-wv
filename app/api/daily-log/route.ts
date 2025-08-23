import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const body = await request.json()

    const { vehicleId, startMileage, endMileage, fuelAdded, fuelCost, issuesReported, photos } = body

    // Insert daily log
    const { data, error } = await supabase
      .from("daily_logs")
      .insert({
        vehicle_id: vehicleId,
        driver_id: "00000000-0000-0000-0000-000000000001", // Mock driver ID for now
        log_date: new Date().toISOString().split("T")[0],
        start_mileage: Number.parseInt(startMileage),
        end_mileage: Number.parseInt(endMileage),
        fuel_added: fuelAdded ? Number.parseFloat(fuelAdded) : null,
        fuel_cost: fuelCost ? Number.parseFloat(fuelCost) : null,
        issues_reported: issuesReported || null,
        photos: photos || [],
      })
      .select()
      .single()

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Failed to save daily log" }, { status: 500 })
    }

    // Update vehicle current mileage
    if (endMileage) {
      await supabase
        .from("vehicles")
        .update({ current_mileage: Number.parseInt(endMileage) })
        .eq("id", vehicleId)
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
