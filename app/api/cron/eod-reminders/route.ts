export const runtime = "nodejs"

import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendPushToUser } from "@/lib/push/sendToUser"

function requireSecret(req: Request) {
  const secret = req.headers.get("x-scheduler-secret")
  return secret && secret === process.env.SUPABASE_SCHEDULER_SECRET
}

export async function POST(req: Request) {
  try {
    if (!requireSecret(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // ✅ Do not require JSON body (Supabase scheduler may send none)
    // If you still want it for debugging, parse it safely:
    let body: any = null
    try {
      body = await req.json()
    } catch {
      body = null
    }

    const admin = createAdminClient()

    const { data: subs, error } = await admin
      .from("push_subscriptions")
      .select("franchise_id, user_id")
      .eq("is_active", true)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!subs?.length) return NextResponse.json({ ok: true, totalSent: 0, note: "No active subscriptions" })

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

    return NextResponse.json({ ok: true, totalSent, failuresCount: failures.length, bodyReceived: body })
  } catch (e: any) {
    console.error("[eod-reminders] fatal:", e)
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 })
  }
}
