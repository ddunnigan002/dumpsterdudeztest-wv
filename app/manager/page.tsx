import ManagerDashboard from "@/components/manager-dashboard"

export default function ManagerPage() {
  // Mock user profile for testing
  const mockUserProfile = {
    role: "manager" as const,
    franchise_id: "test-franchise-123",
    full_name: "Test Manager",
    id: "test-user-123",
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
      <div className="text-center pt-6 pb-4">
        <h1 className="text-2xl font-bold text-orange-600">Dumpster Dudez</h1>
        <p className="text-gray-600">Manager Dashboard</p>
      </div>
      <ManagerDashboard userProfile={mockUserProfile} />
    </div>
  )
}
