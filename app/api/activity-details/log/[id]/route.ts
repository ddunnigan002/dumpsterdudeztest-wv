import { type NextRequest, NextResponse } from "next/server"
import { getActiveFranchiseContext, isContextError, contextErrorResponse } from "@/lib/api/franchise-context"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getActiveFranchiseContext()
  if (isContextError(ctx)) {
    return contextErrorResponse(ctx)
  }

  try {
    const logId = params.id

    const { data: log, error } = await ctx.supabase
      .from("daily_logs")
      .select("*, users(full_name), vehicles!inner(franchise_id)")
      .eq("id", logId)
      .eq("vehicles.franchise_id", ctx.franchiseId)
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
