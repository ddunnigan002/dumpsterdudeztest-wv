"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

function formatDateSafe(value: any) {
  if (!value) return "—"
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString()
}

function money(n: any) {
  const v = Number(n) || 0
  return v.toLocaleString(undefined, { style: "currency", currency: "USD" })
}

type VehicleLite = { id: string; vehicle_number: string; make?: string | null; model?: string | null }

type MaintenanceRecord = {
  id: string
  vehicle_id: string
  service_date: string | null
  created_at: string
  maintenance_category: string | null
  service_type: string | null
  description: string | null
  vendor_name: string | null
  cost: number | null
  notes: string | null
  vehicle?: { id: string; vehicle_number: string; make?: string | null; model?: string | null } | null
}

export default function MaintenanceRecordsTable() {
  const [vehicles, setVehicles] = useState<VehicleLite[]>([])
  const [categories, setCategories] = useState<string[]>([])

  // Filters
  const [vehicleId, setVehicleId] = useState<string>("")
  const [category, setCategory] = useState<string>("")
  const [vendorInput, setVendorInput] = useState<string>("")
  const [vendorQuery, setVendorQuery] = useState<string>("")
  const [dateFrom, setDateFrom] = useState<string>("")
  const [dateTo, setDateTo] = useState<string>("")

  // Data
  const [records, setRecords] = useState<MaintenanceRecord[]>([])
  const [count, setCount] = useState<number>(0)
  const [limit] = useState<number>(25)
  const [offset, setOffset] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(false)

  const totalPages = useMemo(() => Math.max(1, Math.ceil(count / limit)), [count, limit])
  const currentPage = useMemo(() => Math.floor(offset / limit) + 1, [offset, limit])

  // Vehicles dropdown
  useEffect(() => {
    ;(async () => {
      const res = await fetch("/api/manager/vehicles-lite", { cache: "no-store" })
      if (!res.ok) return
      const j = await res.json()
      setVehicles(Array.isArray(j) ? j : [])
    })()
  }, [])

  // Category options
  useEffect(() => {
    ;(async () => {
      const res = await fetch("/api/manager/maintenance-filter-options", { cache: "no-store" })
      if (!res.ok) return
      const j = await res.json()
      setCategories(Array.isArray(j.categories) ? j.categories : [])
    })()
  }, [])

  // Debounce vendor input
  useEffect(() => {
    const t = setTimeout(() => {
      setVendorQuery(vendorInput)
      setOffset(0)
    }, 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorInput])

  async function load(nextOffset?: number) {
    const useOffset = typeof nextOffset === "number" ? nextOffset : offset
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (vehicleId) params.set("vehicle_id", vehicleId)
      if (category) params.set("category", category)
      if (vendorQuery) params.set("vendor", vendorQuery)
      if (dateFrom) params.set("date_from", dateFrom)
      if (dateTo) params.set("date_to", dateTo)
      params.set("limit", String(limit))
      params.set("offset", String(useOffset))

      const res = await fetch(`/api/manager/maintenance-records?${params.toString()}`, {
        cache: "no-store",
      })

      if (!res.ok) {
        setRecords([])
        setCount(0)
        return
      }

      const j = await res.json()
      setRecords(Array.isArray(j.records) ? j.records : [])
      setCount(Number(j.count) || 0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicleId, category, vendorQuery, dateFrom, dateTo, offset])

  function clearFilters() {
    setVehicleId("")
    setCategory("")
    setVendorInput("")
    setVendorQuery("")
    setDateFrom("")
    setDateTo("")
    setOffset(0)
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <CardTitle>Maintenance Records</CardTitle>
          {/* Temporary debug so you can visually confirm the new file is rendering */}
          <div className="text-xs text-muted-foreground">Filters: dropdown category + debounced vendor (v2)</div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={clearFilters}>
            Clear
          </Button>
          <Button
            onClick={() => {
              setOffset(0)
              load(0)
            }}
            disabled={loading}
          >
            Refresh
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <div className="space-y-1">
            <Label>Vehicle</Label>
            <select
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={vehicleId}
              onChange={(e) => {
                setVehicleId(e.target.value)
                setOffset(0)
              }}
            >
              <option value="">All</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.vehicle_number}
                  {v.make || v.model ? ` (${v.make ?? ""} ${v.model ?? ""})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label>Category</Label>
            <select
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value)
                setOffset(0)
              }}
            >
              <option value="">All</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label>Vendor</Label>
            <Input value={vendorInput} onChange={(e) => setVendorInput(e.target.value)} placeholder="e.g. Mavis" />
          </div>

          <div className="space-y-1">
            <Label>Date From</Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value)
                setOffset(0)
              }}
            />
          </div>

          <div className="space-y-1">
            <Label>Date To</Label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value)
                setOffset(0)
              }}
            />
          </div>

          <div className="space-y-1">
            <Label>Results</Label>
            <div className="h-10 rounded-md border px-3 text-sm flex items-center">
              {loading ? "Loading…" : `${count} found`}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-md border">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="[&>th]:px-3 [&>th]:py-2 text-left">
                <th>Date</th>
                <th>Vehicle</th>
                <th>Category</th>
                <th>Provider</th>
                <th>Cost</th>
                <th className="min-w-[260px]">Notes</th>
              </tr>
            </thead>
            <tbody className="[&>tr]:border-t">
              {records.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                    {loading ? "Loading…" : "No records match your filters."}
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r.id} className="[&>td]:px-3 [&>td]:py-2 align-top">
                    <td>{formatDateSafe(r.service_date ?? r.created_at)}</td>
                    <td>
                      <div className="font-medium">{r.vehicle?.vehicle_number ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">
                        {r.vehicle?.make || r.vehicle?.model
                          ? `${r.vehicle?.make ?? ""} ${r.vehicle?.model ?? ""}`.trim()
                          : ""}
                      </div>
                    </td>
                    <td>
                      <Badge variant="secondary">{r.maintenance_category ?? "—"}</Badge>
                    </td>
                    <td>{r.vendor_name ?? "—"}</td>
                    <td className="font-medium">{money(r.cost)}</td>
                    <td className="text-muted-foreground">{r.description ?? r.notes ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={loading || offset === 0}
              onClick={() => setOffset(Math.max(0, offset - limit))}
            >
              Prev
            </Button>
            <Button
              variant="outline"
              disabled={loading || offset + limit >= count}
              onClick={() => setOffset(offset + limit)}
            >
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
