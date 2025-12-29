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

    // If your maintenance_records has franchise_id, this is simple:
    const { data, error } = await supabase
      .from("maintenance_records")
      .select("maintenance_category")
      .eq("franchise_id", franchiseId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const categories = Array.from(
      new Set(
        (data ?? [])
          .map((r: any) => (r?.maintenance_category ?? "").trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b))

    return NextResponse.json({ categories })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 })
  }
}
