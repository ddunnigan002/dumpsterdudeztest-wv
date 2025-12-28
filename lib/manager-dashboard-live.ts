import type { SupabaseClient } from "@supabase/supabase-js"
import type {
  ActionItem,
  ComplianceDay,
  MaintenanceItem,
  ManagerDashboardData,
  TruckStatus,
} from "./manager-dashboard-data"

type Args = {
  supabase: SupabaseClient
  franchiseId: string
  managerId: string
  /** membership role (manager/owner/admin/driver). Managers should see all franchise vehicles. */
  role?: string | null
  /** optional filter for compliance/actions/forecast; truck cards always show all vehicles */
  vehicleId?: string | null
}

export async function getManagerDashboardDataLive({
  supabase,
  franchiseId,
  managerId,
  role,
  vehicleId,
}: Args): Promise<ManagerDashboardData> {
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

  const roleNorm = (role ?? "").toLowerCase()
  const isManagerView =
    !roleNorm || ["manager", "owner", "admin", "franchise_owner", "franchise-owner"].includes(roleNorm)

  // 1) Determine which vehicles the user is allowed to see at all
  let assignedVehicleIds: string[] | null = null
  if (!isManagerView) {
    const { data: assignments, error: assignErr } = await supabase
      .from("vehicle_assignments")
      .select("vehicle_id")
      .eq("user_id", managerId)
      .eq("is_active", true)

    if (assignErr) throw assignErr
    assignedVehicleIds = (assignments ?? []).map((a: any) => a.vehicle_id).filter(Boolean) as string[]
  }

  const vehiclesBase = supabase
    .from("vehicles")
    .select("id, franchise_id, vehicle_number, status")
    .eq("franchise_id", franchiseId)

  const { data: vehicles, error: vehErr } =
    assignedVehicleIds === null
      ? await vehiclesBase.order("vehicle_number", { ascending: true })
      : assignedVehicleIds.length > 0
        ? await vehiclesBase.in("id", assignedVehicleIds)
        : await vehiclesBase.in("id", ["00000000-0000-0000-0000-000000000000"])

  if (vehErr) throw vehErr

  const allVehicleList = (vehicles ?? []).map((v: any) => ({
    id: v.id as string,
    vehicleNumber: (v.vehicle_number ?? "UNKNOWN") as string,
    name: (v.vehicle_number ?? "Vehicle") as string,
    status: normalizeVehicleStatus(v.status),
  }))

  const allVehicleIds = allVehicleList.map((v) => v.id)

  if (allVehicleIds.length === 0) {
    return {
      trucks: [],
      actionItems: [],
      complianceCalendar: buildEmptyCompliance(calendarStart, calendarDays),
      maintenanceForecast: [],
    }
  }

  // Apply optional filter ONLY to compliance/actions/forecast
  const filteredVehicleIds =
    vehicleId && vehicleId !== "all" ? allVehicleIds.filter((id) => id === vehicleId) : allVehicleIds

  // 2) Issues (for counts + action items)
  const { data: issues, error: issuesErr } = await supabase
    .from("vehicle_issues")
    .select("id, vehicle_id, status, created_at, description")
    .in("vehicle_id", allVehicleIds)

  if (issuesErr) throw issuesErr

  const openIssuesAll = (issues ?? []).filter((i: any) => isOpenIssue(i.status))
  const openIssuesCountByVehicle = new Map<string, number>()
  for (const i of openIssuesAll) {
    openIssuesCountByVehicle.set(i.vehicle_id, (openIssuesCountByVehicle.get(i.vehicle_id) ?? 0) + 1)
  }

  // 3) Daily logs (for lastEOD on truck cards + compliance)
  const { data: dailyLogs, error: logsErr } = await supabase
    .from("daily_logs")
    .select("id, vehicle_id, log_date, created_at")
    .in("vehicle_id", allVehicleIds)
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

  const lastEodByVehicle = new Map<string, string | null>()
  for (const id of allVehicleIds) lastEodByVehicle.set(id, null)

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

  // 4) Weekly + monthly checklists (for compliance)
  const [weeklyC, monthlyC] = await Promise.all([
    supabase
      .from("weekly_checklists")
      .select("id, vehicle_id, created_at")
      .in("vehicle_id", allVehicleIds)
      .gte("created_at", calendarStart.toISOString()),
    supabase
      .from("monthly_checklists")
      .select("id, vehicle_id, created_at")
      .in("vehicle_id", allVehicleIds)
      .gte("created_at", calendarStart.toISOString()),
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

  // 5) Scheduled maintenance (for nextMaintenance on truck cards + forecast list)
  const { data: maintRows, error: maintErr } = await supabase
    .from("scheduled_maintenance")
    .select("id, vehicle_id, description, due_date")
    .in("vehicle_id", allVehicleIds)
    .lte("due_date", forecastEndYmd)

  if (maintErr) throw maintErr

  const maintenanceAll: MaintenanceItem[] = (maintRows ?? []).map((m: any) => {
    const due = m.due_date ? new Date(m.due_date + "T00:00:00") : null
    const category = categorizeDueDate(due, today)
    const truckName = allVehicleList.find((v) => v.id === m.vehicle_id)?.name ?? "Vehicle"
    return {
      id: m.id as string,
      truckName,
      description: (m.description ?? "Scheduled Maintenance") as string,
      dueDate: m.due_date ? new Date(m.due_date + "T00:00:00").toISOString() : null,
      category,
    }
  })

  // 6) Truck cards ALWAYS from all vehicles (unfiltered)
  const trucks: TruckStatus[] = allVehicleList.map((v) => {
    const openCount = openIssuesCountByVehicle.get(v.id) ?? 0
    const lastEOD = lastEodByVehicle.get(v.id) ?? null

    const nextMaint = maintenanceAll
      .filter((m) => m.truckName === v.name && m.dueDate)
      .sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"))[0]

    const nextMaintenance =
      nextMaint?.category === "overdue"
        ? `${nextMaint.description} overdue`
        : nextMaint?.dueDate
          ? `${nextMaint.description} due ${new Date(nextMaint.dueDate).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}`
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

  // 7) Compliance calendar (filtered ids only)
  const dailyComplianceByDate = new Map<string, "completed" | "missed">()
  for (let d = new Date(calendarStart); d <= today; d.setDate(d.getDate() + 1)) {
    const key = toYmd(d)
    const completedAll = completedVehiclesByDate.get(key) ?? new Set<string>()
    const completedFiltered = filteredVehicleIds.filter((id) => completedAll.has(id)).length

    dailyComplianceByDate.set(key, completedFiltered === filteredVehicleIds.length ? "completed" : "missed")
  }

  const complianceCalendar: ComplianceDay[] = []
  for (let d = new Date(calendarStart); d <= today; d.setDate(d.getDate() + 1)) {
    const key = toYmd(d)
    const isWeeklyDue = d.getDay() === 1 // Monday
    const isMonthlyDue = d.getDate() === 1

    const weekly =
      isWeeklyDue
        ? ((weeklyCompletedByDate.get(key)?.size ?? 0) >= filteredVehicleIds.length ? "completed" : "missed")
        : null

    const monthly =
      isMonthlyDue
        ? ((monthlyCompletedByDate.get(key)?.size ?? 0) >= filteredVehicleIds.length ? "completed" : "missed")
        : null

    complianceCalendar.push({
      date: key,
      daily: dailyComplianceByDate.get(key) ?? null,
      weekly,
      monthly,
    })
  }

  // 8) Maintenance forecast list (filtered ids only)
  const maintenanceForecast = maintenanceAll
    .filter((m) => {
      // map truckName->id is messy; instead filter by vehicle_id earlier if you want.
      // easiest: rebuild from maintRows and filter by vehicle_id.
      return true
    })
    .sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"))
    .filter((m) => !m.dueDate || new Date(m.dueDate) <= forecastEnd)

  // rebuild forecast from rows so we can filter correctly by vehicleId:
  const maintenanceForecastFiltered: MaintenanceItem[] = (maintRows ?? [])
    .filter((m: any) => filteredVehicleIds.includes(m.vehicle_id))
    .map((m: any) => {
      const due = m.due_date ? new Date(m.due_date + "T00:00:00") : null
      const category = categorizeDueDate(due, today)
      const truckName = allVehicleList.find((v) => v.id === m.vehicle_id)?.name ?? "Vehicle"
      return {
        id: m.id as string,
        truckName,
        description: (m.description ?? "Scheduled Maintenance") as string,
        dueDate: m.due_date ? new Date(m.due_date + "T00:00:00").toISOString() : null,
        category,
      }
    })
    .sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"))
    .filter((m) => !m.dueDate || new Date(m.dueDate) <= forecastEnd)

  // 9) Action items (filtered ids only)
  const actionItems: ActionItem[] = []

  // Missed EOD yesterday (filtered) — Option A: one row per vehicle
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const yKey = toYmd(yesterday)

  const yCompletedSet = completedVehiclesByDate.get(yKey) ?? new Set<string>()

  // Vehicles in-scope (respect filter)
  const missingVehicleIds = filteredVehicleIds.filter((id) => !yCompletedSet.has(id))

  for (const vId of missingVehicleIds) {
    const truckName = allVehicleList.find((v) => v.id === vId)?.name ?? "Vehicle"

    actionItems.push({
      id: `missed-eod-${vId}-${yKey}`,
      type: "missed-eod",
      urgency: "high",
      label: "End of Day Log Missed",
      truckName,
      ageOrDue: "Yesterday",
      ctaLabel: "Complete End Day",
      ctaLink: `/vehicle/${vId}/end-day?date=${encodeURIComponent(yKey)}`,
    })
  }

  // Open issues (filtered)
  openIssuesAll
    .filter((i: any) => filteredVehicleIds.includes(i.vehicle_id))
    .sort((a: any, b: any) => (b.created_at ?? "").localeCompare(a.created_at ?? ""))
    .slice(0, 5)
    .forEach((i: any) => {
      const truckName = allVehicleList.find((v) => v.id === i.vehicle_id)?.name ?? "Vehicle"
      const text = (i.description ?? "Open issue") as string
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

  // Maintenance due soon (filtered)
  maintenanceForecastFiltered
    .filter((m) => m.category === "overdue" || m.category === "due-7days")
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
    trucks, // always unfiltered
    actionItems: actionItems.slice(0, 10),
    complianceCalendar,
    maintenanceForecast: maintenanceForecastFiltered, // filtered list for the bottom section
  }
}

/* Helpers */

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
