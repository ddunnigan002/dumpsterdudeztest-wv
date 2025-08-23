import EndDay from "@/components/end-day"

interface EndDayPageProps {
  params: {
    vehicleId: string
  }
}

export default function EndDayPage({ params }: EndDayPageProps) {
  const vehicleId = params.vehicleId.toUpperCase()

  return <EndDay vehicleId={vehicleId} />
}
