"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, CheckCircle, XCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import PhotoUpload from "@/components/photo-upload"

interface DailyChecklistProps {
  vehicleNumber: string
  onBack: () => void
}

interface ChecklistItem {
  id: string
  label: string
  description: string
  status: "pass" | "service_soon" | "fail" | null
}

export default function DailyChecklist({ vehicleNumber, onBack }: DailyChecklistProps) {
  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    { id: "tires", label: "Tires", description: "Check tire condition and pressure", status: null },
    { id: "lights", label: "Lights", description: "Test all lights (headlights, taillights, signals)", status: null },
    { id: "brakes", label: "Brakes", description: "Test brake function and check fluid", status: null },
    { id: "fluids", label: "Fluid Levels", description: "Check oil, coolant, and other fluids", status: null },
    { id: "mirrors", label: "Mirrors", description: "Clean and adjust all mirrors", status: null },
    { id: "safety", label: "Safety Equipment", description: "Verify safety equipment is present", status: null },
  ])

  const [notes, setNotes] = useState("")
  const [photoUrls, setPhotoUrls] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const updateChecklistItem = (id: string, status: "pass" | "service_soon" | "fail") => {
    setChecklist((prev) => prev.map((item) => (item.id === id ? { ...item, status } : item)))
  }

  const handlePhotoUploaded = (url: string) => {
    setPhotoUrls((prev) => [...prev, url])
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/daily-checklist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          vehicleNumber,
          checklist,
          notes,
          photoUrls,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to save checklist")
      }

      const result = await response.json()
      console.log("Checklist saved successfully:", result)

      setIsSubmitting(false)
      onBack()
    } catch (error) {
      console.error("Error saving checklist:", error)
      setIsSubmitting(false)
      // You might want to show an error message to the user here
    }
  }

  const allItemsChecked = checklist.every((item) => item.status !== null)
  const hasFailures = checklist.some((item) => item.status === "fail")
  const hasServiceSoon = checklist.some((item) => item.status === "service_soon")

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Pre-Trip Checklist</h1>
          <p className="text-gray-600">
            {vehicleNumber} - {new Date().toLocaleDateString()}
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
                    Pass
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
                    Fail
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
            placeholder="Add any additional observations or issues..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
          />
        </CardContent>
      </Card>

      {(hasFailures || hasServiceSoon) && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Document Issues</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Please take photos of any failed items or items needing service soon.
            </p>
            <PhotoUpload
              vehicleId={vehicleNumber}
              logType="daily_checklist"
              onPhotoUploaded={handlePhotoUploaded}
              maxPhotos={10}
              existingPhotos={photoUrls}
            />
          </CardContent>
        </Card>
      )}

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
                {hasFailures
                  ? "FAIL - Issues Found"
                  : hasServiceSoon
                    ? "SERVICE SOON - Attention Needed"
                    : "PASS - All Good"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      <Button className="w-full h-12 text-lg" disabled={!allItemsChecked || isSubmitting} onClick={handleSubmit}>
        {isSubmitting ? "Submitting..." : "Complete Checklist"}
      </Button>
    </div>
  )
}
