import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { searchParams } = new URL(request.url)
    const vehicleId = searchParams.get("vehicleId")
    const date = searchParams.get("date") || new Date().toISOString().split("T")[0]

    if (!vehicleId) {
      return NextResponse.json({ error: "Vehicle ID is required" }, { status: 400 })
    }

    // Check if vehicleId is a UUID or vehicle_number
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(vehicleId)

    let actualVehicleId = vehicleId

    if (!isUUID) {
      const { data: vehicle, error: vehicleError } = await supabase
        .from("vehicles")
        .select("id")
        .ilike("vehicle_number", vehicleId)
        .maybeSingle()

      if (vehicleError || !vehicle) {
        return NextResponse.json({ completed: false }, { status: 200 })
      }

      actualVehicleId = vehicle.id
    }

    // Check if checklist exists for this vehicle and date
    const { data, error } = await supabase
      .from("daily_checklists")
      .select("id, overall_status")
      .eq("vehicle_id", actualVehicleId)
      .eq("checklist_date", date)
      .maybeSingle()

    if (error) {
      console.error("Error checking daily checklist:", error)
      return NextResponse.json({ completed: false }, { status: 200 })
    }

    return NextResponse.json({
      completed: !!data,
      status: data?.overall_status || null,
    })
  } catch (error) {
    console.error("Error in daily-checklist GET:", error)
    return NextResponse.json({ completed: false }, { status: 200 })
  }
}

export async function POST(request: NextRequest) {
  console.log("🔵 API: Daily checklist POST request received")

  try {
    const supabase = createClient()
    console.log("🔵 API: Supabase client created")

    let body
    try {
      body = await request.json()
      console.log("🔵 API: Request body parsed:", JSON.stringify(body, null, 2))
    } catch (parseError) {
      console.error("❌ API: Failed to parse request body:", parseError)
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 })
    }

    const { vehicleNumber, checklist, notes, photoUrls } = body

    // Validate required fields
    if (!vehicleNumber) {
      console.error("❌ API: Missing vehicleNumber")
      return NextResponse.json({ error: "Vehicle number is required" }, { status: 400 })
    }

    if (!checklist || !Array.isArray(checklist)) {
      console.error("❌ API: Invalid checklist data")
      return NextResponse.json({ error: "Checklist data is required and must be an array" }, { status: 400 })
    }

    console.log("🔵 API: Looking for vehicle with number:", vehicleNumber.toUpperCase())

    // Find vehicle by vehicle_number (case-insensitive)
    const { data: vehicle, error: vehicleError } = await supabase
      .from("vehicles")
      .select("id")
      .ilike("vehicle_number", `%${vehicleNumber.toUpperCase()}%`)
      .maybeSingle()

    console.log("🔵 API: Vehicle query result:", { vehicle, vehicleError })

    if (vehicleError || !vehicle) {
      console.error("❌ API: Vehicle not found:", vehicleError)
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 })
    }

    // Create or get a default system user instead of requiring authentication
    console.log("🔵 API: Using default system user (no login required)")

    // Use a default user ID - you can change this to any UUID you want
    const defaultUserId = "8cd2bf7a-2442-4468-8131-d3d2764db3b1"

    // Helper function to safely get checklist item status
    const getItemStatus = (itemId: string) => {
      const item = checklist.find((item: any) => item.id === itemId)
      console.log(`🔵 API: Item ${itemId} status:`, item?.status)
      return item?.status === "pass"
    }

    console.log("🔵 API: Building checklist data...")

    // Build checklist data object dynamically - only with existing columns
    const checklistData = {
      vehicle_id: vehicle.id,
      driver_id: defaultUserId, // Using default user instead of authenticated user
      checklist_date: new Date().toISOString().split("T")[0],
      overall_status: checklist.some((item: any) => item.status === "fail")
        ? "fail"
        : checklist.some((item: any) => item.status === "service_soon")
          ? "pending"
          : "pass",
      notes: notes || null,
      // Removed checklist_items and photos columns - they don't exist in your table
    }

    console.log("🔵 API: Base checklist data:", JSON.stringify(checklistData, null, 2))

    // Only add database columns that exist and have corresponding frontend items
    const itemMapping = {
      tires: "tires_condition",
      lights: "lights_working",
      brakes: "brakes_working",
      fluids: "fluid_levels_ok",
    }

    // Map only the items that exist in your frontend
    Object.entries(itemMapping).forEach(([frontendId, dbColumn]) => {
      const status = getItemStatus(frontendId)
      checklistData[dbColumn] = status
      console.log(`🔵 API: Mapped ${frontendId} -> ${dbColumn} = ${status}`)
    })

    // Set default values for items not in frontend but exist in DB
    checklistData.mirrors_clean = true
    checklistData.safety_equipment_present = true
    // Note: signature_url and created_at will be handled automatically by the database

    console.log("🔵 API: Final checklist data:", JSON.stringify(checklistData, null, 2))

    console.log("🔵 API: Attempting to upsert to daily_checklists table...")

    const { data, error } = await supabase
      .from("daily_checklists")
      .upsert(checklistData, {
        onConflict: "vehicle_id,checklist_date",
      })
      .select()
      .single()

    console.log("🔵 API: Upsert result:", { data, error })

    if (error) {
      console.error("❌ API: Database error:", error)
      console.error("❌ API: Error details:", JSON.stringify(error, null, 2))
      return NextResponse.json(
        {
          error: "Failed to save checklist",
          details: error.message,
          hint: error.hint,
        },
        { status: 500 },
      )
    }

    console.log("✅ API: Checklist saved successfully!")
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("❌ API: Unexpected error:", error)
    console.error("❌ API: Error stack:", error instanceof Error ? error.stack : "No stack trace")
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
