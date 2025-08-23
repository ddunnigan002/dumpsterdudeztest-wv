"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Truck, AlertTriangle, Settings, BarChart3, FileText } from "lucide-react"

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
        console.log("[v0] Manager Dashboard: API failed, using fallback data")
        setVehicles([
          {
            id: "chevy-6500",
            vehicle_number: "CHEVY",
            make: "Chevrolet",
            model: "6500",
            year: 2018,
            current_mileage: 45234,
            status: "active",
            license_plate: "DD-001",
          },
          {
            id: "kenworth-t280",
            vehicle_number: "KENWORTH",
            make: "Kenworth",
            model: "T280",
            year: 2019,
            current_mileage: 38567,
            status: "active",
            license_plate: "DD-002",
          },
        ])
      }
    } catch (error) {
      console.error("Error fetching vehicles:", error)
      console.log("[v0] Manager Dashboard: Error occurred, using fallback data")
      setVehicles([
        {
          id: "chevy-6500",
          vehicle_number: "CHEVY",
          make: "Chevrolet",
          model: "6500",
          year: 2018,
          current_mileage: 45234,
          status: "active",
          license_plate: "DD-001",
        },
        {
          id: "kenworth-t280",
          vehicle_number: "KENWORTH",
          make: "Kenworth",
          model: "T280",
          year: 2019,
          current_mileage: 38567,
          status: "active",
          license_plate: "DD-002",
        },
      ])
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
      setRecentIssues(issues.slice(0, 5)) // Show only 5 most recent
    } catch (error) {
      console.error("Error fetching recent issues:", error)
      setRecentIssues([
        {
          id: "issue-1",
          vehicleNumber: "CHEVY",
          description: "Hydraulic fluid leak detected",
          status: "open",
          created_at: new Date().toISOString(),
        },
        {
          id: "issue-2",
          vehicleNumber: "KENWORTH",
          description: "Brake pads need replacement",
          status: "open",
          created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        },
      ])
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
        setMaintenanceAlerts([
          {
            id: "1",
            vehicleNumber: "CHEVY",
            type: "Oil Change",
            dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0],
            dueMileage: 45500,
            priority: "high",
            scheduledId: "oil-change-1",
          },
          {
            id: "2",
            vehicleNumber: "CHEVY",
            type: "PTO Service",
            dueDate: "2024-02-20",
            dueMileage: 46000,
            priority: "medium",
            scheduledId: "pto-service-1",
          },
          {
            id: "3",
            vehicleNumber: "KENWORTH",
            type: "Brake Inspection",
            dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
            dueMileage: 39000,
            priority: "high",
            scheduledId: "brake-inspection-1",
          },
        ])
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
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/")}
            className="flex items-center gap-2 border-orange-200 hover:bg-orange-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Button>
          <div className="flex items-center gap-4">
            <img src="/placeholder-a0q0x.png" alt="Dumpster Dudez" className="h-10 w-auto" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Fleet Management Dashboard</h1>
              <p className="text-orange-600 font-medium">Dumpster Dudez - Manager View</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-3">
            <Card className="border-orange-200 shadow-lg">
              <CardHeader className="bg-orange-50">
                <CardTitle className="flex items-center gap-2 text-orange-800">
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
                          className="cursor-pointer hover:shadow-md transition-shadow border-orange-100 hover:border-orange-300"
                          onClick={() => router.push(`/manager/vehicle/${vehicle.vehicle_number}`)}
                        >
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h3 className="font-semibold text-lg text-gray-900">
                                  {vehicle.make} {vehicle.model}
                                </h3>
                                <p className="text-sm text-gray-600">
                                  {vehicle.vehicle_number} • {vehicle.year}
                                </p>
                                <p className="text-sm text-gray-600">License: {vehicle.license_plate}</p>
                              </div>
                              <Badge
                                variant={vehicle.status === "active" ? "default" : "secondary"}
                                className={vehicle.status === "active" ? "bg-orange-600 hover:bg-orange-700" : ""}
                              >
                                {vehicle.status}
                              </Badge>
                            </div>
                            <div className="text-sm text-gray-600">
                              Current Mileage: {vehicle.current_mileage?.toLocaleString()} mi
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })
                  ) : (
                    <div className="col-span-2 text-center py-8 text-gray-500">No vehicles found</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-orange-200 shadow-lg">
            <CardHeader className="bg-orange-50">
              <CardTitle className="flex items-center gap-2 text-orange-800">
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
                      className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-100"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={alert.priority === "high" ? "destructive" : "secondary"}>
                            {alert.priority === "high" ? "Overdue" : "Due Soon"}
                          </Badge>
                          <span className="font-medium">{alert.vehicleNumber}</span>
                        </div>
                        <p className="text-sm text-gray-600">{alert.type}</p>
                        {alert.dueDate && (
                          <p className="text-xs text-gray-500">Due: {new Date(alert.dueDate).toLocaleDateString()}</p>
                        )}
                        {alert.dueMileage && (
                          <p className="text-xs text-gray-500">Due: {alert.dueMileage.toLocaleString()} mi</p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        className="bg-orange-600 hover:bg-orange-700"
                        onClick={() => handleCompleteMaintenanceClick(alert.vehicleNumber, alert.scheduledId)}
                      >
                        Complete
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">No maintenance alerts</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-orange-200 shadow-lg">
            <CardHeader className="bg-orange-50">
              <CardTitle className="flex items-center gap-2 text-orange-800">
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
                      className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-100"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="border-orange-300 text-orange-700">
                            {issue.vehicleNumber}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {new Date(issue.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-800">{issue.description}</p>
                        {issue.status && (
                          <Badge
                            variant={issue.status === "resolved" ? "default" : "secondary"}
                            className={issue.status === "resolved" ? "bg-orange-600 hover:bg-orange-700 mt-1" : "mt-1"}
                          >
                            {issue.status}
                          </Badge>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-orange-300 text-orange-700 hover:bg-orange-50 bg-transparent"
                        onClick={() => handleScheduleMaintenanceFromIssue(issue.id, issue.vehicleNumber)}
                      >
                        Schedule Maintenance
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">No recent issues</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-orange-200 shadow-lg">
          <CardHeader className="bg-orange-50">
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <Settings className="h-5 w-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button
                variant="outline"
                className="h-20 flex flex-col items-center gap-2 border-orange-200 hover:bg-orange-50 hover:border-orange-300 bg-transparent"
                onClick={() => router.push("/vehicles")}
              >
                <Truck className="h-6 w-6 text-orange-600" />
                <span className="text-sm">Manage Vehicles</span>
              </Button>
              <Button
                variant="outline"
                className="h-20 flex flex-col items-center gap-2 border-orange-200 hover:bg-orange-50 hover:border-orange-300 bg-transparent"
                onClick={() => router.push("/manager/reports/pre-trip")}
              >
                <FileText className="h-6 w-6 text-orange-600" />
                <span className="text-sm">Pre-Trip Reports</span>
              </Button>
              <Button
                variant="outline"
                className="h-20 flex flex-col items-center gap-2 border-orange-200 hover:bg-orange-50 hover:border-orange-300 bg-transparent"
                onClick={() => router.push("/manager/reports/gas-analytics")}
              >
                <BarChart3 className="h-6 w-6 text-orange-600" />
                <span className="text-sm">Gas Analytics</span>
              </Button>
              <Button
                variant="outline"
                className="h-20 flex flex-col items-center gap-2 border-orange-200 hover:bg-orange-50 hover:border-orange-300 bg-transparent"
                onClick={() => router.push("/manager/settings")}
              >
                <Settings className="h-6 w-6 text-orange-600" />
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
