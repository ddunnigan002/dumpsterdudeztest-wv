import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    console.log("[v0] Vehicles API: Starting GET request")
    const supabase = createClient()
    console.log("[v0] Vehicles API: Supabase client created")

    const { data: vehicles, error } = await supabase.from("vehicles").select("*").order("vehicle_number")

    console.log("[v0] Vehicles API: Database query result:", {
      vehicleCount: vehicles?.length || 0,
      error: error?.message || "none",
    })

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Failed to fetch vehicles" }, { status: 500 })
    }

    console.log("[v0] Vehicles API: Returning vehicles:", vehicles)
    return NextResponse.json({ vehicles })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const body = await request.json()
    const { vehicle_number, make, model, year, license_plate, vin, current_mileage } = body

    const { data: newVehicle, error: createError } = await supabase
      .from("vehicles")
      .insert({
        vehicle_number,
        make,
        model,
        year,
        license_plate,
        vin,
        current_mileage,
        franchise_id: "00000000-0000-0000-0000-000000000001", // Default franchise for demo
        status: "active",
      })
      .select()
      .single()

    if (createError) {
      throw createError
    }

    return NextResponse.json({ vehicle: newVehicle })
  } catch (error) {
    console.error("Vehicle creation error:", error)
    return NextResponse.json({ error: "Failed to create vehicle" }, { status: 500 })
  }
}
