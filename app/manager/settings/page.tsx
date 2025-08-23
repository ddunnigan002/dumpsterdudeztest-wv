import { Suspense } from "react"
import { ManagerSettings } from "@/components/manager-settings"

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100">
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-lg text-gray-600">Loading settings...</div>
          </div>
        }
      >
        <ManagerSettings />
      </Suspense>
    </div>
  )
}
