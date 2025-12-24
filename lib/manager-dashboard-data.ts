import type { SupabaseClient } from "@supabase/supabase-js"
import type { ActionItem, ComplianceDay, MaintenanceItem, ManagerDashboardData, TruckStatus } from "./manager-dashboard-data"

type Args = {
  supabase: SupabaseClient
  franchiseId: string
}

/**
 * Live manager dashboard data using your actual tables:
 * - vehicles
 * - vehicle_assignments (filters to manager's trucks)
 * - vehicle_issues
 * - daily_logs (log_date)
 * - weekly_checklists / monthly_checklists / daily_checklists
 * - scheduled_maintenance (forecast)
 *
 * NOTE: The only thing you may need to tweak is ISSUE_TEXT_COL depending on your vehicle_issues columns.
 */
export async function getManagerDashboardDataLive({ supabase, franchiseId }: Args): Promise<ManagerDashboardData> {
  const TABLES = {
    vehicles: "vehicles",
    vehicleAssignments: "vehicle_assignments",
    vehicleIssues: "vehicle_issues",
    dailyLogs: "daily_logs",
    dailyChecklist: "daily_checklists",
    weeklyChecklist: "weekly_checklists",
    monthlyChecklist: "monthly_checklists",
    scheduledMaintenance: "scheduled_maintenance",
  } as const

  // ---------------------------
  // Column assumptions (adjust only if errors tell you to)
  // ---------------------------

  // vehicles: must have id, franchise_id, vehicle_number, status
  const VEHICLE_COLS = "id, franchise_id, vehicle_number, status"

  // vehicle_assignments: must have vehicle_id and either user_id or manager_id
  // We'll try user_id first; if your column is manager_id, change ASSIGNMENT_USER_COL.
  const ASSIGNMENT_COLS = "vehicle_id, user_id"
  const ASSIGNMENT_USER_COL: "user_id" | "manager_id" = "user_id" // change to "manager_id" if needed

  // vehicle_issues: must have id, vehicle_id, status, created_at, and a text-ish column
  // 🔧 If you don't have "description", change ISSUE_TEXT_COL to the real column (notes/details/etc.)
  const ISSUE_TEXT_COL = "description"
  const ISSUE_COLS = `id, vehicle_id, status, created_at, ${ISSUE_TEXT_COL}`

  // daily_logs: must have vehicle_id, log_date, created_at
  const DAILY_LOG_COLS = "id, vehicle_id, log_date, created_at"

  // checklists: we assume each has a "vehicle_id" and "created_at"
  // If you have date columns (recommended):
  // - daily_checklists.checklist_date
  // - weekly_checklists.week_start_date
  // - monthly_checklists.month_start_date
  // You can swap to those; but this version works off created_at.
  const CHECKLIST_COLS = "id, vehicle_id, created_at"

  // scheduled_maintenance: must have vehicle_id, description, due_date
  // If your due date column has a different name, change DUE_DATE_COL and MAINT_COLS.
  const DUE_DATE_COL = "due_date"
  const MAINT_COLS = `id, vehicle_id, description, ${DUE_DATE_COL}`

  // ---------------------------
  // Windows
  // ---------------------------
  const today = new Date()
  const calendarDays = 45
  const calendarStart = new Date(today)
  calendarStart.setDate(calendarStart.getDate() - (calendarDays - 1))

  const forecastDays = 45
  const forecastEnd = new Date(today)
  forecastEnd.setDate(forecastEnd.getDate() + forecastDays)

  const todayYmd = toYmd(today)
  const startYmd = toYmd(calendarStart)
  const forecastEndYmd = toYmd(forecastEnd)

  // ---------------------------
  // 1) Determine which vehicles manager can see (via vehicle_assignments)
  // ---------------------------
  // Find managerId via auth user (server route already gated), but we still need it here:
  // Since this function signature only gets franchiseId, we'll read assignments by franchise vehicles
  // AND rely on RLS + server route user context. If you want explicit manager filtering, pass managerId.
  //
  // Better: use assignments by current user id, but we don't have it here.
  // So: We'll load franchise vehicles first, then filter by assignments table *without* user filter
  // would be wrong. Therefore we should pass managerId.
  //
  // ✅ To keep this correct, we’ll infer managerId from Postgres auth via RPC? Not available here.
  //
  // Instead: We will NOT use assignments here unless you pass managerId.
  // BUT you told me managers only have 1–3 trucks; it’s important.
  //
  // ✅ So: we’ll read managerId from JWT by calling supabase.auth.getUser() here.
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const managerId = user?.id

  if (!managerId) {
    return {
      trucks: [],
      actionItems: [],
      complianceCalendar: buildEmptyCompliance(calendarStart, calendarDays),
      maintenanceForecast: [],
    }
  }

  // Assignments for this manager
  const { data: assignments, error: assignErr } = await supabase
    .from(TABLES.vehicleAssignments)
    .select(ASSIGNMENT_COLS)
    // @ts-expect-error: dynamic column
    .eq(ASSIGNMENT_USER_COL, managerId)

  if (assignErr) throw assignErr

  const assignedVehicleIds = (assignments ?? []).map((a: any) => a.vehicle_id).filter(Boolean) as string[]
  if (assignedVehicleIds.length === 0) {
    return {
      trucks: [],
      actionItems: [],
      complianceCalendar: buildEmptyCompliance(calendarStart, calendarDays),
      maintenanceForecast: [],
    }
  }

  // ---------------------------
  // 2) Vehicles (only those assigned)
  // ---------------------------
  const { data: vehicles, error: vehErr } = await supabase
    .from(TABLES.vehicles)
    .select(VEHICLE_COLS)
    .eq("franchise_id", franchiseId)
    .in("id", assignedVehicleIds)

  if (vehErr) throw vehErr

  const vehicleList = (vehicles ?? []).map((v: any) => ({
    id: v.id as string,
    vehicleNumber: (v.vehicle_number ?? "UNKNOWN") as string,
    name: (v.vehicle_number ?? "Vehicle") as string,
    status: normalizeVehicleStatus(v.status),
  }))

  const vehicleIds = vehicleList.map((v) => v.id)
  if (vehicleIds.length === 0) {
    return {
      trucks: [],
      actionItems: [],
      complianceCalendar: buildEmptyCompliance(calendarStart, calendarDays),
      maintenanceForecast: [],
    }
  }

  // ---------------------------
  // 3) Issues
  // ---------------------------
  const { data: issues, error: issuesErr } = await supabase
    .from(TABLES.vehicleIssues)
    .select(ISSUE_COLS)
    .in("vehicle_id", vehicleIds)

  if (issuesErr) throw issuesErr

  const openIssues = (issues ?? []).filter((i: any) => isOpenIssue(i.status))

  const openIssuesCountByVehicle = new Map<string, number>()
  for (const i of openIssues) {
    openIssuesCountByVehicle.set(i.vehicle_id, (openIssuesCountByVehicle.get(i.vehicle_id) ?? 0) + 1)
  }

  // ---------------------------
  // 4) Daily logs (EOD)
  // ---------------------------
  const { data: dailyLogs, error: logsErr } = await supabase
    .from(TABLES.dailyLogs)
    .select(DAILY_LOG_COLS)
    .in("vehicle_id", vehicleIds)
    .gte("log_date", startYmd)
    .lte("log_date", todayYmd)

  if (logsErr) throw logsErr

  const completedVehiclesByDate = new Map<string, Set<string>>()
  for (const row of dailyLogs ?? []) {
    const date = (row.log_date as string) ?? (row.created_at as string)?.slice(0, 10)
    if (!date) continue
    if (!completedVehiclesByDate.has(date)) completedVehiclesByDate.set(date, new Set())
    completedVehiclesByDate.get(date)!.add(row.vehicle_id)
  }

  // last EOD per vehicle (by created_at desc)
  const lastEodByVehicle = new Map<string, string | null>()
  for (const id of vehicleIds) lastEodByVehicle.set(id, null)

  const sortedLogs = [...(dailyLogs ?? [])].sort((a: any, b: any) => {
    const ad = (a.created_at ?? "").toString()
    const bd = (b.created_at ?? "").toString()
    return bd.localeCompare(ad)
  })
  for (const row of sortedLogs) {
    const vId = row.vehicle_id as string
    if (lastEodByVehicle.get(vId)) continue
    lastEodByVehicle.set(vId, (row.created_at ?? null) as string | null)
  }

  const dailyComplianceByDate = new Map<string, "completed" | "missed">()
  for (let d = new Date(calendarStart); d <= today; d.setDate(d.getDate() + 1)) {
    const key = toYmd(d)
    const completed = completedVehiclesByDate.get(key)?.size ?? 0
    dailyComplianceByDate.set(key, completed === vehicleIds.length ? "completed" : "missed")
  }

  // ---------------------------
  // 5) Weekly + Monthly checklist completion (created_at day)
  // ---------------------------
  const [weeklyC, monthlyC] = await Promise.all([
    supabase.from(TABLES.weeklyChecklist).select(CHECKLIST_COLS).in("vehicle_id", vehicleIds).gte("created_at", calendarStart.toISOString()),
    supabase.from(TABLES.monthlyChecklist).select(CHECKLIST_COLS).in("vehicle_id", vehicleIds).gte("created_at", calendarStart.toISOString()),
  ])

  if (weeklyC.error) throw weeklyC.error
  if (monthlyC.error) throw monthlyC.error

  const weeklyCompletedByDate = new Map<string, Set<string>>()
  for (const row of weeklyC.data ?? []) {
    const key = (row.created_at as string).slice(0, 10)
    if (!weeklyCompletedByDate.has(key)) weeklyCompletedByDate.set(key, new Set())
    weeklyCompletedByDate.get(key)!.add(row.vehicle_id)
  }

  const monthlyCompletedByDate = new Map<string, Set<string>>()
  for (const row of monthlyC.data ?? []) {
    const key = (row.created_at as string).slice(0, 10)
    if (!monthlyCompletedByDate.has(key)) monthlyCompletedByDate.set(key, new Set())
    monthlyCompletedByDate.get(key)!.add(row.vehicle_id)
  }

  // ---------------------------
  // 6) Scheduled Maintenance
  // ---------------------------
  const { data: maintRows, error: maintErr } = await supabase
    .from(TABLES.scheduledMaintenance)
    .select(MAINT_COLS)
    .in("vehicle_id", vehicleIds)
    // @ts-expect-error dynamic column name
    .lte(DUE_DATE_COL, forecastEndYmd)

  if (maintErr) throw maintErr

  const maintenanceForecast: MaintenanceItem[] = (maintRows ?? []).map((m: any) => {
    const due = m[DUE_DATE_COL] ? new Date(m[DUE_DATE_COL] + "T00:00:00") : null
    const category = categorizeDueDate(due, today)
    const truckName = vehicleList.find((v) => v.id === m.vehicle_id)?.name ?? "Vehicle"
    return {
      id: m.id as string,
      truckName,
      description: (m.description ?? "Scheduled Maintenance") as string,
      dueDate: m[DUE_DATE_COL] ? new Date(m[DUE_DATE_COL] + "T00:00:00").toISOString() : null,
      category,
    }
  })

  // ---------------------------
  // 7) Truck cards
  // ---------------------------
  const trucks: TruckStatus[] = vehicleList.map((v) => {
    const openCount = openIssuesCountByVehicle.get(v.id) ?? 0
    const lastEOD = lastEodByVehicle.get(v.id) ?? null

    const nextMaint = maintenanceForecast
      .filter((m) => m.truckName === v.name && m.dueDate)
      .sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"))[0]

    const nextMaintenance =
      nextMaint?.category === "overdue"
        ? `${nextMaint.description} overdue`
        : nextMaint?.dueDate
          ? `${nextMaint.description} due ${new Date(nextMaint.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
          : "No scheduled maintenance"

    const status = openCount > 0 && v.status === "operational" ? "needs-attention" : v.status

    return {
      id: v.id,
      vehicleNumber: v.vehicleNumber,
      name: v.name,
      status,
      lastEOD,
      openIssuesCount: openCount,
      nextMaintenance,
    }
  })

  // ---------------------------
  // 8) Compliance calendar
  // ---------------------------
  const complianceCalendar: ComplianceDay[] = []
  for (let d = new Date(calendarStart); d <= today; d.setDate(d.getDate() + 1)) {
    const key = toYmd(d)
    const isWeeklyDue = d.getDay() === 1 // Monday
    const isMonthlyDue = d.getDate() === 1

    const weekly =
      isWeeklyDue ? ((weeklyCompletedByDate.get(key)?.size ?? 0) === vehicleIds.length ? "completed" : "missed") : null

    const monthly =
      isMonthlyDue ? ((monthlyCompletedByDate.get(key)?.size ?? 0) === vehicleIds.length ? "completed" : "missed") : null

    complianceCalendar.push({
      date: key,
      daily: dailyComplianceByDate.get(key) ?? null,
      weekly,
      monthly,
    })
  }

  // ---------------------------
  // 9) Action items
  // ---------------------------
  const actionItems: ActionItem[] = []

  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const yKey = toYmd(yesterday)
  const yCompleted = completedVehiclesByDate.get(yKey)?.size ?? 0

  if (yCompleted < vehicleIds.length) {
    actionItems.push({
      id: `missed-eod-${yKey}`,
      type: "missed-eod",
      urgency: "high",
      label: "End of Day Log Missed",
      truckName: "One or more trucks",
      ageOrDue: "Yesterday",
      ctaLabel: "Go to Daily Logs",
      ctaLink: "/manager/daily-logs",
    })
  }

  openIssues
    .sort((a: any, b: any) => (b.created_at ?? "").localeCompare(a.created_at ?? ""))
    .slice(0, 5)
    .forEach((i: any) => {
      const truckName = vehicleList.find((v) => v.id === i.vehicle_id)?.name ?? "Vehicle"
      const text = (i[ISSUE_TEXT_COL] ?? "Open issue") as string
      actionItems.push({
        id: `issue-${i.id}`,
        type: "open-issue",
        urgency: "medium",
        label: text,
        truckName,
        ageOrDue: i.created_at ? humanAge(i.created_at) : "Open",
        ctaLabel: "View Issue",
        ctaLink: `/manager/issues/${i.id}`,
      })
    })

  maintenanceForecast
    .filter((m) => m.category === "overdue" || m.category === "due-7days")
    .sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"))
    .slice(0, 6)
    .forEach((m) => {
      actionItems.push({
        id: `maint-${m.id}`,
        type: m.category === "overdue" ? "maintenance-due" : "maintenance-scheduled",
        urgency: m.category === "overdue" ? "high" : "medium",
        label: m.description,
        truckName: m.truckName,
        ageOrDue: m.dueDate
          ? `Due ${new Date(m.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
          : "Due soon",
        ctaLabel: "View Maintenance",
        ctaLink: "/manager/maintenance",
      })
    })

  actionItems.sort((a, b) => urgencyRank(a.urgency) - urgencyRank(b.urgency))

  return {
    trucks,
    actionItems: actionItems.slice(0, 10),
    complianceCalendar,
    maintenanceForecast: maintenanceForecast
      .sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"))
      .filter((m) => !m.dueDate || new Date(m.dueDate) <= forecastEnd),
  }
}

