"use client"

import { useState } from "react"

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i)
  return outputArray
}

export function EnablePushNotificationsButton() {
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<string>("")

  const enable = async () => {
    setLoading(true)
    setStatus("")
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setStatus("Push notifications are not supported in this browser.")
        return
      }

      const perm = await Notification.requestPermission()
      if (perm !== "granted") {
        setStatus("Notifications were not allowed.")
        return
      }

      // register/ready
      await navigator.serviceWorker.register("/sw.js")
      const reg = await navigator.serviceWorker.ready

      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidPublicKey) {
        setStatus("Missing VAPID public key.")
        return
      }

      // reuse subscription if present
      let sub = await reg.pushManager.getSubscription()
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        })
      }

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ subscription: sub }),
      })

      if (!res.ok) {
        const text = await res.text()
        throw new Error(text)
      }

      setStatus("Notifications enabled ✅")
    } catch (e: any) {
      console.error(e)
      setStatus(`Failed: ${e?.message || "Unknown error"}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={enable}
        disabled={loading}
        className="px-4 py-2 rounded bg-orange-500 text-white disabled:opacity-50"
      >
        {loading ? "Enabling..." : "Enable Push Notifications"}
      </button>
      {status && <div className="text-sm text-gray-600">{status}</div>}
    </div>
  )
}
