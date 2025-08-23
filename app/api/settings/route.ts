import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user's franchise
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("franchise_id")
      .eq("id", user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const franchiseId = userData.franchise_id

    // Fetch all settings for the franchise
    const [companySettings, notificationSettings, maintenanceSettings, systemSettings] = await Promise.all([
      supabase.from("company_settings").select("*").eq("franchise_id", franchiseId).single(),
      supabase.from("notification_settings").select("*").eq("franchise_id", franchiseId).single(),
      supabase.from("maintenance_schedule_settings").select("*").eq("franchise_id", franchiseId).single(),
      supabase.from("system_preferences").select("*").eq("franchise_id", franchiseId).single(),
    ])

    return NextResponse.json({
      company: companySettings.data,
      notifications: notificationSettings.data,
      maintenance: maintenanceSettings.data,
      system: systemSettings.data,
    })
  } catch (error) {
    console.error("Settings fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = createClient()
    const body = await request.json()
    const { settingType, settings } = body

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user's franchise
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("franchise_id")
      .eq("id", user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const franchiseId = userData.franchise_id

    // Update settings based on type
    let result
    switch (settingType) {
      case "company":
        result = await supabase
          .from("company_settings")
          .upsert({ ...settings, franchise_id: franchiseId, updated_at: new Date().toISOString() })
          .eq("franchise_id", franchiseId)
        break
      case "notifications":
        result = await supabase
          .from("notification_settings")
          .upsert({ ...settings, franchise_id: franchiseId, updated_at: new Date().toISOString() })
          .eq("franchise_id", franchiseId)
        break
      case "maintenance":
        result = await supabase
          .from("maintenance_schedule_settings")
          .upsert({ ...settings, franchise_id: franchiseId, updated_at: new Date().toISOString() })
          .eq("franchise_id", franchiseId)
        break
      case "system":
        result = await supabase
          .from("system_preferences")
          .upsert({ ...settings, franchise_id: franchiseId, updated_at: new Date().toISOString() })
          .eq("franchise_id", franchiseId)
        break
      default:
        return NextResponse.json({ error: "Invalid setting type" }, { status: 400 })
    }

    if (result.error) {
      throw result.error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Settings update error:", error)
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 })
  }
}
