import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { searchParams } = new URL(request.url)
    const checklistType = searchParams.get("type")

    let query = supabase.from("checklist_settings").select("*").is("franchise_id", null)

    if (checklistType) {
      query = query.eq("checklist_type", checklistType)
    }

    const { data, error } = await query

    if (error) {
      const defaultSettings =
        checklistType === "weekly"
          ? [{ checklist_type: "weekly", due_day_of_week: 4 }]
          : checklistType === "monthly"
            ? [{ checklist_type: "monthly", due_day_of_month: 1 }]
            : []

      return NextResponse.json({ settings: defaultSettings })
    }

    if (!data || data.length === 0) {
      const defaultSettings =
        checklistType === "weekly"
          ? [{ checklist_type: "weekly", due_day_of_week: 4 }]
          : checklistType === "monthly"
            ? [{ checklist_type: "monthly", due_day_of_month: 1 }]
            : []

      return NextResponse.json({ settings: defaultSettings })
    }

    return NextResponse.json({ settings: data || [] })
  } catch (error) {
    console.error("[v0] Error fetching checklist settings:", error)
    const { searchParams } = new URL(request.url)
    const checklistType = searchParams.get("type")
    const defaultSettings =
      checklistType === "weekly"
        ? [{ checklist_type: "weekly", due_day_of_week: 4 }]
        : checklistType === "monthly"
          ? [{ checklist_type: "monthly", due_day_of_month: 1 }]
          : []

    return NextResponse.json({ settings: defaultSettings })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = createClient()
    const body = await request.json()
    const { checklistType, dueDayOfWeek, dueDayOfMonth } = body

    const { data, error } = await supabase
      .from("checklist_settings")
      .upsert(
        {
          franchise_id: null,
          checklist_type: checklistType,
          due_day_of_week: dueDayOfWeek,
          due_day_of_month: dueDayOfMonth,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "franchise_id,checklist_type",
        },
      )
      .select()

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("[v0] Error updating checklist settings:", error)
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 })
  }
}
