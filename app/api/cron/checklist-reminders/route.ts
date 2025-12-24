export const runtime = "nodejs"
export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import webpush from "web-push"
import { createAdminClient } from "@/lib/supabase/admin"

function isCronAuthorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const auth = req.headers.get("authorization") || ""
  return auth === `Bearer ${secret}`
}

// YYYY-MM-DD for a given timezone
function todayInTz(timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())
}

// "HH:MM" for a given timezone
function hourMinuteInTz(timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date())

  const hh = parts.find((p) => p.type === "hour")?.value ?? "00"
  const mm = parts.find((p) => p.type === "minute")?.value ?? "00"
  return `${hh}:${mm}`
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const forcedRun = url.searchParams.get("run") // "pre_trip" | "end_day" | null
  
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const admin = createAdminClient()

  // webpush setup
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  if (!publicKey || !privateKey) {
    return NextResponse.json({ error: "Missing VAPID keys" }, { status: 500 })
  }

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@dumpsterdudez.com",
    publicKey,
    privateKey,
  )

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

    const url = new URL(req.url)
    const forcedRun = url.searchParams.get("run")

    const runType =
      forcedRun === "pre_trip"
        ? "pre_trip_9am"
        : forcedRun === "end_day"
        ? "end_day_6pm"
        : null

    if (!runType) continue

    // Dedupe
    const { data: already } = await admin
      .from("notification_runs")
      .select("id")
      .eq("franchise_id", franchiseId)
      .eq("run_date", runDate)
      .eq("run_type", runType)
      .maybeSingle()

    if (already?.id) continue

    // Active vehicles
    const { data: vehicles, error: vErr } = await admin
      .from("vehicles")
      .select("id, vehicle_number")
      .eq("franchise_id", franchiseId)
      .eq("status", "active")

    if (vErr) {
      results.push({ franchiseName, runType, error: vErr.message })
      continue
    }

    const vehicleIds = (vehicles || []).map((v: any) => v.id)
    if (!vehicleIds.length) {
      await admin.from("notification_runs").insert({ franchise_id: franchiseId, run_date: runDate, run_type: runType })
      results.push({ franchiseName, runType, sent: 0, reason: "no vehicles" })
      continue
    }

    // Option A: checklist is "done for the day" if a row exists
    const { data: todays, error: cErr } = await admin
      .from("daily_checklists")
      .select("vehicle_id")
      .in("vehicle_id", vehicleIds)
      .eq("checklist_date", runDate)

    if (cErr) {
      results.push({ franchiseName, runType, error: cErr.message })
      continue
    }

    const completed = new Set((todays || []).map((r: any) => r.vehicle_id))
    const missing = (vehicles || []).filter((v: any) => !completed.has(v.id))

    if (!missing.length) {
      await admin.from("notification_runs").insert({ franchise_id: franchiseId, run_date: runDate, run_type: runType })
      results.push({ franchiseName, runType, sent: 0, reason: "none missing" })
      continue
    }

    // Recipients: assigned drivers for missing vehicles + managers/owners
    const missingVehicleIds = missing.map((v: any) => v.id)

    const { data: assignees } = await admin
      .from("vehicle_assignments")
      .select("user_id")
      .eq("franchise_id", franchiseId)
      .eq("is_active", true)
      .in("vehicle_id", missingVehicleIds)

    const { data: managers } = await admin
      .from("franchise_memberships")
      .select("user_id")
      .eq("franchise_id", franchiseId)
      .eq("is_active", true)
      .in("role", ["owner", "manager", "super_admin"])

    const userIds = new Set<string>()
    ;(assignees || []).forEach((r: any) => userIds.add(r.user_id))
    ;(managers || []).forEach((r: any) => userIds.add(r.user_id))

    // Subscriptions for recipients
    const { data: subs } = await admin
      .from("push_subscriptions")
      .select("user_id, endpoint, p256dh, auth")
      .eq("franchise_id", franchiseId)
      .eq("is_active", true)
      .in("user_id", Array.from(userIds))

    const title = runType === "pre_trip_9am" ? "Pre-trip checklist overdue" : "End-of-day checklist overdue"
    const body =
      runType === "pre_trip_9am"
        ? `Missing checklist for: ${missing.map((v: any) => v.vehicle_number).join(", ")}`
        : `Missing checklist for: ${missing.map((v: any) => v.vehicle_number).join(", ")}`

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

    // Mark dedupe
    await admin.from("notification_runs").insert({ franchise_id: franchiseId, run_date: runDate, run_type: runType })

    results.push({ franchiseName, tz, runType, missing: missing.length, recipients: userIds.size, subs: (subs || []).length, sent })
  }

  return NextResponse.json({ ok: true, results })

}
