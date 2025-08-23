import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient()
    const logId = params.id

    // Get daily log details
    const { data: log, error } = await supabase
      .from("daily_logs")
      .select("*, users(full_name)")
      .eq("id", logId)
      .single()

    if (error || !log) {
      return NextResponse.json({ error: "Daily log not found" }, { status: 404 })
    }

    // Parse photos if stored as JSON
    let photos = []
    if (log.photos) {
      try {
        photos = typeof log.photos === "string" ? JSON.parse(log.photos) : log.photos
      } catch (e) {
        console.error("Error parsing photos:", e)
      }
    }

    return NextResponse.json({
      ...log,
      photos,
    })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
