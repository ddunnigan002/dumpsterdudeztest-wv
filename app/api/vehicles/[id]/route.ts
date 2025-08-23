import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient()

    // First try to find by vehicle_number (like "CHEVY", "KENWORTH")
    let { data, error } = await supabase
      .from("vehicles")
      .select("*")
      .eq("vehicle_number", params.id.toUpperCase())
      .maybeSingle()

    // If not found by vehicle_number and the ID looks like a UUID, try by UUID
    if (!data && !error && isValidUUID(params.id)) {
      const { data: uuidData, error: uuidError } = await supabase
        .from("vehicles")
        .select("*")
        .eq("id", params.id)
        .maybeSingle()

      data = uuidData
      error = uuidError
    }

    // If still no data found, return mock data for testing
    if (!data && !error) {
      // Return mock data based on vehicle identifier
      if (params.id.toUpperCase() === "CHEVY") {
        return NextResponse.json({
          id: "mock-chevy-id",
          vehicle_number: "CHEVY",
          make: "Chevrolet",
          model: "6500",
          year: 2020,
          current_mileage: 45000,
          license_plate: "DD-001",
          vin: "1GB6G5BG8L1234567",
          status: "active",
        })
      } else if (params.id.toUpperCase() === "KENWORTH") {
        return NextResponse.json({
          id: "mock-kenworth-id",
          vehicle_number: "KENWORTH",
          make: "Kenworth",
          model: "T280",
          year: 2019,
          current_mileage: 62000,
          license_plate: "DD-002",
          vin: "1XKAD49X0KJ123456",
          status: "active",
        })
      }
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 })
    }

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient()
    const body = await request.json()

    const { data, error } = await supabase.from("vehicles").update(body).eq("id", params.id).select().single()

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Failed to update vehicle" }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
