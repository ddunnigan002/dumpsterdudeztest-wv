import EndDay from "@/components/end-day"

interface EndDayPageProps {
  params: { vehicleId: string }
}

export default function EndDayPage({ params }: EndDayPageProps) {
  // vehicleId is a UUID — do not mutate case
  return <EndDay vehicleId={params.vehicleId} />
}
