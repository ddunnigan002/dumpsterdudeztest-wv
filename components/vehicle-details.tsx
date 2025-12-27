"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Truck, Calendar, Wrench, AlertTriangle, CheckCircle, X } from "lucide-react"

interface VehicleDetailsProps {
  vehicleId: string
  onBack: () => void
}

type IssueRow = {
  id: string
  vehicle_id: string
  status: string | null
  created_at: string
  description: string | null
  photos?: string[] | null
}

export default function VehicleDetails({ vehicleId, onBack }: VehicleDetailsProps) {
  const [vehicle, setVehicle] = useState<any>(null)
  const [maintenanceHistory, setMaintenanceHistory] = useState<any[]>([])
  const [upcomingMaintenance, setUpcomingMaintenance] = useState<any[]>([])
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [issues, setIssues] = useState<IssueRow[]>([])

  const [loading, setLoading] = useState(true)

  const [selectedActivity, setSelectedActivity] = useState<any>(null)
  const [activityDetails, setActivityDetails] = useState<any>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)

  const [completingMaintenance, setCompletingMaintenance] = useState<string | null>(null)
  const [resolvingIssue, setResolvingIssue] = useState<string | null>(null)

  const openIssues = useMemo(() => {
    return (issues ?? []).filter((i) => {
      const s = (i.status ?? "").toLowerCase()
      return s !== "resolved" && s !== "closed"
    })
  }, [issues])

  const derivedStatus = useMemo(() => {
    // If there are open issues, we want to show the same "Needs Attention" idea as the dashboard.
    if (openIssues.length > 0) return "needs-attention"
    return (vehicle?.status ?? "active").toString().toLowerCase()
  }, [openIssues.length, vehicle?.status])

  const fetchVehicleData = async () => {
    try {
      setLoading(true)

      // 1) Vehicle
      const vehicleResponse = await fetch(`/api/vehicles/${vehicleId}`, { cache: "no-store" })
      if (vehicleResponse.ok) {
        const json = await vehicleResponse.json()
        setVehicle(json.vehicle ?? json)
      } else {
        setVehicle(null)
      }

    // 2) Issues (supports both shapes: [] OR { issues: [] })
    const issuesResp = await fetch(`/api/vehicles/${vehicleId}/issues`, { cache: "no-store" })
    if (issuesResp.ok) {
      const j = await issuesResp.json()
      const list = Array.isArray(j) ? j : (j.issues ?? [])
      setIssues(list)
    } else {
      setIssues([])
    } 

      // 3) Maintenance history
      const historyResponse = await fetch(`/api/vehicles/${vehicleId}/maintenance-history`, { cache: "no-store" })
      if (historyResponse.ok) {
        const historyData = await historyResponse.json()
        setMaintenanceHistory(historyData ?? [])
      } else {
        setMaintenanceHistory([])
      }

      // 4) Upcoming maintenance
      const upcomingResponse = await fetch(`/api/vehicles/${vehicleId}/upcoming-maintenance`, { cache: "no-store" })
      if (upcomingResponse.ok) {
        const upcomingData = await upcomingResponse.json()
        setUpcomingMaintenance(upcomingData?.upcomingMaintenance || [])
      } else {
        setUpcomingMaintenance([])
      }

      // 5) Recent activity
      const activityResponse = await fetch(`/api/vehicles/${vehicleId}/recent-activity`, { cache: "no-store" })
      if (activityResponse.ok) {
        const activityData = await activityResponse.json()
        setRecentActivity(activityData ?? [])
      } else {
        setRecentActivity([])
      }
    } catch (error) {
      console.error("Error fetching vehicle data:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (vehicleId) fetchVehicleData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicleId])

  const completeMaintenanceItem = async (maintenanceId: string, maintenanceType: string) => {
    setCompletingMaintenance(maintenanceId)
    try {
      const response = await fetch("/api/complete-maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId,
          maintenanceType,
          alertId: maintenanceId,
          completedBy: "Manager",
          completedDate: new Date().toISOString().split("T")[0],
        }),
      })

      if (response.ok) {
        setUpcomingMaintenance((prev) => prev.filter((item) => item.id !== maintenanceId))
        await fetchVehicleData()
      } else {
        console.error("Failed to complete maintenance")
      }
    } catch (error) {
      console.error("Error completing maintenance:", error)
    } finally {
      setCompletingMaintenance(null)
    }
  }

  const resolveIssue = async (issueId: string) => {
    setResolvingIssue(issueId)
    try {
      const response = await fetch("/api/resolve-issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Your existing UI sometimes uses "issue-<id>" in other places
          issueId: issueId.replace("issue-", ""),
          resolvedBy: "Manager",
          resolvedDate: new Date().toISOString().split("T")[0],
        }),
      })

      if (response.ok) {
        // Update issues list immediately
        setIssues((prev) =>
          prev.map((i) =>
            i.id === issueId || `issue-${i.id}` === issueId ? { ...i, status: "resolved" } : i,
          ),
        )

        // Also update activity list if it contains that issue
        setRecentActivity((prev) =>
          prev.map((activity) =>
            activity.id === issueId ? { ...activity, status: "resolved" } : activity,
          ),
        )
      } else {
        console.error("Failed to resolve issue")
      }
    } catch (error) {
      console.error("Error resolving issue:", error)
    } finally {
      setResolvingIssue(null)
    }
  }

  const handleActivityClick = async (activity: any) => {
    setSelectedActivity(activity)
    setLoadingDetails(true)
    setActivityDetails(null)

    try {
      let endpoint = ""
      if (activity.type === "Daily Checklist") {
        endpoint = `/api/activity-details/checklist/${activity.id.replace("checklist-", "")}`
      } else if (activity.type === "Daily Log") {
        endpoint = `/api/activity-details/log/${activity.id.replace("log-", "")}`
      } else if (activity.type === "Issue Report") {
        endpoint = `/api/activity-details/issue/${activity.id.replace("issue-", "")}`
      }

      if (endpoint) {
        const response = await fetch(endpoint, { cache: "no-store" })
        if (response.ok) {
          const details = await response.json()
          setActivityDetails(details)
        }
      }
    } catch (error) {
      console.error("Error fetching activity details:", error)
    } finally {
      setLoadingDetails(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 p-4">
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-600">Loading vehicle details...</p>
        </div>
      </div>
    )
  }

  if (!vehicle) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 p-4">
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-600">Vehicle not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 p-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-orange-600 hover:text-orange-700">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-orange-600">{vehicle.vehicle_number}</h1>
          <p className="text-gray-600">
            {vehicle.make} {vehicle.model} {vehicle.year}
          </p>
        </div>
      </div>

      {/* Vehicle Info */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Vehicle Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">VIN</p>
              <p className="font-medium">{vehicle.vin || "Not specified"}</p>
            </div>
            <div>
              <p className="text-gray-600">License Plate</p>
              <p className="font-medium">{vehicle.license_plate || "Not specified"}</p>
            </div>
            <div>
              <p className="text-gray-600">Current Mileage</p>
              <p className="font-medium">{vehicle.current_mileage?.toLocaleString() || "0"} miles</p>
            </div>
            <div>
              <p className="text-gray-600">Purchase Date</p>
              <p className="font-medium">
                {vehicle.purchase_date ? new Date(vehicle.purchase_date).toLocaleDateString() : "Not specified"}
              </p>
            </div>
            <div>
              <p className="text-gray-600">Status</p>
              <Badge
                variant={derivedStatus === "needs-attention" ? "destructive" : "secondary"}
                className="mt-1"
              >
                {derivedStatus === "needs-attention"
                  ? "NEEDS ATTENTION"
                  : (vehicle.status?.toUpperCase() || "ACTIVE")}
              </Badge>
              {openIssues.length > 0 && (
                <p className="text-xs text-orange-600 mt-1">{openIssues.length} open issue(s)</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Open Issues (NEW) */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Open Issues
          </CardTitle>
        </CardHeader>
        <CardContent>
          {openIssues.length > 0 ? (
            <div className="space-y-3">
              {openIssues.map((i) => (
                <div key={i.id} className="p-3 border rounded-lg">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">{i.description ?? "Issue"}</p>
                      <p className="text-xs text-gray-600">{new Date(i.created_at).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive">OPEN</Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => resolveIssue(i.id)}
                        disabled={resolvingIssue === i.id}
                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                      >
                        {resolvingIssue === i.id ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        ) : (
                          "Resolve"
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600 text-center py-4">No open issues 🎉</p>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Maintenance */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Upcoming Maintenance (Next 10k miles / 2 months)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingMaintenance.length > 0 ? (
            <div className="space-y-3">
              {upcomingMaintenance.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium">{item.maintenance_type}</h4>
                    <p className="text-sm text-gray-600">
                      {item.due_date && `Due: ${new Date(item.due_date).toLocaleDateString()}`}
                      {item.due_mileage && ` or ${item.due_mileage.toLocaleString()} miles`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={item.priority === "high" ? "destructive" : "secondary"}>
                      {item.priority?.toUpperCase() || "MEDIUM"}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => completeMaintenanceItem(item.id, item.maintenance_type)}
                      disabled={completingMaintenance === item.id}
                      className="text-green-600 hover:text-green-700 hover:bg-green-50"
                    >
                      {completingMaintenance === item.id ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : (
                        "Complete"
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600 text-center py-4">No upcoming maintenance scheduled</p>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivity.length > 0 ? (
            <div className="space-y-3">
              {recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => handleActivityClick(activity)}
                >
                  <div className="flex-shrink-0 mt-1">
                    {activity.type === "Daily Checklist" ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : activity.type === "Issue Report" ? (
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                    ) : (
                      <Calendar className="h-4 w-4 text-blue-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-medium text-sm">{activity.type}</h4>
                      <span className="text-xs text-gray-600">{new Date(activity.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm text-gray-600">By {activity.driver_name || "Driver"}</p>
                    {activity.details && <p className="text-sm text-gray-900 mt-1">{activity.details}</p>}
                    <p className="text-xs text-orange-600 mt-1">Click to view details</p>
                  </div>

                  {activity.type === "Issue Report" && activity.status !== "resolved" && (
                    <div className="flex-shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation()
                          resolveIssue(activity.id)
                        }}
                        disabled={resolvingIssue === activity.id}
                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                      >
                        {resolvingIssue === activity.id ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        ) : (
                          "Resolve"
                        )}
                      </Button>
                    </div>
                  )}

                  {activity.type === "Issue Report" && activity.status === "resolved" && (
                    <div className="flex-shrink-0">
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        Resolved
                      </Badge>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600 text-center py-4">No recent activity</p>
          )}
        </CardContent>
      </Card>

      {/* Maintenance History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Maintenance History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {maintenanceHistory.length > 0 ? (
            <div className="space-y-3">
              {maintenanceHistory.map((record) => (
                <div key={record.id} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{record.maintenance_type}</h4>
                    <div className="text-right">
                      <p className="text-sm font-medium">${record.cost?.toFixed(2) || "0.00"}</p>
                      <p className="text-xs text-gray-600">{new Date(record.date_performed).toLocaleDateString()}</p>
                    </div>
                  </div>
                  {record.notes && <p className="text-sm text-gray-900 mb-1">{record.notes}</p>}
                  <div className="flex items-center justify-between text-xs text-gray-600">
                    <span>{record.service_provider || "Unknown provider"}</span>
                    <span>{record.mileage_at_service?.toLocaleString() || "0"} miles</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600 text-center py-4">No maintenance history available</p>
          )}
        </CardContent>
      </Card>

      {/* Activity Details Modal */}
      {selectedActivity && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">{selectedActivity.type} Details</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedActivity(null)
                  setActivityDetails(null)
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4">
              {loadingDetails ? (
                <p className="text-center text-gray-600">Loading details...</p>
              ) : activityDetails ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600">Date</p>
                    <p className="font-medium">{new Date(selectedActivity.created_at).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Driver</p>
                    <p className="font-medium">{selectedActivity.driver_name || "Unknown"}</p>
                  </div>

                  {/* Your existing detail render blocks unchanged */}
                  {selectedActivity.type === "Daily Checklist" && (
                    <div>
                      <p className="text-sm text-gray-600 mb-2">Checklist Items</p>
                      <div className="space-y-2">
                        {activityDetails.checklist_items?.map((item: any, index: number) => (
                          <div key={index} className="flex items-center justify-between p-2 border rounded">
                            <span className="text-sm">{item.item_name}</span>
                            <Badge
                              variant={
                                item.status === "pass" ? "secondary" : item.status === "service_soon" ? "outline" : "destructive"
                              }
                              className={
                                item.status === "pass"
                                  ? "bg-green-100 text-green-800"
                                  : item.status === "service_soon"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-red-100 text-red-800"
                              }
                            >
                              {item.status === "pass" ? "Pass" : item.status === "service_soon" ? "Service Soon" : "Fail"}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedActivity.type === "Daily Log" && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Start Mileage</p>
                          <p className="font-medium">{activityDetails.start_mileage?.toLocaleString() || "N/A"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">End Mileage</p>
                          <p className="font-medium">{activityDetails.end_mileage?.toLocaleString() || "N/A"}</p>
                        </div>
                      </div>
                      {activityDetails.notes && (
                        <div>
                          <p className="text-sm text-gray-600">Notes</p>
                          <p className="font-medium">{activityDetails.notes}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {selectedActivity.type === "Issue Report" && (
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-gray-600">Issue Description</p>
                        <p className="font-medium">{activityDetails.description || "No description provided"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Status</p>
                        <Badge variant={activityDetails.status === "resolved" ? "secondary" : "destructive"}>
                          {activityDetails.status?.toUpperCase() || "OPEN"}
                        </Badge>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-center text-gray-600">Failed to load details</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
