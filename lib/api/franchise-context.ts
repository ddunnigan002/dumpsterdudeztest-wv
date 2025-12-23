import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export type FranchiseRole = "owner" | "manager" | "driver"

export interface FranchiseContext {
  supabase: ReturnType<typeof createClient>
  user: { id: string; email?: string }
  franchiseId: string
  role: FranchiseRole
}

export interface FranchiseContextError {
  error: string
  status: 401 | 403
}

export type FranchiseContextResult = FranchiseContext | FranchiseContextError

export function isContextError(result: FranchiseContextResult): result is FranchiseContextError {
  return "error" in result
}

export function contextErrorResponse(result: FranchiseContextError): NextResponse {
  return NextResponse.json({ error: result.error }, { status: result.status })
}

/**
 * Gets the active franchise context for the current authenticated user.
 * Returns 401 if user is not authenticated.
 * Returns 403 if user has no active franchise membership.
 */
export async function getActiveFranchiseContext(): Promise<FranchiseContextResult> {
  const supabase = createClient()

  // Get authenticated user
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData?.user) {
    return { error: "Not authenticated", status: 401 }
  }

  const user = userData.user

  // Load active membership from franchise_memberships
  const { data: membership, error: membershipError } = await supabase
    .from("franchise_memberships")
    .select("franchise_id, role")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle()

  if (membershipError) {
    console.error("[franchise-context] Error fetching membership:", membershipError)
    return { error: "Failed to verify franchise membership", status: 403 }
  }

  if (!membership?.franchise_id) {
    return { error: "No active franchise membership", status: 403 }
  }

  return {
    supabase,
    user: { id: user.id, email: user.email },
    franchiseId: membership.franchise_id as string,
    role: membership.role as FranchiseRole,
  }
}

/**
 * Helper to validate that a vehicle belongs to the active franchise.
 * Returns the vehicle data if valid, null otherwise.
 */
export async function validateVehicleInFranchise(
  supabase: ReturnType<typeof createClient>,
  franchiseId: string,
  vehicleIdentifier: string,
): Promise<{ id: string; vehicle_number: string; current_mileage: number } | null> {
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(vehicleIdentifier)

  let query = supabase.from("vehicles").select("id, vehicle_number, current_mileage").eq("franchise_id", franchiseId)

  if (isUUID) {
    query = query.eq("id", vehicleIdentifier)
  } else {
    // Case-insensitive match for vehicle_number
    query = query.ilike("vehicle_number", vehicleIdentifier)
  }

  const { data, error } = await query.maybeSingle()

  if (error) {
    console.error("[franchise-context] Error validating vehicle:", error)
    return null
  }

  return data
}

/**
 * Helper to check if user has manager or owner role.
 */
export function requireManagerRole(role: FranchiseRole): boolean {
  return role === "manager" || role === "owner"
}
