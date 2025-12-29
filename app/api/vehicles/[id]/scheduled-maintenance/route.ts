import { type NextRequest, NextResponse } from "next/server"
import {
  getActiveFranchiseContext,
  isContextError,
  contextErrorResponse,
  validateVehicleInFranchise,
} from "@/lib/api/franchise-context"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ctx = await getActiveFranchiseContext()
    if (isContextError(ctx)) return contextErrorResponse(ctx)

    const { supabase, franchiseId } = ctx
    const vehicleId = params.id

    const vehicle = await validateVehicleInFranchise(supabase, franchiseId, vehicleId)
    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found in your franchise" }, { status: 404 })
    }

    // Get scheduled maintenance for this vehicle that hasn't been completed
    // NOTE: include null-completed rows too (older data) just in case
    const { data, error } = await supabase
      .from("scheduled_maintenance")
      .select("*")
      .eq("vehicle_id", vehicle.id)
      .or("completed.is.null,completed.eq.false")
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("due_mileage", { ascending: true, nullsFirst: false })

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (error: any) {
    console.error("API error:", error)
    return NextResponse.json({ error: error?.message ?? "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ctx = await getActiveFranchiseContext()
    if (isContextError(ctx)) return contextErrorResponse(ctx)

    const { supabase, franchiseId } = ctx
    const vehicleId = params.id

    const vehicle = await validateVehicleInFranchise(supabase, franchiseId, vehicleId)
    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found in your franchise" }, { status: 404 })
    }

    const body = await request.json().catch(() => null)
    if (!body) return NextResponse.json({ error: "Invalid payload" }, { status: 400 })

    const maintenance_type = String(body.maintenance_type ?? "").trim()
    if (!maintenance_type) {
      return NextResponse.json({ error: "maintenance_type is required" }, { status: 400 })
    }

    const description = body.description != null ? String(body.description) : null

    // Exactly one trigger should be provided (mileage OR date)
    const due_mileage =
      body.due_mileage === "" || body.due_mileage == null ? null : Number(body.due_mileage)
    const due_date = body.due_date === "" || body.due_date == null ? null : String(body.due_date)

    if (due_mileage == null && due_date == null) {
      return NextResponse.json({ error: "Either due_mileage or due_date is required" }, { status: 400 })
    }
    if (due_mileage != null && !Number.isFinite(due_mileage)) {
      return NextResponse.json({ error: "due_mileage must be a number" }, { status: 400 })
    }

    // Pull default intervals from maintenance_policy (manager settings)
    const { data: policy, error: pErr } = await supabase
      .from("maintenance_policy")
      .select("default_interval_miles, default_interval_days, is_active")
      .eq("franchise_id", franchiseId)
      .eq("maintenance_type", maintenance_type)
      .maybeSingle()

    if (pErr) {
      console.error("Policy lookup error:", pErr)
      return NextResponse.json({ error: pErr.message }, { status: 500 })
    }

    // If a policy exists but is inactive, block scheduling (optional behavior; change if you want)
    if (policy && policy.is_active === false) {
      return NextResponse.json(
        { error: "This maintenance type is disabled in Maintenance Settings." },
        { status: 400 }
      )
    }

    const interval_miles = policy?.default_interval_miles ?? null
    const interval_days = policy?.default_interval_days ?? null

    const { data: inserted, error: insErr } = await supabase
      .from("scheduled_maintenance")
      .insert({
        franchise_id: franchiseId,
        vehicle_id: vehicle.id,
        maintenance_type,
        description,
        due_date,
        due_mileage,
        completed: false,
        interval_miles,
        interval_days,
      })
      .select("*")
      .single()

    if (insErr) {
      console.error("Insert error:", insErr)
      return NextResponse.json({ error: insErr.message }, { status: 500 })
    }

    return NextResponse.json(inserted)
  } catch (error: any) {
    console.error("API error:", error)
    return NextResponse.json({ error: error?.message ?? "Internal server error" }, { status: 500 })
  }
}
