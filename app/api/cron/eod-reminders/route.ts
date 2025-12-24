export const runtime = "nodejs"

import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendPushToUser } from "@/lib/push/sendToUser"

function requireSecret(req: Request) {
  const secret = req.headers.get("x-scheduler-secret")
  if (!secret || secret !== process.env.SUPABASE_SCHEDULER_SECRET) {
    return false
  }
  return true
}

export async function POST(req: Request) {
  try {
    if (!requireSecret(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const admin = createAdminClient()

    // ---- TODO: Replace this logic with your real “yesterday EOD incomplete” query ----
    // For now, we’ll just target *all users who have active subscriptions*,
    // so we can verify the scheduled job works end-to-end.
    const { data: subs, error } = await admin
      .from("push_subscriptions")
      .select("franchise_id, user_id")
      .eq("is_active", true)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!subs?.length) return NextResponse.json({ ok: true, sent: 0, note: "No active subscriptions" })

    // Deduplicate user+franchise pairs
    const unique = new Map<string, { franchise_id: string; user_id: string }>()
    for (const s of subs) unique.set(`${s.franchise_id}:${s.user_id}`, s)

    let totalSent = 0
    const failures: any[] = []

    for (const { franchise_id, user_id } of unique.values()) {
      const res = await sendPushToUser({
        franchiseId: franchise_id,
        userId: user_id,
        payload: {
          title: "Checklist reminder",
          body: "Daily reminder test (scheduled). Tap to open.",
          data: { url: "/" },
        },
      })

      totalSent += res.sent
      if (res.failures?.length) failures.push({ franchise_id, user_id, failures: res.failures })
    }

    return NextResponse.json({ ok: true, totalSent, failuresCount: failures.length, failures })
  } catch (e: any) {
    console.error("[eod-reminders] fatal:", e)
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 })
  }
}
