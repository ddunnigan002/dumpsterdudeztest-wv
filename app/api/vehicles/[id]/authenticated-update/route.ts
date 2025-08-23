import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function PUT(request: NextRequest, { params }: { params: { vehicleId: string } }) {
  try {
    const supabase = createClient()
    const body = await request.json()
    const { vehicleId } = params

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Update vehicle
    const { data: updatedVehicle, error: updateError } = await supabase
      .from("vehicles")
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq("id", vehicleId)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({ vehicle: updatedVehicle })
  } catch (error) {
    console.error("Vehicle update error:", error)
    return NextResponse.json({ error: "Failed to update vehicle" }, { status: 500 })
  }
}
