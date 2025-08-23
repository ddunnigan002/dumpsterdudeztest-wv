"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, FileText, Camera, Truck, AlertTriangle, Calendar, Wrench } from "lucide-react"
import DailyChecklist from "./daily-checklist"
import WeeklyChecklist from "./weekly-checklist"
import MonthlyChecklist from "./monthly-checklist"
import DailyLog from "./daily-log"

type View = "dashboard" | "daily-checklist" | "weekly-checklist" | "monthly-checklist" | "log"

export default function DriverDashboard() {
  const [currentView, setCurrentView] = useState<View>("dashboard")
  const [selectedVehicle, setSelectedVehicle] = useState<string>("TRUCK-001")

  // Mock data - will be replaced with real data from Supabase
  const vehicles = [
    { id: "1", number: "TRUCK-001", make: "Ford", model: "F-550", status: "active" },
    { id: "2", number: "TRUCK-002", make: "Chevrolet", model: "Silverado 3500HD", status: "active" },
  ]

  const todaysTasks = {
    dailyChecklistComplete: false,
    weeklyChecklistComplete: false,
    monthlyChecklistComplete: false,
    logComplete: false,
    issuesReported: 0,
  }

  if (currentView === "daily-checklist") {
    return <DailyChecklist vehicleNumber={selectedVehicle} onBack={() => setCurrentView("dashboard")} />
  }

  if (currentView === "weekly-checklist") {
    return <WeeklyChecklist vehicleNumber={selectedVehicle} onBack={() => setCurrentView("dashboard")} />
  }

  if (currentView === "monthly-checklist") {
    return <MonthlyChecklist vehicleNumber={selectedVehicle} onBack={() => setCurrentView("dashboard")} />
  }

  if (currentView === "log") {
    return <DailyLog vehicleNumber={selectedVehicle} onBack={() => setCurrentView("dashboard")} />
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Driver Dashboard</h1>
        <p className="text-gray-600">Welcome back! Complete your daily tasks below.</p>
      </div>

      {/* Vehicle Selection */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Select Vehicle
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {vehicles.map((vehicle) => (
              <Button
                key={vehicle.id}
                variant={selectedVehicle === vehicle.number ? "default" : "outline"}
                className="justify-start h-auto p-4"
                onClick={() => setSelectedVehicle(vehicle.number)}
              >
                <div className="text-left">
                  <div className="font-semibold">{vehicle.number}</div>
                  <div className="text-sm opacity-70">
                    {vehicle.make} {vehicle.model}
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Daily Tasks */}
      <div className="space-y-4 mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Maintenance Checklists</h2>

        {/* Daily Pre-Trip Checklist */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-full ${todaysTasks.dailyChecklistComplete ? "bg-green-100" : "bg-gray-100"}`}
                >
                  <CheckCircle
                    className={`h-5 w-5 ${todaysTasks.dailyChecklistComplete ? "text-green-600" : "text-gray-400"}`}
                  />
                </div>
                <div>
                  <h3 className="font-medium">Daily Pre-Trip Checklist</h3>
                  <p className="text-sm text-gray-600">Daily vehicle inspection</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {todaysTasks.dailyChecklistComplete ? (
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    Complete
                  </Badge>
                ) : (
                  <Badge variant="outline">Pending</Badge>
                )}
                <Button size="sm" onClick={() => setCurrentView("daily-checklist")}>
                  {todaysTasks.dailyChecklistComplete ? "View" : "Start"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Weekly Checklist */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-full ${todaysTasks.weeklyChecklistComplete ? "bg-green-100" : "bg-blue-100"}`}
                >
                  <Calendar
                    className={`h-5 w-5 ${todaysTasks.weeklyChecklistComplete ? "text-green-600" : "text-blue-600"}`}
                  />
                </div>
                <div>
                  <h3 className="font-medium">Weekly Maintenance</h3>
                  <p className="text-sm text-gray-600">Lubrication & inspection tasks</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {todaysTasks.weeklyChecklistComplete ? (
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    Complete
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-blue-200 text-blue-700">
                    Weekly
                  </Badge>
                )}
                <Button size="sm" onClick={() => setCurrentView("weekly-checklist")}>
                  {todaysTasks.weeklyChecklistComplete ? "View" : "Start"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Checklist */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-full ${todaysTasks.monthlyChecklistComplete ? "bg-green-100" : "bg-orange-100"}`}
                >
                  <Wrench
                    className={`h-5 w-5 ${todaysTasks.monthlyChecklistComplete ? "text-green-600" : "text-orange-600"}`}
                  />
                </div>
                <div>
                  <h3 className="font-medium">Monthly Service</h3>
                  <p className="text-sm text-gray-600">Comprehensive maintenance tasks</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {todaysTasks.monthlyChecklistComplete ? (
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    Complete
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-orange-200 text-orange-700">
                    Monthly
                  </Badge>
                )}
                <Button size="sm" onClick={() => setCurrentView("monthly-checklist")}>
                  {todaysTasks.monthlyChecklistComplete ? "View" : "Start"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Daily Log */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${todaysTasks.logComplete ? "bg-green-100" : "bg-gray-100"}`}>
                  <FileText className={`h-5 w-5 ${todaysTasks.logComplete ? "text-green-600" : "text-gray-400"}`} />
                </div>
                <div>
                  <h3 className="font-medium">Daily Log</h3>
                  <p className="text-sm text-gray-600">Mileage, fuel, and notes</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {todaysTasks.logComplete ? (
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    Complete
                  </Badge>
                ) : (
                  <Badge variant="outline">Pending</Badge>
                )}
                <Button size="sm" onClick={() => setCurrentView("log")}>
                  {todaysTasks.logComplete ? "View" : "Start"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="h-20 flex-col gap-2 bg-transparent">
              <Camera className="h-6 w-6" />
              <span className="text-sm">Report Issue</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2 bg-transparent">
              <AlertTriangle className="h-6 w-6" />
              <span className="text-sm">Emergency</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
