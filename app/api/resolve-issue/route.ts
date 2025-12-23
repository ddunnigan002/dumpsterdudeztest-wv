import { type NextRequest, NextResponse } from "next/server"
import { getActiveFranchiseContext, isContextError, contextErrorResponse } from "@/lib/api/franchise-context"

export async function POST(request: NextRequest) {
  const ctx = await getActiveFranchiseContext()
  if (isContextError(ctx)) {
    return contextErrorResponse(ctx)
  }

  try {
    const { issueId, resolvedBy, resolvedDate } = await request.json()

    const { data: issue } = await ctx.supabase
      .from("vehicle_issues")
      .select("id, vehicles!inner(franchise_id)")
      .eq("id", issueId)
      .eq("vehicles.franchise_id", ctx.franchiseId)
      .single()

    if (!issue) {
      return NextResponse.json({ error: "Issue not found in your franchise" }, { status: 404 })
    }

    const { error: updateError } = await ctx.supabase
      .from("vehicle_issues")
      .update({
        status: "resolved",
        resolved_date: resolvedDate,
        resolved_by: ctx.user.id,
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
