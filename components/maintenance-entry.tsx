"use client"

import { useState } from "react"

import type React from "react"
import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Wrench } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSearchParams } from "next/navigation"

interface MaintenanceEntryProps {
  vehicleId: string
}

interface ScheduledMaintenance {
  id: string
  maintenance_type: string
  due_date?: string
  due_mileage?: number
}

export default function MaintenanceEntry({ vehicleId }: MaintenanceEntryProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [scheduledItems, setScheduledItems] = useState<ScheduledMaintenance[]>([])

  const [formData, setFormData] = useState({
    maintenanceType: "",
    customType: "",
    date: new Date().toISOString().split("T")[0], // Default to today
    serviceProvider: "",
    cost: "",
    notes: "",
    mileage: "",
    scheduledMaintenanceId: "", // Track which scheduled item this completes
  })

  useEffect(() => {
    const fetchScheduledMaintenance = async () => {
      try {
        const response = await fetch(`/api/vehicles/${vehicleId}/scheduled-maintenance`)
        if (response.ok) {
          const data = await response.json()
          if (data && data.length > 0) {
            setScheduledItems(data)
          } else {
            setScheduledItems([])
          }
        } else {
          setScheduledItems([])
        }
      } catch (error) {
        console.error("Error fetching scheduled maintenance:", error)
        setScheduledItems([])
      }
    }

    fetchScheduledMaintenance()
  }, [vehicleId])

  const maintenanceTypes = [
    "Oil Change",
    "Brake Service",
    "Tire Rotation",
    "Engine Tune-up",
    "Transmission Service",
    "Coolant Flush",
    "Air Filter Replacement",
    "Fuel Filter Replacement",
    "Battery Replacement",
    "Inspection",
    "Other",
  ]

  const allMaintenanceOptions = [
    ...maintenanceTypes,
    ...scheduledItems.map((item) => item.maintenance_type).filter((type) => !maintenanceTypes.includes(type)),
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/enter-maintenance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          vehicleNumber: vehicleId.toUpperCase(),
          maintenanceType: formData.maintenanceType === "Other" ? formData.customType : formData.maintenanceType,
          date: formData.date,
          serviceProvider: formData.serviceProvider,
          cost: Number.parseFloat(formData.cost) || 0,
          notes: formData.notes,
          mileage: Number.parseInt(formData.mileage) || 0,
          scheduledMaintenanceId: formData.scheduledMaintenanceId, // Include scheduled ID to mark as complete
        }),
      })

      if (response.ok) {
        setIsSuccess(true)
      } else {
        throw new Error("Failed to save maintenance record")
      }
    } catch (error) {
      console.error("Error saving maintenance:", error)
      alert("Failed to save maintenance record. Please try again.")
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

  const handleOutstandingTaskSelect = (taskId: string) => {
    console.log("Selected taskId:", taskId)
    console.log("Available scheduledItems:", scheduledItems)

    const selectedTask = scheduledItems.find((item) => item.id === taskId)
    console.log("Found selectedTask:", selectedTask)

    if (selectedTask) {
      setFormData((prev) => ({
        ...prev,
        maintenanceType: selectedTask.maintenance_type,
        scheduledMaintenanceId: taskId,
      }))
      console.log("Updated formData with:", selectedTask.maintenance_type)
    } else {
      console.log("No task found for ID:", taskId)
    }
  }

  const clearOutstandingTask = () => {
    setFormData({
      ...formData,
      maintenanceType: "",
      scheduledMaintenanceId: "",
    })
  }

  const formatMaintenanceTaskDisplay = (item: ScheduledMaintenance) => {
    let display = item.maintenance_type
    if (item.due_date) {
      display += ` (Due: ${new Date(item.due_date).toLocaleDateString()})`
    }
    if (item.due_mileage) {
      display += ` (Due: ${item.due_mileage.toLocaleString()} mi)`
    }
    return display
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 p-4">
        <div className="max-w-md mx-auto space-y-6">
          <div className="text-center">
            <h1 className="text-lg font-bold text-orange-600">Dumpster Dudez</h1>
            <h2 className="text-sm text-gray-600">{getVehicleDisplayName(vehicleId)}</h2>
          </div>

          <Card>
            <CardContent className="pt-6 text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <Wrench className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-green-800">Maintenance Recorded!</h3>
              <p className="text-gray-600">Your maintenance record has been saved successfully.</p>
              <Link href={`/vehicle/${vehicleId}`}>
                <Button className="w-full bg-orange-600 hover:bg-orange-700">Back to Dashboard</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 p-4">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Link href={`/vehicle/${vehicleId}`}>
            <Button variant="ghost" size="sm" className="text-orange-600 hover:text-orange-700">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div className="text-center">
            <h1 className="text-lg font-bold text-orange-600">Dumpster Dudez</h1>
            <h2 className="text-sm text-gray-600">{getVehicleDisplayName(vehicleId)}</h2>
          </div>
          <div></div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center flex items-center justify-center gap-2">
              <Wrench className="h-5 w-5" />
              Enter Maintenance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {scheduledItems.length > 0 && (
              <div className="mb-6 p-4 bg-orange-50 rounded-lg border border-orange-200">
                <Label className="text-sm font-semibold text-orange-800 mb-2 block">
                  Outstanding Maintenance Tasks
                </Label>
                <select
                  value={formData.scheduledMaintenanceId}
                  onChange={(e) => handleOutstandingTaskSelect(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md bg-white"
                >
                  <option value="">Select an outstanding task to complete</option>
                  {scheduledItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {formatMaintenanceTaskDisplay(item)}
                    </option>
                  ))}
                </select>
                {formData.scheduledMaintenanceId && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={clearOutstandingTask}
                    className="mt-2 text-xs bg-transparent"
                  >
                    Clear Selection
                  </Button>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="maintenanceType">Maintenance Type</Label>
                <select
                  value={formData.maintenanceType}
                  onChange={(e) => setFormData({ ...formData, maintenanceType: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md bg-white"
                  required
                >
                  <option value="">Select maintenance type</option>
                  {maintenanceTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              {formData.maintenanceType === "Other" && (
                <div>
                  <Label htmlFor="customType">Custom Maintenance Type</Label>
                  <Input
                    id="customType"
                    value={formData.customType}
                    onChange={(e) => setFormData({ ...formData, customType: e.target.value })}
                    placeholder="Enter custom maintenance type"
                    required
                  />
                </div>
              )}

              <div>
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="mileage">Current Mileage</Label>
                <Input
                  id="mileage"
                  type="number"
                  value={formData.mileage}
                  onChange={(e) => setFormData({ ...formData, mileage: e.target.value })}
                  placeholder="Enter current mileage"
                  required
                />
              </div>

              <div>
                <Label htmlFor="serviceProvider">Service Provider</Label>
                <Input
                  id="serviceProvider"
                  value={formData.serviceProvider}
                  onChange={(e) => setFormData({ ...formData, serviceProvider: e.target.value })}
                  placeholder="Shop name or your name if DIY"
                  required
                />
              </div>

              <div>
                <Label htmlFor="cost">Cost ($)</Label>
                <Input
                  id="cost"
                  type="number"
                  step="0.01"
                  value={formData.cost}
                  onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional details about the maintenance..."
                  rows={3}
                />
              </div>

              <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700" size="lg" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Maintenance Record"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
