import { type NextRequest, NextResponse } from "next/server"
import {
  getActiveFranchiseContext,
  isContextError,
  contextErrorResponse,
  validateVehicleInFranchise,
} from "@/lib/api/franchise-context"

export async function POST(request: NextRequest) {
  try {
    const ctx = await getActiveFranchiseContext()
    if (isContextError(ctx)) {
      return contextErrorResponse(ctx)
    }

    const { supabase, franchiseId } = ctx
    const body = await request.json()

    console.log("Received maintenance data:", body)

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

    console.log(`Mapping "${maintenanceType}" to "${mappedServiceType}"`)

    const vehicle = await validateVehicleInFranchise(supabase, franchiseId, vehicleNumber)
    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found in your franchise" }, { status: 404 })
    }

    console.log("Vehicle found:", vehicle)

    if (!maintenanceType || !date || !serviceProvider) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const { data: existingRecord, error: checkError } = await supabase
      .from("maintenance_records")
      .select("id, cost, vendor_name")
      .eq("vehicle_id", vehicle.id)
      .eq("service_type", mappedServiceType)
      .eq("service_date", date)
      .maybeSingle()

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
      // Check if scheduledMaintenanceId is a valid UUID
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
        .eq("franchise_id", franchiseId) // Scope update to franchise
        .gte("current_mileage", mileage)

      if (mileageError) {
        console.error("Error updating vehicle mileage:", mileageError)
      }
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error("API error:", error)
    return NextResponse.json({ error: `Internal server error: ${error.message}` }, { status: 500 })
  }
}
