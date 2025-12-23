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

export async function GET(request: NextRequest) {
  try {
    const ctx = await getActiveFranchiseContext()
    if ("error" in ctx) return NextResponse.json({ error: ctx.error, settings: [] }, { status: ctx.status })

    const { supabase, franchiseId } = ctx
    const { searchParams } = new URL(request.url)
    const checklistType = searchParams.get("type") // weekly | monthly (or daily if you ever add)

    let query = supabase.from("checklist_settings").select("*").eq("franchise_id", franchiseId)

    if (checklistType) query = query.eq("checklist_type", checklistType)

    const { data, error } = await query

    if (error) throw error

    // Defaults if none exists yet
    if (!data || data.length === 0) {
      const defaultSettings =
        checklistType === "weekly"
          ? [{ checklist_type: "weekly", due_day_of_week: 4, franchise_id: franchiseId }]
          : checklistType === "monthly"
            ? [{ checklist_type: "monthly", due_day_of_month: 1, franchise_id: franchiseId }]
            : []

      return NextResponse.json({ settings: defaultSettings })
    }

    return NextResponse.json({ settings: data })
  } catch (error) {
    console.error("[checklist-settings GET] Error:", error)
    return NextResponse.json({ error: "Failed to fetch checklist settings", settings: [] }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const ctx = await getActiveFranchiseContext()
    if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

    const { supabase, franchiseId } = ctx
    const body = await request.json()

    const checklistType = (body?.checklistType || body?.checklist_type) as string | undefined
    const dueDayOfWeek = body?.dueDayOfWeek ?? body?.due_day_of_week ?? null
    const dueDayOfMonth = body?.dueDayOfMonth ?? body?.due_day_of_month ?? null

    if (!checklistType) {
      return NextResponse.json({ error: "Missing required field: checklistType" }, { status: 400 })
    }

    // Upsert settings row per franchise + checklist_type
    const payload: any = {
      franchise_id: franchiseId,
      checklist_type: checklistType,
      updated_at: new Date().toISOString(),
    }

    // Only set the relevant field based on checklist type
    if (checklistType === "weekly") payload.due_day_of_week = dueDayOfWeek
    if (checklistType === "monthly") payload.due_day_of_month = dueDayOfMonth

    const { data, error } = await supabase
      .from("checklist_settings")
      .upsert(payload, { onConflict: "franchise_id,checklist_type" })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, setting: data })
  } catch (error) {
    console.error("[checklist-settings PUT] Error:", error)
    return NextResponse.json({ error: "Failed to update checklist settings" }, { status: 500 })
  }
}
