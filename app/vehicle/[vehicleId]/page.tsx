import VehicleDriverDashboard from "@/components/vehicle-driver-dashboard"

interface VehiclePageProps {
  params: {
    vehicleId: string
  }
}

export default function VehiclePage({ params }: VehiclePageProps) {
  const vehicleId = params.vehicleId.toUpperCase()

  // Mock user profile for testing
  const mockUserProfile = {
    role: "driver" as const,
    franchise_id: "test-franchise-123",
    full_name: "Test Driver",
    id: "test-user-123",
  }

  return <VehicleDriverDashboard vehicleId={vehicleId} userProfile={mockUserProfile} />
}
