"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Truck, AlertTriangle, Settings, BarChart3, FileText, Edit3, History } from "lucide-react"

const ManagerDashboard = () => {
  const router = useRouter()
  const [vehicles, setVehicles] = useState([])
  const [maintenanceAlerts, setMaintenanceAlerts] = useState([])
  const [recentIssues, setRecentIssues] = useState([])

  useEffect(() => {
    fetchVehicles()
  }, [])

  useEffect(() => {
    if (vehicles.length > 0) {
      fetchRecentIssues()
    }
  }, [vehicles])

  const fetchVehicles = async () => {
    try {
      console.log("[v0] Manager Dashboard: Starting to fetch vehicles")
      const response = await fetch("/api/vehicles")
      console.log("[v0] Manager Dashboard: Vehicles API response status:", response.status)
      if (response.ok) {
        const data = await response.json()
        console.log("[v0] Manager Dashboard: Vehicles API returned data:", data)
        console.log("[v0] Manager Dashboard: Data is array:", Array.isArray(data))
        console.log("[v0] Manager Dashboard: Data length:", data?.length)
        const vehiclesArray = data.vehicles || data || []
        setVehicles(vehiclesArray)
        console.log("[v0] Manager Dashboard: Vehicles state set to:", vehiclesArray)
      } else {
        console.log("[v0] Manager Dashboard: API failed, setting empty vehicles array")
        setVehicles([])
      }
    } catch (error) {
      console.error("Error fetching vehicles:", error)
      console.log("[v0] Manager Dashboard: Error occurred, setting empty vehicles array")
      setVehicles([])
    }
  }

  const fetchRecentIssues = async () => {
    try {
      console.log("[v0] Fetching recent issues for vehicles:", vehicles)
      const issues = []
      for (const vehicle of vehicles) {
        const response = await fetch(`/api/vehicles/${vehicle.vehicle_number || vehicle.id}/issues`)
        console.log("[v0] Issues API response for", vehicle.vehicle_number, ":", response.status)
        if (response.ok) {
          const data = await response.json()
          console.log("[v0] Issues data:", data)
          if (Array.isArray(data)) {
            issues.push(
              ...data.map((issue) => ({
                ...issue,
                vehicleNumber: vehicle.vehicle_number || vehicle.id,
              })),
            )
          }
        }
      }
      console.log("[v0] Total issues found:", issues.length)
      setRecentIssues(issues.slice(0, 5))
    } catch (error) {
      console.error("Error fetching recent issues:", error)
      setRecentIssues([])
    }
  }

  useEffect(() => {
    const fetchMaintenanceAlerts = async () => {
      try {
        console.log("[v0] Fetching maintenance alerts for vehicles:", vehicles)
        const alerts = []
        for (const vehicle of vehicles) {
          const response = await fetch(`/api/vehicles/${vehicle.vehicle_number || vehicle.id}/upcoming-maintenance`)
          console.log("[v0] Maintenance API response for", vehicle.vehicle_number, ":", response.status)
          if (response.ok) {
            const data = await response.json()
            console.log("[v0] Maintenance data:", data)
            const maintenanceData = data.upcomingMaintenance || data || []
            if (Array.isArray(maintenanceData)) {
              alerts.push(
                ...maintenanceData.map((item) => ({
                  id: item.id,
                  vehicleNumber: vehicle.vehicle_number || vehicle.id,
                  type: item.maintenance_type || item.maintenanceType,
                  dueDate: item.due_date || item.dueDate,
                  dueMileage: item.due_mileage || item.dueMileage,
                  priority:
                    (item.due_date || item.dueDate) &&
                    new Date(item.due_date || item.dueDate) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                      ? "high"
                      : "medium",
                  scheduledId: item.id || item.scheduledId,
                })),
              )
            }
          }
        }
        console.log("[v0] Total maintenance alerts found:", alerts.length)
        setMaintenanceAlerts(alerts)
      } catch (error) {
        console.error("Error fetching maintenance alerts:", error)
        setMaintenanceAlerts([])
      }
    }

    if (vehicles.length > 0) {
      fetchMaintenanceAlerts()
    }
  }, [vehicles])

  const handleCompleteMaintenanceClick = (vehicleNumber: string, scheduledId: string) => {
    router.push(`/vehicle/${vehicleNumber}/enter-maintenance`)
  }

  const handleScheduleMaintenanceFromIssue = (issueId: string, vehicleNumber: string) => {
    router.push(`/vehicle/${vehicleNumber}/schedule-maintenance`)
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => router.push("/")} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Button>
          <div className="flex items-center gap-4">
            <img src="/placeholder-a0q0x.png" alt="Dumpster Dudez" className="h-10 w-auto" />
            <div>
              <h1 className="text-3xl font-bold text-foreground">Fleet Management Dashboard</h1>
              <p className="text-primary font-medium">Dumpster Dudez - Manager View</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-3">
            <Card className="border-primary/20 shadow-lg">
              <CardHeader className="bg-primary/10">
                <CardTitle className="flex items-center gap-2 text-primary">
                  <Truck className="h-5 w-5" />
                  Vehicle Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(() => {
                    console.log("[v0] Manager Dashboard: Rendering vehicles section")
                    console.log("[v0] Manager Dashboard: vehicles state:", vehicles)
                    console.log("[v0] Manager Dashboard: vehicles is array:", Array.isArray(vehicles))
                    console.log("[v0] Manager Dashboard: vehicles length:", vehicles?.length)
                    return null
                  })()}
                  {Array.isArray(vehicles) && vehicles.length > 0 ? (
                    vehicles.map((vehicle) => {
                      console.log("[v0] Manager Dashboard: Rendering vehicle:", vehicle.vehicle_number)
                      return (
                        <Card
                          key={vehicle.id}
                          className="cursor-pointer hover:shadow-md transition-shadow border-border hover:border-primary"
                          onClick={() => router.push(`/manager/vehicle/${vehicle.vehicle_number}`)}
                        >
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h3 className="font-semibold text-lg text-foreground">
                                  {vehicle.make} {vehicle.model}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                  {vehicle.vehicle_number} • {vehicle.year}
                                </p>
                                <p className="text-sm text-muted-foreground">License: {vehicle.license_plate}</p>
                              </div>
                              <Badge
                                variant={vehicle.status === "active" ? "default" : "secondary"}
                                className={vehicle.status === "active" ? "bg-primary hover:bg-primary/90" : ""}
                              >
                                {vehicle.status}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Current Mileage: {vehicle.current_mileage?.toLocaleString()} mi
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })
                  ) : (
                    <div className="col-span-2 text-center py-8 text-muted-foreground">No vehicles found</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-primary/20 shadow-lg">
            <CardHeader className="bg-primary/10">
              <CardTitle className="flex items-center gap-2 text-primary">
                <AlertTriangle className="h-5 w-5" />
                Maintenance Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {maintenanceAlerts.length > 0 ? (
                  maintenanceAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="flex items-center justify-between p-3 bg-card rounded-lg border border-border"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={alert.priority === "high" ? "destructive" : "secondary"}>
                            {alert.priority === "high" ? "Overdue" : "Due Soon"}
                          </Badge>
                          <span className="font-medium">{alert.vehicleNumber}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{alert.type}</p>
                        {alert.dueDate && (
                          <p className="text-xs text-muted-foreground">
                            Due: {new Date(alert.dueDate).toLocaleDateString()}
                          </p>
                        )}
                        {alert.dueMileage && (
                          <p className="text-xs text-muted-foreground">Due: {alert.dueMileage.toLocaleString()} mi</p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        className="bg-primary hover:bg-primary/90"
                        onClick={() => handleCompleteMaintenanceClick(alert.vehicleNumber, alert.scheduledId)}
                      >
                        Complete
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-center py-4">No maintenance alerts</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/20 shadow-lg">
            <CardHeader className="bg-primary/10">
              <CardTitle className="flex items-center gap-2 text-primary">
                <AlertTriangle className="h-5 w-5" />
                Recent Issues
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentIssues.length > 0 ? (
                  recentIssues.map((issue) => (
                    <div
                      key={issue.id}
                      className="flex items-center justify-between p-3 bg-card rounded-lg border border-border"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="border-primary text-primary">
                            {issue.vehicleNumber}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(issue.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-foreground">{issue.description}</p>
                        {issue.status && (
                          <Badge
                            variant={issue.status === "resolved" ? "default" : "secondary"}
                            className={issue.status === "resolved" ? "bg-primary hover:bg-primary/90 mt-1" : "mt-1"}
                          >
                            {issue.status}
                          </Badge>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-primary text-primary hover:bg-primary/10 bg-transparent"
                        onClick={() => handleScheduleMaintenanceFromIssue(issue.id, issue.vehicleNumber)}
                      >
                        Schedule Maintenance
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-center py-4">No recent issues</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-primary/20 shadow-lg">
          <CardHeader className="bg-primary/10">
            <CardTitle className="flex items-center gap-2 text-primary">
              <Settings className="h-5 w-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <Button
                variant="outline"
                className="h-20 flex flex-col items-center gap-2 bg-transparent"
                onClick={() => router.push("/vehicles")}
              >
                <Truck className="h-6 w-6 text-primary" />
                <span className="text-sm">Manage Vehicles</span>
              </Button>
              <Button
                variant="outline"
                className="h-20 flex flex-col items-center gap-2 bg-transparent"
                onClick={() => router.push("/manager/reports/pre-trip")}
              >
                <FileText className="h-6 w-6 text-primary" />
                <span className="text-sm">Pre-Trip Reports</span>
              </Button>
              <Button
                variant="outline"
                className="h-20 flex flex-col items-center gap-2 bg-transparent"
                onClick={() => router.push("/manager/reports/gas-analytics")}
              >
                <BarChart3 className="h-6 w-6 text-primary" />
                <span className="text-sm">Gas Analytics</span>
              </Button>
              <Button
                variant="outline"
                className="h-20 flex flex-col items-center gap-2 bg-transparent"
                onClick={() => router.push("/manager/data-override")}
              >
                <Edit3 className="h-6 w-6 text-primary" />
                <span className="text-sm">Data Override</span>
              </Button>
              <Button
                variant="outline"
                className="h-20 flex flex-col items-center gap-2 bg-transparent"
                onClick={() => router.push("/manager/audit-log")}
              >
                <History className="h-6 w-6 text-primary" />
                <span className="text-sm">Audit Log</span>
              </Button>
              <Button
                variant="outline"
                className="h-20 flex flex-col items-center gap-2 bg-transparent"
                onClick={() => router.push("/manager/settings")}
              >
                <Settings className="h-6 w-6 text-primary" />
                <span className="text-sm">Settings</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default ManagerDashboard
