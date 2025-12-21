import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { searchParams } = new URL(request.url)
    const checklistType = searchParams.get("type")

    let query = supabase
      .from("checklist_items")
      .select("*")
      .is("franchise_id", null)
      .eq("is_active", true)
      .order("display_order", { ascending: true })

    if (checklistType) {
      query = query.eq("checklist_type", checklistType)
    }

    const { data, error } = await query

    if (error) {
      console.error("[v0] Error fetching checklist items:", error)
      return NextResponse.json({ items: [] })
    }

    return NextResponse.json({ items: data || [] })
  } catch (error) {
    console.error("[v0] Error fetching checklist items:", error)
    return NextResponse.json({ items: [] })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const body = await request.json()
    const { checklistType, itemName, itemLabel, displayOrder } = body

    const { data, error } = await supabase
      .from("checklist_items")
      .insert({
        franchise_id: null,
        checklist_type: checklistType,
        item_name: itemName,
        item_label: itemLabel,
        display_order: displayOrder || 0,
        is_active: true,
      })
      .select()

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("[v0] Error creating checklist item:", error)
    return NextResponse.json({ error: "Failed to create item" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createClient()
    const { searchParams } = new URL(request.url)
    const itemId = searchParams.get("id")

    if (!itemId) {
      return NextResponse.json({ error: "Item ID required" }, { status: 400 })
    }

    const { error } = await supabase.from("checklist_items").update({ is_active: false }).eq("id", itemId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error deleting checklist item:", error)
    return NextResponse.json({ error: "Failed to delete item" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = createClient()
    const body = await request.json()
    const { itemId, itemName, itemLabel } = body

    if (!itemId) {
      return NextResponse.json({ error: "Item ID required" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("checklist_items")
      .update({
        item_name: itemName,
        item_label: itemLabel,
        updated_at: new Date().toISOString(),
      })
      .eq("id", itemId)
      .select()

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("[v0] Error updating checklist item:", error)
    return NextResponse.json({ error: "Failed to update item" }, { status: 500 })
  }
}
