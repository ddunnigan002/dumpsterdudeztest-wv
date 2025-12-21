"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { CheckCircle, XCircle, ArrowLeft, Calendar } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface MonthlyChecklistProps {
  vehicleId: string
}

interface ChecklistItem {
  id: string
  label: string
  description: string
  status: "pass" | "service_soon" | "fail" | null
}

function MonthlyChecklist({ vehicleId }: MonthlyChecklistProps) {
  const [dueDate, setDueDate] = useState<string>("")
  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    {
      id: "change_engine_oil",
      label: "Engine Oil & Filter",
      description: "Change engine oil & filter (or per OEM hours/miles)",
      status: null,
    },
    { id: "replace_air_filter", label: "Air Filter", description: "Replace or clean air filter", status: null },
    {
      id: "inspect_brake_system",
      label: "Brake System",
      description: "Inspect brake pads/shoes, drums/rotors, and slack adjusters",
      status: null,
    },
    {
      id: "change_hydraulic_filter",
      label: "Hydraulic Filter",
      description: "Change hydraulic filter (per hooklift OEM recommendation)",
      status: null,
    },
    {
      id: "check_differential_fluid",
      label: "Differential Fluid",
      description: "Check and top-off rear differential fluid",
      status: null,
    },
    {
      id: "inspect_frame_rails",
      label: "Frame Rails",
      description: "Inspect frame rails for cracks or rust",
      status: null,
    },
    {
      id: "test_block_heater",
      label: "Block Heater",
      description: "Test block heater & cold-weather systems (seasonal)",
      status: null,
    },
    {
      id: "clean_radiator_fins",
      label: "Radiator & Intercooler",
      description: "Deep clean radiator & intercooler fins (prevents overheating)",
      status: null,
    },
  ])

  const [notes, setNotes] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    fetchDueDate()
  }, [])

  const fetchDueDate = async () => {
    try {
      const response = await fetch("/api/checklist-settings?type=monthly")
      if (response.ok) {
        const data = await response.json()
        if (data.settings && data.settings.length > 0) {
          const setting = data.settings[0]
          const nextDueDate = getNextDueDate(setting.due_day_of_month)
          setDueDate(nextDueDate)
        }
      }
    } catch (error) {
      console.error("Error fetching due date:", error)
      const nextDueDate = getNextDueDate(1)
      setDueDate(nextDueDate)
    }
  }

  const getNextDueDate = (dayOfMonth: number): string => {
    const today = new Date()
    const currentMonth = today.getMonth()
    const currentYear = today.getFullYear()
    let dueDate = new Date(currentYear, currentMonth, dayOfMonth)

    if (dueDate < today) {
      dueDate = new Date(currentYear, currentMonth + 1, dayOfMonth)
    }

    return dueDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
  }

  const updateChecklistItem = (id: string, status: "pass" | "service_soon" | "fail") => {
    setChecklist((prev) => prev.map((item) => (item.id === id ? { ...item, status } : item)))
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/monthly-checklist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          vehicleId,
          checklist,
          notes,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to save monthly checklist")
      }

      setIsSubmitting(false)
      window.history.back()
    } catch (error) {
      console.error("Error saving monthly checklist:", error)
      setIsSubmitting(false)
    }
  }

  const allItemsChecked = checklist.every((item) => item.status !== null)
  const hasFailures = checklist.some((item) => item.status === "fail")
  const hasServiceSoon = checklist.some((item) => item.status === "service_soon")

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 p-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-orange-600">Monthly Service</h1>
          <p className="text-gray-600">
            {vehicleId} - {new Date().toLocaleDateString()}
          </p>
          {dueDate && (
            <div className="flex items-center gap-2 mt-1">
              <Calendar className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium text-orange-600">Due: {dueDate}</span>
            </div>
          )}
        </div>
      </div>

      {/* Checklist Items */}
      <div className="space-y-4 mb-6">
        {checklist.map((item) => (
          <Card key={item.id}>
            <CardContent className="p-4">
              <div className="space-y-3">
                <div>
                  <h3 className="font-medium text-gray-900">{item.label}</h3>
                  <p className="text-sm text-gray-600">{item.description}</p>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant={item.status === "pass" ? "default" : "outline"}
                    size="sm"
                    className={`flex-1 ${item.status === "pass" ? "bg-green-600 hover:bg-green-700" : ""}`}
                    onClick={() => updateChecklistItem(item.id, "pass")}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Complete
                  </Button>
                  <Button
                    variant={item.status === "service_soon" ? "default" : "outline"}
                    size="sm"
                    className={`flex-1 ${item.status === "service_soon" ? "bg-yellow-500 hover:bg-yellow-600 text-white" : ""}`}
                    onClick={() => updateChecklistItem(item.id, "service_soon")}
                  >
                    Service Soon
                  </Button>
                  <Button
                    variant={item.status === "fail" ? "destructive" : "outline"}
                    size="sm"
                    className="flex-1"
                    onClick={() => updateChecklistItem(item.id, "fail")}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Needs Service
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Notes Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Service Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Add service details, part numbers, vendor information..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
          />
        </CardContent>
      </Card>

      {allItemsChecked && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">Overall Status:</span>
              <Badge
                variant={hasFailures ? "destructive" : hasServiceSoon ? "secondary" : "secondary"}
                className={
                  hasFailures ? "" : hasServiceSoon ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800"
                }
              >
                {hasFailures ? "SERVICE REQUIRED" : hasServiceSoon ? "SERVICE SOON - Attention Needed" : "ALL COMPLETE"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      <Button className="w-full h-12 text-lg" disabled={!allItemsChecked || isSubmitting} onClick={handleSubmit}>
        {isSubmitting ? "Submitting..." : "Complete Monthly Checklist"}
      </Button>
    </div>
  )
}

export { MonthlyChecklist }
export default MonthlyChecklist
