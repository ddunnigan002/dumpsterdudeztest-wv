export const runtime = "nodejs"

import { NextResponse } from "next/server"
import webpush from "web-push"
import { createAdminClient } from "@/lib/supabase/admin"
import { getActiveFranchiseContext, isContextError, contextErrorResponse } from "@/lib/api/franchise-context"

export async function POST() {
  try {
    const ctx = await getActiveFranchiseContext()
    if (isContextError(ctx)) return contextErrorResponse(ctx)

    const admin = createAdminClient()

    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    const privateKey = process.env.VAPID_PRIVATE_KEY
    if (!publicKey || !privateKey) {
      return NextResponse.json(
        { error: "Missing VAPID env vars (NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY)." },
        { status: 500 },
      )
    }

    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || "mailto:admin@dumpsterdudez.com",
      publicKey,
      privateKey,
    )

    const { data: subs, error } = await admin
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("franchise_id", ctx.franchiseId)
      .eq("user_id", ctx.user.id)
      .eq("is_active", true)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!subs?.length) {
      return NextResponse.json({ error: "No active subscriptions saved for this user yet." }, { status: 400 })
    }

    let sent = 0
    const failures: any[] = []

    for (const s of subs) {
      try {
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
      } catch (e: any) {
        failures.push({
          endpoint: s.endpoint?.slice(0, 40) + "...",
          statusCode: e?.statusCode,
          message: e?.message || String(e),
          body: e?.body,
        })
      }
    }

    return NextResponse.json({ ok: true, sent, failures })
  } catch (e: any) {
    console.error("[push test] fatal:", e)
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 })
  }
}
