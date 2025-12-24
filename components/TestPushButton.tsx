"use client"
import { useState } from "react"

export function TestPushButton() {
  const [msg, setMsg] = useState("")

  const test = async () => {
    setMsg("Sending...")
    const res = await fetch("/api/push/test", { method: "POST", credentials: "include" })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) setMsg(data?.error || "Failed")
    else setMsg(`Sent ✅ (${data.sent})`)
  }

  return (
    <div className="space-y-2">
      <button onClick={test} className="px-4 py-2 rounded bg-slate-800 text-white">
        Send Test Notification
      </button>
      {msg && <div className="text-sm text-gray-600">{msg}</div>}
    </div>
  )
}
