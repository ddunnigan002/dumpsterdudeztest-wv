"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import PreTripReports from "@/components/pre-trip-reports"

export default function PreTripReportsPage() {
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
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>

          <div className="flex items-center gap-4">
            <img src="/dumpster-dudez-logo.svg" alt="Dumpster Dudez" className="h-10 w-auto" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Pre-Trip Reports</h1>
              <p className="text-orange-600 font-medium">Dumpster Dudez - Daily Inspection Summary</p>
            </div>
          </div>
        </div>

        <PreTripReports />
      </div>
    </div>
  )
}
