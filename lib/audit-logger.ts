// Utility functions for audit logging

interface AuditLogEntry {
  table_name: string
  record_id: string
  action: "INSERT" | "UPDATE" | "DELETE"
  old_values?: any
  new_values?: any
  changed_by_user_id?: string
  manager_override?: boolean
  change_reason?: string
  ip_address?: string
  user_agent?: string
}

export async function logAuditEntry(entry: AuditLogEntry) {
  try {
    const response = await fetch("/api/audit-log", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(entry),
    })

    if (!response.ok) {
      console.error("Failed to log audit entry:", await response.text())
    }
  } catch (error) {
    console.error("Error logging audit entry:", error)
  }
}

export function getClientInfo(request?: Request) {
  if (!request) return {}

  const forwarded = request.headers.get("x-forwarded-for")
  const ip = forwarded ? forwarded.split(",")[0] : request.headers.get("x-real-ip")
  const userAgent = request.headers.get("user-agent")

  return {
    ip_address: ip,
    user_agent: userAgent,
  }
}

export function createChangeDescription(oldValues: any, newValues: any): string {
  const changes: string[] = []

  for (const [key, newValue] of Object.entries(newValues)) {
    const oldValue = oldValues?.[key]
    if (oldValue !== newValue) {
      changes.push(`${key}: ${oldValue} → ${newValue}`)
    }
  }

  return changes.join(", ")
}
