import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

/**
 * If you use additional roles (ex: super_admin), add them here.
 * Keep this in sync with your DB check constraint / allowed values.
 */
export type FranchiseRole = "owner" | "manager" | "driver" | "super_admin"

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
 * - Returns 401 if user is not authenticated.
 * - Returns 403 if user has no active franchise membership.
 *
 * IMPORTANT:
 * We pick the most recently created active membership to avoid "old membership wins"
 * issues during testing/migrations.
 */
export async function getActiveFranchiseContext(): Promise<FranchiseContextResult> {
  const supabase = createClient()

  // Get authenticated user
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData?.user) {
    return { error: "Not authenticated", status: 401 }
  }

  const user = userData.user

  // Load active membership from franchise_memberships (newest active wins)
  const { data: membership, error: membershipError } = await supabase
    .from("franchise_memberships")
    .select("franchise_id, role")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
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
    role: (membership.role as FranchiseRole) || "driver",
  }
}

/**
 * Helper to validate that a vehicle belongs to the active franchise.
 *
 * Accepts either:
 * - UUID `vehicles.id`
 * - vehicle number (case-insensitive, exact match after normalization)
 *
 * Returns minimal vehicle fields if valid, otherwise null.
 */
export async function validateVehicleInFranchise(
  supabase: ReturnType<typeof createClient>,
  franchiseId: string,
  vehicleIdentifier: string,
): Promise<{ id: string; vehicle_number: string; current_mileage: number } | null> {
  const input = (vehicleIdentifier || "").trim()
  if (!input) return null

  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input)

  let query = supabase
    .from("vehicles")
    .select("id, vehicle_number, current_mileage")
    .eq("franchise_id", franchiseId)

  if (isUUID) {
    query = query.eq("id", input)
  } else {
    // Exact match on normalized vehicle number to avoid accidental partial matches
    query = query.eq("vehicle_number", input.toUpperCase())
  }

  const { data, error } = await query.maybeSingle()

  if (error) {
    console.error("[franchise-context] Error validating vehicle:", error)
    return null
  }

  return data ?? null
}

/**
 * Helper to check if user has manager-level permissions.
 */
export function requireManagerRole(role: FranchiseRole): boolean {
  return role === "manager" || role === "owner" || role === "super_admin"
}
