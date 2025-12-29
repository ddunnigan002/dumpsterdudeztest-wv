"use client"

import type React from "react"
import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ArrowLeft, Wrench } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface MaintenanceEntryProps {
  vehicleId: string
}

type IssueDetails = {
  id: string
  description?: string | null
  created_at?: string
}

export default function MaintenanceEntry({ vehicleId }: MaintenanceEntryProps) {
  const searchParams = useSearchParams()
  const issueIdRaw = searchParams.get("issueId")
  const issueId = useMemo(() => {
    if (!issueIdRaw) return null
    return issueIdRaw.startsWith("issue-") ? issueIdRaw.replace("issue-", "") : issueIdRaw
  }, [issueIdRaw])

  const isResolvingIssue = Boolean(issueId)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const [vehicleNumber, setVehicleNumber] = useState<string>("")
  const [issue, setIssue] = useState<IssueDetails | null>(null)
  const [issueLoading, setIssueLoading] = useState(false)

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    serviceProvider: "",
    cost: "",
    notes: "",
    mileage: "",
  })

  // 1) Load vehicle display name (vehicle_number)
  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch(`/api/vehicles/${vehicleId}`, { cache: "no-store" })
        if (!res.ok) return
        const j = await res.json()
        const v = j?.vehicle ?? j
        setVehicleNumber(v?.vehicle_number ?? "")
      } catch {
        // ignore
      }
    })()
  }, [vehicleId])

  // 2) If resolving issue, load issue details for the banner
  useEffect(() => {
    if (!issueId) return
    setIssueLoading(true)
    ;(async () => {
      try {
        const res = await fetch(`/api/activity-details/issue/${issueId}`, { cache: "no-store" })
        if (!res.ok) {
          setIssue(null)
          return
        }
        const j = await res.json()
        setIssue(j ?? null)
      } catch {
        setIssue(null)
      } finally {
        setIssueLoading(false)
      }
    })()
  }, [issueId])

  const headerTitle = isResolvingIssue ? "Resolve Issue" : "Enter Maintenance"

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const payload = {
        vehicleNumber: vehicleId.toUpperCase(), // keep your existing server expectation
        maintenanceType: isResolvingIssue ? "Repair" : "Other", // if you still want generic entry later
        date: formData.date,
        serviceProvider: formData.serviceProvider,
        cost: Number.parseFloat(formData.cost) || 0,
        notes: formData.notes,
        mileage: Number.parseInt(formData.mileage) || 0,
        issueId: issueId ?? null, // ✅ single-call approach
      }

      const res = await fetch("/api/enter-maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const j = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(j?.error ?? "Failed to save maintenance record")
      }

      setIsSuccess(true)
    } catch (err: any) {
      console.error(err)
      alert(err?.message ?? "Failed to save. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 p-4">
        <div className="max-w-md mx-auto space-y-6">
          <div className="text-center">
            <h1 className="text-lg font-bold text-orange-600">Dumpster Dudez</h1>
            <h2 className="text-sm text-gray-600">{vehicleNumber || "Truck"}</h2>
          </div>

          <Card>
            <CardContent className="pt-6 text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <Wrench className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-green-800">
                {isResolvingIssue ? "Issue Resolved!" : "Maintenance Recorded!"}
              </h3>
              <p className="text-gray-600">
                {isResolvingIssue
                  ? "Maintenance was recorded and the issue was marked resolved."
                  : "Your maintenance record has been saved successfully."}
              </p>

              <Link href={`/vehicle/${vehicleId}`}>
                <Button className="w-full bg-orange-600 hover:bg-orange-700">Back to Truck</Button>
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
            <h2 className="text-sm text-gray-600">{vehicleNumber || vehicleId}</h2>
          </div>

          <div />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center flex items-center justify-center gap-2">
              <Wrench className="h-5 w-5" />
              {headerTitle}
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Linked issue banner */}
            {isResolvingIssue && (
              <div className="p-3 rounded-md border bg-orange-50">
                <div className="text-sm font-semibold text-orange-800">Linked Issue</div>
                <div className="text-sm text-orange-900 mt-1">
                  {issueLoading
                    ? "Loading issue details…"
                    : issue?.description
                      ? issue.description
                      : "Issue details not available"}
                </div>
              </div>
            )}

            {/* Maintenance Type (locked when resolving issue) */}
            <div className="space-y-1">
              <Label>Maintenance Type</Label>
              <Input
                value={isResolvingIssue ? "Repair (linked to issue)" : "General maintenance"}
                readOnly
              />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData((p) => ({ ...p, date: e.target.value }))}
                  required
                />
              </div>

              <div>
                <Label htmlFor="mileage">Current Mileage</Label>
                <Input
                  id="mileage"
                  type="number"
                  value={formData.mileage}
                  onChange={(e) => setFormData((p) => ({ ...p, mileage: e.target.value }))}
                  placeholder="Enter current mileage"
                  required
                />
              </div>

              <div>
                <Label htmlFor="serviceProvider">Service Provider</Label>
                <Input
                  id="serviceProvider"
                  value={formData.serviceProvider}
                  onChange={(e) => setFormData((p) => ({ ...p, serviceProvider: e.target.value }))}
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
                  onChange={(e) => setFormData((p) => ({ ...p, cost: e.target.value }))}
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="Additional details about the maintenance..."
                  rows={3}
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-teal-600 hover:bg-teal-700"
                size="lg"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving..." : isResolvingIssue ? "Save & Resolve Issue" : "Save Maintenance Record"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
