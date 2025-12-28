"use client"

import type React from "react"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Clock, Check } from "lucide-react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"

interface EndDayProps {
  vehicleId: string // UUID
}

type VehicleInfo = {
  id: string
  vehicle_number: string
  make?: string | null
  model?: string | null
}

function toYmd(d: Date) {
  return d.toISOString().slice(0, 10)
}

export default function EndDay({ vehicleId }: EndDayProps) {
  const [formData, setFormData] = useState({ endMileage: "" })
  const [startMileage, setStartMileage] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const [vehicleInfo, setVehicleInfo] = useState<VehicleInfo | null>(null)
  const [vehicleLoading, setVehicleLoading] = useState(true)

  const sp = useSearchParams()
  const dateParam = sp.get("date") // expected YYYY-MM-DD (from dashboard)
  const logDateYmd = useMemo(() => {
    // If passed in, use it. Otherwise today.
    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) return dateParam
    return toYmd(new Date())
  }, [dateParam])

  useEffect(() => {
    let cancelled = false

    const fetchVehicle = async () => {
      setVehicleLoading(true)
      try {
        // If you don't have this endpoint, see note below
        const res = await fetch(`/api/vehicles/${vehicleId}`, { cache: "no-store" })
        if (!res.ok) throw new Error(`Failed to load vehicle: ${res.status}`)
        const json = await res.json()
        const v = (json.vehicle ?? json) as VehicleInfo

        if (!cancelled) setVehicleInfo(v)
      } catch (error) {
        console.error("Error fetching vehicle:", error)
        if (!cancelled) setVehicleInfo(null)
      } finally {
        if (!cancelled) setVehicleLoading(false)
      }
    }

    fetchVehicle()
    return () => {
      cancelled = true
    }
  }, [vehicleId])

  useEffect(() => {
    // Fetch the start mileage (last mileage) for this vehicle
    const fetchStartMileage = async () => {
      try {
        const response = await fetch(`/api/vehicles/${vehicleId}/last-mileage`, { cache: "no-store" })
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

  const vehicleDisplay = useMemo(() => {
    if (!vehicleInfo) return vehicleId
    const parts = [vehicleInfo.vehicle_number, vehicleInfo.make, vehicleInfo.model].filter(Boolean)
    return parts.join(" • ") || vehicleInfo.vehicle_number || vehicleId
  }, [vehicleInfo, vehicleId])

  const dailyMiles =
    startMileage !== null && formData.endMileage
      ? Number.parseInt(formData.endMileage, 10) - startMileage
      : 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    console.log("[v0] End Day Component: Starting submission", {
      vehicleId,
      endMileage: formData.endMileage,
      logDateYmd,
    })

    try {
      const response = await fetch("/api/end-day", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId,
          endMileage: Number.parseInt(formData.endMileage, 10),
          // ✅ send the intended log date (YYYY-MM-DD), not "now"
          log_date: logDateYmd,
        }),
      })

      console.log("[v0] End Day Component: Response status", response.status)

      if (response.ok) {
        const result = await response.json()
        console.log("[v0] End Day Component: Success response", result)
        setIsSubmitted(true)
        setFormData({ endMileage: "" })
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error("[v0] End Day Component: Error response", errorData)
        alert(errorData?.error ?? "Failed to record end of day. Please try again.")
      }
    } catch (error) {
      console.error("[v0] End Day Component: Caught error", error)
      alert("Failed to record end of day. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-background p-4">
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
              <p className="text-muted-foreground mb-6">
                Your end of day mileage has been recorded. Have a great evening!
              </p>
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
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-center">
          <h1 className="text-xl font-bold">End Day</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="mr-2 h-5 w-5 text-primary" />
              {vehicleLoading ? "Loading..." : vehicleDisplay} - End of Day
            </CardTitle>
            <div className="text-sm text-muted-foreground">{new Date(logDateYmd).toLocaleDateString()}</div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {startMileage !== null && (
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm text-foreground">
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
                  min={startMileage ?? 0}
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
                className="w-full h-12 text-lg bg-primary hover:bg-primary/90"
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
