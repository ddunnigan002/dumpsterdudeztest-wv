import { Suspense } from "react"
import { AuditLogViewer } from "@/components/audit-log-viewer"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function AuditLogPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/manager">
            <Button variant="outline" size="sm" className="flex items-center gap-2 bg-transparent">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Audit Log</h1>
            <p className="text-gray-600">Track all data changes and manager overrides</p>
          </div>
        </div>

        <Suspense
          fallback={
            <div className="flex items-center justify-center min-h-screen">
              <div className="text-lg text-gray-600">Loading audit logs...</div>
            </div>
          }
        >
          <AuditLogViewer />
        </Suspense>
      </div>
    </div>
  )
}
