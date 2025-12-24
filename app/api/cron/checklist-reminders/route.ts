export const runtime = "nodejs"
export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import webpush from "web-push"
import { createAdminClient } from "@/lib/supabase/admin"

type RunType = "pre_trip_9am" | "end_day_6pm"

function isCronAuthorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const auth = req.headers.get("authorization") || ""
  return auth === `Bearer ${secret}`
}

// format YYYY-MM-DD in a given timeZone
function todayInTz(timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())
}

function runTypeFromForcedRun(forcedRun: string | null): RunType | null {
  if (forcedRun === "pre_trip") return "pre_trip_9am"
  if (forcedRun === "end_day") return "end_day_6pm"
  return null
}

export async function GET(req: NextRequest) {
  try {
    // Auth first
    if (!isCronAuthorized(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const url = new URL(req.url)
    const forcedRun = url.searchParams.get("run") // "pre_trip" | "end_day" | null
    const runType = runTypeFromForcedRun(forcedRun)

    if (!runType) {
      return NextResponse.json(
        { error: "Missing or invalid ?run=. Use ?run=pre_trip or ?run=end_day" },
        { status: 400 },
      )
    }

    const admin = createAdminClient()

    // webpush setup
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    const privateKey = process.env.VAPID_PRIVATE_KEY
    const subject = process.env.VAPID_SUBJECT || "mailto:admin@dumpsterdudez.com"

    if (!publicKey || !privateKey) {
      return NextResponse.json({ error: "Missing VAPID keys" }, { status: 500 })
    }

    webpush.setVapidDetails(subject, publicKey, privateKey)

    // Load franchises + timezone
    const { data: franchises, error: fErr } = await admin
      .from("franchises")
      .select("id, name, timezone")

    if (fErr) return NextResponse.json({ error: fErr.message }, { status: 500 })

    const results: any[] = []

    for (const f of franchises || []) {
      const franchiseId = f.id as string
      const franchiseName = (f.name as string) || franchiseId
      const tz = (f.timezone as string) || "America/New_York"
      const runDate = todayInTz(tz)

      // Dedupe per franchise/date/type
      const { data: already, error: dErr } = await admin
        .from("notification_runs")
        .select("id")
        .eq("franchise_id", franchiseId)
        .eq("run_date", runDate)
        .eq("run_type", runType)
        .maybeSingle()

      if (dErr) {
        results.push({ franchiseName, tz, runType, error: dErr.message })
        continue
      }
      if (already?.id) {
        results.push({ franchiseName, tz, runType, sent: 0, reason: "deduped" })
        continue
      }

      // Active vehicles
      const { data: vehicles, error: vErr } = await admin
        .from("vehicles")
        .select("id, vehicle_number")
        .eq("franchise_id", franchiseId)
        .eq("status", "active")

      if (vErr) {
        results.push({ franchiseName, tz, runType, error: vErr.message })
        continue
      }

      const vehicleIds = (vehicles || []).map((v: any) => v.id)
      if (!vehicleIds.length) {
        await admin.from("notification_runs").insert({ franchise_id: franchiseId, run_date: runDate, run_type: runType })
        results.push({ franchiseName, tz, runType, sent: 0, reason: "no vehicles" })
        continue
      }

      // Check which vehicles have a checklist row for today
      const { data: todays, error: cErr } = await admin
        .from("daily_checklists")
        .select("vehicle_id")
        .in("vehicle_id", vehicleIds)
        .eq("checklist_date", runDate)

      if (cErr) {
        results.push({ franchiseName, tz, runType, error: cErr.message })
        continue
      }

      const completed = new Set((todays || []).map((r: any) => r.vehicle_id))
      const missing = (vehicles || []).filter((v: any) => !completed.has(v.id))

      if (!missing.length) {
        await admin.from("notification_runs").insert({ franchise_id: franchiseId, run_date: runDate, run_type: runType })
        results.push({ franchiseName, tz, runType, sent: 0, reason: "none missing" })
        continue
      }

      const missingVehicleIds = missing.map((v: any) => v.id)

      // Assigned drivers
      const { data: assignees } = await admin
        .from("vehicle_assignments")
        .select("user_id")
        .eq("franchise_id", franchiseId)
        .eq("is_active", true)
        .in("vehicle_id", missingVehicleIds)

      // Managers/owners
      const { data: managers } = await admin
        .from("franchise_memberships")
        .select("user_id")
        .eq("franchise_id", franchiseId)
        .eq("is_active", true)
        .in("role", ["owner", "manager", "super_admin"])

      const userIds = new Set<string>()
      ;(assignees || []).forEach((r: any) => userIds.add(r.user_id))
      ;(managers || []).forEach((r: any) => userIds.add(r.user_id))

      if (userIds.size === 0) {
        await admin.from("notification_runs").insert({ franchise_id: franchiseId, run_date: runDate, run_type: runType })
        results.push({ franchiseName, tz, runType, missing: missing.length, sent: 0, reason: "no recipients" })
        continue
      }

      // Subscriptions for recipients
      const { data: subs, error: sErr } = await admin
        .from("push_subscriptions")
        .select("user_id, endpoint, p256dh, auth")
        .eq("franchise_id", franchiseId)
        .eq("is_active", true)
        .in("user_id", Array.from(userIds))

      if (sErr) {
        results.push({ franchiseName, tz, runType, error: sErr.message })
        continue
      }

      const title = runType === "pre_trip_9am" ? "Pre-trip checklist overdue" : "End-of-day checklist overdue"
      const body = `Missing checklist for: ${missing.map((v: any) => v.vehicle_number).join(", ")}`

      let sent = 0
      for (const s of subs || []) {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } } as any,
            JSON.stringify({ title, body, data: { url: "/manager" } }),
          )
          sent++
        } catch (e: any) {
          // Deactivate expired subscriptions
          if (e?.statusCode === 404 || e?.statusCode === 410) {
            await admin
              .from("push_subscriptions")
              .update({ is_active: false })
              .eq("endpoint", s.endpoint)
              .eq("user_id", s.user_id)
          }
        }
      }

      // Mark dedupe (even if sent=0, to prevent spam)
      await admin.from("notification_runs").insert({ franchise_id: franchiseId, run_date: runDate, run_type: runType })

      results.push({
        franchiseName,
        tz,
        runType,
        runDate,
        missing: missing.length,
        recipients: userIds.size,
        subs: (subs || []).length,
        sent,
      })
    }

    return NextResponse.json({ ok: true, runType, results })
  } catch (e: any) {
    console.error("[cron] fatal:", e)
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 })
  }
}
