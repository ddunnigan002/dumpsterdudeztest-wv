"use client"

import { useRouter } from "next/navigation"
import DailyChecklist from "@/components/daily-checklist"

export default function PreTripPage({ params }: { params: { vehicleId: string } }) {
  const router = useRouter()

  const handleBack = () => {
    router.push(`/vehicle/${params.vehicleId}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 p-4">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-orange-600 mb-2">Dumpster Dudez</h1>
          <h2 className="text-lg text-gray-700">Pre-Trip Checklist</h2>
        </div>

        <DailyChecklist vehicleNumber={params.vehicleId.toUpperCase()} onBack={handleBack} />
      </div>
    </div>
  )
}
