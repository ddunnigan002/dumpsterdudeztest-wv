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

    // Fetch all users in the same franchise
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("id, full_name, email, phone, role, is_active, created_at")
      .eq("franchise_id", userData.franchise_id)
      .order("created_at", { ascending: false })

    if (usersError) {
      throw usersError
    }

    return NextResponse.json({ users })
  } catch (error) {
    console.error("Users fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const body = await request.json()
    const { full_name, email, phone, role } = body

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

    // Create new user
    const { data: newUser, error: createError } = await supabase
      .from("users")
      .insert({
        full_name,
        email,
        phone,
        role,
        franchise_id: userData.franchise_id,
        is_active: true,
      })
      .select()
      .single()

    if (createError) {
      throw createError
    }

    return NextResponse.json({ user: newUser })
  } catch (error) {
    console.error("User creation error:", error)
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 })
  }
}
