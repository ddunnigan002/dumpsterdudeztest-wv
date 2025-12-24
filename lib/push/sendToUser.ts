export const runtime = "nodejs"

import webpush from "web-push"
import { createAdminClient } from "@/lib/supabase/admin"

type PushPayload = {
  title: string
  body: string
  data?: { url?: string }
  url?: string
}

function ensureWebPushConfigured() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@dumpsterdudez.com"

  if (!publicKey || !privateKey) {
    throw new Error("Missing VAPID env vars (NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY).")
  }

  webpush.setVapidDetails(subject, publicKey, privateKey)
}

export async function sendPushToUser(opts: {
  franchiseId: string
  userId: string
  payload: PushPayload
}) {
  ensureWebPushConfigured()

  const admin = createAdminClient()

  const { data: subs, error } = await admin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("franchise_id", opts.franchiseId)
    .eq("user_id", opts.userId)
    .eq("is_active", true)

  if (error) throw new Error(error.message)
  if (!subs?.length) return { sent: 0, failures: [{ message: "No active subscriptions" }] }

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
          title: opts.payload.title,
          body: opts.payload.body,
          url: opts.payload.url || opts.payload.data?.url || "/",
          data: { url: opts.payload.url || opts.payload.data?.url || "/" },
        })
      )
      sent++
    } catch (e: any) {
      // Auto-deactivate dead subscriptions
      if (e?.statusCode === 410 || e?.statusCode === 404) {
        await admin.from("push_subscriptions").update({ is_active: false }).eq("endpoint", s.endpoint)
      }

      failures.push({
        endpoint: s.endpoint?.slice(0, 40) + "...",
        statusCode: e?.statusCode,
        message: e?.message || String(e),
        body: e?.body,
      })
    }
  }

  return { sent, failures }
}
