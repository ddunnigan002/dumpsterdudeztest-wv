"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function Home() {
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const response = await fetch("/api/vehicles")
        if (response.ok) {
          const data = await response.json()
          const vehiclesArray = data.vehicles || data || []
          setVehicles(vehiclesArray)
        }
      } catch (error) {
        console.error("Error fetching vehicles:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchVehicles()
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-background border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <Image src="/dumpster-dudez-logo.svg" alt="Dumpster Dudez" width={160} height={50} className="h-8 w-auto" />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3 leading-tight">Fleet Maintenance</h1>
          <p className="text-lg text-muted-foreground max-w-md mx-auto leading-relaxed">
            Select your vehicle to access checklists and maintenance tools
          </p>
        </div>

        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading vehicles...</div>
          ) : vehicles.length > 0 ? (
            vehicles.map((vehicle) => (
              <Link key={vehicle.id} href={`/vehicle/${vehicle.vehicle_number}`} className="block">
                <Card className="bg-card hover:bg-muted/50 transition-all duration-200 border-border hover:border-accent/30 active:scale-[0.98] cursor-pointer">
                  <CardHeader className="pb-4">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-accent/10 rounded-lg flex-shrink-0">
                        <Image
                          src={`/images/${vehicle.make.toLowerCase()}-logo.png`}
                          alt={vehicle.make}
                          width={24}
                          height={24}
                          className="h-6 w-6"
                        />
                      </div>
                      <div className="text-left flex-1">
                        <CardTitle className="text-lg text-card-foreground">{vehicle.vehicle_number}</CardTitle>
                        <CardDescription className="text-muted-foreground">
                          {vehicle.make} {vehicle.model}
                        </CardDescription>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-accent font-medium capitalize">{vehicle.status}</div>
                        <div className="text-xs text-muted-foreground">
                          {vehicle.current_mileage?.toLocaleString()} mi
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            ))
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No vehicles found in your fleet</p>
              <Link href="/manager/settings">
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  <Settings className="h-4 w-4 mr-2" />
                  Add Vehicles in Settings
                </Button>
              </Link>
            </div>
          )}
        </div>

        {vehicles.length > 0 && (
          <div className="mt-8 text-center">
            <Link href="/manager">
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 text-base font-medium">
                <Settings className="h-4 w-4 mr-2" />
                Manager Dashboard
              </Button>
            </Link>
            <p className="text-sm text-muted-foreground mt-2">Access reports, settings & analytics</p>
          </div>
        )}

        <div className="h-8"></div>
      </main>
    </div>
  )
}
