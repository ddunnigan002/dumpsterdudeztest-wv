import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("[v0] Vehicle by ID API: Fetching vehicle with ID:", params.id)
    const supabase = createClient()

    // First try by exact ID match
    let { data, error } = await supabase.from("vehicles").select("*").eq("id", params.id).maybeSingle()

    // If not found, try by vehicle_number
    if (!data && !error) {
      const { data: byNumber, error: numberError } = await supabase
        .from("vehicles")
        .select("*")
        .eq("vehicle_number", params.id.toUpperCase())
        .maybeSingle()

      data = byNumber
      error = numberError
    }

    if (!data && !error) {
      console.log("[v0] Vehicle by ID API: Vehicle not found")
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 })
    }

    if (error) {
      console.error("[v0] Vehicle by ID API: Database error:", error)
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    console.log("[v0] Vehicle by ID API: Returning vehicle from database")
    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] Vehicle by ID API: Caught error:", error)
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
