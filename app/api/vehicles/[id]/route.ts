import { type NextRequest, NextResponse } from "next/server"
import { getActiveFranchiseContext, isContextError, contextErrorResponse } from "@/lib/api/franchise-context"

function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ctx = await getActiveFranchiseContext()
    if (isContextError(ctx)) {
      return contextErrorResponse(ctx)
    }

    const { supabase, franchiseId } = ctx
    const identifier = params.id

    let query = supabase.from("vehicles").select("*").eq("franchise_id", franchiseId)

    if (isValidUUID(identifier)) {
      query = query.eq("id", identifier)
    } else {
      query = query.ilike("vehicle_number", identifier)
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
    if (isContextError(ctx)) {
      return contextErrorResponse(ctx)
    }

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
    let matchQuery = supabase
      .from("vehicles")
      .update({ ...safeBody, updated_at: new Date().toISOString() })
      .eq("franchise_id", franchiseId)

    if (isValidUUID(identifier)) {
      matchQuery = matchQuery.eq("id", identifier)
    } else {
      matchQuery = matchQuery.ilike("vehicle_number", identifier)
    }

    const { data, error } = await matchQuery.select().maybeSingle()

    if (error) {
      console.error("[vehicles/[id] PUT] Database error:", error)
      return NextResponse.json({ error: "Failed to update vehicle" }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, vehicle: data })
  } catch (error) {
    console.error("[vehicles/[id] PUT] API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
