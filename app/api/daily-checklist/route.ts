import { type NextRequest, NextResponse } from "next/server"
import {
  getActiveFranchiseContext,
  isContextError,
  contextErrorResponse,
  validateVehicleInFranchise,
} from "@/lib/api/franchise-context"

function decodeMaybe(value: unknown): string {
  const raw = typeof value === "string" ? value : ""
  try {
    return decodeURIComponent(raw).trim()
  } catch {
    return raw.trim()
  }
}

function toISODateToday() {
  return new Date().toISOString().split("T")[0]
}

type OverallStatus = "pass" | "service_soon" | "fail"

function normalizeStatus(s: unknown) {
  return String(s ?? "").toLowerCase().trim().replace(/\s+/g, "_")
}

function computeOverallStatus(checklist: any[]): OverallStatus {
  const statuses = (checklist ?? []).map((i) => normalizeStatus(i?.status))

  if (statuses.includes("fail")) return "fail"
  if (statuses.includes("service_soon")) return "service_soon"
  return "pass"
}

function isPassForItem(checklist: any[], itemId: string) {
  const item = (checklist ?? []).find((i) => i?.id === itemId)
  return normalizeStatus(item?.status) === "pass"
}

export async function GET(request: NextRequest) {
  const ctx = await getActiveFranchiseContext()
  if (isContextError(ctx)) return contextErrorResponse(ctx)

  try {
    const { searchParams } = new URL(request.url)
    const vehicleIdRaw = searchParams.get("vehicleId")
    const date = searchParams.get("date") || toISODateToday()

    if (!vehicleIdRaw) {
      return NextResponse.json({ error: "Vehicle ID is required" }, { status: 400 })
    }

    const vehicleId = decodeMaybe(vehicleIdRaw)

    const vehicle = await validateVehicleInFranchise(ctx.supabase, ctx.franchiseId, vehicleId)
    if (!vehicle) {
      return NextResponse.json({ completed: false }, { status: 200 })
    }

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
  const ctx = await getActiveFranchiseContext()
  if (isContextError(ctx)) return contextErrorResponse(ctx)

  try {
    const body = await request.json()
    const { vehicleNumber, checklist, notes /* photoUrls */ } = body

    const decodedVehicleNumber = decodeMaybe(vehicleNumber)

    if (!decodedVehicleNumber) {
      return NextResponse.json({ error: "Vehicle number is required" }, { status: 400 })
    }

    if (!Array.isArray(checklist)) {
      return NextResponse.json({ error: "Checklist data is required and must be an array" }, { status: 400 })
    }

    // Your helper seems to accept either ID or vehicle_number; we keep your usage.
    const vehicle = await validateVehicleInFranchise(ctx.supabase, ctx.franchiseId, decodedVehicleNumber)
    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found in your franchise" }, { status: 404 })
    }

    const checklist_date = toISODateToday()
    const overall_status = computeOverallStatus(checklist)

    // Map your UI items -> DB boolean columns (true ONLY if pass; otherwise false)
    const itemToBoolColumn: Record<string, string> = {
      tires: "tires_condition",
      lights: "lights_working",
      brakes: "brakes_working",
      fluids: "fluid_levels_ok",

      // If you add these items to the UI later, you can turn these on:
      // mirrors: "mirrors_clean",
      // safety: "safety_equipment_present",
    }

    const checklistData: Record<string, any> = {
      franchise_id: ctx.franchiseId,
      vehicle_id: vehicle.id,
      driver_id: ctx.user.id,
      checklist_date,
      overall_status,
      notes: notes || null,

      // This is the “source of truth” for pass/service_soon/fail per item
      custom_items: checklist,
    }

    // Fill boolean columns based on pass-only
    for (const [itemId, col] of Object.entries(itemToBoolColumn)) {
      checklistData[col] = isPassForItem(checklist, itemId)
    }

    const { data, error } = await ctx.supabase
      .from("daily_checklists")
      .upsert(checklistData, { onConflict: "vehicle_id,checklist_date" })
      .select()
      .single()

    if (error) {
      console.error("Daily checklist DB error:", error)
      return NextResponse.json(
        { error: "Failed to save checklist", details: error.message, hint: (error as any).hint ?? null },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Daily checklist API error:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
