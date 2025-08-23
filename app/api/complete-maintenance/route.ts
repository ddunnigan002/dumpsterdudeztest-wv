import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { vehicleId, maintenanceType, alertId, completedBy, completedDate } = await request.json()

    // Get vehicle UUID from vehicle number
    const { data: vehicle, error: vehicleError } = await supabase
      .from("vehicles")
      .select("id")
      .eq("vehicle_number", vehicleId)
      .single()

    if (vehicleError || !vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 })
    }

    // Mark scheduled maintenance as completed
    const { error: updateError } = await supabase
      .from("scheduled_maintenance")
      .update({
        status: "completed",
        completed_date: completedDate,
        completed_by: completedBy,
      })
      .eq("id", alertId)

    if (updateError) {
      console.error("Error updating scheduled maintenance:", updateError)
    }

    const { data: existingRecord, error: checkError } = await supabase
      .from("maintenance_records")
      .select("id, cost")
      .eq("vehicle_id", vehicle.id)
      .eq("maintenance_type", maintenanceType)
      .eq("date_performed", completedDate)
      .single()

    if (checkError && checkError.code !== "PGRST116") {
      console.error("Error checking existing maintenance record:", checkError)
    }

    if (existingRecord) {
      // Update existing record to mark as completed
      const { error: updateRecordError } = await supabase
        .from("maintenance_records")
        .update({
          status: "completed",
          performed_by: completedBy,
        })
        .eq("id", existingRecord.id)

      if (updateRecordError) {
        console.error("Error updating existing maintenance record:", updateRecordError)
        return NextResponse.json({ error: "Failed to update maintenance record" }, { status: 500 })
      }
    } else {
      // Create a new maintenance record placeholder that can be updated with cost later
      const { error: insertError } = await supabase.from("maintenance_records").insert({
        vehicle_id: vehicle.id,
        maintenance_type: maintenanceType,
        date_performed: completedDate,
        performed_by: completedBy,
        description: `${maintenanceType} completed via dashboard`,
        cost: 0, // Placeholder - will be updated when cost is entered
        status: "completed",
        service_provider: "Pending cost entry",
      })

      if (insertError) {
        console.error("Error creating maintenance record:", insertError)
        return NextResponse.json({ error: "Failed to create maintenance record" }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error completing maintenance:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
