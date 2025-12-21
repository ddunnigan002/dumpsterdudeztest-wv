"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
  const [weeklyDueDate, setWeeklyDueDate] = useState<string>("")
  const [monthlyDueDate, setMonthlyDueDate] = useState<string>("")
  const [showEndDayReminder, setShowEndDayReminder] = useState(false)
  const [yesterdayDate, setYesterdayDate] = useState<string>("")

  useEffect(() => {
    fetchMaintenanceAlerts()
    fetchChecklistDueDates()
    checkEndDayStatus()
  }, [vehicleId])

  const checkEndDayStatus = async () => {
    try {
      const response = await fetch(`/api/check-end-day?vehicleId=${vehicleId}`)
      if (response.ok) {
        const data = await response.json()
        if (data.needsEndDay) {
          setShowEndDayReminder(true)
          setYesterdayDate(data.yesterdayFormatted)
        }
      }
    } catch (error) {
      console.error("Error checking end day status:", error)
    }
  }

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

  const fetchChecklistDueDates = async () => {
    try {
      const [weeklyRes, monthlyRes] = await Promise.all([
        fetch("/api/checklist-settings?type=weekly"),
        fetch("/api/checklist-settings?type=monthly"),
      ])

      if (weeklyRes.ok) {
        const data = await weeklyRes.json()
        if (data.settings && data.settings.length > 0) {
          const nextDue = getNextWeeklyDueDate(data.settings[0].due_day_of_week)
          setWeeklyDueDate(nextDue)
        }
      }

      if (monthlyRes.ok) {
        const data = await monthlyRes.json()
        if (data.settings && data.settings.length > 0) {
          const nextDue = getNextMonthlyDueDate(data.settings[0].due_day_of_month)
          setMonthlyDueDate(nextDue)
        }
      }
    } catch (error) {
      console.error("Error fetching checklist due dates:", error)
    }
  }

  const getNextWeeklyDueDate = (dayOfWeek: number): string => {
    const today = new Date()
    const currentDay = today.getDay()
    const daysUntilDue = (dayOfWeek - currentDay + 7) % 7 || 7
    const dueDate = new Date(today)
    dueDate.setDate(today.getDate() + daysUntilDue)
    return dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }

  const getNextMonthlyDueDate = (dayOfMonth: number): string => {
    const today = new Date()
    const currentMonth = today.getMonth()
    const currentYear = today.getFullYear()
    let dueDate = new Date(currentYear, currentMonth, dayOfMonth)
    if (dueDate < today) {
      dueDate = new Date(currentYear, currentMonth + 1, dayOfMonth)
    }
    return dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })
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
      <Dialog open={showEndDayReminder} onOpenChange={setShowEndDayReminder}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Clock className="h-5 w-5" />
              End Day Reminder
            </DialogTitle>
            <DialogDescription>
              You need to complete the "End Day" task for {yesterdayDate} before starting today's checklist.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-4">
            <Alert className="border-destructive bg-destructive/10">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <AlertDescription className="text-destructive">
                Please record yesterday's ending mileage and any issues before proceeding with today's tasks.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter className="flex-col sm:flex-col gap-2">
            <Button
              onClick={() => {
                setShowEndDayReminder(false)
                router.push(`/vehicle/${vehicleId}/end-day`)
              }}
              className="w-full bg-destructive hover:bg-destructive/90"
            >
              <Clock className="mr-2 h-4 w-4" />
              Complete End Day for {yesterdayDate}
            </Button>
            <Button variant="outline" onClick={() => setShowEndDayReminder(false)} className="w-full">
              I'll do this later
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                className="w-full h-14 text-base font-medium bg-secondary hover:bg-secondary/90 text-secondary-foreground flex items-center justify-between px-4"
                size="lg"
              >
                <div className="flex items-center">
                  <Calendar className="mr-3 h-5 w-5" />
                  <span>Weekly Checklist</span>
                </div>
                {weeklyDueDate && <span className="text-xs opacity-80">Due {weeklyDueDate}</span>}
              </Button>
            </Link>

            <Link href={`/vehicle/${vehicleId}/monthly-checklist`} className="block">
              <Button
                className="w-full h-14 text-base font-medium bg-secondary hover:bg-secondary/90 text-secondary-foreground flex items-center justify-between px-4"
                size="lg"
              >
                <div className="flex items-center">
                  <CalendarDays className="mr-3 h-5 w-5" />
                  <span>Monthly Checklist</span>
                </div>
                {monthlyDueDate && <span className="text-xs opacity-80">Due {monthlyDueDate}</span>}
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
