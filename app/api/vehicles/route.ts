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
      return NextResponse.json({ vehicles: [] })
    }

    console.log("[v0] Vehicles API: Returning vehicles:", vehicles || [])
    return NextResponse.json({ vehicles: vehicles || [] })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ vehicles: [] })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Vehicles API POST: Starting vehicle creation")
    const supabase = createClient()
    const body = await request.json()
    console.log("[v0] Vehicles API POST: Request body:", body)

    const { vehicle_number, make, model, year, license_plate, vin, current_mileage } = body

    if (!vehicle_number || !make || !model) {
      console.log("[v0] Vehicles API POST: Missing required fields")
      return NextResponse.json(
        { error: "Missing required fields: vehicle_number, make, and model are required" },
        { status: 400 },
      )
    }

    console.log("[v0] Vehicles API POST: Fetching franchise")
    const { data: franchises, error: franchiseError } = await supabase.from("franchises").select("id").limit(1).single()

    if (franchiseError || !franchises) {
      console.error("[v0] Vehicles API POST: Franchise error:", franchiseError)
      return NextResponse.json({ error: "No franchise found. Please create a franchise first." }, { status: 400 })
    }

    console.log("[v0] Vehicles API POST: Using franchise_id:", franchises.id)
    console.log("[v0] Vehicles API POST: Inserting into database")
    const { data: newVehicle, error: createError } = await supabase
      .from("vehicles")
      .insert({
        vehicle_number,
        make,
        model,
        year: year || new Date().getFullYear(),
        license_plate: license_plate || "",
        vin: vin || "",
        current_mileage: current_mileage || 0,
        franchise_id: franchises.id,
        status: "active",
      })
      .select()
      .single()

    if (createError) {
      console.error("[v0] Vehicles API POST: Database error:", createError)
      throw createError
    }

    console.log("[v0] Vehicles API POST: Successfully created vehicle:", newVehicle)
    return NextResponse.json({ vehicle: newVehicle })
  } catch (error) {
    console.error("[v0] Vehicles API POST: Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create vehicle" },
      { status: 500 },
    )
  }
}
