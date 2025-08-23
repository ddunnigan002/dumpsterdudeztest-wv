import { Suspense } from "react"
import { DataOverrideInterface } from "@/components/data-override-interface"

export default function DataOverridePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100">
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-lg text-gray-600">Loading data override interface...</div>
          </div>
        }
      >
        <DataOverrideInterface />
      </Suspense>
    </div>
  )
}
