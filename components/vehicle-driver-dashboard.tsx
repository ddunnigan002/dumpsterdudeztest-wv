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
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div className="text-center">
            <h1 className="text-lg font-bold text-primary">Dumpster Dudez</h1>
            <h2 className="text-sm text-muted-foreground">{getVehicleDisplayName(vehicleId)}</h2>
          </div>
          <div></div>
        </div>

        {/* Maintenance Alerts */}
        {maintenanceAlerts.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-foreground mb-2">Maintenance Alerts</h3>
            {maintenanceAlerts.map((alert, index) => (
              <Alert
                key={alert.id || index}
                className={
                  alert.type === "overdue" ? "border-destructive bg-destructive/10" : "border-accent bg-accent/10"
                }
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-2">
                    <AlertCircle
                      className={`h-4 w-4 mt-0.5 ${alert.type === "overdue" ? "text-destructive" : "text-accent"}`}
                    />
                    <AlertDescription className={alert.type === "overdue" ? "text-destructive" : "text-accent"}>
                      {alert.message}
                    </AlertDescription>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCompleteMaintenanceClick}
                    className={`ml-2 ${alert.type === "overdue" ? "text-destructive hover:text-destructive/80 hover:bg-destructive/10" : "text-accent hover:text-accent/80 hover:bg-accent/10"}`}
                  >
                    Complete
                  </Button>
                </div>
              </Alert>
            ))}
          </div>
        )}

        {/* Section 1: Daily Tasks */}
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-center text-primary flex items-center justify-center gap-2">
              <CheckSquare className="h-5 w-5" />
              Daily Tasks
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href={`/vehicle/${vehicleId}/pre-trip`} className="block">
              <Button className="w-full h-14 text-base font-medium bg-primary hover:bg-primary/90" size="lg">
                <CheckSquare className="mr-3 h-5 w-5" />
                Daily Pre-Trip Checklist
              </Button>
            </Link>

            <Link href={`/vehicle/${vehicleId}/gas`} className="block">
              <Button className="w-full h-14 text-base font-medium bg-primary hover:bg-primary/90" size="lg">
                <Fuel className="mr-3 h-5 w-5" />
                Gas Entry
              </Button>
            </Link>

            <Link href={`/vehicle/${vehicleId}/end-day`} className="block">
              <Button className="w-full h-14 text-base font-medium bg-primary hover:bg-primary/90" size="lg">
                <Clock className="mr-3 h-5 w-5" />
                End Day
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Section 2: Maintenance */}
        <Card className="border-secondary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-center text-secondary flex items-center justify-center gap-2">
              <Wrench className="h-5 w-5" />
              Maintenance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href={`/vehicle/${vehicleId}/weekly-checklist`} className="block">
              <Button
                className="w-full h-14 text-base font-medium bg-secondary hover:bg-secondary/90 text-secondary-foreground"
                size="lg"
              >
                <Calendar className="mr-3 h-5 w-5" />
                Weekly Checklist
              </Button>
            </Link>

            <Link href={`/vehicle/${vehicleId}/monthly-checklist`} className="block">
              <Button
                className="w-full h-14 text-base font-medium bg-secondary hover:bg-secondary/90 text-secondary-foreground"
                size="lg"
              >
                <CalendarDays className="mr-3 h-5 w-5" />
                Monthly Checklist
              </Button>
            </Link>

            <Link href={`/vehicle/${vehicleId}/enter-maintenance`} className="block">
              <Button
                className="w-full h-14 text-base font-medium bg-secondary hover:bg-secondary/90 text-secondary-foreground"
                size="lg"
              >
                <Settings className="mr-3 h-5 w-5" />
                Enter Maintenance
              </Button>
            </Link>

            <Link href={`/vehicle/${vehicleId}/schedule-maintenance`} className="block">
              <Button
                className="w-full h-14 text-base font-medium bg-secondary hover:bg-secondary/90 text-secondary-foreground"
                size="lg"
              >
                <Wrench className="mr-3 h-5 w-5" />
                Schedule Maintenance
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Section 3: Report Issue */}
        <Card className="border-destructive/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-center text-destructive flex items-center justify-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Report Issue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Link href={`/vehicle/${vehicleId}/report-issue`} className="block">
              <Button className="w-full h-16 text-lg font-medium bg-destructive hover:bg-destructive/90" size="lg">
                <AlertTriangle className="mr-3 h-6 w-6" />
                Report Vehicle Issue
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
