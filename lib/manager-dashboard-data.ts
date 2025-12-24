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
      actionItems
