import { MonthlyChecklist } from "@/components/monthly-checklist"

interface MonthlyChecklistPageProps {
  params: {
    vehicleId: string
  }
}

export default function MonthlyChecklistPage({ params }: MonthlyChecklistPageProps) {
  return <MonthlyChecklist vehicleId={params.vehicleId.toUpperCase()} />
}
