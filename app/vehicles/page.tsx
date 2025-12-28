"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, Edit, Truck } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface Vehicle {
  id: string
  vehicle_number: string
  make: string
  model: string
  year: number
  current_mileage: number
  license_plate: string
  vin: string
  status: string
}

function makeSlug(make: string) {
  return (make ?? "")
    .trim()
    .toLowerCase()
    .replace(/['".]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

// Optional: normalize common aliases once (no per-truck hardcoding)
const MAKE_ALIASES: Record<string, string> = {
  chevy: "chevrolet",
  intl: "international",
}

function logoPathForMake(make: string) {
  let slug = makeSlug(make)
  if (!slug) return null
  slug = MAKE_ALIASES[slug] ?? slug
  return `/vehicle-makes/${slug}.png`
}

function MakeLogo({ make }: { make: string }) {
  const [broken, setBroken] = useState(false)
  const src = logoPathForMake(make)

  return (
    <div className="h-10 w-10 rounded-md bg-white border flex items-center justify-center overflow-hidden">
      {src && !broken ? (
        <Image
          src={src}
          alt={`${make} logo`}
          width={40}
          height={40}
          className="object-contain"
          onError={() => setBroken(true)}
        />
      ) : (
        <Truck className="h-5 w-5 text-muted-foreground" />
      )}
    </div>
  )
}

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [isEditing, setIsEditing] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<Vehicle>>({})

  useEffect(() => {
    fetchVehicles()
  }, [])

  const fetchVehicles = async () => {
    try {
      const response = await fetch("/api/vehicles", { cache: "no-store" })
      if (response.ok) {
        const data = await response.json()
        const vehiclesArray = Array.isArray(data?.vehicles) ? data.vehicles : Array.isArray(data) ? data : []
        setVehicles(vehiclesArray)
      } else {
        setVehicles([])
      }
    } catch (error) {
      console.error("Error fetching vehicles:", error)
      setVehicles([])
    }
  }

  const handleEdit = (vehicle: Vehicle) => {
    setIsEditing(vehicle.id)
    setEditData(vehicle)
  }

  const handleSave = async () => {
    if (!isEditing) return

    try {
      const response = await fetch(`/api/vehicles/${isEditing}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editData),
      })

      if (response.ok) {
        await fetchVehicles()
        setIsEditing(null)
        setEditData({})
      } else {
        console.error("Failed to update vehicle", await response.text().catch(() => ""))
      }
    } catch (error) {
      console.error("Error updating vehicle:", error)
    }
  }

  const handleCancel = () => {
    setIsEditing(null)
    setEditData({})
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/">
          <Button variant="ghost" size="sm" type="button">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Vehicle Management</h1>
      </div>

      {Array.isArray(vehicles) && vehicles.length > 0 ? (
        vehicles.map((vehicle) => (
          <Card key={vehicle.id} className="mb-4">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <MakeLogo make={vehicle.make} />
                  <div>
                    <CardTitle className="leading-tight">{vehicle.vehicle_number}</CardTitle>
                    <div className="text-sm text-muted-foreground">
                      {vehicle.make} {vehicle.model}
                    </div>
                  </div>
                </div>

                <Button variant="outline" size="sm" type="button" onClick={() => handleEdit(vehicle)}>
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>

            <CardContent>
              {isEditing === vehicle.id ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Truck Name / Vehicle #</Label>
                      <Input
                        value={editData.vehicle_number || ""}
                        onChange={(e) => setEditData({ ...editData, vehicle_number: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label>Make</Label>
                      <Input value={editData.make || ""} onChange={(e) => setEditData({ ...editData, make: e.target.value })} />
                    </div>

                    <div>
                      <Label>Model</Label>
                      <Input
                        value={editData.model || ""}
                        onChange={(e) => setEditData({ ...editData, model: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label>Year</Label>
                      <Input
                        type="number"
                        value={editData.year ?? ""}
                        onChange={(e) => setEditData({ ...editData, year: Number.parseInt(e.target.value || "0", 10) })}
                      />
                    </div>

                    <div>
                      <Label>Current Mileage</Label>
                      <Input
                        type="number"
                        value={editData.current_mileage ?? ""}
                        onChange={(e) =>
                          setEditData({ ...editData, current_mileage: Number.parseInt(e.target.value || "0", 10) })
                        }
                      />
                    </div>

                    <div>
                      <Label>License Plate</Label>
                      <Input
                        value={editData.license_plate || ""}
                        onChange={(e) => setEditData({ ...editData, license_plate: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label>VIN</Label>
                      <Input value={editData.vin || ""} onChange={(e) => setEditData({ ...editData, vin: e.target.value })} />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button type="button" onClick={handleSave}>
                      Save
                    </Button>
                    <Button variant="outline" type="button" onClick={handleCancel}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>Make/Model:</strong> {vehicle.make} {vehicle.model}
                  </div>
                  <div>
                    <strong>Year:</strong> {vehicle.year}
                  </div>
                  <div>
                    <strong>Current Mileage:</strong> {vehicle.current_mileage?.toLocaleString()}
                  </div>
                  <div>
                    <strong>License:</strong> {vehicle.license_plate}
                  </div>
                  <div>
                    <strong>VIN:</strong> {vehicle.vin}
                  </div>
                  <div>
                    <strong>Status:</strong> {vehicle.status}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))
      ) : (
        <Card>
          <CardContent className="p-6 text-center text-gray-500">No vehicles found in the fleet.</CardContent>
        </Card>
      )}
    </div>
  )
}
