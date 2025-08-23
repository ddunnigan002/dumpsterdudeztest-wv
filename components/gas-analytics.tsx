"use client"

import { useState, useEffect } from "react"
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

export default function GasAnalytics({ onBack }: GasAnalyticsProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData[]>([])
  const [summary, setSummary] = useState<SummaryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState("30")
  const [selectedVehicle, setSelectedVehicle] = useState("all")

  useEffect(() => {
    fetchAnalytics()
  }, [dateRange, selectedVehicle])

  const fetchAnalytics = async () => {
    try {
      const params = new URLSearchParams({
        days: dateRange,
        vehicleId: selectedVehicle,
      })
      const response = await fetch(`/api/gas-analytics?${params}`)
      if (response.ok) {
        const data = await response.json()
        setAnalytics(data.analytics || [])
        setSummary(data.summary || null)
      }
    } catch (error) {
      console.error("Error fetching analytics:", error)
    } finally {
      setLoading(false)
    }
  }

  const chartConfig = {
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
  }

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
          >
            <option value="all">All Vehicles</option>
            <option value="CHEVY">Chevy 6500</option>
            <option value="KENWORTH">Kenworth T280</option>
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