/* =========================
   Helpers
========================= */

function toYmd(d: Date) {
  return d.toISOString().slice(0, 10)
}

function normalizeVehicleStatus(raw: any): TruckStatus["status"] {
  const s = (raw ?? "").toString().toLowerCase()
  if (s.includes("out")) return "out-of-service"
  if (s.includes("attention") || s.includes("needs")) return "needs-attention"
  if (s.includes("oper")) return "operational"
  return "operational"
}

function isOpenIssue(status: any) {
  const s = (status ?? "").toString().toLowerCase()
  return s === "open" || s === "active" || s === "unresolved" || s === ""
}

function categorizeDueDate(due: Date | null, today: Date): MaintenanceItem["category"] {
  if (!due) return "later"
  const startOfToday = new Date(today)
  startOfToday.setHours(0, 0, 0, 0)

  const diffMs = due.getTime() - startOfToday.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return "overdue"
  if (diffDays <= 7) return "due-7days"
  if (diffDays <= 14) return "due-14days"
  return "later"
}

function urgencyRank(u: "high" | "medium" | "low") {
  return u === "high" ? 0 : u === "medium" ? 1 : 2
}

function humanAge(iso: string) {
  const date = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d ago`
}

function buildEmptyCompliance(start: Date, days: number): ComplianceDay[] {
  const arr: ComplianceDay[] = []
  const d = new Date(start)
  for (let i = 0; i < days; i++) {
    arr.push({ date: toYmd(d), daily: null, weekly: null, monthly: null })
    d.setDate(d.getDate() + 1)
  }
  return arr
}
