"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

type VehicleRow = {
  id: string
  vehicle_number: string
  status: string | null
}

type ChecklistRow = {
  vehicle_id: string
  checklist_date: string // YYYY-MM-DD
  overall_status?: string | null
}

type ScheduleSettings = {
  weekly_checklist_interval_days: number | null
  monthly_checklist_interval_days: number | null
}

type CompletionState = "missing" | "pass" | "service_soon" | "fail"

function toISODate(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}
function addDays(d: Date, days: number) {
  const x = new Date(d)
  x.setDate(x.getDate() + days)
  return x
}
function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function normalizeStatus(s?: string | null) {
  return (s ?? "").toLowerCase().trim().replace(/\s+/g, "_")
}

/**
 * Severity rules:
 * - green only if pass
 * - yellow if service soon (and no fail)
 * - red if fail
 * - missing if not completed / pending / no row
 */
function getCompletionState(row: ChecklistRow | undefined): CompletionState {
  if (!row) return "missing"
  const s = normalizeStatus(row.overall_status)

  if (!s || s === "pending") return "missing"
  if (["fail", "failed"].includes(s)) return "fail"
  if (["service_soon", "service-soon", "needs_service", "needs-attention", "warning", "caution"].includes(s)) {
    return "service_soon"
  }
  if (["pass", "passed", "ok", "completed", "complete", "done", "submitted"].includes(s)) return "pass"
  return "missing"
}

function isSubmitted(row: ChecklistRow | undefined) {
  return getCompletionState(row) !== "missing"
}

function formatPct(n: number) {
  if (!Number.isFinite(n)) return "0%"
  return `${Math.round(n)}%`
}

type Props = { franchiseId: string }

