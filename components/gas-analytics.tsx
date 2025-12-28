"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Fuel, TrendingUp, DollarSign, Gauge } from "lucide-react"
import { Line, LineChart, Bar, BarChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

interface GasAnalyticsProps {
  onBack: () => void
}

interface AnalyticsData {
  date: string
  vehicle: string
  gallons: number
  cost: number
  milesDriven: number
  mpg: number
  costPerGallon: number
  costPerMile: number
}

interface SummaryData {
  totalGallons: number
  totalCost: number
  totalMiles: number
  averageMPG: number
  averageCostPerGallon: number
  entriesCount: number
}

interface VehicleOption {
  id: string
  vehicle_number: string
  make?: string | null
  model?: string | null
}

export default function GasAnalytics({ onBack }: GasAnalyticsProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData[]>([])
  const [summary, setSummary] = useState<SummaryData | null>(null)

  const [vehicles, setVehicles] = useState<VehicleOption[]>([])
  const [vehiclesLoading, setVehiclesLoading] = useState(true)

  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState("30")
  const [selectedVehicle, setSelectedVehicle] = useState("all") // UUID or "all"

  // Build dropdown label
  const vehicleLabel = (v: VehicleOption) => {
    const parts = [v.vehicle_number, v.make, v.model].filter(Boolean)
    return parts.join(" • ")
  }

  // Fetch vehicles for the dropdown (dynamic, franchise-scoped)
  useEffect(() => {
    let cancelled = false

    const fetchVehicles = async () => {
      setVehiclesLoading(true)
      try {
        // ✅ If your vehicles page already works, you almost certainly have an endpoint.
        // If yours is different, change this URL:
        const res = await fetch("/api/vehicles", { cache: "no-store" })
        if (!res.ok) throw new Error(`Failed to fetch vehicles: ${res.status}`)

        const data = await res.json()

        // Common shapes:
        // - { vehicles: [...] }
        // - [...] directly
        const list: VehicleOption[] = Array.isArray(data) ? data : (data.vehicles ?? data.data ?? [])

        if (!cancelled) {
          // ensure unique and stable ordering
          const normalized = (list || [])
            .filter((v) => v?.id && v?.vehicle_number)
            .sort((a, b) => (a.vehicle_number || "").localeCompare(b.vehicle_number || ""))

          setVehicles(normalized)
        }
      } catch (e) {
        console.error("Error fetching vehicles:", e)
        if (!cancelled) setVehicles([])
      } finally {
        if (!cancelled) setVehiclesLoading(false)
      }
    }

    fetchVehicles()
    return () => {
      cancelled = true
    }
  }, [])

  // If the currently selected vehicle is no longer in the list (e.g., old hardcoded value), reset to "all"
  useEffect(() => {
    if (selectedVehicle === "all") return
    if (vehiclesLoading) return

    const exists = vehicles.some((v) => v.id === selectedVehicle)
    if (!exists) setSelectedVehicle("all")
  }, [vehiclesLoading, vehicles, selectedVehicle])

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        days: dateRange,
        vehicleId: selectedVehicle, // UUID or "all"
      })
      const response = await fetch(`/api/gas-analytics?${params}`, { cache: "no-store" })
      if (!response.ok) {
        const text = await response.text().catch(() => "")
        throw new Error(`Gas analytics fetch failed: ${response.status} ${text}`)
      }
      const data = await response.json()
      setAnalytics(data.analytics || [])
      setSummary(data.summary || null)
    } catch (error) {
      console.error("Error fetching analytics:", error)
      setAnalytics([])
      setSummary(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange, selectedVehicle])

  const chartConfig = useMemo(
    () => ({
      gallons: {
        label: "Gallons",
        color: "hsl(var(--chart-1))",
      },
      cost: {
        label: "Cost ($)",
        color: "hsl(var(--chart-2))",
      },
      mpg: {
        label: "MPG",
        color: "hsl(var(--chart-3))",
      },
      milesDriven: {
        label: "Miles Driven",
        color: "hsl(var(--chart-4))",
      },
    }),
    []
  )

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Gas Analytics</h1>
          <p className="text-gray-600">Fuel consumption and cost analysis</p>
        </div>

        <div className="flex gap-2">
          <select
            value={selectedVehicle}
            onChange={(e) => setSelectedVehicle(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            disabled={vehiclesLoading}
          >
            <option value="all">{vehiclesLoading ? "Loading vehicles..." : "All Vehicles"}</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {vehicleLabel(v)}
              </option>
            ))}
          </select>

          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
        </div>
      </div>

      {loading ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-gray-600">Loading analytics...</div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary Cards */}
          {summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Fuel className="h-4 w-4 text-blue-600" />
                    <div className="text-sm text-gray-600">Total Gallons</div>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{summary.totalGallons}</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    <div className="text-sm text-gray-600">Total Cost</div>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">${summary.totalCost}</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-purple-600" />
                    <div className="text-sm text-gray-600">Total Miles</div>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{summary.totalMiles.toLocaleString()}</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Gauge className="h-4 w-4 text-orange-600" />
                    <div className="text-sm text-gray-600">Avg MPG</div>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{summary.averageMPG}</div>
                </CardContent>
              </Card>
            </div>
          )}

          {analytics.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Fuel className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <div className="text-gray-600">No fuel data found for the selected period.</div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Fuel Consumption Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Fuel Consumption Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={analytics}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tickFormatter={(value) => new Date(value).toLocaleDateString()} />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Line
                          type="monotone"
                          dataKey="gallons"
                          stroke="var(--color-gallons)"
                          strokeWidth={2}
                          name="Gallons"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Cost Analysis Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Fuel Cost Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={analytics}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tickFormatter={(value) => new Date(value).toLocaleDateString()} />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Line
                          type="monotone"
                          dataKey="cost"
                          stroke="var(--color-cost)"
                          strokeWidth={2}
                          name="Cost ($)"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* MPG Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Miles Per Gallon (MPG)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tickFormatter={(value) => new Date(value).toLocaleDateString()} />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="mpg" fill="var(--color-mpg)" name="MPG" />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Miles Driven Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Daily Miles Driven</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tickFormatter={(value) => new Date(value).toLocaleDateString()} />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="milesDriven" fill="var(--color-milesDriven)" name="Miles Driven" />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  )
}
