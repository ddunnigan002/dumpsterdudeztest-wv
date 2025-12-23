import { type NextRequest, NextResponse } from "next/server"
import {
  getActiveFranchiseContext,
  isContextError,
  contextErrorResponse,
  validateVehicleInFranchise,
} from "@/lib/api/franchise-context"

export async function GET(request: NextRequest) {
  const ctx = await getActiveFranchiseContext()
  if (isContextError(ctx)) {
    return contextErrorResponse(ctx)
  }

  try {
    const { searchParams } = new URL(request.url)
    const vehicleId = searchParams.get("vehicleId")
    const date = searchParams.get("date") || new Date().toISOString().split("T")[0]

    if (!vehicleId) {
      return NextResponse.json({ error: "Vehicle ID is required" }, { status: 400 })
    }

    const vehicle = await validateVehicleInFranchise(ctx.supabase, ctx.franchiseId, vehicleId)
    if (!vehicle) {
      return NextResponse.json({ completed: false }, { status: 200 })
    }

    // Check if checklist exists for this vehicle and date
    const { data, error } = await ctx.supabase
      .from("daily_checklists")
      .select("id, overall_status")
      .eq("vehicle_id", vehicle.id)
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

  const ctx = await getActiveFranchiseContext()
  if (isContextError(ctx)) {
    return contextErrorResponse(ctx)
  }

  try {
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

    const vehicle = await validateVehicleInFranchise(ctx.supabase, ctx.franchiseId, vehicleNumber)
    if (!vehicle) {
      console.error("❌ API: Vehicle not found in franchise")
      return NextResponse.json({ error: "Vehicle not found in your franchise" }, { status: 404 })
    }

    console.log("🔵 API: Vehicle found in franchise:", vehicle)

    // Helper function to safely get checklist item status
    const getItemStatus = (itemId: string) => {
      const item = checklist.find((item: any) => item.id === itemId)
      console.log(`🔵 API: Item ${itemId} status:`, item?.status)
      return item?.status === "pass"
    }

    console.log("🔵 API: Building checklist data...")

    const checklistData = {
      vehicle_id: vehicle.id,
      driver_id: ctx.user.id, // Use authenticated user
      checklist_date: new Date().toISOString().split("T")[0],
      overall_status: checklist.some((item: any) => item.status === "fail")
        ? "fail"
        : checklist.some((item: any) => item.status === "service_soon")
          ? "pending"
          : "pass",
      notes: notes || null,
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

    // Note: signature_url and created_at will be handled automatically by the database

    console.log("🔵 API: Final checklist data:", JSON.stringify(checklistData, null, 2))

    console.log("🔵 API: Attempting to upsert to daily_checklists table...")

    const { data, error } = await ctx.supabase
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
