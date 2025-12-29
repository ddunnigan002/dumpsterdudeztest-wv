import { NextResponse } from "next/server"
import {
  getActiveFranchiseContext,
  isContextError,
  contextErrorResponse,
  validateVehicleInFranchise,
} from "@/lib/api/franchise-context"

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const vehicleId = params.id

    const ctx = await getActiveFranchiseContext()
    if (isContextError(ctx)) return contextErrorResponse(ctx)

    const { supabase, franchiseId } = ctx

    const vehicle = await validateVehicleInFranchise(supabase, franchiseId, vehicleId)
    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found in your franchise" }, { status: 404 })
    }

    // IMPORTANT: select the fields your UI renders
    const { data, error } = await supabase
      .from("maintenance_records") // <-- confirm this table name matches yours
      .select(
        `
        id,
        vehicle_id,
        service_date,
        service_type,
        maintenance_category,
        description,
        cost,
        vendor_name,
        mileage_at_service,
        notes,
        created_at
      `
      )
      .eq("vehicle_id", vehicle.id)
      .order("service_date", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Return a plain array (simplest for frontend)
    return NextResponse.json(data ?? [])
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 })
  }
}
