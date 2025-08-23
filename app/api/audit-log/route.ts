import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tableFilter = searchParams.get("table")
    const recordId = searchParams.get("record_id")
    const managerOverrideOnly = searchParams.get("manager_override") === "true"
    const limit = Number.parseInt(searchParams.get("limit") || "50")

    const supabase = createClient()

    let query = supabase
      .from("audit_log")
      .select(`
        *,
        users:changed_by_user_id(full_name, email)
      `)
      .order("created_at", { ascending: false })
      .limit(limit)

    if (tableFilter) {
      query = query.eq("table_name", tableFilter)
    }

    if (recordId) {
      query = query.eq("record_id", recordId)
    }

    if (managerOverrideOnly) {
      query = query.eq("manager_override", true)
    }

    const { data: auditLogs, error } = await query

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Failed to fetch audit logs" }, { status: 500 })
    }

    return NextResponse.json({ logs: auditLogs || [] })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const body = await request.json()

    const {
      table_name,
      record_id,
      action,
      old_values,
      new_values,
      changed_by_user_id,
      manager_override,
      change_reason,
      ip_address,
      user_agent,
    } = body

    const { data, error } = await supabase
      .from("audit_log")
      .insert({
        table_name,
        record_id,
        action,
        old_values,
        new_values,
        changed_by_user_id: changed_by_user_id || "00000000-0000-0000-0000-000000000001", // Default manager ID
        manager_override: manager_override || false,
        change_reason,
        ip_address,
        user_agent,
      })
      .select()
      .single()

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Failed to create audit log" }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
