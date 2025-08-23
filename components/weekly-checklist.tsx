"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { CheckCircle, XCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface WeeklyChecklistProps {
  vehicleId: string
}

interface ChecklistItem {
  id: string
  label: string
  description: string
  status: "pass" | "service_soon" | "fail" | null
}

function WeeklyChecklist({ vehicleId }: WeeklyChecklistProps) {
  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    {
      id: "grease_chassis_points",
      label: "Grease Chassis Points",
      description: "Grease all chassis lube points (steering, suspension, driveshaft U-joints)",
      status: null,
    },
    {
      id: "lubricate_hooklift_points",
      label: "Lubricate Hooklift",
      description: "Lubricate hooklift pivot points & rollers",
      status: null,
    },
    {
      id: "inspect_hydraulic_cylinders",
      label: "Hydraulic Cylinders",
      description: "Inspect hydraulic cylinders for pitting or excessive wear",
      status: null,
    },
    {
      id: "inspect_hydraulic_filter",
      label: "Hydraulic Filter",
      description: "Inspect hydraulic filter sight glass for contamination/cloudiness",
      status: null,
    },
    {
      id: "clean_battery_terminals",
      label: "Battery Terminals",
      description: "Clean and check battery terminals for corrosion",
      status: null,
    },
    {
      id: "check_def_fluid",
      label: "DEF Fluid",
      description: "Check DEF fluid (for diesel emissions systems)",
      status: null,
    },
    {
      id: "torque_wheel_lugs",
      label: "Wheel Lug Nuts",
      description: "Torque-check wheel lug nuts (especially after tire work)",
      status: null,
    },
    {
      id: "inspect_tarp_straps",
      label: "Tarp Straps",
      description: "Inspect tarp straps, ropes, or motors for fraying/wear",
      status: null,
    },
    {
      id: "check_door_latches",
      label: "Door Latches",
      description: "Check door latches and hinges on dumpster gates for bending/wear",
      status: null,
    },
    {
      id: "wash_truck_clean_cab",
      label: "Wash & Clean",
      description: "Wash truck and clean cab interior (reduces corrosion & improves inspection visibility)",
      status: null,
    },
  ])

  const [notes, setNotes] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const updateChecklistItem = (id: string, status: "pass" | "service_soon" | "fail") => {
    setChecklist((prev) => prev.map((item) => (item.id === id ? { ...item, status } : item)))
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/weekly-checklist", {
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
        throw new Error("Failed to save weekly checklist")
      }

      setIsSubmitting(false)
      // Navigate back to vehicle dashboard
      window.history.back()
    } catch (error) {
      console.error("Error saving weekly checklist:", error)
      setIsSubmitting(false)
    }
  }

  const allItemsChecked = checklist.every((item) => item.status !== null)
  const hasFailures = checklist.some((item) => item.status === "fail")
  const hasServiceSoon = checklist.some((item) => item.status === "service_soon")

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 p-4">
      {/* Header */}
      <div className="flex items-center justify-center mb-6">
        <div>
          <h1 className="text-xl font-bold text-orange-600">Weekly Maintenance</h1>
          <p className="text-gray-600 text-center">
            {vehicleId} - {new Date().toLocaleDateString()}
          </p>
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
                    Needs Attention
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
          <CardTitle>Additional Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Add any additional observations or maintenance notes..."
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
                {hasFailures ? "ATTENTION NEEDED" : hasServiceSoon ? "SERVICE SOON - Attention Needed" : "ALL COMPLETE"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      <Button className="w-full h-12 text-lg" disabled={!allItemsChecked || isSubmitting} onClick={handleSubmit}>
        {isSubmitting ? "Submitting..." : "Complete Weekly Checklist"}
      </Button>
    </div>
  )
}

export { WeeklyChecklist }
export default WeeklyChecklist
