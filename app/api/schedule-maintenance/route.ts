import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const { vehicleId, maintenanceType, description, triggerType, targetMileage, targetDate, createdDate } =
      await request.json()

    console.log("Scheduling maintenance:", { vehicleId, maintenanceType, triggerType, targetMileage, targetDate })

    const supabase = createClient()

    // First, get the vehicle UUID from the vehicle_number or create vehicle if it doesn't exist
    let { data: vehicle, error: vehicleError } = await supabase
      .from("vehicles")
      .select("id")
      .eq("vehicle_number", vehicleId.toUpperCase())
      .maybeSingle()

    if (vehicleError) {
      console.error("Database error:", vehicleError)
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    if (!vehicle) {
      // First ensure franchise exists
      let { data: franchise, error: franchiseError } = await supabase
        .from("franchises")
        .select("id")
        .eq("name", "Dumpster Dudez")
        .maybeSingle()

      if (!franchise) {
        const { data: newFranchise, error: createFranchiseError } = await supabase
          .from("franchises")
          .insert({
            name: "Dumpster Dudez",
            owner_email: "admin@dumpsterdudez.com",
            phone: "555-0123",
            address: "123 Main St, Anytown, USA",
          })
          .select()
          .single()

        if (createFranchiseError) {
          console.error("Error creating franchise:", createFranchiseError)
          return NextResponse.json({ error: "Failed to create franchise" }, { status: 500 })
        }
        franchise = newFranchise
      }

      // Create vehicle
      const vehicleData = {
        vehicle_number: vehicleId.toUpperCase(),
        make: vehicleId.toUpperCase() === "CHEVY" ? "Chevrolet" : "Kenworth",
        model: vehicleId.toUpperCase() === "CHEVY" ? "6500" : "T280",
        year: 2020,
        status: "active",
        current_mileage: vehicleId.toUpperCase() === "CHEVY" ? 45000 : 32000,
        franchise_id: franchise.id,
      }

      const { data: newVehicle, error: createVehicleError } = await supabase
        .from("vehicles")
        .insert(vehicleData)
        .select()
        .single()

      if (createVehicleError) {
        console.error("Error creating vehicle:", createVehicleError)
        return NextResponse.json({ error: "Failed to create vehicle" }, { status: 500 })
      }
      vehicle = newVehicle
    }

    const { data, error } = await supabase
      .from("scheduled_maintenance")
      .insert({
        vehicle_id: vehicle.id,
        maintenance_type: maintenanceType,
        description: description || null,
        due_mileage: triggerType === "mileage" ? targetMileage : null,
        due_date: triggerType === "date" ? targetDate : null,
        completed: false,
        created_at: new Date(createdDate).toISOString(),
      })
      .select()

    if (error) {
      console.error("Error scheduling maintenance:", error)
      return NextResponse.json({ error: "Failed to schedule maintenance" }, { status: 500 })
    }

    console.log("Maintenance scheduled successfully:", data)
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Error in schedule maintenance API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
