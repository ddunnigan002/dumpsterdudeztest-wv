"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Truck, AlertTriangle, CheckCircle2, Clock, Wrench, FileText, Settings, LogOut } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import ComplianceHeatmapByTruck from "@/components/compliance/ComplianceHeatmapByTruck"
import type { ManagerDashboardData, MaintenanceItem } from "@/lib/manager-dashboard-data"

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

  // NEW: selected truck filter (all vs specific vehicle id)
  const [selectedVehicleId, setSelectedVehicleId] = useState("all")

  useEffect(() => {
    fetchDashboardData(selectedVehicleId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVehicleId])

  const fetchDashboardData = async (vehicleId: string) => {
    try {
      setLoading(true)

      const qs = new URLSearchParams()
      qs.set("managerId", userProfile.id)
      if (vehicleId && vehicleId !== "all") {
        qs.set("vehicleId", vehicleId)
      }

      const response = await fetch(`/api/manager-dashboard?${qs.toString()}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      })

      if (!response.ok) {
        const text = await response.text().catch(() => "")
        throw new Error(`Failed to fetch dashboard: ${response.status} ${text}`)
      }

      const liveData: ManagerDashboardData = await response.json()
      setData(liveData)
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
      setData(null)
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

  const maintenanceByTruck = useMemo(() => {
    if (!data) return []
    return groupMaintenanceByTruck(data.maintenanceForecast)
  }, [data])

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
                    <Button
                      size="sm"
                      type="button"
                      onClick={() => router.push(item.ctaLink)}
                    >
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
              Compliance
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="overflow-x-auto">
              <div className="min-w-[900px]">
                <ComplianceHeatmapByTruck franchiseId={userProfile.franchise_id} />
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
            <div className="space-y-6">
              {maintenanceByTruck.map(({ truckName, list }) => (
                <div key={truckName} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">{truckName}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <LegendDot label="Overdue" className="bg-red-500" />
                      <LegendDot label="< 7d" className="bg-amber-500" />
                      <LegendDot label="< 14d" className="bg-blue-500" />
                      <LegendDot label="Later" className="bg-gray-400" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    {list.map((item) => (
                      <div
                        key={item.id}
                        className={`flex items-center justify-between p-2 rounded border ${
                          item.category === "overdue"
                            ? "bg-red-50"
                            : item.category === "due-7days"
                              ? "bg-amber-50"
                              : item.category === "due-14days"
                                ? "bg-blue-50"
                                : "bg-muted/50"
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{item.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.category === "overdue"
                              ? "Overdue"
                              : item.category === "due-7days"
                                ? "Due within 7 days"
                                : item.category === "due-14days"
                                  ? "Due within 14 days"
                                  : "Later"}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground">{item.dueDate ? formatDate(item.dueDate) : "TBD"}</p>
                      </div>
                    ))}
                    {list.length === 0 && <p className="text-sm text-muted-foreground">No scheduled items.</p>}
                  </div>
                </div>
              ))}
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

/* =========================
   Helpers + Components
========================= */

function LegendDot({ label, className }: { label: string; className: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`w-2.5 h-2.5 rounded-full ${className}`} />
      {label}
    </span>
  )
}

function formatRelativeTime(isoDate: string): string {
  const date = new Date(isoDate)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))

  if (diffMins < 2) return "just now"
  if (diffMins < 60) return `${diffMins} min ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`
}

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function groupMaintenanceByTruck(items: MaintenanceItem[]) {
  const byTruck = new Map<string, MaintenanceItem[]>()
  for (const item of items) {
    const key = item.truckName
    byTruck.set(key, [...(byTruck.get(key) ?? []), item])
  }
  for (const [k, list] of byTruck) {
    list.sort((a, b) => (a.dueDate ?? "9999-99-99").localeCompare(b.dueDate ?? "9999-99-99"))
    byTruck.set(k, list)
  }
  return [...byTruck.entries()].map(([truckName, list]) => ({ truckName, list }))
}
