"use client"

import { useParams, useRouter } from "next/navigation"
import VehicleDetails from "@/components/vehicle-details"

export default function ManagerVehicleDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const vehicleId = params.vehicleId as string

  const handleBack = () => {
    router.push("/manager")
  }

  return <VehicleDetails vehicleId={vehicleId} onBack={handleBack} />
}
