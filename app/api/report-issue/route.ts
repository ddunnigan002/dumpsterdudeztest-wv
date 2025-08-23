import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const { vehicleId, description, photos, date } = await request.json()

    const supabase = createClient()

    // First, get the vehicle UUID from the vehicle_number
    const { data: vehicle, error: vehicleError } = await supabase
      .from("vehicles")
      .select("id")
      .eq("vehicle_number", vehicleId)
      .single()

    if (vehicleError || !vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 })
    }

    // Insert issue report
    const { data, error } = await supabase
      .from("vehicle_issues")
      .insert({
        vehicle_id: vehicle.id,
        description,
        photos: photos || [],
        status: "open",
        reported_date: new Date(date).toISOString().split("T")[0],
        created_at: new Date().toISOString(),
      })
      .select()

    if (error) {
      console.error("Error saving issue report:", error)
      return NextResponse.json({ error: "Failed to save issue report" }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Error in report issue API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
