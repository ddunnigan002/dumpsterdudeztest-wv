import { type NextRequest, NextResponse } from "next/server"
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

export async function POST(request: NextRequest) {
  try {
    const ctx = await getActiveFranchiseContext()
    if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

    const { supabase, user, franchiseId } = ctx
    const body = await request.json()

    const vehicle_number = typeof body?.vehicle_number === "string" ? body.vehicle_number.trim() : ""
    const description = typeof body?.description === "string" ? body.description.trim() : ""
    const severity = typeof body?.severity === "string" ? body.severity : "medium"
    const status = typeof body?.status === "string" ? body.status : "open"
    const manager_override = typeof body?.manager_override === "boolean" ? body.manager_override : false

    // Optional fields
    const photos = Array.isArray(body?.photos) ? body.photos : undefined
    const reported_date =
      typeof body?.reported_date === "string" && body.reported_date
        ? body.reported_date
        : new Date().toISOString().split("T")[0]

    if (!vehicle_number || !description) {
      return NextResponse.json({ error: "Missing required fields: vehicle_number, description" }, { status: 400 })
    }

    // ✅ Find the vehicle INSIDE the active franchise only
    const { data: vehicle, error: vehicleError } = await supabase
      .from("vehicles")
      .select("id, franchise_id")
      .eq("franchise_id", franchiseId)
      .eq("vehicle_number", vehicle_number.toUpperCase())
      .single()

    if (vehicleError || !vehicle) {
      return NextResponse.json({ error: "Vehicle not found for this franchise" }, { status: 404 })
    }

    // NOTE: Your schema earlier shows vehicle_issues has no "notes" column,
    // so we do NOT write notes here. If you add notes later, we can include it.
    const insertPayload: Record<string, any> = {
      vehicle_id: vehicle.id,
      description,
      severity,
      status,
      reported_date,
      manager_override,
      updated_at: new Date().toISOString(),
      // driver_id isn't in your schema, but if you add it later this is where it would go
    }

    if (photos) insertPayload.photos = photos

    const { data, error } = await supabase.from("vehicle_issues").insert(insertPayload).select().single()

    if (error) {
      console.error("[vehicle-issues POST] Database error:", error)
      return NextResponse.json({ error: "Failed to save vehicle issue" }, { status: 500 })
    }

    return NextResponse.json({ success: true, issue: data })
  } catch (error) {
    console.error("[vehicle-issues POST] API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
