import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getManagerDashboardDataLive } from "@/lib/manager-dashboard-live"

export async function GET(req: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser()

    if (userErr || !user) {
      return NextResponse.json({ error: "Unauthorized", detail: userErr?.message }, { status: 401 })
    }

    const url = new URL(req.url)
    const managerId = url.searchParams.get("managerId") || user.id

    const { data: profile, error: profileErr } = await supabase
      .from("users")
      .select("id, franchise_id, role, full_name")
      .eq("id", managerId)
      .single()

    if (profileErr || !profile) {
      return NextResponse.json({ error: "Profile not found", detail: profileErr?.message }, { status: 404 })
    }

    const dashboard = await getManagerDashboardDataLive({
      supabase,
      franchiseId: profile.franchise_id,
    })

    return NextResponse.json(dashboard)
  } catch (err: any) {
    // THIS is what will tell us exactly what's wrong
    console.error("manager-dashboard route error:", err)

    return NextResponse.json(
      {
        error: "Internal server error",
        detail: err?.message ?? String(err),
        hint: err?.hint,
        code: err?.code,
      },
      { status: 500 }
    )
  }
}
