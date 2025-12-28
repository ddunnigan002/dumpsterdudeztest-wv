"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Settings, Truck } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type Vehicle = {
  id: string
  vehicle_number: string
  make: string
  model: string
  status: string
  current_mileage: number
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

// Keep aliases minimal + generic (not per-truck). This just normalizes common inputs.
const MAKE_ALIASES: Record<string, string> = {
  chevy: "chevrolet",
  intl: "international",
  "international-truck": "international",
}

function logoPathForMake(make: string) {
  let slug = makeSlug(make)
  if (!slug) return null
  slug = MAKE_ALIASES[slug] ?? slug
  // IMPORTANT: this must match where you actually placed the images:
  // /public/vehicle-makes/ford.png, /public/vehicle-makes/peterbilt.png, etc.
  return `/${slug}-logo.png`
}

function MakeLogo({ make }: { make: string }) {
  const [broken, setBroken] = useState(false)
  const src = logoPathForMake(make)

  return (
    <div className="p-3 bg-accent/10 rounded-lg flex-shrink-0 flex items-center justify-center">
      {src && !broken ? (
        <Image
          src={src}
          alt={`${make} logo`}
          width={24}
          height={24}
          className="h-6 w-6 object-contain"
          onError={() => setBroken(true)}
        />
      ) : (
        <Truck className="h-6 w-6 text-muted-foreground" />
      )}
    </div>
  )
}

export default function Home() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [franchiseName, setFranchiseName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const response = await fetch("/api/vehicles", { cache: "no-store" })
        if (response.ok) {
          const data = await response.json()

          // NEW: your API now returns { franchiseName, vehicles }
          setFranchiseName(data?.franchiseName ?? null)

          const vehiclesArray = Array.isArray(data?.vehicles)
            ? data.vehicles
            : Array.isArray(data)
              ? data
              : []
          setVehicles(vehiclesArray)
        } else {
          setVehicles([])
        }
      } catch (error) {
        console.error("Error fetching vehicles:", error)
        setVehicles([])
      } finally {
        setLoading(false)
      }
    }

    fetchVehicles()
  }, [])

  const heading = useMemo(() => {
    const name = franchiseName?.trim()
    return name ? `Dumpster Dudez of ${name}` : "Dumpster Dudez"
  }, [franchiseName])

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-background border-b border-border">
        <div className="container mx-auto px-4 py-5 sm:py-4">
          <div className="flex flex-col items-center sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex flex-col items-center sm:items-start">
              <Image
                src="/dumpster-dudez-logo.svg"
                alt="Dumpster Dudez"
                width={240}
                height={80}
                priority
                className="h-14 w-auto sm:h-9 drop-shadow-sm animate-ddz-pop"
              />

              {/* Franchise name + subtitle */}
              <div className="text-center sm:text-left mt-2 sm:mt-1">
                <div className="text-xl sm:text-base font-extrabold tracking-tight text-foreground">
                  Dumpster Dudez{franchiseName ? ` of ${franchiseName}` : ""}
                </div>
                <div className="text-sm sm:text-xs italic text-muted-foreground">Fleet Maintenance</div>
              </div>
            </div>
          </div>
        </div>

        {/* Brand accent bar */}
        <div className="h-1 w-full bg-orange-500/90" />

        {/* Tiny CSS animation */}
        <style jsx>{`
          @keyframes ddzPop {
            from {
              opacity: 0;
              transform: translateY(-6px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .animate-ddz-pop {
            animation: ddzPop 220ms ease-out;
          }
          @media (prefers-reduced-motion: reduce) {
            .animate-ddz-pop {
              animation: none;
            }
          }
        `}</style>
      </header>


      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="text-center mb-8">
          <p className="text-sm text-muted-foreground mt-3 max-w-md mx-auto leading-relaxed">
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
                      <MakeLogo make={vehicle.make} />

                      <div className="text-left flex-1 min-w-0">
                        <CardTitle className="text-lg text-card-foreground">{vehicle.vehicle_number}</CardTitle>
                        <CardDescription className="text-muted-foreground truncate">
                          {vehicle.make} {vehicle.model}
                        </CardDescription>
                      </div>

                      <div className="text-right shrink-0">
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

        <div className="h-8" />
      </main>
    </div>
  )
}
