"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Calendar,
  Truck,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

interface ChecklistSummary {
  id: string
  vehicle_number: string
  vehicle_make: string
  vehicle_model: string
  checklist_date: string
  overall_status: "pass" | "fail" | "pending"
  driver_name: string
  issues_count: number
  notes?: string
  // Individual checklist items
  tires_condition: boolean
  lights_working: boolean
  brakes_working: boolean
  fluid_levels_ok: boolean
  mirrors_clean: boolean
  safety_equipment_present: boolean
}

interface DayData {
  date: string
  checklists: ChecklistSummary[]
  completionRate: number
  hasIssues: boolean
}

export default function PreTripReports() {
  const [reports, setReports] = useState<ChecklistSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null)
  const [viewMode, setViewMode] = useState<"calendar" | "details">("calendar")
  const [selectedVehicle, setSelectedVehicle] = useState<string>("All")
  const [selectedChecklistType, setSelectedChecklistType] = useState<string>("All")

  useEffect(() => {
    fetchReports()
  }, [currentDate])

  const fetchReports = async () => {
    try {
      // Fetch reports for the current month
      const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
      const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)

      const response = await fetch(
        `/api/pre-trip-reports?start=${startDate.toISOString()}&end=${endDate.toISOString()}`,
      )
      if (response.ok) {
        const data = await response.json()
        setReports(data.reports || [])
      }
    } catch (error) {
      console.error("Error fetching reports:", error)
    } finally {
      setLoading(false)
    }
  }

  const generateCalendarData = (): DayData[] => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const calendarData: DayData[] = []

    const filteredReports = reports.filter((report) => {
      // Filter by vehicle
      if (selectedVehicle !== "All" && report.vehicle_number !== selectedVehicle) {
        return false
      }

      // Filter by checklist type (for now, all existing reports are daily)
      // This will be expanded when weekly/monthly data is available
      if (selectedChecklistType !== "All" && selectedChecklistType !== "Daily") {
        return false
      }

      return true
    })

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day).toISOString().split("T")[0]
      const dayReports = filteredReports.filter((r) => r.checklist_date === date)

      let expectedVehicleCount = 1
      if (selectedVehicle === "All") {
        expectedVehicleCount = new Set(reports.map((r) => r.vehicle_number)).size || 1
      } else {
        expectedVehicleCount = 1 // Only one vehicle when filtered
      }

      const completionRate = dayReports.length / expectedVehicleCount
      const hasIssues = dayReports.some((r) => r.overall_status === "fail" || r.issues_count > 0)

      calendarData.push({
        date,
        checklists: dayReports,
        completionRate,
        hasIssues,
      })
    }

    return calendarData
  }

  const calendarData = generateCalendarData()

  const navigateMonth = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate)
    if (direction === "prev") {
      newDate.setMonth(newDate.getMonth() - 1)
    } else {
      newDate.setMonth(newDate.getMonth() + 1)
    }
    setCurrentDate(newDate)
  }

  const handleDayClick = (dayData: DayData) => {
    setSelectedDay(dayData)
    setViewMode("details")
  }

  const getDayStatusColor = (dayData: DayData) => {
    if (dayData.checklists.length === 0) return "bg-gray-100"
    if (dayData.hasIssues) return "bg-red-100 border-red-300"
    if (dayData.completionRate >= 0.8) return "bg-green-100 border-green-300"
    return "bg-yellow-100 border-yellow-300"
  }

  const getChecklistItemStatus = (value: boolean) => {
    return value ? <CheckCircle className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-red-600" />
  }

  if (viewMode === "details" && selectedDay) {
    const filteredDayChecklists = selectedDay.checklists.filter((checklist) => {
      if (selectedVehicle !== "All" && checklist.vehicle_number !== selectedVehicle) {
        return false
      }
      if (selectedChecklistType !== "All" && selectedChecklistType !== "Daily") {
        return false
      }
      return true
    })

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode("calendar")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Calendar
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {new Date(selectedDay.date).toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </h2>
            <p className="text-gray-600">
              {filteredDayChecklists.length} checklist{filteredDayChecklists.length !== 1 ? "s" : ""} completed
              {selectedVehicle !== "All" && ` for ${selectedVehicle}`}
              {selectedChecklistType !== "All" && ` (${selectedChecklistType})`}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {filteredDayChecklists.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <div className="text-gray-600">
                  No checklists completed on this day
                  {selectedVehicle !== "All" && ` for ${selectedVehicle}`}
                  {selectedChecklistType !== "All" && ` (${selectedChecklistType} type)`}.
                </div>
              </CardContent>
            </Card>
          ) : (
            filteredDayChecklists.map((checklist) => (
              <Card key={checklist.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-3">
                      <Truck className="h-5 w-5 text-gray-500" />
                      {checklist.vehicle_number} - {checklist.vehicle_make} {checklist.vehicle_model}
                    </CardTitle>
                    <Badge
                      className={
                        checklist.overall_status === "pass"
                          ? "bg-green-100 text-green-800"
                          : checklist.overall_status === "fail"
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                      }
                    >
                      {checklist.overall_status}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">Driver: {checklist.driver_name}</p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      {getChecklistItemStatus(checklist.tires_condition)}
                      <span className="text-sm">Tires Condition</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {getChecklistItemStatus(checklist.lights_working)}
                      <span className="text-sm">Lights Working</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {getChecklistItemStatus(checklist.brakes_working)}
                      <span className="text-sm">Brakes Working</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {getChecklistItemStatus(checklist.fluid_levels_ok)}
                      <span className="text-sm">Fluid Levels OK</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {getChecklistItemStatus(checklist.mirrors_clean)}
                      <span className="text-sm">Mirrors Clean</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {getChecklistItemStatus(checklist.safety_equipment_present)}
                      <span className="text-sm">Safety Equipment</span>
                    </div>
                  </div>
                  {checklist.notes && (
                    <div className="p-3 bg-gray-50 rounded-md">
                      <p className="text-sm text-gray-700">{checklist.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Pre-Trip Inspection Calendar</h2>
          <p className="text-gray-600">Click on any day to view detailed inspection results</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigateMonth("prev")}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="px-4 py-2 font-medium">
            {currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </span>
          <Button variant="outline" size="sm" onClick={() => navigateMonth("next")}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Vehicle:</span>
              <div className="flex gap-1">
                {["All", "CHEVY", "KENWORTH"].map((vehicle) => (
                  <Button
                    key={vehicle}
                    variant={selectedVehicle === vehicle ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedVehicle(vehicle)}
                    className={selectedVehicle === vehicle ? "bg-orange-600 hover:bg-orange-700" : ""}
                  >
                    {vehicle}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Type:</span>
              <div className="flex gap-1">
                {["All", "Daily", "Weekly", "Monthly"].map((type) => (
                  <Button
                    key={type}
                    variant={selectedChecklistType === type ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedChecklistType(type)}
                    className={selectedChecklistType === type ? "bg-orange-600 hover:bg-orange-700" : ""}
                  >
                    {type}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="text-gray-600">Loading calendar...</div>
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-2">
              {/* Day headers */}
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} className="p-2 text-center font-medium text-gray-500 text-sm">
                  {day}
                </div>
              ))}

              {/* Empty cells for days before month starts */}
              {Array.from({ length: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay() }).map(
                (_, i) => (
                  <div key={`empty-${i}`} className="p-2"></div>
                ),
              )}

              {/* Calendar days */}
              {calendarData.map((dayData, index) => {
                const day = new Date(dayData.date).getDate()
                const isToday = dayData.date === new Date().toISOString().split("T")[0]

                return (
                  <button
                    key={dayData.date}
                    onClick={() => handleDayClick(dayData)}
                    className={`
                      p-3 rounded-lg border-2 transition-all hover:shadow-md
                      ${getDayStatusColor(dayData)}
                      ${isToday ? "ring-2 ring-orange-400" : ""}
                      ${dayData.checklists.length > 0 ? "cursor-pointer" : "cursor-default"}
                    `}
                  >
                    <div className="text-sm font-medium">{day}</div>
                    {dayData.checklists.length > 0 && (
                      <div className="mt-1">
                        <div className="text-xs text-gray-600">
                          {dayData.checklists.length} check{dayData.checklists.length !== 1 ? "s" : ""}
                        </div>
                        {dayData.hasIssues && <AlertTriangle className="h-3 w-3 text-red-500 mx-auto mt-1" />}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
              <span>All Good</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded"></div>
              <span>Incomplete</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-100 border border-red-300 rounded"></div>
              <span>Issues Found</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-100 rounded"></div>
              <span>No Data</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
