import GasEntry from "@/components/gas-entry"

interface GasPageProps {
  params: {
    vehicleId: string
  }
}

export default function GasPage({ params }: GasPageProps) {
  const vehicleId = params.vehicleId.toUpperCase()

  return <GasEntry vehicleId={vehicleId} />
}
