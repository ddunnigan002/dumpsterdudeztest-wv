import { redirect } from "next/navigation"
import ManagerDashboard from "@/components/manager-dashboard"
import { createClient } from "@/lib/supabase/server"

export default async function ManagerPage() {
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/auth/login")
  }

  const userId = session.user.id

  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", userId).single()

  const { data: membership } = await supabase
    .from("franchise_memberships")
    .select("franchise_id, role")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .single()

  if (!membership) {
    redirect("/auth/login")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
      <ManagerDashboard
        userProfile={{
          id: userId,
          full_name: profile?.full_name || session.user.email || "User",
          franchise_id: membership.franchise_id,
          role: (membership.role === "super_admin" ? "owner" : membership.role) as any,
        }}
      />
    </div>
  )
}
