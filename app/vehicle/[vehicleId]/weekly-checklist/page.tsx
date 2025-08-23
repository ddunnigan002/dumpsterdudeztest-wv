import { WeeklyChecklist } from "@/components/weekly-checklist"

interface WeeklyChecklistPageProps {
  params: {
    vehicleId: string
  }
}

export default function WeeklyChecklistPage({ params }: WeeklyChecklistPageProps) {
  return <WeeklyChecklist vehicleId={params.vehicleId.toUpperCase()} />
}
