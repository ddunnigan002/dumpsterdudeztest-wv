"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { ArrowLeft } from "lucide-react"
import PhotoUpload from "@/components/photo-upload"

interface DailyLogProps {
  vehicleNumber: string
  onBack: () => void
}

export default function DailyLog({ vehicleNumber, onBack }: DailyLogProps) {
  const [formData, setFormData] = useState({
    endMileage: "",
    fuelAdded: "",
    fuelCost: "",
    issuesReported: "",
  })
  const [startMileage, setStartMileage] = useState<number>(0)
  const [photoUrls, setPhotoUrls] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const fetchLastMileage = async () => {
      try {
        const response = await fetch(`/api/vehicles/${vehicleNumber}/last-mileage`)
        if (response.ok) {
          const data = await response.json()
          setStartMileage(data.lastMileage || 0)
        }
      } catch (error) {
        console.error("Error fetching last mileage:", error)
      }
    }
    fetchLastMileage()
  }, [vehicleNumber])

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handlePhotoUploaded = (url: string) => {
    setPhotoUrls((prev) => [...prev, url])
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/daily-log", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          vehicleId: vehicleNumber,
          startMileage: startMileage,
          endMileage: formData.endMileage,
          fuelAdded: formData.fuelAdded,
          fuelCost: formData.fuelCost,
          issuesReported: formData.issuesReported,
          photos: photoUrls,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to save daily log")
      }

      const result = await response.json()
      console.log("Daily log saved:", result)

      setFormData({
        endMileage: "",
        fuelAdded: "",
        fuelCost: "",
        issuesReported: "",
      })
      setPhotoUrls([])
      onBack()
    } catch (error) {
      console.error("Error saving daily log:", error)
      alert("Failed to save daily log. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const isFormValid = formData.endMileage

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Daily Log</h1>
          <p className="text-gray-600">
            {vehicleNumber} - {new Date().toLocaleDateString()}
          </p>
        </div>
      </div>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Mileage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-700">Start Mileage: {startMileage.toLocaleString()}</p>
          </div>
          <div>
            <Label htmlFor="endMileage">End Mileage *</Label>
            <Input
              id="endMileage"
              type="number"
              placeholder="Enter ending mileage"
              value={formData.endMileage}
              onChange={(e) => handleInputChange("endMileage", e.target.value)}
            />
          </div>
          {formData.endMileage && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium text-blue-900">
                Miles Driven Today: {Number.parseInt(formData.endMileage) - startMileage}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fuel Section */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Fuel Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="fuelAdded">Fuel Added (gallons)</Label>
            <Input
              id="fuelAdded"
              type="number"
              step="0.1"
              placeholder="0.0"
              value={formData.fuelAdded}
              onChange={(e) => handleInputChange("fuelAdded", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="fuelCost">Fuel Cost ($)</Label>
            <Input
              id="fuelCost"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={formData.fuelCost}
              onChange={(e) => handleInputChange("fuelCost", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Issues Section */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Issues & Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="issues">Report any issues or observations</Label>
            <Textarea
              id="issues"
              placeholder="Describe any problems, maintenance needs, or other observations..."
              value={formData.issuesReported}
              onChange={(e) => handleInputChange("issuesReported", e.target.value)}
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* Photo Upload Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Photos</CardTitle>
        </CardHeader>
        <CardContent>
          <PhotoUpload
            vehicleId={vehicleNumber}
            logType="daily_log"
            onPhotoUploaded={handlePhotoUploaded}
            maxPhotos={5}
            existingPhotos={photoUrls}
          />
        </CardContent>
      </Card>

      {/* Submit Button */}
      <Button className="w-full h-12 text-lg" disabled={!isFormValid || isSubmitting} onClick={handleSubmit}>
        {isSubmitting ? "Submitting..." : "Complete Daily Log"}
      </Button>
    </div>
  )
}
