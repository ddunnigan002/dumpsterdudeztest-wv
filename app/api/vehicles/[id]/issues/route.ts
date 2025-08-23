import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const vehicleId = params.id
    console.log("[v0] Issues API: Starting request for vehicle:", vehicleId)

    const supabase = createClient()

    // First, get the vehicle UUID from the vehicle_number
    console.log("[v0] Issues API: Looking up vehicle by vehicle_number:", vehicleId)
    const { data: vehicle, error: vehicleError } = await supabase
      .from("vehicles")
      .select("id")
      .eq("vehicle_number", vehicleId)
      .maybeSingle()

    console.log("[v0] Issues API: Vehicle lookup result:", { vehicle, vehicleError })

    if (vehicleError) {
      console.error("Database error:", vehicleError)
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    if (!vehicle) {
      console.log("[v0] Issues API: Vehicle not found for vehicle_number:", vehicleId)
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 })
    }

    // Fetch recent issues for this vehicle
    console.log("[v0] Issues API: Fetching issues for vehicle_id:", vehicle.id)
    const { data: issues, error } = await supabase
      .from("vehicle_issues")
      .select("*")
      .eq("vehicle_id", vehicle.id)
      .order("created_at", { ascending: false })
      .limit(10)

    console.log("[v0] Issues API: Issues query result:", { issuesCount: issues?.length || 0, error })
    console.log("[v0] Issues API: Issues data:", issues)

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    return NextResponse.json(issues || [])
  } catch (error) {
    console.error("Error in vehicle issues API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
