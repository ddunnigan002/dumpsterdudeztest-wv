import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient()
    const checklistId = params.id

    // Get checklist details with items
    const { data: checklist, error } = await supabase
      .from("daily_checklists")
      .select("*, users(full_name)")
      .eq("id", checklistId)
      .single()

    if (error || !checklist) {
      return NextResponse.json({ error: "Checklist not found" }, { status: 404 })
    }

    // Parse checklist items if stored as JSON
    let checklist_items = []
    if (checklist.checklist_items) {
      try {
        checklist_items =
          typeof checklist.checklist_items === "string"
            ? JSON.parse(checklist.checklist_items)
            : checklist.checklist_items
      } catch (e) {
        console.error("Error parsing checklist items:", e)
      }
    }

    // Parse photos if stored as JSON
    let photos = []
    if (checklist.photos) {
      try {
        photos = typeof checklist.photos === "string" ? JSON.parse(checklist.photos) : checklist.photos
      } catch (e) {
        console.error("Error parsing photos:", e)
      }
    }

    return NextResponse.json({
      ...checklist,
      checklist_items,
      photos,
    })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
