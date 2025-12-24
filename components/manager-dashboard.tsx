"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Truck, AlertTriangle, CheckCircle2, Clock, Wrench, FileText, Settings, LogOut } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import type { ManagerDashboardData } from "@/lib/manager-dashboard-data"

interface Props {
  userProfile: {
    id: string
    full_name: string
    franchise_id: string
    role: string
  }
}

export default function ManagerDashboard({ userProfile }: Props) {
  const router = useRouter()
  const [data, setData] = useState<ManagerDashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      // TODO: Replace with actual API call
      // const response = await fetch(`/api/manager-dashboard?managerId=${userProfile.id}`)
      // const data = await response.json()

      // Mock data for now
      const mockData: ManagerDashboardData = {
        trucks: [
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
            lastEOD: null,
            openIssuesCount: 2,
            nextMaintenance: "Tire rotation overdue",
          },
        ],
        actionItems: [
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
        ],
        complianceCalendar: generateMockCompliance(),
        maintenanceForecast: [
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
        ],
      }

      setData(mockData)
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push("/auth/login")
    } catch (error) {
      console.error("Error logging out:", error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Failed to load dashboard</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.push("/")} className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Home
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Manager Dashboard</h1>
              <p className="text-sm text-muted-foreground">Welcome, {userProfile.full_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => router.push("/manager/settings")}>
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        {/* Truck Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.trucks.map((truck) => (
            <Card
              key={truck.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => router.push(`/manager/vehicle/${truck.id}`)}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-lg">{truck.name}</h3>
                    <p className="text-sm text-muted-foreground">{truck.vehicleNumber}</p>
                  </div>
                  <Badge
                    variant={
                      truck.status === "operational"
                        ? "default"
                        : truck.status === "needs-attention"
                          ? "secondary"
                          : "destructive"
                    }
                  >
                    {truck.status === "operational"
                      ? "Operational"
                      : truck.status === "needs-attention"
                        ? "Needs Attention"
                        : "Out of Service"}
                  </Badge>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Last EOD:</span>
                    <span className={truck.lastEOD ? "" : "text-destructive font-medium"}>
                      {truck.lastEOD ? formatRelativeTime(truck.lastEOD) : "Missed"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Open Issues:</span>
                    <span className={truck.openIssuesCount > 0 ? "text-destructive font-medium" : ""}>
                      {truck.openIssuesCount}
                    </span>
                  </div>
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground">Next Maintenance:</p>
                    <p className="text-sm font-medium">{truck.nextMaintenance}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Action Needed Section */}
        {data.actionItems.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Action Needed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.actionItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
                    <div className="flex items-start gap-3 flex-1">
                      {item.urgency === "high" ? (
                        <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                      ) : item.urgency === "medium" ? (
                        <Clock className="h-5 w-5 text-amber-500 mt-0.5" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-muted-foreground mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p className="font-medium">{item.label}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {item.truckName}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{item.ageOrDue}</span>
                        </div>
                      </div>
                    </div>
                    <Button size="sm" onClick={() => router.push(item.ctaLink)}>
                      {item.ctaLabel}
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Compliance Widget */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Compliance (Last 30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Daily EOD */}
              <div>
                <p className="text-sm font-medium mb-2">Daily End-of-Day</p>
                <div className="flex gap-1 flex-wrap">
                  {data.complianceCalendar.map((day) => (
                    <div
                      key={day.date}
                      className={`w-7 h-7 rounded flex items-center justify-center text-xs ${
                        day.daily === "completed"
                          ? "bg-green-500 text-white"
                          : day.daily === "missed"
                            ? "bg-red-500 text-white"
                            : "bg-muted"
                      }`}
                      title={`${day.date}: ${day.daily || "N/A"}`}
                    >
                      {new Date(day.date).getDate()}
                    </div>
                  ))}
                </div>
              </div>

              {/* Weekly Checklist */}
              <div>
                <p className="text-sm font-medium mb-2">Weekly Checklist</p>
                <div className="flex gap-1 flex-wrap">
                  {data.complianceCalendar.map((day) => (
                    <div
                      key={day.date}
                      className={`w-7 h-7 rounded flex items-center justify-center text-xs ${
                        day.weekly === "completed"
                          ? "bg-green-500 text-white"
                          : day.weekly === "missed"
                            ? "bg-red-500 text-white"
                            : "bg-muted"
                      }`}
                      title={`${day.date}: ${day.weekly || "Not due"}`}
                    >
                      {new Date(day.date).getDate()}
                    </div>
                  ))}
                </div>
              </div>

              {/* Monthly Checklist */}
              <div>
                <p className="text-sm font-medium mb-2">Monthly Checklist</p>
                <div className="flex gap-1 flex-wrap">
                  {data.complianceCalendar.map((day) => (
                    <div
                      key={day.date}
                      className={`w-7 h-7 rounded flex items-center justify-center text-xs ${
                        day.monthly === "completed"
                          ? "bg-green-500 text-white"
                          : day.monthly === "missed"
                            ? "bg-red-500 text-white"
                            : "bg-muted"
                      }`}
                      title={`${day.date}: ${day.monthly || "Not due"}`}
                    >
                      {new Date(day.date).getDate()}
                    </div>
                  ))}
                </div>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 pt-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-500 rounded"></div>
                  <span>Completed</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-500 rounded"></div>
                  <span>Missed</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-muted rounded"></div>
                  <span>Not Due</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Maintenance Forecast */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Maintenance Forecast (Next 45 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Overdue */}
              {data.maintenanceForecast.filter((m) => m.category === "overdue").length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <p className="text-sm font-medium text-destructive">Overdue</p>
                  </div>
                  <div className="space-y-2 pl-5">
                    {data.maintenanceForecast
                      .filter((m) => m.category === "overdue")
                      .map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-2 bg-red-50 rounded">
                          <div>
                            <p className="text-sm font-medium">{item.description}</p>
                            <p className="text-xs text-muted-foreground">{item.truckName}</p>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {item.dueDate ? formatDate(item.dueDate) : "TBD"}
                          </p>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Due < 7 days */}
              {data.maintenanceForecast.filter((m) => m.category === "due-7days").length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                    <p className="text-sm font-medium text-amber-600">Due within 7 days</p>
                  </div>
                  <div className="space-y-2 pl-5">
                    {data.maintenanceForecast
                      .filter((m) => m.category === "due-7days")
                      .map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-2 bg-amber-50 rounded">
                          <div>
                            <p className="text-sm font-medium">{item.description}</p>
                            <p className="text-xs text-muted-foreground">{item.truckName}</p>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {item.dueDate ? formatDate(item.dueDate) : "TBD"}
                          </p>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Due < 14 days */}
              {data.maintenanceForecast.filter((m) => m.category === "due-14days").length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <p className="text-sm font-medium text-blue-600">Due within 14 days</p>
                  </div>
                  <div className="space-y-2 pl-5">
                    {data.maintenanceForecast
                      .filter((m) => m.category === "due-14days")
                      .map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-2 bg-blue-50 rounded">
                          <div>
                            <p className="text-sm font-medium">{item.description}</p>
                            <p className="text-xs text-muted-foreground">{item.truckName}</p>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {item.dueDate ? formatDate(item.dueDate) : "TBD"}
                          </p>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Later */}
              {data.maintenanceForecast.filter((m) => m.category === "later").length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                    <p className="text-sm font-medium text-muted-foreground">Later (14+ days)</p>
                  </div>
                  <div className="space-y-2 pl-5">
                    {data.maintenanceForecast
                      .filter((m) => m.category === "later")
                      .map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                          <div>
                            <p className="text-sm font-medium">{item.description}</p>
                            <p className="text-xs text-muted-foreground">{item.truckName}</p>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {item.dueDate ? formatDate(item.dueDate) : "TBD"}
                          </p>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Links */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Links</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Button
                variant="outline"
                className="h-20 flex flex-col gap-2 bg-transparent"
                onClick={() => router.push("/vehicles")}
              >
                <Truck className="h-5 w-5" />
                <span className="text-xs">Manage Vehicles</span>
              </Button>
              <Button
                variant="outline"
                className="h-20 flex flex-col gap-2 bg-transparent"
                onClick={() => router.push("/manager/reports/pre-trip")}
              >
                <FileText className="h-5 w-5" />
                <span className="text-xs">Pre-Trip Reports</span>
              </Button>
              <Button
                variant="outline"
                className="h-20 flex flex-col gap-2 bg-transparent"
                onClick={() => router.push("/manager/reports/gas-analytics")}
              >
                <FileText className="h-5 w-5" />
                <span className="text-xs">Gas Analytics</span>
              </Button>
              <Button
                variant="outline"
                className="h-20 flex flex-col gap-2 bg-transparent"
                onClick={() => router.push("/manager/data-override")}
              >
                <FileText className="h-5 w-5" />
                <span className="text-xs">Data Override</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function formatRelativeTime(isoDate: string): string {
  const date = new Date(isoDate)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))

  if (diffHours < 24) {
    return `${diffHours} hours ago`
  }
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`
}

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function generateMockCompliance() {
  const calendar = []
  const today = new Date()
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split("T")[0]

    const dailyStatus = Math.random() > 0.15 ? "completed" : "missed"
    const weeklyStatus = date.getDay() === 1 ? (Math.random() > 0.2 ? "completed" : "missed") : null
    const monthlyStatus = date.getDate() === 1 ? "completed" : null

    calendar.push({
      date: dateStr,
      daily: dailyStatus,
      weekly: weeklyStatus,
      monthly: monthlyStatus,
    })
  }
  return calendar
}
