import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

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

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ctx = await getActiveFranchiseContext()
    if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

    const { supabase, franchiseId } = ctx
    const identifier = params.id

    let query = supabase.from("vehicles").select("*").eq("franchise_id", franchiseId)

    if (isValidUUID(identifier)) {
      query = query.eq("id", identifier)
    } else {
      query = query.eq("vehicle_number", identifier.toUpperCase())
    }

    const { data, error } = await query.maybeSingle()

    if (error) {
      console.error("[vehicles/[id] GET] Database error:", error)
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 })
    }

    return NextResponse.json({ vehicle: data })
  } catch (error) {
    console.error("[vehicles/[id] GET] Caught error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ctx = await getActiveFranchiseContext()
    if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

    const { supabase, franchiseId } = ctx
    const identifier = params.id
    const body = await request.json()

    // Safety: never allow these to be updated from the client
    const {
      id,
      franchise_id,
      created_at,
      updated_at,
      // allow everything else:
      ...safeBody
    } = body ?? {}

    // We must only update within the active franchise
    let matchQuery = supabase.from("vehicles").update({ ...safeBody, updated_at: new Date().toISOString() }).eq("franchise_id", franchiseId)

    if (isValidUUID(identifier)) {
      matchQuery = matchQuery.eq("id", identifier)
    } else {
      matchQuery = matchQuery.eq("vehicle_number", identifier.toUpperCase())
    }

    const { data, error } = await matchQuery.select().maybeSingle()

    if (error) {
      console.error("[vehicles/[id] PUT] Database error:", error)
      return NextResponse.json({ error: "Failed to update vehicle" }, { status: 500 })
    }

    if (!data) {
      // Either not found, or found but in a different franchise
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, vehicle: data })
  } catch (error) {
    console.error("[vehicles/[id] PUT] API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
