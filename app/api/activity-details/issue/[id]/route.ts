import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient()
    const issueId = params.id

    // Get issue details
    const { data: issue, error } = await supabase
      .from("vehicle_issues")
      .select("*, users(full_name)")
      .eq("id", issueId)
      .single()

    if (error || !issue) {
      return NextResponse.json({ error: "Issue not found" }, { status: 404 })
    }

    // Parse photos if stored as JSON
    let photos = []
    if (issue.photos) {
      try {
        photos = typeof issue.photos === "string" ? JSON.parse(issue.photos) : issue.photos
      } catch (e) {
        console.error("Error parsing photos:", e)
      }
    }

    return NextResponse.json({
      ...issue,
      photos,
    })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
