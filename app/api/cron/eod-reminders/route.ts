export const runtime = "nodejs"

import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendPushToUser } from "@/lib/push/sendToUser"

const TZ = "America/New_York"

function requireSecret(req: Request) {
  const secret = req.headers.get("x-scheduler-secret")
  return !!secret && secret === process.env.SUPABASE_SCHEDULER_SECRET
}

// Returns { ymd: "YYYY-MM-DD", dow: 0..6 } in America/New_York
function getDatePartsInTZ(d: Date) {
  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
  const ymd = dtf.format(d) // en-CA => YYYY-MM-DD

  const dow = Number(
    new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short" })
      .format(d)
      // Map Sun/Mon/... to 0..6
      .replace("Sun", "0")
      .replace("Mon", "1")
      .replace("Tue", "2")
      .replace("Wed", "3")
      .replace("Thu", "4")
      .replace("Fri", "5")
      .replace("Sat", "6")
  )

  return { ymd, dow }
}

function getYesterdayYMDInTZ() {
  // Start from "now", but interpret day boundaries in TZ by formatting then subtracting 1 day in UTC-safe way
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
    const { data: vehicles, error: vehErr } = await admin
      .from("vehicles")
      .select("id, franchise_id, status")
      .neq("status", "inactive") // if you don’t have 'inactive', it’ll just not filter much
    if (vehErr) return NextResponse.json({ error: vehErr.message }, { status: 500 })
    if (!vehicles?.length) return NextResponse.json({ ok: true, targetDate, sentDrivers: 0, note: "No vehicles" })

    const vehicleIds = vehicles.map((v: any) => v.id)

    // 2) Get all checklists for targetDate
    const { data: checklists, error: clErr } = await admin
      .from("daily_checklists")
      .select("vehicle_id, driver_id, franchise_id, overall_status")
      .eq("checklist_date", targetDate)
      .in("vehicle_id", vehicleIds)

    if (clErr) return NextResponse.json({ error: clErr.message }, { status: 500 })

    // 3) Determine which vehicles are incomplete (missing OR pending)
    const checklistByVehicle = new Map<string, any>()
    for (const c of checklists ?? []) {
      checklistByVehicle.set(c.vehicle_id, c)
    }

    const pendingVehicleIds: string[] = []
    const missingVehicleIds: string[] = []

    for (const v of vehicles as any[]) {
      const c = checklistByVehicle.get(v.id)
      if (!c) {
        missingVehicleIds.push(v.id)
      } else if ((c.overall_status || "pending") === "pending") {
        pendingVehicleIds.push(v.id)
      }
    }

    // For vehicles with a pending checklist row, we can notify that row's driver directly
    const reminders = new Map<string, { franchiseId: string; driverId: string; vehicleIds: string[] }>()

    for (const vid of pendingVehicleIds) {
      const c = checklistByVehicle.get(vid)
      if (!c?.driver_id || !c?.franchise_id) continue
      const key = `${c.franchise_id}:${c.driver_id}`
      if (!reminders.has(key)) reminders.set(key, { franchiseId: c.franchise_id, driverId: c.driver_id, vehicleIds: [] })
      reminders.get(key)!.vehicleIds.push(vid)
    }

    // 4) For vehicles with NO checklist row, assign reminder to "most recent driver" for that vehicle
    // We do this by pulling prior checklists for those vehicles and picking the latest per vehicle.
    if (missingVehicleIds.length) {
      const { data: history, error: histErr } = await admin
        .from("daily_checklists")
        .select("vehicle_id, driver_id, franchise_id, checklist_date")
        .in("vehicle_id", missingVehicleIds)
        .lt("checklist_date", targetDate)
        .order("checklist_date", { ascending: false })

      if (histErr) return NextResponse.json({ error: histErr.message }, { status: 500 })

      const latestByVehicle = new Map<string, any>()
      for (const row of history ?? []) {
        if (!latestByVehicle.has(row.vehicle_id)) latestByVehicle.set(row.vehicle_id, row)
      }

      for (const vid of missingVehicleIds) {
        const last = latestByVehicle.get(vid)
        if (!last?.driver_id || !last?.franchise_id) continue
        const key = `${last.franchise_id}:${last.driver_id}`
        if (!reminders.has(key)) reminders.set(key, { franchiseId: last.franchise_id, driverId: last.driver_id, vehicleIds: [] })
        reminders.get(key)!.vehicleIds.push(vid)
      }
    }

    // 5) Send pushes (one per driver per franchise)
    let sentDrivers = 0
    let totalDeviceSends = 0
    const failures: any[] = []

    for (const { franchiseId, driverId, vehicleIds } of reminders.values()) {
      if (!vehicleIds.length) continue

      const count = vehicleIds.length
      const res = await sendPushToUser({
        franchiseId,
        userId: driverId,
        payload: {
          title: "Daily checklist overdue",
          body: `You have ${count} vehicle checklist${count === 1 ? "" : "s"} missing/pending for ${targetDate}. Tap to complete.`,
          data: { url: `/daily-checklists?date=${targetDate}` },
        },
      })

      if (res.sent > 0) {
        sentDrivers++
        totalDeviceSends += res.sent
      }
      if (res.failures?.length) {
        failures.push({ franchiseId, driverId, vehicleCount: count, failures: res.failures })
      }
    }

    return NextResponse.json({
      ok: true,
      targetDate,
      vehiclesTotal: vehicles.length,
      missingVehicles: missingVehicleIds.length,
      pendingVehicles: pendingVehicleIds.length,
      driversTargeted: reminders.size,
      sentDrivers,
      totalDeviceSends,
      failuresCount: failures.length,
      failures,
    })
  } catch (e: any) {
    console.error("[eod-reminders] fatal:", e)
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 })
  }
}
