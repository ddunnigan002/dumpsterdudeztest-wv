// app/api/cron/eod-reminders/route.ts
export const runtime = "nodejs"

import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendPushToUser } from "@/lib/push/sendToUser"

const TZ = "America/New_York"

function requireSecret(req: Request) {
  const headerSecret = req.headers.get("x-scheduler-secret")

  // Allow Vercel Cron (no header, but internal request)
  const vercelCron = req.headers.get("x-vercel-cron") === "1"

  if (vercelCron) return true

  return !!headerSecret && headerSecret === process.env.SUPABASE_SCHEDULER_SECRET
}

// Returns { ymd: "YYYY-MM-DD", dow: 0..6 } in America/New_York
function getDatePartsInTZ(d: Date) {
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d) // en-CA => YYYY-MM-DD

  const wd = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short" }).format(d)
  const dowMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  const dow = dowMap[wd] ?? 0

  return { ymd, dow }
}

function getYesterdayYMDInTZ() {
  const now = new Date()
  const { ymd: todayYMD } = getDatePartsInTZ(now)

  // Convert YYYY-MM-DD to Date at UTC midnight, subtract 1 day, then format back in TZ
  const [y, m, d] = todayYMD.split("-").map(Number)
  const utcMidnight = new Date(Date.UTC(y, m - 1, d))
  const yesterdayUtc = new Date(utcMidnight.getTime() - 24 * 60 * 60 * 1000)

  return getDatePartsInTZ(yesterdayUtc).ymd
}

export async function POST(req: Request) {
  try {
    if (!requireSecret(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Quiet hours rule: do not send on Sundays (ET)
    const now = new Date()
    const { dow } = getDatePartsInTZ(now)
    if (dow === 0) {
      return NextResponse.json({ ok: true, skipped: true, reason: "Sunday quiet hours (ET)" })
    }

    const targetDate = getYesterdayYMDInTZ() // "YYYY-MM-DD" for yesterday in ET
    const admin = createAdminClient()

    // 1) Load vehicles (we assume vehicles table exists with id, franchise_id, status)
    // If you don't have a status field or "inactive" doesn't exist, this still won't break your app.
    const { data: vehicles, error: vehErr } = await admin
      .from("vehicles")
      .select("id, franchise_id, status")

    if (vehErr) return NextResponse.json({ error: vehErr.message }, { status: 500 })
    if (!vehicles?.length) {
      return NextResponse.json({
        ok: true,
        targetDate,
        vehiclesTotal: 0,
        foundChecklists: 0,
        missingVehiclesCount: 0,
        pendingVehiclesCount: 0,
        driversTargeted: 0,
        sentDrivers: 0,
        totalDeviceSends: 0,
        failuresCount: 0,
        failures: [],
        note: "No vehicles found",
      })
    }

    // Optional filter: ignore inactive vehicles if status exists
    const activeVehicles = (vehicles as any[]).filter((v) => (v?.status ? v.status !== "inactive" : true))
    const vehicleIds = activeVehicles.map((v) => v.id)

    // 2) Get all checklists for targetDate
    const { data: checklists, error: clErr } = await admin
      .from("daily_checklists")
      .select("vehicle_id, driver_id, franchise_id, overall_status")
      .eq("checklist_date", targetDate)
      .in("vehicle_id", vehicleIds)

    if (clErr) return NextResponse.json({ error: clErr.message }, { status: 500 })

    // 3) Build vehicle->checklist map
    const checklistByVehicle = new Map<string, any>()
    for (const c of checklists ?? []) checklistByVehicle.set(c.vehicle_id, c)

    // 4) Determine which vehicles are incomplete (missing OR pending)
    const missingVehicleIds: string[] = []
    const pendingVehicleIds: string[] = []

    for (const v of activeVehicles) {
      const c = checklistByVehicle.get(v.id)
      if (!c) missingVehicleIds.push(v.id)
      else if ((c.overall_status || "pending") === "pending") pendingVehicleIds.push(v.id)
    }

    // 5) Build reminder targets (keyed by franchiseId:userId) with vehicle lists
    const reminders = new Map<string, { franchiseId: string; userId: string; vehicleIds: string[] }>()

    // 5A) Pending rows: notify that row's driver
    for (const vid of pendingVehicleIds) {
      const c = checklistByVehicle.get(vid)
      if (!c?.driver_id || !c?.franchise_id) continue
      const key = `${c.franchise_id}:${c.driver_id}`
      if (!reminders.has(key)) reminders.set(key, { franchiseId: c.franchise_id, userId: c.driver_id, vehicleIds: [] })
      reminders.get(key)!.vehicleIds.push(vid)
    }

    // 5B) Missing rows: notify ALL active push subscribers in that franchise (guarantees someone gets it)
    const { data: activeSubs, error: subErr } = await admin
      .from("push_subscriptions")
      .select("franchise_id, user_id")
      .eq("is_active", true)

    if (subErr) return NextResponse.json({ error: subErr.message }, { status: 500 })

    const activeUsersByFranchise = new Map<string, Set<string>>()
    for (const s of activeSubs ?? []) {
      if (!activeUsersByFranchise.has(s.franchise_id)) activeUsersByFranchise.set(s.franchise_id, new Set())
      activeUsersByFranchise.get(s.franchise_id)!.add(s.user_id)
    }

    const vehicleById = new Map<string, any>()
    for (const v of activeVehicles) vehicleById.set(v.id, v)

    for (const vid of missingVehicleIds) {
      const v = vehicleById.get(vid)
      if (!v?.franchise_id) continue

      const users = activeUsersByFranchise.get(v.franchise_id)
      if (!users || users.size === 0) continue

      for (const uid of users) {
        const key = `${v.franchise_id}:${uid}`
        if (!reminders.has(key)) reminders.set(key, { franchiseId: v.franchise_id, userId: uid, vehicleIds: [] })
        reminders.get(key)!.vehicleIds.push(vid)
      }
    }

    // 6) Send pushes (one per user per franchise)
    let sentUsers = 0
    let totalDeviceSends = 0
    const failures: any[] = []

    for (const { franchiseId, userId, vehicleIds } of reminders.values()) {
      if (!vehicleIds.length) continue

      const count = vehicleIds.length

      const res = await sendPushToUser({
        franchiseId,
        userId,
        payload: {
          title: "Daily checklist overdue",
          body: `You have ${count} vehicle checklist${count === 1 ? "" : "s"} missing/pending for ${targetDate}. Tap to complete.`,
          data: { url: `/daily-checklists?date=${targetDate}` },
        },
      })

      if (res.sent > 0) {
        sentUsers++
        totalDeviceSends += res.sent
      }
      if (res.failures?.length) failures.push({ franchiseId, userId, vehicleCount: count, failures: res.failures })
    }

    // Return debug-friendly response
    return NextResponse.json({
      ok: true,
      targetDate,
      vehiclesTotal: activeVehicles.length,
      foundChecklists: (checklists ?? []).length,
      missingVehiclesCount: missingVehicleIds.length,
      pendingVehiclesCount: pendingVehicleIds.length,
      driversOrUsersTargeted: reminders.size,
      sentUsers,
      totalDeviceSends,
      failuresCount: failures.length,
      failures,
      // helpful during rollout; remove later if you want
      missingVehicleIds,
      pendingVehicleIds,
    })
  } catch (e: any) {
    console.error("[eod-reminders] fatal:", e)
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 })
  }
}
