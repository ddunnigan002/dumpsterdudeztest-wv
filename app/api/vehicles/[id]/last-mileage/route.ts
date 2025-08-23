import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient()

    const { data: vehicle, error: vehicleError } = await supabase
      .from("vehicles")
      .select("id")
      .eq("vehicle_number", params.id)
      .single()

    if (vehicleError) {
      throw vehicleError
    }

    const { data: lastLog, error } = await supabase
      .from("daily_logs")
      .select("end_mileage")
      .eq("vehicle_id", vehicle.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== "PGRST116") {
      // PGRST116 is "no rows returned"
      throw error
    }

    return NextResponse.json({
      lastMileage: lastLog?.end_mileage || 0,
    })
  } catch (error) {
    console.error("Error fetching last mileage:", error)
    return NextResponse.json({ error: "Failed to fetch last mileage" }, { status: 500 })
  }
}
