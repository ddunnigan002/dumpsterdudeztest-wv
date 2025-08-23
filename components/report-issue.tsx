"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { AlertTriangle, Check } from "lucide-react"
import Link from "next/link"
import PhotoUpload from "@/components/photo-upload"

interface ReportIssueProps {
  vehicleId: string
}

export default function ReportIssue({ vehicleId }: ReportIssueProps) {
  const [formData, setFormData] = useState({
    description: "",
    photos: [] as string[],
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/report-issue", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          vehicleId,
          description: formData.description,
          photos: formData.photos,
          date: new Date().toISOString(),
        }),
      })

      if (response.ok) {
        setIsSubmitted(true)
        setFormData({ description: "", photos: [] })
      }
    } catch (error) {
      console.error("Error submitting issue report:", error)
    } finally {
      setIsSubmitting(false)
    }
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

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-md mx-auto space-y-6">
          <div className="flex items-center justify-center">
            <h1 className="text-xl font-bold">Report Issue</h1>
          </div>

          <Card>
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Issue Reported!</h2>
              <p className="text-gray-600 mb-6">
                Your issue report has been submitted for {getVehicleDisplayName(vehicleId)}. Management will be
                notified.
              </p>
              <Link href={`/vehicle/${vehicleId.toLowerCase()}`}>
                <Button className="w-full">Return to Dashboard</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-center">
          <h1 className="text-xl font-bold">Report Issue</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="mr-2 h-5 w-5 text-red-600" />
              {getVehicleDisplayName(vehicleId)} - Issue Report
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="description">Issue Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the issue in detail... (e.g., strange noise from engine, hydraulic leak, warning light, etc.)"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                  className="min-h-32 text-base"
                  rows={6}
                />
              </div>

              <div className="space-y-2">
                <Label>Photos (Optional)</Label>
                <PhotoUpload
                  onPhotosChange={(photos) => setFormData({ ...formData, photos })}
                  maxPhotos={10}
                  context={`issue-${vehicleId.toLowerCase()}`}
                />
              </div>

              <Button type="submit" className="w-full h-12 text-lg bg-red-600 hover:bg-red-700" disabled={isSubmitting}>
                {isSubmitting ? "Submitting Report..." : "Submit Issue Report"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
