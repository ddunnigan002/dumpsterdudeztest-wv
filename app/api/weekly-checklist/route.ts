import { type NextRequest, NextResponse } from "next/server"
import {
  getActiveFranchiseContext,
  isContextError,
  contextErrorResponse,
  validateVehicleInFranchise,
} from "@/lib/api/franchise-context"

type OverallStatus = "pass" | "service_soon" | "fail"

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

export async function POST(request: NextRequest) {
  const ctx = await getActiveFranchiseContext()
  if (isContextError(ctx)) return contextErrorResponse(ctx)

  try {
    const body = await request.json()
    const { vehicleNumber, checklist, notes } = body

    const decodedVehicleNumber = decodeMaybe(vehicleNumber)

    if (!decodedVehicleNumber) {
      return NextResponse.json({ error: "Vehicle number is required" }, { status: 400 })
    }
    if (!Array.isArray(checklist)) {
      return NextResponse.json({ error: "Checklist data is required and must be an array" }, { status: 400 })
    }

    // Franchise-safe vehicle resolution
    const vehicle = await validateVehicleInFranchise(ctx.supabase, ctx.franchiseId, decodedVehicleNumber)
    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found in your franchise" }, { status: 404 })
    }

    const checklist_date = toISODateToday()
    const overall_status = computeOverallStatus(checklist)

    const itemToBoolColumn: Record<string, string> = {
      grease_chassis_points: "grease_chassis_points",
      lubricate_hooklift_points: "lubricate_hooklift_points",
      inspect_hydraulic_cylinders: "inspect_hydraulic_cylinders",
      inspect_hydraulic_filter: "inspect_hydraulic_filter",
      clean_battery_terminals: "clean_battery_terminals",
      check_def_fluid: "check_def_fluid",
      torque_wheel_lugs: "torque_wheel_lugs",
      inspect_tarp_straps: "inspect_tarp_straps",
      check_door_latches: "check_door_latches",
      wash_truck_clean_cab: "wash_truck_clean_cab",
    }

    const checklistData: Record<string, any> = {
      franchise_id: ctx.franchiseId,
      vehicle_id: vehicle.id,
      driver_id: ctx.user.id,
      checklist_date,
      overall_status,
      notes: notes || null,

      // source of truth for tri-state items
      custom_items: checklist,
    }

    // Fill bool columns: true only if pass
    for (const [itemId, col] of Object.entries(itemToBoolColumn)) {
      checklistData[col] = isPassForItem(checklist, itemId)
    }

    const { data, error } = await ctx.supabase
      .from("weekly_checklists")
      .upsert(checklistData, { onConflict: "vehicle_id,checklist_date" })
      .select()
      .single()

    if (error) {
      console.error("Weekly checklist DB error:", error)
      return NextResponse.json(
        { error: "Failed to save weekly checklist", details: error.message, hint: (error as any).hint ?? null },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Weekly checklist API error:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
