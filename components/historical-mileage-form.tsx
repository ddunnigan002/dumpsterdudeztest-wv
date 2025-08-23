"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Clock, Save, X } from "lucide-react"

interface HistoricalMileageFormProps {
  vehicleNumber: string
  selectedDate: string
  onSave: (data: any) => void
  onCancel: () => void
  initialData?: {
    start_mileage?: number | null
    end_mileage?: number | null
    notes?: string | null
  }
}

export function HistoricalMileageForm({
  vehicleNumber,
  selectedDate,
  onSave,
  onCancel,
  initialData,
}: HistoricalMileageFormProps) {
  const [formData, setFormData] = useState({
    startMileage: initialData?.start_mileage?.toString() || "",
    endMileage: initialData?.end_mileage?.toString() || "",
    notes: initialData?.notes || "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const data = {
        start_mileage: formData.startMileage ? Number.parseInt(formData.startMileage) : null,
        end_mileage: formData.endMileage ? Number.parseInt(formData.endMileage) : null,
        notes: formData.notes || null,
        manager_override: true,
      }
      await onSave(data)
    } catch (error) {
      console.error("Error saving mileage entry:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const dailyMiles =
    formData.startMileage && formData.endMileage
      ? Number.parseInt(formData.endMileage) - Number.parseInt(formData.startMileage)
      : 0

  return (
    <Card className="border-orange-200">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-600" />
            Mileage Entry - {selectedDate}
          </div>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startMileage">Start Mileage</Label>
              <Input
                id="startMileage"
                type="number"
                value={formData.startMileage}
                onChange={(e) => setFormData({ ...formData, startMileage: e.target.value })}
                placeholder="0"
              />
            </div>
            <div>
              <Label htmlFor="endMileage">End Mileage</Label>
              <Input
                id="endMileage"
                type="number"
                value={formData.endMileage}
                onChange={(e) => setFormData({ ...formData, endMileage: e.target.value })}
                placeholder="0"
                min={formData.startMileage || 0}
              />
            </div>
          </div>
          {dailyMiles > 0 && (
            <div className="bg-green-50 p-3 rounded-lg">
              <p className="text-sm text-green-800">
                <strong>Miles Driven:</strong> {dailyMiles.toLocaleString()} miles
              </p>
            </div>
          )}
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Input
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Optional notes about mileage..."
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" className="bg-orange-500 hover:bg-orange-600" disabled={isSubmitting}>
              <Save className="h-4 w-4 mr-2" />
              {isSubmitting ? "Saving..." : "Save Mileage Entry"}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
