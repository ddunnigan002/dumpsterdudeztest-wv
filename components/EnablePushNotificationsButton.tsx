"use client"

import { useState } from "react"

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

export default function EnablePushNotificationsButton() {
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  const enable = async () => {
    setLoading(true)
    setStatus(null)

    try {
      if (!("serviceWorker" in navigator)) {
        setStatus("Push not supported in this browser")
        return
      }

      const registration = await navigator.serviceWorker.register("/sw.js")

      const permission = await Notification.requestPermission()
      if (permission !== "granted") {
        setStatus("Notifications were blocked")
        return
      }

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidKey) {
        setStatus("Missing VAPID key")
        return
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      })

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription }),
      })

      if (!res.ok) throw new Error(await res.text())

      setStatus("Notifications enabled ✅")
    } catch (err: any) {
      console.error(err)
      setStatus("Failed to enable notifications")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={enable}
        disabled={loading}
        className="rounded bg-orange-600 px-4 py-2 text-white disabled:opacity-50"
      >
        {loading ? "Enabling…" : "Enable Notifications"}
      </button>
      {status && <p className="text-sm text-gray-600">{status}</p>}
    </div>
  )
}
