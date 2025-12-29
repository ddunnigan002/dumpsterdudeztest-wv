import { type NextRequest, NextResponse } from "next/server"
import {
  getActiveFranchiseContext,
  isContextError,
  contextErrorResponse,
  validateVehicleInFranchise,
} from "@/lib/api/franchise-context"

function cleanIssueId(id: string) {
  return id.startsWith("issue-") ? id.replace("issue-", "") : id
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await getActiveFranchiseContext()
    if (isContextError(ctx)) return contextErrorResponse(ctx)

    const { supabase, franchiseId } = ctx
    const body = await request.json()

    const {
      vehicleNumber, // in your current client this is vehicleId.toUpperCase() (works because validateVehicleInFranchise is what you used)
      maintenanceType,
      date,
      serviceProvider,
      cost,
      notes,
      mileage,
      scheduledMaintenanceId,
      issueId, // ✅ NEW: optional
    } = body ?? {}

    if (!vehicleNumber || !maintenanceType || !date || !serviceProvider) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

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
      Other: "other",
    }

    const mappedServiceType = serviceTypeMapping[maintenanceType] || "repair"

    const vehicle = await validateVehicleInFranchise(supabase, franchiseId, vehicleNumber)
    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found in your franchise" }, { status: 404 })
    }

    // If this is tied to an issue, we can attach extra context to the notes/description
    const resolvedIssueId = issueId ? cleanIssueId(String(issueId)) : null

    // 1) Insert maintenance record
    const { data: inserted, error: insertErr } = await supabase
      .from("maintenance_records")
      .insert({
        vehicle_id: vehicle.id,
        service_type: mappedServiceType,
        service_date: date,
        vendor_name: serviceProvider,
        cost: Number(cost) || 0,
        notes: notes ?? null,
        mileage_at_service: Number(mileage) || 0,
        description: resolvedIssueId
          ? `Repair (linked to issue ${resolvedIssueId})`
          : `${maintenanceType} performed by ${serviceProvider}`,
      })
      .select()
      .maybeSingle()

    if (insertErr) {
      return NextResponse.json({ error: `Database error: ${insertErr.message}` }, { status: 500 })
    }

    // 2) Complete scheduled maintenance item (optional)
    if (scheduledMaintenanceId) {
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

      if (uuidRegex.test(String(scheduledMaintenanceId))) {
        const { error: scheduleErr } = await supabase
          .from("scheduled_maintenance")
          .update({ completed: true })
          .eq("id", scheduledMaintenanceId)
          .eq("franchise_id", franchiseId)

        if (scheduleErr) {
          return NextResponse.json(
            { error: `Error updating scheduled maintenance: ${scheduleErr.message}` },
            { status: 500 },
          )
        }
      }
    }

    // 3) Update vehicle mileage safely (only if new mileage is higher)
    const mileageNum = Number(mileage) || 0
    if (mileageNum > 0) {
      // Only update if existing current_mileage is LOWER than new mileage
      const { error: mileageErr } = await supabase
        .from("vehicles")
        .update({ current_mileage: mileageNum })
        .eq("id", vehicle.id)
        .eq("franchise_id", franchiseId)
        .lt("current_mileage", mileageNum)

      if (mileageErr) {
        // non-fatal
        console.error("Error updating vehicle mileage:", mileageErr)
      }
    }

    // 4) ✅ Resolve linked issue (optional)
    if (resolvedIssueId) {
      const { error: issueErr } = await supabase
        .from("vehicle_issues")
        .update({
          status: "resolved",
          resolved_at: new Date().toISOString(),
          resolved_by: null, // optional if you don't store
        })
        .eq("id", resolvedIssueId)
        .in("vehicle_id", [vehicle.id]) // ensure issue belongs to this vehicle
        .select("id")
        .maybeSingle()

      if (issueErr) {
        // At this point maintenance is already inserted, but at least this is server-side, not a 2nd client call
        return NextResponse.json(
          { error: `Maintenance saved, but failed to resolve issue: ${issueErr.message}` },
          { status: 500 },
        )
      }
    }

    return NextResponse.json({
      success: true,
      data: inserted ?? null,
      issueResolved: Boolean(resolvedIssueId),
    })
  } catch (error: any) {
    console.error("API error:", error)
    return NextResponse.json({ error: `Internal server error: ${error?.message ?? "Unknown"}` }, { status: 500 })
  }
}
