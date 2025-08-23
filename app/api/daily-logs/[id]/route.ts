import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient()
    const body = await request.json()
    const logId = params.id

    const { start_mileage, end_mileage, gallons_purchased, fuel_cost, notes } = body

    const { data, error } = await supabase
      .from("daily_logs")
      .update({
        start_mileage,
        end_mileage,
        gallons_purchased,
        fuel_cost,
        notes,
        manager_override: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", logId)
      .select()
      .single()

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Failed to update daily log" }, { status: 500 })
    }

    // Update vehicle current mileage if end_mileage is provided
    if (end_mileage && data) {
      const { data: vehicle } = await supabase.from("vehicles").select("id").eq("id", data.vehicle_id).single()

      if (vehicle) {
        await supabase.from("vehicles").update({ current_mileage: end_mileage }).eq("id", vehicle.id)
      }
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
