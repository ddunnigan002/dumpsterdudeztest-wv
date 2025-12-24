export const runtime = "nodejs"

import { NextResponse } from "next/server"

export async function POST(req: Request) {
  // Secret check (must match Supabase header)
  const secret = req.headers.get("x-scheduler-secret")
  if (!secret || secret !== process.env.SUPABASE_SCHEDULER_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // IMPORTANT: do NOT require JSON body
  // (Supabase may send empty body depending on trigger)
  return NextResponse.json({ ok: true, message: "Cron endpoint reached via POST ✅" })
}
