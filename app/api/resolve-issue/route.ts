import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { issueId, resolvedBy, resolvedDate } = await request.json()

    // Update the issue status to resolved
    const { error: updateError } = await supabase
      .from("vehicle_issues")
      .update({
        status: "resolved",
        resolved_date: resolvedDate,
        resolved_by: resolvedBy,
      })
      .eq("id", issueId)

    if (updateError) {
      console.error("Error updating issue status:", updateError)
      return NextResponse.json({ error: "Failed to resolve issue" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error resolving issue:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
