import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getManagerDashboardDataLive } from "@/lib/manager-dashboard-live"

async function getFranchiseName(supabase: any, franchiseId: string) {
  try {
    const { data, error } = await supabase
      .from("franchises")
      .select("name")
      .eq("id", franchiseId)
      .maybeSingle()

    if (error) {
      console.error("[manager-dashboard] franchise name lookup error:", error)
      return null
    }

    return data?.name ?? null
  } catch (e) {
    console.error("[manager-dashboard] franchise name lookup exception:", e)
    return null
  }
}

export async function GET(req: Request) {
  try {
    const supabase = await createClient()

    // 1) Authenticated user
    const { data: userRes, error: userErr } = await supabase.auth.getUser()
    const user = userRes.user

    if (userErr || !user) {
      return NextResponse.json(
        { error: "Unauthorized", detail: userErr?.message ?? "No user session" },
        { status: 401 },
      )
    }

    const url = new URL(req.url)
    const managerId = url.searchParams.get("managerId") || user.id
    const vehicleId = url.searchParams.get("vehicleId") || undefined

    // 2) Email required for public.users NOT NULL
    const email = user.email ?? user.user_metadata?.email ?? null
    if (!email) {
      return NextResponse.json(
        {
          error: "Missing email on auth user",
          detail: "Supabase auth user.email is null, but public.users.email is NOT NULL.",
        },
        { status: 400 },
      )
    }

    const fullName =
      user.user_metadata?.full_name ??
      user.user_metadata?.name ??
      user.user_metadata?.fullName ??
      user.email ??
      "User"

    // 3) Determine franchise + role from franchise_memberships (canonical)
    const { data: membership, error: membershipErr } = await supabase
      .from("franchise_memberships")
      .select("franchise_id, role, is_active")
      .eq("user_id", managerId)
      .eq("is_active", true)
      .maybeSingle()

    if (membershipErr) {
      return NextResponse.json(
        { error: "Failed to read franchise membership", detail: membershipErr.message, code: membershipErr.code },
        { status: 500 },
      )
    }

    if (!membership?.franchise_id) {
      return NextResponse.json(
        {
          error: "No active franchise membership",
          detail:
            "This user has no active franchise membership. Create a franchise_memberships row for this user_id (role=manager).",
          user_id: managerId,
          email,
        },
        { status: 403 },
      )
    }

    const franchiseId = membership.franchise_id as string
    const role = membership.role ?? "manager"

    // 4) Keep legacy public.users row in sync (compat layer)
    const { error: upsertErr } = await supabase.from("users").upsert(
      {
        id: managerId,
        email,
        full_name: fullName,
        role,
        franchise_id: franchiseId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    )

    if (upsertErr) {
      return NextResponse.json(
        { error: "Failed to upsert users profile", detail: upsertErr.message, code: upsertErr.code },
        { status: 500 },
      )
    }

    // 5) Fetch live dashboard data + franchise name in parallel
    const [dashboard, franchiseName] = await Promise.all([
      getManagerDashboardDataLive({
        supabase,
        franchiseId,
        managerId,
        role,
        vehicleId,
      }),
      getFranchiseName(supabase, franchiseId),
    ])

    // 6) Return dashboard + franchiseName (non-breaking additive field)
    return NextResponse.json({
      franchiseName,
      ...dashboard,
    })
  } catch (err: any) {
    console.error("manager-dashboard route error:", err)
    return NextResponse.json(
      {
        error: "Internal server error",
        detail: err?.message ?? String(err),
        code: err?.code,
        hint: err?.hint,
      },
      { status: 500 },
    )
  }
}
