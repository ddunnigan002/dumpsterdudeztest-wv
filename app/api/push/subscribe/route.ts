import { NextRequest, NextResponse } from "next/server"
import { getActiveFranchiseContext, isContextError, contextErrorResponse } from "@/lib/api/franchise-context"

export async function POST(request: NextRequest) {
  const ctx = await getActiveFranchiseContext()
  if (isContextError(ctx)) return contextErrorResponse(ctx)

  const body = await request.json()
  const sub = body?.subscription

  const endpoint = sub?.endpoint
  const p256dh = sub?.keys?.p256dh
  const auth = sub?.keys?.auth

  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "Invalid subscription payload" }, { status: 400 })
  }

  const ua = request.headers.get("user-agent") || null

  const { error } = await ctx.supabase.from("push_subscriptions").upsert(
    {
      user_id: ctx.user.id,
      franchise_id: ctx.franchiseId,
      endpoint,
      p256dh,
      auth,
      user_agent: ua,
      last_seen_at: new Date().toISOString(),
      is_active: true,
    },
    { onConflict: "user_id,endpoint" },
  )

  if (error) {
    console.error("[push subscribe] error:", error)
    return NextResponse.json({ error: "Failed to save subscription" }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
