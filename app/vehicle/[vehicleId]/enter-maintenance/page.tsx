import MaintenanceEntry from "@/components/maintenance-entry"

interface PageProps {
  params: {
    vehicleId: string
  }
}

export default function EnterMaintenancePage({ params }: PageProps) {
  return <MaintenanceEntry vehicleId={params.vehicleId} />
}
