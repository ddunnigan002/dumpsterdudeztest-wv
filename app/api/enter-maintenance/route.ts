import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const body = await request.json()

    console.log("Received maintenance data:", body) // Added debugging

    const { vehicleNumber, maintenanceType, date, serviceProvider, cost, notes, mileage, scheduledMaintenanceId } = body

    const serviceTypeMapping: Record<string, string> = {
      "Oil Change": "preventive",
      "Brake Service": "repair",
      "Tire Rotation": "preventive",
      "Engine Tune-up": "preventive",
      "Transmission Service": "repair",
      "Coolant Flush": "preventive",
      "Air Filter Replacement": "preventive",
      "Fuel Filter Replacement": "preventive",
      "Battery Replacement": "repair",
      Inspection: "inspection",
      "PTO Service": "repair",
      Other: "other",
    }

    const mappedServiceType = serviceTypeMapping[maintenanceType] || "other"

    console.log(`Mapping "${maintenanceType}" to "${mappedServiceType}"`) // Added mapping debug log

    // First, get the vehicle ID from the vehicle number
    let { data: vehicle, error: vehicleError } = await supabase
      .from("vehicles")
      .select("id")
      .eq("vehicle_number", vehicleNumber)
      .single()

    console.log("Vehicle lookup result:", { vehicle, vehicleError })

    if (vehicleError || !vehicle) {
      console.log("Vehicle not found, creating:", vehicleNumber)

      let { data: franchise, error: franchiseError } = await supabase
        .from("franchises")
        .select("id")
        .eq("name", "Dumpster Dudez")
        .single()

      if (franchiseError || !franchise) {
        console.log("Creating default franchise")
        const { data: newFranchise, error: createFranchiseError } = await supabase
          .from("franchises")
          .insert({
            name: "Dumpster Dudez",
            owner_email: "admin@dumpsterdudez.com",
            phone: "(555) 123-4567",
            address: "123 Main St, Your City, State 12345",
          })
          .select("id")
          .single()

        if (createFranchiseError) {
          console.error("Error creating franchise:", createFranchiseError)
          return NextResponse.json(
            { error: `Failed to create franchise: ${createFranchiseError.message}` },
            { status: 500 },
          )
        }

        franchise = newFranchise
      }

      // Create the vehicle with franchise_id
      const vehicleData = {
        vehicle_number: vehicleNumber,
        make: vehicleNumber === "CHEVY" ? "Chevrolet" : "Kenworth",
        model: vehicleNumber === "CHEVY" ? "6500" : "T280",
        year: 2020,
        current_mileage: mileage || 80000,
        status: "active",
        franchise_id: franchise.id, // Added required franchise_id
      }

      const { data: newVehicle, error: createError } = await supabase
        .from("vehicles")
        .insert(vehicleData)
        .select("id")
        .single()

      if (createError) {
        console.error("Error creating vehicle:", createError)
        return NextResponse.json({ error: `Failed to create vehicle: ${createError.message}` }, { status: 500 })
      }

      vehicle = newVehicle
      console.log("Created new vehicle:", vehicle)
    }

    if (!maintenanceType || !date || !serviceProvider) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const { data: existingRecord, error: checkError } = await supabase
      .from("maintenance_records")
      .select("id, cost, vendor_name")
      .eq("vehicle_id", vehicle.id)
      .eq("service_type", mappedServiceType)
      .eq("service_date", date)
      .single()

    if (checkError && checkError.code !== "PGRST116") {
      console.error("Error checking existing maintenance record:", checkError)
    }

    let data
    let error

    if (existingRecord && (existingRecord.cost === 0 || existingRecord.vendor_name === "Pending cost entry")) {
      // Update existing placeholder record with cost and service details
      const updateResult = await supabase
        .from("maintenance_records")
        .update({
          vendor_name: serviceProvider,
          cost: cost,
          notes: notes,
          mileage_at_service: mileage,
        })
        .eq("id", existingRecord.id)
        .select()

      data = updateResult.data
      error = updateResult.error
    } else {
      console.log("Attempting to insert maintenance record with service_type:", mappedServiceType)

      const insertResult = await supabase
        .from("maintenance_records")
        .insert({
          vehicle_id: vehicle.id,
          service_type: mappedServiceType,
          service_date: date,
          vendor_name: serviceProvider,
          cost: cost,
          notes: notes,
          mileage_at_service: mileage,
          description: `${maintenanceType} performed by ${serviceProvider}`,
        })
        .select()

      data = insertResult.data
      error = insertResult.error
    }

    if (error) {
      console.error("Database error details:", {
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        serviceType: mappedServiceType,
        maintenanceType: maintenanceType,
      })
      return NextResponse.json({ error: `Database error: ${error.message}` }, { status: 500 })
    }

    if (scheduledMaintenanceId) {
      // Check if scheduledMaintenanceId is a valid UUID (not fallback data like "1", "2")
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

      if (uuidRegex.test(scheduledMaintenanceId)) {
        const { error: scheduleError } = await supabase
          .from("scheduled_maintenance")
          .update({ completed: true })
          .eq("id", scheduledMaintenanceId)

        if (scheduleError) {
          console.error("Error updating scheduled maintenance:", scheduleError)
          return NextResponse.json(
            { error: `Error updating scheduled maintenance: ${scheduleError.message}` },
            { status: 500 },
          )
        }
      } else {
        console.log(
          "Skipping scheduled maintenance update - using fallback data with non-UUID ID:",
          scheduledMaintenanceId,
        )
      }
    }

    // Update vehicle's current mileage if this is higher
    if (mileage > 0) {
      const { error: mileageError } = await supabase
        .from("vehicles")
        .update({ current_mileage: mileage })
        .eq("id", vehicle.id)
        .gte("current_mileage", mileage)

      if (mileageError) {
        console.error("Error updating vehicle mileage:", mileageError)
      }
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: `Internal server error: ${error.message}` }, { status: 500 })
  }
}
