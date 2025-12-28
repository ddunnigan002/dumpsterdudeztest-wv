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
  current_mileage?: number | null
}

type VehiclesResponse = {
  vehicles: Vehicle[]
  franchiseName?: string | null
  error?: string
}

function normalizeMakeForLogo(make: string) {
  const raw = (make ?? "").trim()
  if (!raw) return ""
  return raw.split(/\s+/)[0] || raw
}

function makeSlug(make: string) {
  const normalized = normalizeMakeForLogo(make)
  return (normalized ?? "")
    .trim()
    .toLowerCase()
    .replace(/['".]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

const MAKE_ALIASES: Record<string, string> = {
  chevy: "chevrolet",
  intl: "international",
}

function logoPathForMake(make: string) {
  let slug = makeSlug(make)
  if (!slug) return null
  slug = MAKE_ALIASES[slug] ?? slug
  // expects: /public/ford-logo.png etc
  return `/${slug}-logo.png`
}

function MakeLogo({ make }: { make: string }) {
  const [broken, setBroken] = useState(false)
  const src = useMemo(() => logoPathForMake(make), [make])

  useEffect(() => setBroken(false), [src])

  return (
    <div className="p-3 bg-accent/10 rounded-lg flex-shrink-0 h-12 w-12 flex items-center justify-center">
      {src && !broken ? (
        <Image
          src={src}
          alt={make}
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
    const load = async () => {
      try {
        const res = await fetch("/api/vehicles", { cache: "no-store" })

        // IMPORTANT: if we got HTML (login page/404), don't try to parse json.
        if (!res.ok) {
          const text = await res.text().catch(() => "")
          console.error("Home load error:", res.status, text)
          setVehicles([])
          setFranchiseName(null)
          return
        }

        const data: VehiclesResponse = await res.json()
        setVehicles(Array.isArray(data?.vehicles) ? data.vehicles : [])
        setFranchiseName(data?.franchiseName ?? null)
      } catch (e) {
        console.error("Home load error:", e)
        setVehicles([])
        setFranchiseName(null)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const headerFranchise = franchiseName ? `Dumpster Dudez of ${franchiseName}` : "Dumpster Dudez of Your Franchise"

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Branded Header */}
      <header className="sticky top-0 z-50 bg-background/90 backdrop-blur border-b border-border">
        <div className="container mx-auto px-4 py-3">
          <div className="flex flex-col items-center gap-2">
            {/* Bigger + centered logo on mobile */}
            <Image
              src="/dumpster-dudez-logo.svg"
              alt="Dumpster Dudez"
              width={240}
              height={90}
              priority
              className="h-12 sm:h-10 w-auto drop-shadow-[0_2px_10px_rgba(0,0,0,0.12)]"
            />

            <div className="text-center leading-tight">
              <div className="text-lg sm:text-xl font-extrabold tracking-tight text-foreground">
                {headerFranchise}
              </div>
              <div className="text-sm italic text-muted-foreground">Fleet Maintenance</div>
            </div>
          </div>
        </div>

        {/* Orange brand divider */}
        <div className="h-1 w-full bg-orange-500/90" />
      </header>

      <main className="container mx-auto px-4 py-5 max-w-2xl">
        {/* helper text only (no duplicate title) */}
        <div className="text-center mb-5">
          <p className="text-sm text-muted-foreground">
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
                        <CardTitle className="text-lg text-card-foreground truncate">
                          {vehicle.vehicle_number}
                        </CardTitle>
                        <CardDescription className="text-muted-foreground truncate">
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
          <div className="mt-7 text-center">
            <Link href="/manager">
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 text-base font-medium">
                <Settings className="h-4 w-4 mr-2" />
                Manager Dashboard
              </Button>
            </Link>
            <p className="text-sm text-muted-foreground mt-2">Access reports, settings & analytics</p>
          </div>
        )}

        <div className="h-6" />
      </main>
    </div>
  )
}
