import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient()
    const vehicleId = params.id

    // First get the vehicle UUID from vehicle_number
    const { data: vehicle } = await supabase
      .from("vehicles")
      .select("id")
      .eq("vehicle_number", vehicleId.toUpperCase())
      .maybeSingle()

    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 })
    }

    // Get scheduled maintenance for this vehicle that hasn't been completed
    const { data: scheduledMaintenance, error } = await supabase
      .from("scheduled_maintenance")
      .select("*")
      .eq("vehicle_id", vehicle.id)
      .eq("completed", false)
      .order("due_date", { ascending: true })

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    return NextResponse.json(scheduledMaintenance || [])
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
