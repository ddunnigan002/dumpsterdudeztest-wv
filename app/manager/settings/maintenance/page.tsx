"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"

type PolicyRow = {
  id?: string
  maintenance_type: string
  default_interval_miles: number | null
  default_interval_days: number | null
  is_active: boolean
}

function numOrNull(v: string) {
  const n = Number(v)
  return Number.isFinite(n) && v !== "" ? n : null
}

function normalizeType(s: string) {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
}

export default function MaintenancePolicySettingsPage() {
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState<PolicyRow[]>([])
  const [categories, setCategories] = useState<string[]>([])

  // Add custom type inputs
  const [newType, setNewType] = useState("")
  const [newMiles, setNewMiles] = useState("")
  const [newDays, setNewDays] = useState("")
  const [newActive, setNewActive] = useState(true)

  const knownTypes = useMemo(() => {
    const set = new Set<string>()
    rows.forEach((r) => set.add(r.maintenance_type))
    categories.forEach((c) => set.add(c))
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [rows, categories])

  async function load() {
    setLoading(true)
    try {
      const [pRes, cRes] = await Promise.all([
        fetch("/api/manager/maintenance-policy", { cache: "no-store" }),
        fetch("/api/manager/maintenance-filter-options", { cache: "no-store" }),
      ])

      const pJson = pRes.ok ? await pRes.json() : []
      const cJson = cRes.ok ? await cRes.json() : { categories: [] }

      setRows(Array.isArray(pJson) ? pJson : [])
      setCategories(Array.isArray(cJson.categories) ? cJson.categories : [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  function getRow(type: string): PolicyRow {
    const existing = rows.find((r) => r.maintenance_type === type)
    return (
      existing ?? {
        maintenance_type: type,
        default_interval_miles: null,
        default_interval_days: null,
        is_active: true,
      }
    )
  }

  // ✅ FIXED: surface errors instead of failing silently
  async function save(row: PolicyRow) {
    setLoading(true)
    try {
      const res = await fetch("/api/manager/maintenance-policy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(row),
      })

      const j = await res.json().catch(() => null)

      if (!res.ok) {
        console.error("Save policy failed:", j)
        alert(j?.error ?? "Failed to save maintenance policy")
        return
      }

      await load()
    } finally {
      setLoading(false)
    }
  }

  async function applyToExisting() {
    setLoading(true)
    try {
      const res = await fetch("/api/manager/maintenance-policy/apply", { method: "POST" })
      const j = await res.json().catch(() => null)

      if (!res.ok) {
        console.error("Apply failed:", j)
        alert(j?.error ?? "Failed to apply defaults to existing schedules")
        return
      }

      await load()
    } finally {
      setLoading(false)
    }
  }

  const normalizedPreview = newType.trim() ? normalizeType(newType) : ""
  const newTypeAlreadyExists =
    normalizedPreview &&
    knownTypes.some((t) => t.toLowerCase() === normalizedPreview.toLowerCase())

  async function addType() {
    const t = normalizeType(newType)
    if (!t) return

    await save({
      maintenance_type: t,
      default_interval_miles: numOrNull(newMiles),
      default_interval_days: numOrNull(newDays),
      is_active: newActive,
    })

    setNewType("")
    setNewMiles("")
    setNewDays("")
    setNewActive(true)
  }

  async function seedFromExisting() {
    setLoading(true)
    try {
      const res = await fetch("/api/manager/maintenance-policy/seed", { method: "POST" })
      const j = await res.json().catch(() => null)

      if (!res.ok) {
        console.error("Seed failed:", j)
        alert(j?.error ?? "Failed to seed maintenance types")
        return
      }

      await load()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Maintenance Settings</h1>
          <p className="text-sm text-muted-foreground">
            Set default maintenance intervals per franchise. These are used to roll the next due forward when a service is completed.
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={load} disabled={loading}>
            Refresh
          </Button>

          <Button variant="outline" onClick={seedFromExisting} disabled={loading}>
            Seed from Existing Data
          </Button>

          <Button onClick={applyToExisting} disabled={loading}>
            Apply to Existing Schedules
          </Button>
        </div>
      </div>

      {/* Add Maintenance Type */}
      <Card>
        <CardHeader>
          <CardTitle>Add Maintenance Type</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="space-y-1 sm:col-span-2">
            <Label>Type name</Label>
            <Input
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              placeholder="e.g. brakes, grease_points, pmi_a"
            />
            <div className="text-xs text-muted-foreground">
              Saved as: <span className="font-mono">{normalizedPreview ? normalizedPreview : "—"}</span>
              {newTypeAlreadyExists ? <span className="ml-2 text-destructive">Already exists</span> : null}
            </div>
          </div>

          <div className="space-y-1">
            <Label>Interval Miles</Label>
            <Input
              type="number"
              value={newMiles}
              onChange={(e) => setNewMiles(e.target.value)}
              placeholder="e.g. 10000"
            />
          </div>

          <div className="space-y-1">
            <Label>Interval Days</Label>
            <Input
              type="number"
              value={newDays}
              onChange={(e) => setNewDays(e.target.value)}
              placeholder="e.g. 90"
            />
          </div>

          <div className="sm:col-span-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Label className="text-xs">Active</Label>
              <Switch checked={newActive} onCheckedChange={(v) => setNewActive(v)} />
            </div>

            <div className="flex gap-2">
              <Button disabled={loading || !newType.trim() || newTypeAlreadyExists} onClick={addType}>
                Add Type
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setNewType("")
                  setNewMiles("")
                  setNewDays("")
                  setNewActive(true)
                }}
              >
                Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Defaults */}
      <Card>
        <CardHeader>
          <CardTitle>Defaults by Maintenance Type</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {knownTypes.length === 0 ? (
            <div className="text-sm text-muted-foreground">No maintenance types found yet.</div>
          ) : (
            knownTypes.map((type) => {
              const row = getRow(type)
              return (
                <div key={type} className="rounded-md border p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{type}</Badge>
                      <div className="text-xs text-muted-foreground">Franchise default</div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Label className="text-xs">Active</Label>
                      <Switch checked={row.is_active} onCheckedChange={(v) => save({ ...row, is_active: v })} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label>Interval Miles</Label>
                      <Input
                        type="number"
                        value={row.default_interval_miles ?? ""}
                        onChange={(e) => save({ ...row, default_interval_miles: numOrNull(e.target.value) })}
                        placeholder="e.g. 10000"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label>Interval Days</Label>
                      <Input
                        type="number"
                        value={row.default_interval_days ?? ""}
                        onChange={(e) => save({ ...row, default_interval_days: numOrNull(e.target.value) })}
                        placeholder="e.g. 90"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label>Notes</Label>
                      <div className="h-10 rounded-md border px-3 text-sm flex items-center text-muted-foreground">
                        Used when rolling schedule forward
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>
    </div>
  )
}
