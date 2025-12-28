"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, CheckCircle, XCircle, AlertTriangle } from "lucide-react"
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
  ])

  const [notes, setNotes] = useState("")
  const [photoUrls, setPhotoUrls] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string>("")

  const updateChecklistItem = (id: string, status: "pass" | "service_soon" | "fail") => {
    setChecklist((prev) => prev.map((item) => (item.id === id ? { ...item, status } : item)))
  }

  const handlePhotoUploaded = (url: string) => {
    setPhotoUrls((prev) => [...prev, url])
  }

  const computeOverallStatus = () => {
    if (checklist.some((i) => i.status === "fail")) return "fail"
    if (checklist.some((i) => i.status === "service_soon")) return "service_soon"
    return "pass"
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setError("")

    console.log("🚀 Starting checklist submission...")
    console.log("Vehicle Number:", vehicleNumber)
    console.log("Checklist:", checklist)
    console.log("Notes:", notes)
    console.log("Photo URLs:", photoUrls)

    try {
      const payload = {
        vehicleNumber,
        checklist,
        notes,
        photoUrls,
        overall_status: computeOverallStatus()
      }

      console.log("📤 Sending payload:", JSON.stringify(payload, null, 2))

      const response = await fetch("/api/daily-checklist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      console.log("📡 Response status:", response.status)
      console.log("📡 Response ok:", response.ok)

      const responseText = await response.text()
      console.log("📡 Raw response:", responseText)

      let result
      try {
        result = JSON.parse(responseText)
      } catch (parseError) {
        console.error("❌ Failed to parse response as JSON:", parseError)
        throw new Error(`Invalid JSON response: ${responseText}`)
      }

      if (!response.ok) {
        console.error("❌ API Error:", result)
        throw new Error(result.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      console.log("✅ Checklist saved successfully:", result)

      // Show success message briefly before going back
      alert("Checklist saved successfully!")
      onBack()
    } catch (error) {
      console.error("❌ Error saving checklist:", error)
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
      setError(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const allItemsChecked = checklist.every((item) => item.status !== null)
  const hasFailures = checklist.some((item) => item.status === "fail")
  const hasServiceSoon = checklist.some((item) => item.status === "service_soon")

  return (
    <div className="min-h-screen bg-background p-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-foreground">Pre-Trip Checklist</h1>
          <p className="text-muted-foreground">
            {vehicleNumber} - {new Date().toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="mb-6 border-destructive bg-destructive/10">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
              <div>
                <h4 className="font-medium text-destructive">Error Saving Checklist</h4>
                <p className="text-sm text-destructive/80 mt-1">{error}</p>
                <p className="text-xs text-destructive/60 mt-2">Check the browser console for more details.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Checklist Items */}
      <div className="space-y-4 mb-6">
        {checklist.map((item) => (
          <Card key={item.id}>
            <CardContent className="p-4">
              <div className="space-y-3">
                <div>
                  <h3 className="font-medium text-foreground">{item.label}</h3>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
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
                    className={`flex-1 ${item.status === "service_soon" ? "bg-accent hover:bg-accent/90 text-accent-foreground" : ""}`}
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
            <p className="text-sm text-muted-foreground mb-4">
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
                  hasFailures ? "" : hasServiceSoon ? "bg-accent text-accent-foreground" : "bg-green-100 text-green-800"
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
