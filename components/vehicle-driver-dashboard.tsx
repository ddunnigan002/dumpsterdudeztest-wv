"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  CheckSquare,
  Fuel,
  AlertTriangle,
  Clock,
  Wrench,
  ArrowLeft,
  AlertCircle,
  Settings,
  Calendar,
  CalendarDays,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

interface VehicleDriverDashboardProps {
  vehicleId: string
  userProfile: {
    role: string
    franchise_id: string
    full_name: string
    id: string
  }
}

export default function VehicleDriverDashboard({ vehicleId, userProfile }: VehicleDriverDashboardProps) {
  const router = useRouter()
  const [maintenanceAlerts, setMaintenanceAlerts] = useState<any[]>([])

  useEffect(() => {
    fetchMaintenanceAlerts()
  }, [vehicleId])

  const fetchMaintenanceAlerts = async () => {
    try {
      const response = await fetch(`/api/vehicles/${vehicleId}/upcoming-maintenance`)
      if (response.ok) {
        const data = await response.json()
        setMaintenanceAlerts(data.upcomingMaintenance || [])
      }
    } catch (error) {
      console.error("Error fetching maintenance alerts:", error)
      const mockAlerts = [
        {
          id: "1",
          type: "overdue",
          message: "Oil change overdue by 500 miles",
          dueDate: "2024-01-15",
          maintenanceType: "Oil Change",
          scheduledId: "oil-change-1",
        },
        {
          id: "2",
          type: "coming_soon",
          message: "PTO service needed",
          dueDate: "2024-02-01",
          maintenanceType: "PTO Service",
          scheduledId: "pto-service-1",
        },
      ]
      setMaintenanceAlerts(mockAlerts)
    }
  }

  const handleCompleteMaintenanceClick = () => {
    router.push(`/vehicle/${vehicleId}/enter-maintenance`)
  }

  const getVehicleDisplayName = (id: string) => {
    switch (id.toLowerCase()) {
      case "chevy":
        return "Chevy Truck"
      case "kenworth":
        return "Kenworth Truck"
      default:
        return id
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 p-4">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-orange-600 hover:text-orange-700">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div className="text-center">
            <h1 className="text-lg font-bold text-orange-600">Dumpster Dudez</h1>
            <h2 className="text-sm text-gray-600">{getVehicleDisplayName(vehicleId)}</h2>
          </div>
          <div></div>
        </div>

        {/* Maintenance Alerts */}
        {maintenanceAlerts.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Maintenance Alerts</h3>
            {maintenanceAlerts.map((alert, index) => (
              <Alert
                key={alert.id || index}
                className={alert.type === "overdue" ? "border-red-500 bg-red-50" : "border-yellow-500 bg-yellow-50"}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-2">
                    <AlertCircle
                      className={`h-4 w-4 mt-0.5 ${alert.type === "overdue" ? "text-red-600" : "text-yellow-600"}`}
                    />
                    <AlertDescription className={alert.type === "overdue" ? "text-red-800" : "text-yellow-800"}>
                      {alert.message}
                    </AlertDescription>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCompleteMaintenanceClick}
                    className={`ml-2 ${alert.type === "overdue" ? "text-red-600 hover:text-red-700 hover:bg-red-100" : "text-yellow-600 hover:text-yellow-700 hover:bg-yellow-100"}`}
                  >
                    Complete
                  </Button>
                </div>
              </Alert>
            ))}
          </div>
        )}

        {/* Maintenance Checklists */}
        <Card>
          <CardHeader>
            <CardTitle className="text-center">Maintenance Checklists</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href={`/vehicle/${vehicleId}/pre-trip`} className="block">
              <Button className="w-full h-14 text-base font-medium hover:bg-blue-700 bg-orange-600" size="lg">
                <CheckSquare className="mr-3 h-5 w-5" />
                Daily Pre-Trip Checklist
              </Button>
            </Link>

            <Link href={`/vehicle/${vehicleId}/weekly-checklist`} className="block">
              <Button className="w-full h-14 text-base font-medium hover:bg-indigo-700 bg-orange-400" size="lg">
                <Calendar className="mr-3 h-5 w-5" />
                Weekly Maintenance
              </Button>
            </Link>

            <Link href={`/vehicle/${vehicleId}/monthly-checklist`} className="block">
              <Button className="w-full h-14 text-base font-medium hover:bg-purple-700 bg-orange-300" size="lg">
                <CalendarDays className="mr-3 h-5 w-5" />
                Monthly Service
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Driver Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-center">Daily Tasks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link href={`/vehicle/${vehicleId}/gas`} className="block">
              <Button className="w-full h-16 text-lg font-medium hover:bg-green-700 bg-black" size="lg">
                <Fuel className="mr-3 h-6 w-6" />
                Gas
              </Button>
            </Link>

            <Link href={`/vehicle/${vehicleId}/report-issue`} className="block">
              <Button className="w-full h-16 text-lg font-medium hover:bg-red-700 bg-red-600" size="lg">
                <AlertTriangle className="mr-3 h-6 w-6" />
                Report Issue
              </Button>
            </Link>

            <Link href={`/vehicle/${vehicleId}/end-day`} className="block">
              <Button className="w-full h-16 text-lg font-medium hover:bg-purple-700 bg-orange-600" size="lg">
                <Clock className="mr-3 h-6 w-6" />
                End Day
              </Button>
            </Link>

            <Link href={`/vehicle/${vehicleId}/enter-maintenance`} className="block">
              <Button className="w-full h-16 text-lg font-medium hover:bg-teal-700 bg-orange-400" size="lg">
                <Settings className="mr-3 h-6 w-6" />
                Enter Maintenance
              </Button>
            </Link>

            <Link href={`/vehicle/${vehicleId}/schedule-maintenance`} className="block">
              <Button className="w-full h-16 text-lg font-medium hover:bg-orange-700 bg-orange-300" size="lg">
                <Wrench className="mr-3 h-6 w-6" />
                Schedule Maintenance
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
