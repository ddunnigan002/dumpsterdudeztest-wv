import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getManagerDashboardDataLive } from "@/lib/manager-dashboard-live"

export async function GET(req: Request) {
  try {
    const supabase = await createClient()

    // 1) Authenticated user (secure)
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

    // 2) Ensure a row exists in public.users (your table has NOT NULL email)
    // We upsert to avoid "0 rows" errors AND keep email synced.
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

    // NOTE: franchise_id is required for dashboard queries.
    // If you don't know it yet at signup, you can set it later.
    // We'll only set franchise_id on upsert IF it already exists (to avoid overwriting).
    // So first try to read existing.
    const { data: existingProfile, error: readErr } = await supabase
      .from("users")
      .select("id, franchise_id, role, full_name, email")
      .eq("id", managerId)
      .maybeSingle()

    if (readErr) {
      return NextResponse.json(
        { error: "Failed to read users profile", detail: readErr.message, code: readErr.code },
        { status: 500 }
      )
    }

    // Build upsert payload
    const upsertPayload: any = {
      id: managerId,
      email, // NOT NULL in your schema
      full_name: existingProfile?.full_name ?? fullName,
      role: existingProfile?.role ?? "manager",
      // DON'T overwrite franchise_id if it exists
      franchise_id: existingProfile?.franchise_id ?? null,
    }

    const { data: upserted, error: upsertErr } = await supabase
      .from("users")
      .upsert(upsertPayload, { onConflict: "id" })
      .select("id, franchise_id, role, full_name, email")
      .single()

    if (upsertErr) {
      return NextResponse.json(
        { error: "Failed to upsert users profile", detail: upsertErr.message, code: upsertErr.code },
        { status: 500 }
      )
    }

    // 3) You MUST have a franchise_id to load manager dashboard
    if (!upserted.franchise_id) {
      return NextResponse.json(
        {
          error: "Profile missing franchise_id",
          detail:
            "Your public.users row exists now, but franchise_id is null. Set users.franchise_id for this manager (and create vehicle_assignments).",
          user_id: managerId,
          email: upserted.email,
        },
        { status: 400 }
      )
    }

    // 4) Fetch live dashboard data
    const dashboard = await getManagerDashboardDataLive({
      supabase,
      franchiseId: upserted.franchise_id,
      managerId,
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
