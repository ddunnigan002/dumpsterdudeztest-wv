"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Fuel, Save, X } from "lucide-react"

interface HistoricalGasEntryFormProps {
  vehicleNumber: string
  selectedDate: string
  onSave: (data: any) => void
  onCancel: () => void
  initialData?: {
    gallons_purchased?: number | null
    fuel_cost?: number | null
    notes?: string | null
  }
}

export function HistoricalGasEntryForm({
  vehicleNumber,
  selectedDate,
  onSave,
  onCancel,
  initialData,
}: HistoricalGasEntryFormProps) {
  const [formData, setFormData] = useState({
    gallons: initialData?.gallons_purchased?.toString() || "",
    totalCost: initialData?.fuel_cost?.toString() || "",
    notes: initialData?.notes || "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const data = {
        gallons_purchased: formData.gallons ? Number.parseFloat(formData.gallons) : null,
        fuel_cost: formData.totalCost ? Number.parseFloat(formData.totalCost) : null,
        notes: formData.notes || null,
        manager_override: true,
      }
      await onSave(data)
    } catch (error) {
      console.error("Error saving gas entry:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="border-orange-200">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Fuel className="h-5 w-5 text-orange-600" />
            Gas Entry - {selectedDate}
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
              <Label htmlFor="gallons">Gallons Purchased</Label>
              <Input
                id="gallons"
                type="number"
                step="0.01"
                value={formData.gallons}
                onChange={(e) => setFormData({ ...formData, gallons: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="totalCost">Total Cost ($)</Label>
              <Input
                id="totalCost"
                type="number"
                step="0.01"
                value={formData.totalCost}
                onChange={(e) => setFormData({ ...formData, totalCost: e.target.value })}
                placeholder="0.00"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Input
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Optional notes about fuel purchase..."
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" className="bg-orange-500 hover:bg-orange-600" disabled={isSubmitting}>
              <Save className="h-4 w-4 mr-2" />
              {isSubmitting ? "Saving..." : "Save Gas Entry"}
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
