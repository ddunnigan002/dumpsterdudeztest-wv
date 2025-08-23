"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import GasAnalytics from "@/components/gas-analytics"

export default function GasAnalyticsPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/manager")}
            className="flex items-center gap-2 border-orange-200 hover:bg-orange-50"
          >
            Back to Dashboard
          </Button>
          <div className="flex items-center gap-4">
            <img src="/dumpster-dudez-logo.svg" alt="Dumpster Dudez" className="h-10 w-auto" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Gas Analytics</h1>
              <p className="text-orange-600 font-medium">Dumpster Dudez - Fuel Consumption Analysis</p>
            </div>
          </div>
        </div>

        <GasAnalytics />
      </div>
    </div>
  )
}
