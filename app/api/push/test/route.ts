import { NextResponse } from "next/server"
import webpush from "web-push"
import { createAdminClient } from "@/lib/supabase/admin"
import { getActiveFranchiseContext, isContextError, contextErrorResponse } from "@/lib/api/franchise-context"

export async function POST() {
  const ctx = await getActiveFranchiseContext()
  if (isContextError(ctx)) return contextErrorResponse(ctx)

  const admin = createAdminClient()

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@dumpsterdudez.com",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  )

  const { data: subs, error } = await admin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("franchise_id", ctx.franchiseId)
    .eq("user_id", ctx.user.id)
    .eq("is_active", true)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!subs?.length) return NextResponse.json({ error: "No active subscriptions saved for this user yet." }, { status: 400 })

  let sent = 0
  for (const s of subs) {
    await webpush.sendNotification(
      {
        endpoint: s.endpoint,
        keys: { p256dh: s.p256dh, auth: s.auth },
      } as any,
      JSON.stringify({
        title: "Test notification ✅",
        body: "If you can see this, push is working.",
        data: { url: "/" },
      }),
    )
    sent++
  }

  return NextResponse.json({ ok: true, sent })
}
