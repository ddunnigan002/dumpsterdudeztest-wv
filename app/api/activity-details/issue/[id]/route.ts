import { type NextRequest, NextResponse } from "next/server"
import { getActiveFranchiseContext, isContextError, contextErrorResponse } from "@/lib/api/franchise-context"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getActiveFranchiseContext()
  if (isContextError(ctx)) {
    return contextErrorResponse(ctx)
  }

  try {
    const issueId = params.id

    const { data: issue, error } = await ctx.supabase
      .from("vehicle_issues")
      .select("*, users(full_name), vehicles!inner(franchise_id)")
      .eq("id", issueId)
      .eq("vehicles.franchise_id", ctx.franchiseId)
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
