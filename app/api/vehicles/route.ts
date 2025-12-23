import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

async function getActiveFranchiseContext() {
  const supabase = createClient()

  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData?.user) {
    return { supabase, error: "Not authenticated", status: 401 as const }
  }

  const user = userData.user

  const { data: membership, error: membershipError } = await supabase
    .from("franchise_memberships")
    .select("franchise_id, is_active")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single()

  if (membershipError || !membership?.franchise_id) {
    return { supabase, error: "No active franchise membership", status: 403 as const }
  }

  return { supabase, user, franchiseId: membership.franchise_id as string }
}

export async function GET() {
  try {
    const ctx = await getActiveFranchiseContext()
    if ("error" in ctx) return NextResponse.json({ error: ctx.error, vehicles: [] }, { status: ctx.status })

    const { supabase, franchiseId } = ctx

    const { data, error } = await supabase
      .from("vehicles")
      .select("*")
      .eq("franchise_id", franchiseId)
      .order("created_at", { ascending: false })

    if (error) throw error

    return NextResponse.json({ vehicles: data ?? [] })
  } catch (error) {
    console.error("[vehicles GET] Error:", error)
    return NextResponse.json({ error: "Failed to fetch vehicles", vehicles: [] }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await getActiveFranchiseContext()
    if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

    const { supabase, franchiseId } = ctx
    const body = await request.json()

    const vehicle_number = String(body?.vehicle_number ?? "").trim()
    const make = String(body?.make ?? "").trim()
    const model = String(body?.model ?? "").trim()
    const year = Number(body?.year ?? 0)

    if (!vehicle_number || !make || !model || !year) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const payload = {
      franchise_id: franchiseId, // ✅ ALWAYS set from membership
      vehicle_number,
      make,
      model,
      year,
      license_plate: body?.license_plate ? String(body.license_plate).trim() : null,
      vin: body?.vin ? String(body.vin).trim() : null,
      current_mileage: Number.isFinite(body?.current_mileage) ? Number(body.current_mileage) : 0,
      status: body?.status ? String(body.status) : "active",
      notes: body?.notes ?? null,
    }

    const { data, error } = await supabase.from("vehicles").insert(payload).select().single()
    if (error) throw error

    return NextResponse.json({ success: true, vehicle: data })
  } catch (error) {
    console.error("[vehicles POST] Error:", error)
    return NextResponse.json({ error: "Failed to create vehicle" }, { status: 500 })
  }
}
