import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient()
    const vehicleId = params.id

    // Get vehicle UUID
    const { data: vehicle, error: vehicleError } = await supabase
      .from("vehicles")
      .select("id")
      .eq("vehicle_number", vehicleId.toUpperCase())
      .single()

    if (vehicleError || !vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 })
    }

    const activities: any[] = []

    // Get recent daily checklists
    const { data: checklists } = await supabase
      .from("daily_checklists")
      .select("*, users(full_name)")
      .eq("vehicle_id", vehicle.id)
      .order("created_at", { ascending: false })
      .limit(5)

    if (checklists) {
      checklists.forEach((checklist) => {
        activities.push({
          id: `checklist-${checklist.id}`,
          type: "Daily Checklist",
          created_at: checklist.created_at,
          driver_name: checklist.users?.full_name,
          details: `Checklist completed`,
        })
      })
    }

    // Get recent daily logs
    const { data: logs } = await supabase
      .from("daily_logs")
      .select("*, users(full_name)")
      .eq("vehicle_id", vehicle.id)
      .order("created_at", { ascending: false })
      .limit(5)

    if (logs) {
      logs.forEach((log) => {
        const miles = log.end_mileage - log.start_mileage
        activities.push({
          id: `log-${log.id}`,
          type: "Daily Log",
          created_at: log.created_at,
          driver_name: log.users?.full_name,
          details: `${miles} miles driven${log.fuel_gallons ? `, ${log.fuel_gallons} gallons fuel` : ""}`,
        })
      })
    }

    // Get recent issues
    const { data: issues } = await supabase
      .from("vehicle_issues")
      .select("*, users(full_name)")
      .eq("vehicle_id", vehicle.id)
      .order("created_at", { ascending: false })
      .limit(5)

    if (issues) {
      issues.forEach((issue) => {
        activities.push({
          id: `issue-${issue.id}`,
          type: "Issue Report",
          created_at: issue.created_at,
          driver_name: issue.users?.full_name,
          details: issue.description,
        })
      })
    }

    // Sort all activities by date
    activities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    return NextResponse.json(activities.slice(0, 10))
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