export default function ComplianceHeatmapByTruck({ franchiseId }: Props) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [rangeDays, setRangeDays] = useState<7 | 14 | 30>(14)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [vehicles, setVehicles] = useState<VehicleRow[]>([])
  const [daily, setDaily] = useState<ChecklistRow[]>([])
  const [weekly, setWeekly] = useState<ChecklistRow[]>([])
  const [monthly, setMonthly] = useState<ChecklistRow[]>([])
  const [settings, setSettings] = useState<ScheduleSettings>({
    weekly_checklist_interval_days: 7,
    monthly_checklist_interval_days: 30,
  })

  const today = useMemo(() => startOfToday(), [])
  const endISO = useMemo(() => toISODate(today), [today])
  const startISO = useMemo(() => toISODate(addDays(today, -(rangeDays - 1))), [today, rangeDays])

  const dayList = useMemo(() => {
    const days: { date: Date; iso: string }[] = []
    for (let i = rangeDays - 1; i >= 0; i--) {
      const d = addDays(today, -i)
      days.push({ date: d, iso: toISODate(d) })
    }
    return days
  }, [today, rangeDays])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const { data: vData, error: vErr } = await supabase
          .from("vehicles")
          .select("id, vehicle_number, status")
          .eq("franchise_id", franchiseId)
          .order("vehicle_number", { ascending: true })

        if (vErr) throw vErr
        if (cancelled) return
        setVehicles(vData ?? [])

        const { data: sData } = await supabase
          .from("maintenance_schedule_settings")
          .select("weekly_checklist_interval_days, monthly_checklist_interval_days")
          .eq("franchise_id", franchiseId)
          .limit(1)
          .maybeSingle()

        if (!cancelled && sData) {
          setSettings({
            weekly_checklist_interval_days: sData.weekly_checklist_interval_days ?? 7,
            monthly_checklist_interval_days: sData.monthly_checklist_interval_days ?? 30,
          })
        }

        const { data: dData, error: dErr } = await supabase
          .from("daily_checklists")
          .select("vehicle_id, checklist_date, overall_status")
          .eq("franchise_id", franchiseId)
          .gte("checklist_date", startISO)
          .lte("checklist_date", endISO)

        if (dErr) throw dErr
        if (cancelled) return
        setDaily(dData ?? [])

        const weeklyWindowStart = toISODate(addDays(today, -120))
        const monthlyWindowStart = toISODate(addDays(today, -365))

        const [{ data: wData, error: wErr }, { data: mData, error: mErr }] = await Promise.all([
          supabase
            .from("weekly_checklists")
            .select("vehicle_id, checklist_date, overall_status")
            .eq("franchise_id", franchiseId)
            .gte("checklist_date", weeklyWindowStart)
            .lte("checklist_date", endISO),
          supabase
            .from("monthly_checklists")
            .select("vehicle_id, checklist_date, overall_status")
            .eq("franchise_id", franchiseId)
            .gte("checklist_date", monthlyWindowStart)
            .lte("checklist_date", endISO),
        ])

        if (wErr) throw wErr
        if (mErr) throw mErr
        if (cancelled) return
        setWeekly(wData ?? [])
        setMonthly(mData ?? [])
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load compliance data")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [supabase, franchiseId, startISO, endISO, today])

  const dailyByVehicleDate = useMemo(() => {
    const map = new Map<string, ChecklistRow>()
    for (const r of daily) map.set(`${r.vehicle_id}|${r.checklist_date}`, r)
    return map
  }, [daily])

  const latestWeeklyByVehicle = useMemo(() => {
    const map = new Map<string, ChecklistRow>()
    for (const r of weekly) {
      const existing = map.get(r.vehicle_id)
      if (!existing || r.checklist_date > existing.checklist_date) map.set(r.vehicle_id, r)
    }
    return map
  }, [weekly])

  const latestMonthlyByVehicle = useMemo(() => {
    const map = new Map<string, ChecklistRow>()
    for (const r of monthly) {
      const existing = map.get(r.vehicle_id)
      if (!existing || r.checklist_date > existing.checklist_date) map.set(r.vehicle_id, r)
    }
    return map
  }, [monthly])

  function daysSince(iso: string) {
    const d = new Date(iso + "T00:00:00")
    const diff = today.getTime() - d.getTime()
    return Math.floor(diff / (1000 * 60 * 60 * 24))
  }

  function statusBadge(kind: "weekly" | "monthly", vehicleId: string) {
    const interval =
      kind === "weekly"
        ? settings.weekly_checklist_interval_days ?? 7
        : settings.monthly_checklist_interval_days ?? 30

    const latest = kind === "weekly" ? latestWeeklyByVehicle.get(vehicleId) : latestMonthlyByVehicle.get(vehicleId)
    const state = getCompletionState(latest)

    if (state === "missing") {
      return (
        <Badge variant="destructive" className="whitespace-nowrap">
          {kind === "weekly" ? "Weekly" : "Monthly"}: Missing
        </Badge>
      )
    }
    if (state === "fail") {
      return (
        <Badge variant="destructive" className="whitespace-nowrap">
          {kind === "weekly" ? "Weekly" : "Monthly"}: Failed
        </Badge>
      )
    }
    if (state === "service_soon") {
      return (
        <Badge variant="secondary" className="whitespace-nowrap">
          {kind === "weekly" ? "Weekly" : "Monthly"}: Service soon
        </Badge>
      )
    }

    const age = daysSince(latest!.checklist_date)
    const overdue = age > interval
    if (overdue) {
      return (
        <Badge variant="destructive" className="whitespace-nowrap">
          {kind === "weekly" ? "Weekly" : "Monthly"}: Overdue {age}d
        </Badge>
      )
    }

    const warnThreshold = Math.max(1, Math.floor(interval * 0.8))
    if (age >= warnThreshold) {
      return (
        <Badge variant="secondary" className="whitespace-nowrap">
          {kind === "weekly" ? "Weekly" : "Monthly"}: Due soon
        </Badge>
      )
    }

    return (
      <Badge variant="default" className="whitespace-nowrap">
        {kind === "weekly" ? "Weekly" : "Monthly"}: OK
      </Badge>
    )
  }

  function dailyCompletionPct(vehicleId: string) {
    let requiredDays = 0
    let submittedDays = 0

    // past days only (exclude today)
    for (const day of dayList) {
      if (!(day.iso < endISO)) continue
      requiredDays++
      const row = dailyByVehicleDate.get(`${vehicleId}|${day.iso}`)
      if (isSubmitted(row)) submittedDays++
    }

    if (requiredDays === 0) return 0
    return (submittedDays / requiredDays) * 100
  }

  function cellStyle(row: ChecklistRow | undefined, iso: string) {
    const state = getCompletionState(row)
    const isToday = iso === endISO
    const isFuture = iso > endISO
    const isPast = iso < endISO

    if (isFuture) {
      return { cls: "bg-muted/30 border-muted", mark: "", markCls: "" }
    }

    if (state === "missing") {
      const mark = isPast ? "×" : isToday ? "·" : "×"
      return {
        cls: cn(
          "bg-transparent border-muted-foreground/30",
          isPast ? "border-rose-400/50" : "border-muted-foreground/30"
        ),
        mark,
        markCls: isPast ? "text-rose-500/80" : "text-muted-foreground/70",
      }
    }

    if (state === "pass") return { cls: "bg-emerald-500/70 border-emerald-600/40", mark: "", markCls: "" }
    if (state === "service_soon") return { cls: "bg-amber-400/70 border-amber-600/40", mark: "", markCls: "" }
    return { cls: "bg-rose-500/70 border-rose-600/40", mark: "", markCls: "" }
  }

  function labelFor(iso: string, row: ChecklistRow | undefined) {
    const state = getCompletionState(row)
    if (iso > endISO) return `${iso}: future`
    if (state === "missing") return `${iso}: not completed`
    if (state === "pass") return `${iso}: pass`
    if (state === "service_soon") return `${iso}: service soon`
    return `${iso}: fail`
  }

  function openDailyChecklist(vehicleNumber: string, isoDate: string) {
    const url = `/manager/reports/pre-trip?date=${encodeURIComponent(isoDate)}&vehicle=${encodeURIComponent(
      vehicleNumber
    )}&type=Daily`
    router.push(url)
  }

  return (
    <Card className="border-orange-200 bg-white/80 backdrop-blur">
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="text-lg">Compliance (by truck)</CardTitle>

        <div className="flex items-center gap-2">
          <Button variant={rangeDays === 7 ? "default" : "outline"} size="sm" onClick={() => setRangeDays(7)}>
            7d
          </Button>
          <Button variant={rangeDays === 14 ? "default" : "outline"} size="sm" onClick={() => setRangeDays(14)}>
            14d
          </Button>
          <Button variant={rangeDays === 30 ? "default" : "outline"} size="sm" onClick={() => setRangeDays(30)}>
            30d
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : error ? (
          <div className="text-sm text-red-600">{error}</div>
        ) : vehicles.length === 0 ? (
          <div className="text-sm text-muted-foreground">No vehicles found.</div>
        ) : (
          <TooltipProvider>
            <div className="space-y-3">
              <div className="grid items-center gap-3" style={{ gridTemplateColumns: "160px 80px 260px 1fr" }}>
                <div className="text-xs font-medium text-muted-foreground">Truck</div>
                <div className="text-xs font-medium text-muted-foreground">EOD %</div>
                <div className="text-xs font-medium text-muted-foreground">Weekly / Monthly</div>
                <div className="flex items-center justify-between">
                  <div className="text-xs font-medium text-muted-foreground">Daily</div>
                  <div className="text-xs text-muted-foreground">
                    {startISO} → {endISO}
                  </div>
                </div>
              </div>

              {vehicles.map((v) => {
                const pct = dailyCompletionPct(v.id)
                return (
                  <div
                    key={v.id}
                    className="grid items-center gap-3 rounded-lg border bg-white/60 p-2"
                    style={{ gridTemplateColumns: "160px 80px 260px 1fr" }}
                  >
                    <div className="truncate font-medium">
                      {v.vehicle_number}
                      {v.status && v.status !== "active" ? (
                        <span className="ml-2 text-xs text-muted-foreground">({v.status})</span>
                      ) : null}
                    </div>

                    <div className="text-sm font-semibold">{formatPct(pct)}</div>

                    <div className="flex flex-wrap gap-2">
                      {statusBadge("weekly", v.id)}
                      {statusBadge("monthly", v.id)}
                    </div>

                    <div className="flex items-center gap-1">
                      {dayList.map((d) => {
                        const row = dailyByVehicleDate.get(`${v.id}|${d.iso}`)
                        const { cls, mark, markCls } = cellStyle(row, d.iso)
                        const isToday = d.iso === endISO
                        const tooltipLabel = labelFor(d.iso, row)
                        const clickable = d.iso <= endISO

                        return (
                          <Tooltip key={d.iso}>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={() => openDailyChecklist(v.vehicle_number, d.iso)}
                                disabled={!clickable}
                                className={cn(
                                  "h-5 w-5 rounded-sm border flex items-center justify-center text-[12px] leading-none",
                                  cls,
                                  isToday ? "ring-2 ring-orange-400/60" : "ring-0",
                                  clickable ? "cursor-pointer" : "cursor-default opacity-60"
                                )}
                                aria-label={`Open ${v.vehicle_number} checklist for ${d.iso}`}
                              >
                                {mark ? <span className={markCls}>{mark}</span> : null}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>{tooltipLabel}</TooltipContent>
                          </Tooltip>
                        )
                      })}
                    </div>
                  </div>
                )
              })}

              <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded border bg-emerald-500/70 border-emerald-600/40" />
                  <span>Pass</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded border bg-amber-400/70 border-amber-600/40" />
                  <span>Service soon</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded border bg-rose-500/70 border-rose-600/40" />
                  <span>Fail</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded border bg-transparent border-muted-foreground/30 flex items-center justify-center">
                    <span className="text-rose-500/80 text-[12px] leading-none">×</span>
                  </div>
                  <span>Not completed</span>
                </div>
              </div>
            </div>
          </TooltipProvider>
        )}
      </CardContent>
    </Card>
  )
}
