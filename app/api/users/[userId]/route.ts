import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function PUT(request: NextRequest, { params }: { params: { userId: string } }) {
  try {
    const supabase = createClient()
    const body = await request.json()
    const { userId } = params

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Update user
    const { data: updatedUser, error: updateError } = await supabase
      .from("users")
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq("id", userId)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({ user: updatedUser })
  } catch (error) {
    console.error("User update error:", error)
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 })
  }
}
