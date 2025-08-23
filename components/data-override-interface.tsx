"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Calendar, Truck, Edit3, Save, Fuel, Clock, AlertTriangle } from "lucide-react"
import { format } from "date-fns"
import { HistoricalGasEntryForm } from "./historical-gas-entry-form"
import { HistoricalMileageForm } from "./historical-mileage-form"
import { HistoricalIssueForm } from "./historical-issue-form"

interface Vehicle {
  id: string
  vehicle_number: string
  make: string
  model: string
  year: number
}

interface DailyLogEntry {
  id: string
  log_date: string
  vehicle_id: string
  vehicle_number: string
  start_mileage: number | null
  end_mileage: number | null
  gallons_purchased: number | null
  fuel_cost: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

export function DataOverrideInterface() {
  const router = useRouter()
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [selectedVehicle, setSelectedVehicle] = useState<string>("")
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), "yyyy-MM-dd"))
  const [dailyLogs, setDailyLogs] = useState<DailyLogEntry[]>([])
  const [editingEntry, setEditingEntry] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState<string | null>(null) // 'gas', 'mileage', 'issue'
  const [loading, setLoading] = useState(false)

  const [editingData, setEditingData] = useState<Partial<DailyLogEntry>>({})

  useEffect(() => {
    fetchVehicles()
  }, [])

  useEffect(() => {
    if (selectedVehicle && selectedDate) {
      fetchDailyLogs()
    }
  }, [selectedVehicle, selectedDate])

  const fetchVehicles = async () => {
    try {
      const response = await fetch("/api/vehicles")
      if (response.ok) {
        const data = await response.json()
        const vehiclesArray = data.vehicles || data || []
        setVehicles(vehiclesArray)
        if (vehiclesArray.length > 0) {
          setSelectedVehicle(vehiclesArray[0].vehicle_number)
        }
      }
    } catch (error) {
      console.error("Error fetching vehicles:", error)
    }
  }

  const fetchDailyLogs = async () => {
    if (!selectedVehicle || !selectedDate) return

    setLoading(true)
    try {
      const response = await fetch(`/api/daily-logs?vehicle=${selectedVehicle}&date=${selectedDate}`)
      if (response.ok) {
        const data = await response.json()
        setDailyLogs(data.logs || [])
      }
    } catch (error) {
      console.error("Error fetching daily logs:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveEdit = async (entryId: string) => {
    try {
      const response = await fetch(`/api/daily-logs/${entryId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingData),
      })

      if (response.ok) {
        setEditingEntry(null)
        setEditingData({})
        fetchDailyLogs()
      }
    } catch (error) {
      console.error("Error updating entry:", error)
    }
  }

  const handleAddEntry = async (data: any) => {
    if (!selectedVehicle || !selectedDate) return

    try {
      const response = await fetch("/api/daily-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicle_number: selectedVehicle,
          log_date: selectedDate,
          ...data,
        }),
      })

      if (response.ok) {
        setShowAddForm(null)
        fetchDailyLogs()
      }
    } catch (error) {
      console.error("Error adding entry:", error)
    }
  }

  const handleAddIssue = async (data: any) => {
    try {
      const response = await fetch("/api/vehicle-issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicle_number: selectedVehicle,
          ...data,
        }),
      })

      if (response.ok) {
        setShowAddForm(null)
        // Could refresh issues list here if we had one
      }
    } catch (error) {
      console.error("Error adding issue:", error)
    }
  }

  const startEdit = (entry: DailyLogEntry) => {
    setEditingEntry(entry.id)
    setEditingData({
      start_mileage: entry.start_mileage,
      end_mileage: entry.end_mileage,
      gallons_purchased: entry.gallons_purchased,
      fuel_cost: entry.fuel_cost,
      notes: entry.notes,
    })
  }

  const cancelEdit = () => {
    setEditingEntry(null)
    setEditingData({})
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button variant="outline" size="sm" onClick={() => router.push("/manager")} className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Data Override</h1>
          <p className="text-gray-600">Manually edit or add missing data entries for any vehicle and date</p>
        </div>
      </div>

      {/* Vehicle and Date Selection */}
      <Card className="mb-6 border-orange-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-orange-600" />
            Select Vehicle and Date
          </CardTitle>
          <CardDescription>Choose a vehicle and date to view and edit data entries</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="vehicle-select">Vehicle</Label>
              <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
                <SelectTrigger>
                  <SelectValue placeholder="Select vehicle" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={vehicle.vehicle_number}>
                      {vehicle.vehicle_number} - {vehicle.make} {vehicle.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="date-select">Date</Label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={format(new Date(), "yyyy-MM-dd")}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Entry Forms */}
      {showAddForm === "gas" && (
        <HistoricalGasEntryForm
          vehicleNumber={selectedVehicle}
          selectedDate={selectedDate}
          onSave={handleAddEntry}
          onCancel={() => setShowAddForm(null)}
        />
      )}

      {showAddForm === "mileage" && (
        <HistoricalMileageForm
          vehicleNumber={selectedVehicle}
          selectedDate={selectedDate}
          onSave={handleAddEntry}
          onCancel={() => setShowAddForm(null)}
        />
      )}

      {showAddForm === "issue" && (
        <HistoricalIssueForm
          vehicleNumber={selectedVehicle}
          selectedDate={selectedDate}
          onSave={handleAddIssue}
          onCancel={() => setShowAddForm(null)}
        />
      )}

      {/* Quick Add Buttons */}
      {!showAddForm && (
        <Card className="mb-6 border-orange-200">
          <CardHeader>
            <CardTitle>Add Missing Data</CardTitle>
            <CardDescription>Add entries that drivers may have forgotten to record</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                onClick={() => setShowAddForm("gas")}
                className="h-20 flex flex-col items-center gap-2 bg-orange-500 hover:bg-orange-600"
              >
                <Fuel className="h-6 w-6" />
                <span>Add Gas Purchase</span>
              </Button>
              <Button
                onClick={() => setShowAddForm("mileage")}
                className="h-20 flex flex-col items-center gap-2 bg-orange-500 hover:bg-orange-600"
              >
                <Clock className="h-6 w-6" />
                <span>Add Mileage Entry</span>
              </Button>
              <Button
                onClick={() => setShowAddForm("issue")}
                className="h-20 flex flex-col items-center gap-2 bg-orange-500 hover:bg-orange-600"
              >
                <AlertTriangle className="h-6 w-6" />
                <span>Report Issue</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-orange-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-orange-600" />
            Daily Log Entries
            {selectedVehicle && (
              <Badge variant="outline" className="border-orange-300 text-orange-700">
                {selectedVehicle}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>Viewing entries for {format(new Date(selectedDate), "MMMM d, yyyy")}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading entries...</div>
          ) : dailyLogs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No entries found for this date. Use the buttons above to add missing data.
            </div>
          ) : (
            <div className="space-y-4">
              {dailyLogs.map((entry) => (
                <Card key={entry.id} className="border-gray-200">
                  <CardContent className="p-4">
                    {editingEntry === entry.id ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <Label>Start Mileage</Label>
                            <Input
                              type="number"
                              value={editingData.start_mileage || ""}
                              onChange={(e) =>
                                setEditingData({
                                  ...editingData,
                                  start_mileage: e.target.value ? Number.parseInt(e.target.value) : null,
                                })
                              }
                            />
                          </div>
                          <div>
                            <Label>End Mileage</Label>
                            <Input
                              type="number"
                              value={editingData.end_mileage || ""}
                              onChange={(e) =>
                                setEditingData({
                                  ...editingData,
                                  end_mileage: e.target.value ? Number.parseInt(e.target.value) : null,
                                })
                              }
                            />
                          </div>
                          <div>
                            <Label>Gallons</Label>
                            <Input
                              type="number"
                              step="0.1"
                              value={editingData.gallons_purchased || ""}
                              onChange={(e) =>
                                setEditingData({
                                  ...editingData,
                                  gallons_purchased: e.target.value ? Number.parseFloat(e.target.value) : null,
                                })
                              }
                            />
                          </div>
                          <div>
                            <Label>Fuel Cost ($)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={editingData.fuel_cost || ""}
                              onChange={(e) =>
                                setEditingData({
                                  ...editingData,
                                  fuel_cost: e.target.value ? Number.parseFloat(e.target.value) : null,
                                })
                              }
                            />
                          </div>
                        </div>
                        <div>
                          <Label>Notes</Label>
                          <Input
                            value={editingData.notes || ""}
                            onChange={(e) => setEditingData({ ...editingData, notes: e.target.value })}
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleSaveEdit(entry.id)}
                            className="bg-orange-500 hover:bg-orange-600"
                          >
                            <Save className="h-4 w-4 mr-2" />
                            Save Changes
                          </Button>
                          <Button variant="outline" onClick={cancelEdit}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1">
                          <div>
                            <div className="text-sm text-gray-500">Start Mileage</div>
                            <div className="font-medium">
                              {entry.start_mileage ? entry.start_mileage.toLocaleString() : "Not recorded"}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-500">End Mileage</div>
                            <div className="font-medium">
                              {entry.end_mileage ? entry.end_mileage.toLocaleString() : "Not recorded"}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-500">Gallons</div>
                            <div className="font-medium">
                              {entry.gallons_purchased ? `${entry.gallons_purchased} gal` : "Not recorded"}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-500">Fuel Cost</div>
                            <div className="font-medium">
                              {entry.fuel_cost ? `$${entry.fuel_cost.toFixed(2)}` : "Not recorded"}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <div className="text-xs text-gray-400">{format(new Date(entry.created_at), "h:mm a")}</div>
                          <Button variant="outline" size="sm" onClick={() => startEdit(entry)}>
                            <Edit3 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                    {entry.notes && !editingEntry && (
                      <div className="mt-2 pt-2 border-t border-gray-100">
                        <div className="text-sm text-gray-500">Notes</div>
                        <div className="text-sm">{entry.notes}</div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
