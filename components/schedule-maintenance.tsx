"use client"

import type React from "react"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Wrench, Check, Calendar, Gauge } from "lucide-react"
import Link from "next/link"

interface ScheduleMaintenanceProps {
  vehicleId: string
}

type PolicyRow = {
  maintenance_type: string
  is_active: boolean
}

export default function ScheduleMaintenance({ vehicleId }: ScheduleMaintenanceProps) {
  const [formData, setFormData] = useState({
    maintenanceType: "",
    description: "",
    triggerType: "mileage" as "mileage" | "date",
    targetMileage: "",
    targetDate: "",
  })

  const [maintenanceTypes, setMaintenanceTypes] = useState<string[]>([])
  const [loadingTypes, setLoadingTypes] = useState(false)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string>("")

  useEffect(() => {
    ;(async () => {
      setLoadingTypes(true)
      try {
        const res = await fetch("/api/manager/maintenance-policy", { cache: "no-store" })
        if (!res.ok) return
        const j = (await res.json()) as PolicyRow[] | any

        const types = (Array.isArray(j) ? j : [])
          .filter((r: any) => r?.is_active !== false)
          .map((r: any) => String(r?.maintenance_type ?? "").trim())
          .filter(Boolean)
          .sort((a: string, b: string) => a.localeCompare(b))

        setMaintenanceTypes(types)
      } finally {
        setLoadingTypes(false)
      }
    })()
  }, [])

  const canSubmit = useMemo(() => {
    if (!formData.maintenanceType) return false
    if (formData.triggerType === "mileage") return formData.targetMileage.trim().length > 0
    return formData.targetDate.trim().length > 0
  }, [formData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg("")
    setIsSubmitting(true)

    try {
      const payload: any = {
        maintenance_type: formData.maintenanceType,
        description: formData.description || null,
      }

      if (formData.triggerType === "mileage") {
        const miles = Number.parseInt(formData.targetMileage, 10)
        if (!Number.isFinite(miles)) {
          setErrorMsg("Please enter a valid mileage.")
          return
        }
        payload.due_mileage = miles
      } else {
        if (!formData.targetDate) {
          setErrorMsg("Please select a target date.")
          return
        }
        payload.due_date = formData.targetDate // YYYY-MM-DD
      }

      const response = await fetch(`/api/vehicles/${vehicleId}/scheduled-maintenance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const j = await response.json().catch(() => null)
        setErrorMsg(j?.error ?? "Failed to schedule maintenance.")
        return
      }

      setIsSubmitted(true)
      setFormData({
        maintenanceType: "",
        description: "",
        triggerType: "mileage",
        targetMileage: "",
        targetDate: "",
      })
    } catch (error) {
      console.error("Error scheduling maintenance:", error)
      setErrorMsg("Unexpected error scheduling maintenance.")
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
            <h1 className="text-xl font-bold">Schedule Maintenance</h1>
          </div>

          <Card>
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Maintenance Scheduled!</h2>
              <p className="text-gray-600 mb-6">
                Your maintenance reminder has been set for {getVehicleDisplayName(vehicleId)}.
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
          <h1 className="text-xl font-bold">Schedule Maintenance</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Wrench className="mr-2 h-5 w-5 text-orange-600" />
              {getVehicleDisplayName(vehicleId)} - Schedule Maintenance
            </CardTitle>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="maintenanceType">Maintenance Type</Label>
                <Select
                  value={formData.maintenanceType}
                  onValueChange={(value) => setFormData({ ...formData, maintenanceType: value })}
                  required
                >
                  <SelectTrigger className="h-12">
                    <SelectValue
                      placeholder={loadingTypes ? "Loading types..." : "Select maintenance type"}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {maintenanceTypes.length === 0 ? (
                      <SelectItem value="__none" disabled>
                        {loadingTypes ? "Loading..." : "No types found (set them in Maintenance Settings)"}
                      </SelectItem>
                    ) : (
                      maintenanceTypes.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <div className="text-xs text-muted-foreground">
                  Types are managed in <span className="font-medium">Maintenance Settings</span>.
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Additional details about the maintenance..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="min-h-20"
                  rows={3}
                />
              </div>

              <div className="space-y-4">
                <Label>Reminder Trigger</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={formData.triggerType === "mileage" ? "default" : "outline"}
                    onClick={() => setFormData({ ...formData, triggerType: "mileage" })}
                    className="h-12"
                  >
                    <Gauge className="mr-2 h-4 w-4" />
                    Mileage
                  </Button>
                  <Button
                    type="button"
                    variant={formData.triggerType === "date" ? "default" : "outline"}
                    onClick={() => setFormData({ ...formData, triggerType: "date" })}
                    className="h-12"
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    Date
                  </Button>
                </div>
              </div>

              {formData.triggerType === "mileage" ? (
                <div className="space-y-2">
                  <Label htmlFor="targetMileage">Target Mileage</Label>
                  <Input
                    id="targetMileage"
                    type="number"
                    placeholder="Enter mileage (e.g., 75000)"
                    value={formData.targetMileage}
                    onChange={(e) => setFormData({ ...formData, targetMileage: e.target.value })}
                    required
                    className="text-lg h-12"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="targetDate">Target Date</Label>
                  <Input
                    id="targetDate"
                    type="date"
                    value={formData.targetDate}
                    onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                    required
                    className="text-lg h-12"
                  />
                </div>
              )}

              {errorMsg ? (
                <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  {errorMsg}
                </div>
              ) : null}

              <Button
                type="submit"
                className="w-full h-12 text-lg bg-orange-600 hover:bg-orange-700"
                disabled={isSubmitting || !canSubmit}
              >
                {isSubmitting ? "Scheduling..." : "Schedule Maintenance"}
              </Button>

              {maintenanceTypes.length === 0 ? (
                <div className="text-xs text-muted-foreground text-center">
                  Add maintenance types (and intervals) in{" "}
                  <span className="font-medium">Manager → Maintenance Settings</span>.
                </div>
              ) : null}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
