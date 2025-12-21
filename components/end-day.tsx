"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Clock, Check } from "lucide-react"
import Link from "next/link"

interface EndDayProps {
  vehicleId: string
}

export default function EndDay({ vehicleId }: EndDayProps) {
  const [formData, setFormData] = useState({
    endMileage: "",
  })
  const [startMileage, setStartMileage] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  useEffect(() => {
    // Fetch the start mileage for today
    const fetchStartMileage = async () => {
      try {
        const response = await fetch(`/api/vehicles/${vehicleId}/last-mileage`)
        if (response.ok) {
          const data = await response.json()
          setStartMileage(data.lastMileage)
        }
      } catch (error) {
        console.error("Error fetching start mileage:", error)
      }
    }

    fetchStartMileage()
  }, [vehicleId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/end-day", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          vehicleId,
          endMileage: Number.parseInt(formData.endMileage),
          date: new Date().toISOString(),
        }),
      })

      if (response.ok) {
        setIsSubmitted(true)
        setFormData({ endMileage: "" })
      }
    } catch (error) {
      console.error("Error submitting end day:", error)
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

  const dailyMiles = startMileage && formData.endMileage ? Number.parseInt(formData.endMileage) - startMileage : 0

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-md mx-auto space-y-6">
          <div className="flex items-center justify-center">
            <h1 className="text-xl font-bold">End Day</h1>
          </div>

          <Card>
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Thank You!</h2>
              <p className="text-gray-600 mb-6">Your end of day mileage has been recorded. Have a great evening!</p>
              <Link href="/">
                <Button className="w-full">Return to Home</Button>
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
          <h1 className="text-xl font-bold">End Day</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="mr-2 h-5 w-5 text-purple-600" />
              {getVehicleDisplayName(vehicleId)} - End of Day
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {startMileage && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Starting Mileage:</strong> {startMileage.toLocaleString()} miles
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="endMileage">Final Mileage</Label>
                <Input
                  id="endMileage"
                  type="number"
                  placeholder="Enter final mileage"
                  value={formData.endMileage}
                  onChange={(e) => setFormData({ ...formData, endMileage: e.target.value })}
                  required
                  className="text-lg h-12"
                  min={startMileage || 0}
                />
              </div>

              {dailyMiles > 0 && (
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-green-800">
                    <strong>Miles Today:</strong> {dailyMiles.toLocaleString()} miles
                  </p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-12 text-lg bg-purple-600 hover:bg-purple-700"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Recording..." : "Complete Day"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
