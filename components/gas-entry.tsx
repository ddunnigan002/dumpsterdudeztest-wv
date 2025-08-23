"use client"

import type React from "react"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Fuel, Check } from "lucide-react"
import Link from "next/link"

interface GasEntryProps {
  vehicleId: string
}

export default function GasEntry({ vehicleId }: GasEntryProps) {
  const [formData, setFormData] = useState({
    gallons: "",
    totalCost: "",
  })
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      try {
        const response = await fetch("/api/gas-entry", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            vehicleId,
            gallons: Number.parseFloat(formData.gallons),
            totalCost: Number.parseFloat(formData.totalCost),
            date: new Date().toISOString(),
          }),
        })

        if (!response.ok) {
          const errorData = await response.text()
          throw new Error(`Error saving gas entry: ${errorData}`)
        }

        setIsSubmitted(true)
        setFormData({ gallons: "", totalCost: "" })
      } catch (error) {
        console.error("Error submitting gas entry:", error)
        setError(error instanceof Error ? error.message : "Failed to save gas entry")
      }
    })
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
            <h1 className="text-xl font-bold">Gas Entry</h1>
          </div>

          <Card>
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Gas Entry Submitted!</h2>
              <p className="text-gray-600 mb-6">
                Your fuel information has been recorded for {getVehicleDisplayName(vehicleId)}.
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
          <h1 className="text-xl font-bold">Gas Entry</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Fuel className="mr-2 h-5 w-5" />
              {getVehicleDisplayName(vehicleId)} - Fuel Log
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>
              )}

              <div className="space-y-2">
                <Label htmlFor="gallons">Gallons</Label>
                <Input
                  id="gallons"
                  type="number"
                  step="0.01"
                  placeholder="Enter gallons (e.g., 25.5)"
                  value={formData.gallons}
                  onChange={(e) => setFormData({ ...formData, gallons: e.target.value })}
                  required
                  className="text-lg h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="totalCost">Total Cost ($)</Label>
                <Input
                  id="totalCost"
                  type="number"
                  step="0.01"
                  placeholder="Enter total cost (e.g., 89.50)"
                  value={formData.totalCost}
                  onChange={(e) => setFormData({ ...formData, totalCost: e.target.value })}
                  required
                  className="text-lg h-12"
                />
              </div>

              <Button type="submit" className="w-full h-12 text-lg" disabled={isPending}>
                {isPending ? "Submitting..." : "Submit Gas Entry"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
