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
    .select("franchise_id, role, is_active")
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
    if ("error" in ctx) return NextResponse.json({ error: ctx.error, items: [] }, { status: ctx.status })

    const { supabase, franchiseId } = ctx
    const { searchParams } = new URL(request.url)
    const checklistType = searchParams.get("type")

    if (!checklistType) {
      return NextResponse.json({ error: "Missing query param: type", items: [] }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("checklist_items")
      .select("*")
      .eq("franchise_id", franchiseId)
      .eq("checklist_type", checklistType)
      .eq("is_active", true)
      .order("display_order", { ascending: true })

    if (error) throw error

    return NextResponse.json({ items: data || [] })
  } catch (error) {
    console.error("[checklist-items GET] Error:", error)
    return NextResponse.json({ error: "Failed to fetch checklist items", items: [] }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await getActiveFranchiseContext()
    if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

    const { supabase, franchiseId } = ctx

    const body = await request.json()
    const checklistType = (body?.checklistType || body?.checklist_type) as string | undefined
    const itemName = (body?.itemName || body?.item_name) as string | undefined
    const itemLabel = (body?.itemLabel || body?.item_label) as string | undefined
    const displayOrder = Number.isFinite(body?.displayOrder) ? Number(body.displayOrder) : undefined

    if (!checklistType || !itemName || !itemLabel) {
      return NextResponse.json(
        { error: "Missing required fields: checklistType, itemName, itemLabel" },
        { status: 400 }
      )
    }

    // If display order not supplied, append to end
    let finalOrder = displayOrder
    if (finalOrder === undefined) {
      const { data: maxRow } = await supabase
        .from("checklist_items")
        .select("display_order")
        .eq("franchise_id", franchiseId)
        .eq("checklist_type", checklistType)
        .order("display_order", { ascending: false })
        .limit(1)
        .maybeSingle()

      finalOrder = (maxRow?.display_order ?? 0) + 1
    }

    const { data, error } = await supabase
      .from("checklist_items")
      .insert({
        franchise_id: franchiseId,
        checklist_type: checklistType,
        item_name: itemName,
        item_label: itemLabel,
        display_order: finalOrder,
        is_active: true,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, item: data })
  } catch (error) {
    console.error("[checklist-items POST] Error:", error)
    return NextResponse.json({ error: "Failed to create checklist item" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const ctx = await getActiveFranchiseContext()
    if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

    const { supabase, franchiseId } = ctx

    const body = await request.json()
    const itemId = body?.itemId as string | undefined

    if (!itemId) return NextResponse.json({ error: "Item ID required" }, { status: 400 })

    // IMPORTANT: Only allow updating items in your franchise (extra safety)
    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }

    if (typeof body?.itemLabel === "string") updatePayload.item_label = body.itemLabel
    if (typeof body?.itemName === "string") updatePayload.item_name = body.itemName
    if (Number.isFinite(body?.displayOrder)) updatePayload.display_order = Number(body.displayOrder)
    if (typeof body?.isActive === "boolean") updatePayload.is_active = body.isActive

    const { data, error } = await supabase
      .from("checklist_items")
      .update(updatePayload)
      .eq("id", itemId)
      .eq("franchise_id", franchiseId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, item: data })
  } catch (error) {
    console.error("[checklist-items PUT] Error:", error)
    return NextResponse.json({ error: "Failed to update item" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const ctx = await getActiveFranchiseContext()
    if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

    const { supabase, franchiseId } = ctx

    const { searchParams } = new URL(request.url)
    const itemId = searchParams.get("id")

    if (!itemId) return NextResponse.json({ error: "Item ID required" }, { status: 400 })

    // Soft delete
    const { error } = await supabase
      .from("checklist_items")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", itemId)
      .eq("franchise_id", franchiseId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[checklist-items DELETE] Error:", error)
    return NextResponse.json({ error: "Failed to delete item" }, { status: 500 })
  }
}
