import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { searchParams } = new URL(request.url)
    const vehicleId = searchParams.get("vehicleId")

    if (!vehicleId) {
      return NextResponse.json({ error: "Vehicle ID required" }, { status: 400 })
    }

    // Get yesterday's date
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split("T")[0]

    // Check if there's an end day log for yesterday
    const { data, error } = await supabase
      .from("daily_logs")
      .select("*")
      .eq("vehicle_id", vehicleId)
      .eq("log_date", yesterdayStr)
      .single()

    if (error && error.code !== "PGRST116") {
      // PGRST116 is "not found" error, which is expected
      console.error("[v0] Error checking end day:", error)
      return NextResponse.json({ needsEndDay: false, yesterdayDate: yesterdayStr })
    }

    // If no record found, they need to complete end day for yesterday
    const needsEndDay = !data

    return NextResponse.json({
      needsEndDay,
      yesterdayDate: yesterdayStr,
      yesterdayFormatted: yesterday.toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
      }),
    })
  } catch (error) {
    console.error("[v0] Error checking end day status:", error)
    return NextResponse.json({ error: "Failed to check end day status" }, { status: 500 })
  }
}
