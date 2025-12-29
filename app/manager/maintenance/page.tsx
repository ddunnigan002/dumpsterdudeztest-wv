import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Wrench, AlertTriangle, DollarSign, Truck } from "lucide-react"
import MaintenanceRecordsTable from "@/components/maintenance/MaintenanceRecordsTable"

async function getKpis() {
  const res = await fetch("/api/manager/maintenance-kpis", {
    cache: "no-store",
  })
  if (!res.ok) return null
  return res.json()
}

function money(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" })
}

export default async function MaintenanceDashboardPage() {
  const kpis = (await getKpis()) ?? {
    openIssuesCount: 0,
    vehiclesCount: 0,
    vehiclesDueForService: 0,
    totalCost30: 0,
    totalCost90: 0,
    avgCostPerVehicle90: 0,
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Maintenance Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Fleet maintenance health and spend overview.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">Open Issues</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.openIssuesCount}</div>
            <p className="text-xs text-muted-foreground">Across your franchise</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">Vehicles Due</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.vehiclesDueForService}</div>
            <p className="text-xs text-muted-foreground">Rule-based (Phase C)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">Maintenance Spend (30d)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{money(kpis.totalCost30)}</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">Avg Cost / Vehicle (90d)</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{money(kpis.avgCostPerVehicle90)}</div>
            <p className="text-xs text-muted-foreground">90-day average</p>
          </CardContent>
        </Card>
      </div>

      <MaintenanceRecordsTable />
    </div>
  )
}
