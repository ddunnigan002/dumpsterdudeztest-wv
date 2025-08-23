import ScheduleMaintenance from "@/components/schedule-maintenance"

interface ScheduleMaintenancePageProps {
  params: {
    vehicleId: string
  }
}

export default function ScheduleMaintenancePage({ params }: ScheduleMaintenancePageProps) {
  const vehicleId = params.vehicleId.toUpperCase()

  return <ScheduleMaintenance vehicleId={vehicleId} />
}
