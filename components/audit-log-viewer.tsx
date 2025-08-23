"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { History, User, Filter } from "lucide-react"
import { format } from "date-fns"

interface AuditLogEntry {
  id: string
  table_name: string
  record_id: string
  action: string
  old_values: any
  new_values: any
  manager_override: boolean
  change_reason: string | null
  created_at: string
  users: {
    full_name: string
    email: string
  } | null
}

export function AuditLogViewer() {
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({
    table: "all", // Updated default value to "all"
    managerOverrideOnly: false,
    limit: "50",
  })

  useEffect(() => {
    fetchAuditLogs()
  }, [filters])

  const fetchAuditLogs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.table !== "all") params.append("table", filters.table) // Updated condition to check for "all"
      if (filters.managerOverrideOnly) params.append("manager_override", "true")
      params.append("limit", filters.limit)

      const response = await fetch(`/api/audit-log?${params}`)
      if (response.ok) {
        const data = await response.json()
        setAuditLogs(data.logs || [])
      }
    } catch (error) {
      console.error("Error fetching audit logs:", error)
    } finally {
      setLoading(false)
    }
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case "INSERT":
        return "bg-green-100 text-green-800"
      case "UPDATE":
        return "bg-blue-100 text-blue-800"
      case "DELETE":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const formatChanges = (oldValues: any, newValues: any) => {
    if (!oldValues || !newValues) return "No change details available"

    const changes: string[] = []
    for (const [key, newValue] of Object.entries(newValues)) {
      const oldValue = oldValues[key]
      if (oldValue !== newValue && key !== "updated_at") {
        changes.push(`${key}: ${oldValue || "null"} → ${newValue || "null"}`)
      }
    }

    return changes.length > 0 ? changes.join(", ") : "No significant changes"
  }

  return (
    <div className="space-y-6">
      <Card className="border-orange-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-orange-600" />
            Audit Log
          </CardTitle>
          <CardDescription>Track all data changes and manager overrides</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div>
              <Label htmlFor="table-filter">Table</Label>
              <Select value={filters.table} onValueChange={(value) => setFilters({ ...filters, table: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="All tables" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All tables</SelectItem> {/* Updated value to "all" */}
                  <SelectItem value="daily_logs">Daily Logs</SelectItem>
                  <SelectItem value="vehicle_issues">Vehicle Issues</SelectItem>
                  <SelectItem value="vehicles">Vehicles</SelectItem>
                  <SelectItem value="maintenance_records">Maintenance Records</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="limit-filter">Limit</Label>
              <Select value={filters.limit} onValueChange={(value) => setFilters({ ...filters, limit: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25 entries</SelectItem>
                  <SelectItem value="50">50 entries</SelectItem>
                  <SelectItem value="100">100 entries</SelectItem>
                  <SelectItem value="200">200 entries</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                variant={filters.managerOverrideOnly ? "default" : "outline"}
                onClick={() => setFilters({ ...filters, managerOverrideOnly: !filters.managerOverrideOnly })}
                className={filters.managerOverrideOnly ? "bg-orange-500 hover:bg-orange-600" : ""}
              >
                <Filter className="h-4 w-4 mr-2" />
                Manager Overrides Only
              </Button>
            </div>
            <div className="flex items-end">
              <Button onClick={fetchAuditLogs} disabled={loading}>
                {loading ? "Loading..." : "Refresh"}
              </Button>
            </div>
          </div>

          {/* Audit Log Entries */}
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading audit logs...</div>
            ) : auditLogs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No audit logs found</div>
            ) : (
              auditLogs.map((log) => (
                <Card key={log.id} className="border-gray-200">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Badge className={getActionColor(log.action)}>{log.action}</Badge>
                        <Badge variant="outline">{log.table_name}</Badge>
                        {log.manager_override && (
                          <Badge className="bg-orange-100 text-orange-800">Manager Override</Badge>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        {format(new Date(log.created_at), "MMM d, yyyy h:mm a")}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                      <div>
                        <div className="text-sm text-gray-500">Changed by</div>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">
                            {log.users?.full_name || "System"} ({log.users?.email || "system@app.com"})
                          </span>
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Record ID</div>
                        <div className="font-mono text-sm">{log.record_id.slice(0, 8)}...</div>
                      </div>
                    </div>

                    {log.action === "UPDATE" && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <div className="text-sm text-gray-500 mb-1">Changes</div>
                        <div className="text-sm">{formatChanges(log.old_values, log.new_values)}</div>
                      </div>
                    )}

                    {log.change_reason && (
                      <div className="mt-3 bg-blue-50 p-3 rounded-lg">
                        <div className="text-sm text-blue-700">
                          <strong>Reason:</strong> {log.change_reason}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
