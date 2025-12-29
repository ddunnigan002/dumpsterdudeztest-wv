"use client"

import { Badge } from "@/components/ui/badge"

function normalizeCategory(cat?: string | null) {
  return (cat || "other").trim().toLowerCase()
}

export default function MaintenanceCategoryBadge({
  category,
}: {
  category?: string | null
}) {
  const c = normalizeCategory(category)

  // simple visual buckets (you can tweak)
  const variant =
    c === "repair"
      ? "destructive"
      : c === "inspection"
        ? "secondary"
        : c === "hydraulics" || c === "brakes"
          ? "outline"
          : "default"

  const label =
    c
      .replace(/_/g, " ")
      .replace(/\b\w/g, (m) => m.toUpperCase())

  return <Badge variant={variant}>{label}</Badge>
}
