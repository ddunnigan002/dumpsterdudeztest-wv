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

async function getFranchiseName(supabase: any, franchiseId: string) {
  try {
    const { data, error } = await supabase
      .from("franchises")
      .select("name")
      .eq("id", franchiseId)
      .maybeSingle()

    if (error) {
      console.error("[vehicles] franchise name lookup error:", error)
      return null
    }

    return data?.name ?? null
  } catch (e) {
    console.error("[vehicles] franchise name lookup exception:", e)
    return null
  }
}

export async function GET() {
  try {
    const ctx = await getActiveFranchiseContext()
    if ("error" in ctx) {
      return NextResponse.json(
        { error: ctx.error, franchiseName: null, vehicles: [] },
        { status: ctx.status },
      )
    }

    const { supabase, franchiseId } = ctx

    const [franchiseName, vehiclesRes] = await Promise.all([
      getFranchiseName(supabase, franchiseId),
      supabase.from("vehicles").select("*").eq("franchise_id", franchiseId).order("created_at", { ascending: false }),
    ])

    if (vehiclesRes.error) throw vehiclesRes.error

    return NextResponse.json({
      franchiseName,
      vehicles: vehiclesRes.data ?? [],
    })
  } catch (error) {
    console.error("[vehicles GET] Error:", error)
    return NextResponse.json(
      { error: "Failed to fetch vehicles", franchiseName: null, vehicles: [] },
      { status: 500 },
    )
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
      franchise_id: franchiseId,
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
