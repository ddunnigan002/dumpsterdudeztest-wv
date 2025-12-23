"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Truck, Bell, Settings, Building2, Database, Plus, Trash2, Pencil } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "@/components/ui/use-toast"

interface Vehicle {
  id: string
  vehicle_number: string
  make: string
  model: string
  year: number
  license_plate: string
  status: string
  current_mileage: number
  vin: string
}

export function ManagerSettings() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("vehicles")
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(false)
  const [showAddVehicle, setShowAddVehicle] = useState(false)
  const [newVehicle, setNewVehicle] = useState({
    vehicle_number: "",
    make: "",
    model: "",
    year: new Date().getFullYear(),
    license_plate: "",
    vin: "",
    current_mileage: 0,
  })

  const [checklistSettings, setChecklistSettings] = useState({
    weekly_due_day: 4, // Thursday
    monthly_due_day: 1, // 1st of month
  })
  const [checklistItems, setChecklistItems] = useState<{
    daily: any[]
    weekly: any[]
    monthly: any[]
  }>({
    daily: [],
    weekly: [],
    monthly: [],
  })
  const [showAddItem, setShowAddItem] = useState<{
    type: string | null
    label: string
    name: string
  }>({ type: null, label: "", name: "" })
  const [editingItem, setEditingItem] = useState<{
    id: string | null
    type: string | null
    label: string
    name: string
  }>({ id: null, type: null, label: "", name: "" })

  useEffect(() => {
    if (activeTab === "vehicles") {
      fetchVehicles()
    }
    if (activeTab === "maintenance") {
      fetchChecklistSettings()
      fetchChecklistItems()
    }
  }, [activeTab])

  const fetchVehicles = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/vehicles")
      if (response.ok) {
        const data = await response.json()
        setVehicles(data.vehicles || [])
      }
    } catch (error) {
      console.error("Failed to fetch vehicles:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddVehicle = async () => {
    if (!newVehicle.vehicle_number || !newVehicle.make || !newVehicle.model) {
      console.log("[v0] Manager Settings: Missing required fields")
      alert("Please fill in Vehicle Number, Make, and Model")
      return
    }

    console.log("[v0] Manager Settings: Attempting to add vehicle:", newVehicle)

    try {
      const response = await fetch("/api/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newVehicle),
      })

      console.log("[v0] Manager Settings: Response status:", response.status)

      if (response.ok) {
        const data = await response.json()
        console.log("[v0] Manager Settings: Response data:", data)
        console.log("[v0] Manager Settings: Vehicle added successfully")
        setNewVehicle({
          vehicle_number: "",
          make: "",
          model: "",
          year: new Date().getFullYear(),
          license_plate: "",
          vin: "",
          current_mileage: 0,
        })
        setShowAddVehicle(false)
        fetchVehicles()
        alert("Vehicle added successfully!")
      } else {
        const contentType = response.headers.get("content-type")
        let errorMessage = "Unknown error"

        if (contentType?.includes("application/json")) {
          const errorData = await response.json()
          errorMessage = errorData.error || JSON.stringify(errorData)
        } else {
          errorMessage = await response.text()
        }

        console.error("[v0] Manager Settings: Failed to add vehicle:", response.status, errorMessage)
        alert(`Failed to add vehicle: ${errorMessage}`)
      }
    } catch (error) {
      console.error("[v0] Manager Settings: Error:", error)
      alert(`Error adding vehicle: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  const toggleVehicleStatus = async (vehicleId: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active"
    try {
      const response = await fetch(`/api/vehicles/${vehicleId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        fetchVehicles()
      }
    } catch (error) {
      console.error("Failed to update vehicle status:", error)
    }
  }

  const fetchChecklistSettings = async () => {
    try {
      const [weeklyRes, monthlyRes] = await Promise.all([
        fetch("/api/checklist-settings?type=weekly"),
        fetch("/api/checklist-settings?type=monthly"),
      ])

      if (weeklyRes.ok) {
        const data = await weeklyRes.json()
        if (data.settings?.[0]) {
          setChecklistSettings((prev) => ({
            ...prev,
            weekly_due_day: data.settings[0].due_day_of_week,
          }))
        }
      }

      if (monthlyRes.ok) {
        const data = await monthlyRes.json()
        if (data.settings?.[0]) {
          setChecklistSettings((prev) => ({
            ...prev,
            monthly_due_day: data.settings[0].due_day_of_month,
          }))
        }
      }
    } catch (error) {
      console.error("Error fetching checklist settings:", error)
    }
  }

  const fetchChecklistItems = async () => {
    try {
      const [dailyRes, weeklyRes, monthlyRes] = await Promise.all([
        fetch("/api/checklist-items?type=daily"),
        fetch("/api/checklist-items?type=weekly"),
        fetch("/api/checklist-items?type=monthly"),
      ])

      if (dailyRes.ok) {
        const data = await dailyRes.json()
        setChecklistItems((prev) => ({ ...prev, daily: data.items || [] }))
      }

      if (weeklyRes.ok) {
        const data = await weeklyRes.json()
        setChecklistItems((prev) => ({ ...prev, weekly: data.items || [] }))
      }

      if (monthlyRes.ok) {
        const data = await monthlyRes.json()
        setChecklistItems((prev) => ({ ...prev, monthly: data.items || [] }))
      }
    } catch (error) {
      console.error("Error fetching checklist items:", error)
    }
  }

  const updateChecklistSettings = async (type: "weekly" | "monthly", value: number) => {
    try {
      const response = await fetch("/api/checklist-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checklistType: type,
          dueDayOfWeek: type === "weekly" ? value : null,
          dueDayOfMonth: type === "monthly" ? value : null,
        }),
      })

      if (response.ok) {
        toast({
          title: "Settings updated",
          description: `${type.charAt(0).toUpperCase() + type.slice(1)} checklist due date updated successfully`,
        })
      }
    } catch (error) {
      console.error("Error updating checklist settings:", error)
      toast({
        title: "Error",
        description: "Failed to update settings",
        variant: "destructive",
      })
    }
  }

  const addChecklistItem = async () => {
    if (!showAddItem.type || !showAddItem.label) return

    try {
      const response = await fetch("/api/checklist-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checklistType: showAddItem.type,
          itemLabel: showAddItem.label,
          itemName: showAddItem.name || `custom_${showAddItem.label.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40)}`,
          displayOrder: checklistItems[showAddItem.type as keyof typeof checklistItems].length,
        }),
      })

      if (response.ok) {
        toast({
          title: "Item added",
          description: "Checklist item added successfully",
        })
        fetchChecklistItems()
        setShowAddItem({ type: null, label: "", name: "" })
      }
    } catch (error) {
      console.error("Error adding checklist item:", error)
      toast({
        title: "Error",
        description: "Failed to add item",
        variant: "destructive",
      })
    }
  }

  const updateChecklistItem = async () => {
    if (!editingItem.id || !editingItem.label || !editingItem.name) return

    try {
      const response = await fetch("/api/checklist-items", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: editingItem.id,
          itemLabel: editingItem.label,
          itemName: editingItem.name,
        }),
      })

      if (response.ok) {
        toast({
          title: "Item updated",
          description: "Checklist item updated successfully",
        })
        fetchChecklistItems()
        setEditingItem({ id: null, type: null, label: "", name: "" })
      }
    } catch (error) {
      console.error("Error updating checklist item:", error)
      toast({
        title: "Error",
        description: "Failed to update item",
        variant: "destructive",
      })
    }
  }

  const deleteChecklistItem = async (itemId: string) => {
    try {
      const response = await fetch(`/api/checklist-items?id=${itemId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "Item removed",
          description: "Checklist item removed successfully",
        })
        fetchChecklistItems()
      }
    } catch (error) {
      console.error("Error deleting checklist item:", error)
      toast({
        title: "Error",
        description: "Failed to delete item",
        variant: "destructive",
      })
    }
  }

  const getDayName = (day: number) => {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    return days[day]
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 p-4">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/manager")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-600">Manage your fleet maintenance system configuration</p>
          </div>
        </div>

        {/* Settings Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-white shadow-sm">
            <TabsTrigger value="vehicles" className="flex items-center gap-2">
              <Truck className="h-4 w-4" />
              Vehicles
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Maintenance
            </TabsTrigger>
            <TabsTrigger value="company" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Company
            </TabsTrigger>
            <TabsTrigger value="system" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              System
            </TabsTrigger>
          </TabsList>

          {/* Vehicle Management Tab */}
          <TabsContent value="vehicles" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Vehicle Management</CardTitle>
                    <CardDescription>Add, remove, and configure vehicles in your fleet</CardDescription>
                  </div>
                  <Button onClick={() => setShowAddVehicle(true)} className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Add Vehicle
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {showAddVehicle && (
                  <Card className="mb-6 border-orange-200">
                    <CardHeader>
                      <CardTitle className="text-lg">Add New Vehicle</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="vehicle_number">Vehicle Number</Label>
                          <Input
                            id="vehicle_number"
                            value={newVehicle.vehicle_number}
                            onChange={(e) => setNewVehicle({ ...newVehicle, vehicle_number: e.target.value })}
                            placeholder="e.g., TRUCK-001"
                          />
                        </div>
                        <div>
                          <Label htmlFor="make">Make</Label>
                          <Input
                            id="make"
                            value={newVehicle.make}
                            onChange={(e) => setNewVehicle({ ...newVehicle, make: e.target.value })}
                            placeholder="e.g., Kenworth"
                          />
                        </div>
                        <div>
                          <Label htmlFor="model">Model</Label>
                          <Input
                            id="model"
                            value={newVehicle.model}
                            onChange={(e) => setNewVehicle({ ...newVehicle, model: e.target.value })}
                            placeholder="e.g., T880"
                          />
                        </div>
                        <div>
                          <Label htmlFor="year">Year</Label>
                          <Input
                            id="year"
                            type="number"
                            value={newVehicle.year}
                            onChange={(e) =>
                              setNewVehicle({
                                ...newVehicle,
                                year: Number.parseInt(e.target.value) || new Date().getFullYear(),
                              })
                            }
                            placeholder="2024"
                          />
                        </div>
                        <div>
                          <Label htmlFor="license_plate">License Plate</Label>
                          <Input
                            id="license_plate"
                            value={newVehicle.license_plate}
                            onChange={(e) => setNewVehicle({ ...newVehicle, license_plate: e.target.value })}
                            placeholder="ABC-1234"
                          />
                        </div>
                        <div>
                          <Label htmlFor="vin">VIN</Label>
                          <Input
                            id="vin"
                            value={newVehicle.vin}
                            onChange={(e) => setNewVehicle({ ...newVehicle, vin: e.target.value })}
                            placeholder="17-digit VIN"
                          />
                        </div>
                        <div className="col-span-2">
                          <Label htmlFor="current_mileage">Current Mileage</Label>
                          <Input
                            id="current_mileage"
                            type="number"
                            value={newVehicle.current_mileage}
                            onChange={(e) =>
                              setNewVehicle({ ...newVehicle, current_mileage: Number.parseInt(e.target.value) || 0 })
                            }
                            placeholder="0"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={handleAddVehicle} className="bg-orange-500 hover:bg-orange-600">
                          Add Vehicle
                        </Button>
                        <Button variant="outline" onClick={() => setShowAddVehicle(false)}>
                          Cancel
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading vehicles...</div>
                ) : (
                  <div className="space-y-4">
                    {vehicles.length === 0 ? (
                      <div className="text-center py-8 space-y-2">
                        <p className="text-muted-foreground">No vehicles in your fleet yet</p>
                        <p className="text-sm text-muted-foreground">Click "Add Vehicle" above to get started</p>
                      </div>
                    ) : (
                      vehicles.map((vehicle) => (
                        <Card key={vehicle.id} className="border-border">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                                  <Truck className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                  <h3 className="font-semibold text-foreground">{vehicle.vehicle_number}</h3>
                                  <p className="text-sm text-muted-foreground">
                                    {vehicle.year} {vehicle.make} {vehicle.model}
                                  </p>
                                  <div className="flex gap-4 text-sm text-muted-foreground">
                                    {vehicle.license_plate && <span>Plate: {vehicle.license_plate}</span>}
                                    <span>Mileage: {vehicle.current_mileage?.toLocaleString() || 0}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <Badge variant={vehicle.status === "active" ? "default" : "destructive"}>
                                  {vehicle.status || "active"}
                                </Badge>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    // TODO: Implement edit functionality
                                    alert("Edit vehicle functionality coming soon")
                                  }}
                                >
                                  Edit
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => toggleVehicleStatus(vehicle.id, vehicle.status || "active")}
                                >
                                  {vehicle.status === "active" ? "Deactivate" : "Activate"}
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Notification Settings</CardTitle>
                <CardDescription>Configure reminders and alerts for maintenance tasks</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Daily Reminders */}
                  <Card className="border-orange-200">
                    <CardHeader>
                      <CardTitle className="text-lg">Daily Reminders</CardTitle>
                      <CardDescription>Configure daily checklist reminders</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="daily-enabled">Enable Daily Reminders</Label>
                        <input type="checkbox" id="daily-enabled" className="rounded" defaultChecked />
                      </div>
                      <div>
                        <Label htmlFor="daily-time">Reminder Time</Label>
                        <Input type="time" id="daily-time" defaultValue="07:00" />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Weekly Reminders */}
                  <Card className="border-orange-200">
                    <CardHeader>
                      <CardTitle className="text-lg">Weekly Reminders</CardTitle>
                      <CardDescription>Configure weekly maintenance reminders</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="weekly-enabled">Enable Weekly Reminders</Label>
                        <input type="checkbox" id="weekly-enabled" className="rounded" defaultChecked />
                      </div>
                      <div>
                        <Label htmlFor="weekly-day">Reminder Day</Label>
                        <Select defaultValue="1">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">Monday</SelectItem>
                            <SelectItem value="2">Tuesday</SelectItem>
                            <SelectItem value="3">Wednesday</SelectItem>
                            <SelectItem value="4">Thursday</SelectItem>
                            <SelectItem value="5">Friday</SelectItem>
                            <SelectItem value="6">Saturday</SelectItem>
                            <SelectItem value="0">Sunday</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="weekly-time">Reminder Time</Label>
                        <Input type="time" id="weekly-time" defaultValue="08:00" />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Monthly Reminders */}
                  <Card className="border-orange-200">
                    <CardHeader>
                      <CardTitle className="text-lg">Monthly Reminders</CardTitle>
                      <CardDescription>Configure monthly service reminders</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="monthly-enabled">Enable Monthly Reminders</Label>
                        <input type="checkbox" id="monthly-enabled" className="rounded" defaultChecked />
                      </div>
                      <div>
                        <Label htmlFor="monthly-day">Day of Month</Label>
                        <Input type="number" id="monthly-day" min="1" max="31" defaultValue="1" />
                      </div>
                      <div>
                        <Label htmlFor="monthly-time">Reminder Time</Label>
                        <Input type="time" id="monthly-time" defaultValue="09:00" />
                      </div>
                    </CardContent>
                  </Card>

                  {/* SMS Settings */}
                  <Card className="border-orange-200">
                    <CardHeader>
                      <CardTitle className="text-lg">SMS Notifications</CardTitle>
                      <CardDescription>Configure text message alerts (Future: Twilio integration)</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="sms-enabled">Enable SMS Notifications</Label>
                        <input type="checkbox" id="sms-enabled" className="rounded" />
                      </div>
                      <div>
                        <Label htmlFor="emergency-contact">Emergency Contact Phone</Label>
                        <Input type="tel" id="emergency-contact" placeholder="+1 (555) 123-4567" />
                      </div>
                      <div>
                        <Label htmlFor="escalation-hours">Escalation Hours (for overdue tasks)</Label>
                        <Input type="number" id="escalation-hours" defaultValue="24" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="flex justify-end">
                  <Button className="bg-orange-500 hover:bg-orange-600">Save Notification Settings</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Maintenance Schedules Tab */}
          <TabsContent value="maintenance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Checklist Due Dates</CardTitle>
                <CardDescription>Set default due dates for weekly and monthly checklists</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-medium">Weekly Checklist</h3>
                      <p className="text-sm text-muted-foreground">Default due day each week</p>
                    </div>
                    <Select
                      value={checklistSettings.weekly_due_day.toString()}
                      onValueChange={(value) => {
                        const day = Number.parseInt(value)
                        setChecklistSettings((prev) => ({ ...prev, weekly_due_day: day }))
                        updateChecklistSettings("weekly", day)
                      }}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                          <SelectItem key={day} value={day.toString()}>
                            {getDayName(day)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-medium">Monthly Checklist</h3>
                      <p className="text-sm text-muted-foreground">Default due day each month</p>
                    </div>
                    <Select
                      value={checklistSettings.monthly_due_day.toString()}
                      onValueChange={(value) => {
                        const day = Number.parseInt(value)
                        setChecklistSettings((prev) => ({ ...prev, monthly_due_day: day }))
                        updateChecklistSettings("monthly", day)
                      }}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                          <SelectItem key={day} value={day.toString()}>
                            {day}
                            {day === 1 ? "st" : day === 2 ? "nd" : day === 3 ? "rd" : "th"} of month
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

           <Card>
            <CardHeader>
              <CardTitle>Checklist Items Management</CardTitle>
              <CardDescription>
                Add, edit, or remove custom items from daily, weekly, and monthly checklists. Core items are fixed and cannot be edited here.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {(["daily", "weekly", "monthly"] as const).map((type) => {
                const items = checklistItems[type] || []

                return (
                  <div key={type} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium capitalize">{type} Checklist Items</h3>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowAddItem({ type, label: "", name: "" })}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Custom Item
                      </Button>
                    </div>

                    {/* Add Item UI */}
                    {showAddItem.type === type && (
                      <Card className="p-4 bg-orange-50 border-orange-200">
                        <div className="space-y-3">
                          <div>
                            <Label htmlFor={`label-${type}`}>Item Label</Label>
                            <Input
                              id={`label-${type}`}
                              placeholder="e.g., Check tarp straps"
                              value={showAddItem.label}
                              onChange={(e) => {
                                const label = e.target.value
                                // Auto-generate internal name from label
                                const generatedName = label
                                  .toLowerCase()
                                  .trim()
                                  .replace(/[^a-z0-9]+/g, "_")
                                  .replace(/^_+|_+$/g, "")
                                  .slice(0, 40)

                                setShowAddItem((prev) => ({
                                  ...prev,
                                  label,
                                  name: generatedName ? `custom_${generatedName}` : "",
                                }))
                              }}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              This is what drivers will see.
                            </p>
                          </div>
            
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={addChecklistItem}
                              disabled={!showAddItem.label || !showAddItem.name}
                            >
                              Save Item
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setShowAddItem({ type: null, label: "", name: "" })}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </Card>
                    )}

                    {/* Empty state */}
                    {items.length === 0 ? (
                      <div className="text-sm text-muted-foreground border rounded-lg p-4 bg-white">
                        No custom {type} items yet. Click <span className="font-medium">Add Custom Item</span> to create one.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {items.map((item: any) => {
                          // Treat anything that doesn't start with custom_ as "core"
                          const isCore = typeof item.item_name === "string" && !item.item_name.startsWith("custom_")

                          return (
                            <div key={item.id}>
                              {editingItem.id === item.id ? (
                                <Card className="p-4 bg-blue-50 border-blue-200">
                                  <div className="space-y-3">
                                    <div>
                                      <Label>Item Label</Label>
                                      <Input
                                        placeholder="e.g., Check tarp straps"
                                        value={editingItem.label}
                                        onChange={(e) =>
                                          setEditingItem((prev) => ({ ...prev, label: e.target.value }))
                                        }
                                        disabled={isCore}
                                      />
                                    </div>

                                    <div>
                                      <Label>Internal Name</Label>
                                      <Input
                                        placeholder="custom_check_tarp_straps"
                                        value={editingItem.name}
                                        onChange={(e) =>
                                          setEditingItem((prev) => ({
                                            ...prev,
                                            name: e.target.value
                                              .toLowerCase()
                                              .trim()
                                              .replace(/[^a-z0-9_]+/g, "_"),
                                          }))
                                        }
                                        disabled={isCore}
                                      />
                                    </div>

                                    {isCore ? (
                                      <div className="text-sm text-muted-foreground">
                                        This is a core item and can’t be edited here.
                                      </div>
                                    ) : (
                                      <div className="flex gap-2">
                                        <Button size="sm" onClick={updateChecklistItem}>
                                          Save Changes
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() =>
                                            setEditingItem({ id: null, type: null, label: "", name: "" })
                                          }
                                        >
                                          Cancel
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                </Card>
                              ) : (
                                <div className="flex items-center justify-between p-3 border rounded-lg bg-white">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <p className="font-medium">{item.item_label}</p>
                                      {isCore ? (
                                        <Badge variant="secondary">Core</Badge>
                                      ) : (
                                        <Badge variant="default">Custom</Badge>
                                      )}
                                    </div>
                                    <p className="text-sm text-muted-foreground">{item.item_name}</p>
                                  </div>

                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() =>
                                        setEditingItem({
                                          id: item.id,
                                          type,
                                          label: item.item_label,
                                          name: item.item_name,
                                        })
                                      }
                                      disabled={isCore}
                                      title={isCore ? "Core items cannot be edited here" : "Edit"}
                                    >
                                      <Pencil className="h-4 w-4 text-primary" />
                                    </Button>

                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => deleteChecklistItem(item.id, type)}
                                      disabled={isCore}
                                      title={isCore ? "Core items cannot be removed here" : "Remove"}
                                    >
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </TabsContent>

          {/* Company Settings Tab */}
          <TabsContent value="company" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Company Settings</CardTitle>
                <CardDescription>Configure company information and branding</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Company Information */}
                  <Card className="border-orange-200">
                    <CardHeader>
                      <CardTitle className="text-lg">Company Information</CardTitle>
                      <CardDescription>Basic company details</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="company-name">Company Name</Label>
                        <Input id="company-name" defaultValue="Dumpster Dudez" />
                      </div>
                      <div>
                        <Label htmlFor="contact-email">Contact Email</Label>
                        <Input type="email" id="contact-email" placeholder="admin@dumpsterdudez.com" />
                      </div>
                      <div>
                        <Label htmlFor="contact-phone">Contact Phone</Label>
                        <Input type="tel" id="contact-phone" placeholder="+1 (555) 123-4567" />
                      </div>
                      <div>
                        <Label htmlFor="company-address">Address</Label>
                        <Input id="company-address" placeholder="123 Main St, City, State 12345" />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Business Hours */}
                  <Card className="border-orange-200">
                    <CardHeader>
                      <CardTitle className="text-lg">Business Hours</CardTitle>
                      <CardDescription>Operating hours and timezone</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="business-start">Business Hours Start</Label>
                        <Input type="time" id="business-start" defaultValue="08:00" />
                      </div>
                      <div>
                        <Label htmlFor="business-end">Business Hours End</Label>
                        <Input type="time" id="business-end" defaultValue="17:00" />
                      </div>
                      <div>
                        <Label htmlFor="timezone">Timezone</Label>
                        <Select defaultValue="America/New_York">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="America/New_York">Eastern Time</SelectItem>
                            <SelectItem value="America/Chicago">Central Time</SelectItem>
                            <SelectItem value="America/Denver">Mountain Time</SelectItem>
                            <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Branding */}
                  <Card className="border-orange-200 md:col-span-2">
                    <CardHeader>
                      <CardTitle className="text-lg">Branding</CardTitle>
                      <CardDescription>Customize the appearance of your fleet management system</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="primary-color">Primary Color</Label>
                          <div className="flex gap-2">
                            <Input type="color" id="primary-color" defaultValue="#f97316" className="w-16" />
                            <Input value="#f97316" readOnly className="flex-1" />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="secondary-color">Secondary Color</Label>
                          <div className="flex gap-2">
                            <Input type="color" id="secondary-color" defaultValue="#1f2937" className="w-16" />
                            <Input value="#1f2937" readOnly className="flex-1" />
                          </div>
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="logo-upload">Company Logo</Label>
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 bg-orange-100 rounded-lg flex items-center justify-center">
                            <Building2 className="h-8 w-8 text-orange-600" />
                          </div>
                          <Button variant="outline">Upload New Logo</Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="flex justify-end">
                  <Button className="bg-orange-500 hover:bg-orange-600">Save Company Settings</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* System Preferences Tab */}
          <TabsContent value="system" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>System Preferences</CardTitle>
                <CardDescription>Configure general system settings and preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Data Management */}
                  <Card className="border-orange-200">
                    <CardHeader>
                      <CardTitle className="text-lg">Data Management</CardTitle>
                      <CardDescription>Configure data retention and archiving</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="data-retention">Data Retention Period (days)</Label>
                        <Input type="number" id="data-retention" defaultValue="365" min="30" />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="auto-archive">Auto-archive Completed Tasks</Label>
                        <input type="checkbox" id="auto-archive" className="rounded" defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="require-photos">Require Photos for Issues</Label>
                        <input type="checkbox" id="require-photos" className="rounded" defaultChecked />
                      </div>
                    </CardContent>
                  </Card>

                  {/* System Behavior */}
                  <Card className="border-orange-200">
                    <CardHeader>
                      <CardTitle className="text-lg">System Behavior</CardTitle>
                      <CardDescription>Configure system behavior and defaults</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="offline-mode">Allow Offline Mode</Label>
                        <input type="checkbox" id="offline-mode" className="rounded" defaultChecked />
                      </div>
                      <div>
                        <Label htmlFor="default-vehicle-status">Default Vehicle Status</Label>
                        <Select defaultValue="active">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="maintenance">Maintenance</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="dashboard-refresh">Dashboard Refresh Interval (minutes)</Label>
                        <Input type="number" id="dashboard-refresh" defaultValue="5" min="1" max="60" />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Export Settings */}
                  <Card className="border-orange-200 md:col-span-2">
                    <CardHeader>
                      <CardTitle className="text-lg">Export Settings</CardTitle>
                      <CardDescription>Configure report export preferences</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="export-format">Default Export Format</Label>
                          <Select defaultValue="pdf">
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pdf">PDF</SelectItem>
                              <SelectItem value="excel">Excel</SelectItem>
                              <SelectItem value="csv">CSV</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="report-logo">Include Logo in Reports</Label>
                          <Select defaultValue="yes">
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="yes">Yes</SelectItem>
                              <SelectItem value="no">No</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="flex justify-end">
                  <Button className="bg-orange-500 hover:bg-orange-600">Save System Preferences</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
