import { NextResponse } from "next/server"
import {
  getActiveFranchiseContext,
  isContextError,
  contextErrorResponse,
} from "@/lib/api/franchise-context"

export async function GET() {
  try {
    const ctx = await getActiveFranchiseContext()
    if (isContextError(ctx)) return contextErrorResponse(ctx)

    const { supabase, franchiseId } = ctx

    const { data, error } = await supabase
      .from("vehicles")
      .select("id, vehicle_number, make, model")
      .eq("franchise_id", franchiseId)
      .order("vehicle_number", { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json(data ?? [])
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 })
  }
}
