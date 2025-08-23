"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Calendar, Camera } from "lucide-react"

interface LogHistoryProps {
  vehicleNumber?: string
  onBack: () => void
}

interface DailyLogEntry {
  id: string
  date: string
  startMileage: number
  endMileage: number
  fuelAdded: number
  fuelCost: number
  status: "Pass" | "Service Soon" | "Fail"
  issuesReported: string
  photos: string[]
}

export default function LogHistory({ vehicleNumber, onBack }: LogHistoryProps) {
  const [logs, setLogs] = useState<DailyLogEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const url = vehicleNumber ? `/api/daily-log?vehicleId=${vehicleNumber}` : `/api/daily-log`
        const response = await fetch(url)
        if (response.ok) {
          const data = await response.json()
          setLogs(data.logs || [])
        }
      } catch (error) {
        console.error("Error fetching logs:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchLogs()
  }, [vehicleNumber])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Pass":
        return "bg-green-100 text-green-800"
      case "Service Soon":
        return "bg-yellow-100 text-yellow-800"
      case "Fail":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <p>Loading logs...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Daily Log History</h1>
          <p className="text-gray-600">
            {vehicleNumber ? `${vehicleNumber} - ` : "All Vehicles - "}
            {logs.length} entries
          </p>
        </div>
      </div>

      {/* Log Entries */}
      <div className="space-y-4">
        {logs.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-gray-500">No daily logs found</CardContent>
          </Card>
        ) : (
          logs.map((log) => (
            <Card key={log.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">{new Date(log.date).toLocaleDateString()}</span>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(log.status)}`}>
                    {log.status}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Start:</span> {log.startMileage.toLocaleString()}
                  </div>
                  <div>
                    <span className="text-gray-500">End:</span> {log.endMileage.toLocaleString()}
                  </div>
                  <div>
                    <span className="text-gray-500">Miles:</span> {(log.endMileage - log.startMileage).toLocaleString()}
                  </div>
                  <div>
                    <span className="text-gray-500">Fuel:</span> {log.fuelAdded}gal / ${log.fuelCost}
                  </div>
                </div>

                {log.issuesReported && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-700">{log.issuesReported}</p>
                  </div>
                )}

                {log.photos.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Camera className="h-4 w-4" />
                    <span>
                      {log.photos.length} photo{log.photos.length > 1 ? "s" : ""}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
