// Server function to fetch manager dashboard data
// Currently uses mock data but structured for easy Supabase migration

export interface TruckStatus {
  id: string
  vehicleNumber: string
  name: string
  status: "operational" | "needs-attention" | "out-of-service"
  lastEOD: string | null // ISO date string or null if missed
  openIssuesCount: number
  nextMaintenance: string // e.g. "Oil change in 420 miles" or "Overdue"
}

export interface ActionItem {
  id: string
  type: "missed-eod" | "overdue-checklist" | "open-issue" | "maintenance-due" | "maintenance-scheduled"
  urgency: "high" | "medium" | "low"
  label: string
  truckName: string
  ageOrDue: string // e.g. "2 days ago" or "Due today"
  ctaLabel: string
  ctaLink: string
}

export interface ComplianceDay {
  date: string // YYYY-MM-DD
  daily: "completed" | "missed" | null
  weekly: "completed" | "missed" | null
  monthly: "completed" | "missed" | null
}

export interface MaintenanceItem {
  id: string
  truckName: string
  description: string
  dueDate: string | null // ISO date or null if mileage-based
  category: "overdue" | "due-7days" | "due-14days" | "later"
}

export interface ManagerDashboardData {
  trucks: TruckStatus[]
  actionItems: ActionItem[]
  complianceCalendar: ComplianceDay[]
  maintenanceForecast: MaintenanceItem[]
}

export async function getManagerDashboardData(managerId: string): Promise<ManagerDashboardData> {
  // TODO: Replace with actual Supabase queries

  // Mock truck data
  const trucks: TruckStatus[] = [
    {
      id: "1",
      vehicleNumber: "TRUCK-01",
      name: "Dans Truck",
      status: "operational",
      lastEOD: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
      openIssuesCount: 0,
      nextMaintenance: "Oil change in 420 miles",
    },
    {
      id: "2",
      vehicleNumber: "TRUCK-02",
      name: "Kenworth",
      status: "needs-attention",
      lastEOD: null, // Missed EOD
      openIssuesCount: 2,
      nextMaintenance: "Tire rotation overdue",
    },
  ]

  // Mock action items
  const actionItems: ActionItem[] = [
    {
      id: "a1",
      type: "missed-eod",
      urgency: "high",
      label: "End of Day Report Missed",
      truckName: "Kenworth",
      ageOrDue: "Yesterday",
      ctaLabel: "Complete EOD",
      ctaLink: "/vehicle/TRUCK-02/end-day",
    },
    {
      id: "a2",
      type: "open-issue",
      urgency: "medium",
      label: "Check Engine Light",
      truckName: "Kenworth",
      ageOrDue: "3 days ago",
      ctaLabel: "View Issue",
      ctaLink: "/manager/vehicle/2",
    },
    {
      id: "a3",
      type: "maintenance-due",
      urgency: "high",
      label: "Tire Rotation Overdue",
      truckName: "Kenworth",
      ageOrDue: "Due 2 days ago",
      ctaLabel: "Schedule",
      ctaLink: "/vehicle/TRUCK-02/schedule-maintenance",
    },
  ]

  // Mock compliance calendar (last 30 days)
  const complianceCalendar: ComplianceDay[] = []
  const today = new Date()
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split("T")[0]

    // Mock: most days completed, some missed
    const dailyStatus = Math.random() > 0.15 ? "completed" : "missed"
    const weeklyStatus = date.getDay() === 1 ? (Math.random() > 0.2 ? "completed" : "missed") : null
    const monthlyStatus = date.getDate() === 1 ? "completed" : null

    complianceCalendar.push({
      date: dateStr,
      daily: dailyStatus,
      weekly: weeklyStatus,
      monthly: monthlyStatus,
    })
  }

  // Mock maintenance forecast (next 45 days)
  const maintenanceForecast: MaintenanceItem[] = [
    {
      id: "m1",
      truckName: "Kenworth",
      description: "Tire Rotation",
      dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      category: "overdue",
    },
    {
      id: "m2",
      truckName: "Dans Truck",
      description: "Oil Change",
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      category: "due-7days",
    },
    {
      id: "m3",
      truckName: "Dans Truck",
      description: "Brake Inspection",
      dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      category: "due-14days",
    },
    {
      id: "m4",
      truckName: "Kenworth",
      description: "Annual Inspection",
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      category: "later",
    },
  ]

  return {
    trucks,
    actionItems,
    complianceCalendar,
    maintenanceForecast,
  }
}
