import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const body = await request.json()

    const { vehicle_number, description, severity, status, notes, reported_date, manager_override } = body

    // Get vehicle ID from vehicle number
    const { data: vehicle, error: vehicleError } = await supabase
      .from("vehicles")
      .select("id")
      .eq("vehicle_number", vehicle_number)
      .single()

    if (vehicleError || !vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 })
    }

    const { data, error } = await supabase
      .from("vehicle_issues")
      .insert({
        vehicle_id: vehicle.id,
        description,
        severity: severity || "medium",
        status: status || "open",
        notes,
        reported_date: reported_date || new Date().toISOString().split("T")[0],
        manager_override: manager_override || false,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Failed to save vehicle issue" }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
