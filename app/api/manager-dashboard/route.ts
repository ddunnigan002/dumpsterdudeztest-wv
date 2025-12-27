import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getManagerDashboardDataLive } from "@/lib/manager-dashboard-live"

export async function GET(req: Request) {
  try {
    const supabase = await createClient()

    // 1) Authenticated user
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser()

    if (userErr || !user) {
      return NextResponse.json(
        { error: "Unauthorized", detail: userErr?.message ?? "No user session" },
        { status: 401 }
      )
    }

    const url = new URL(req.url)
    const managerId = url.searchParams.get("managerId") || user.id
    const vehicleId = url.searchParams.get("vehicleId") // NEW


    // 2) Email required for public.users NOT NULL
    const email = user.email ?? user.user_metadata?.email ?? null
    if (!email) {
      return NextResponse.json(
        {
          error: "Missing email on auth user",
          detail: "Supabase auth user.email is null, but public.users.email is NOT NULL.",
        },
        { status: 400 }
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
        { status: 500 }
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
        { status: 403 }
      )
    }

    const franchiseId = membership.franchise_id as string
    const role = membership.role ?? "manager"

    // 4) Keep legacy public.users row in sync (optional compatibility layer)
    //    We DO set franchise_id here because membership is authoritative.
    const { error: upsertErr } = await supabase.from("users").upsert(
      {
        id: managerId,
        email,
        full_name: fullName,
        role,
        franchise_id: franchiseId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    )

    if (upsertErr) {
      return NextResponse.json(
        { error: "Failed to upsert users profile", detail: upsertErr.message, code: upsertErr.code },
        { status: 500 }
      )
    }

    // 5) Fetch live dashboard data
    const dashboard = await getManagerDashboardDataLive({
      supabase,
      franchiseId,
      managerId,
      role,
      vehicleId,
    })

    return NextResponse.json(dashboard)
  } catch (err: any) {
    console.error("manager-dashboard route error:", err)
    return NextResponse.json(
      {
        error: "Internal server error",
        detail: err?.message ?? String(err),
        code: err?.code,
        hint: err?.hint,
      },
      { status: 500 }
    )
  }
}
