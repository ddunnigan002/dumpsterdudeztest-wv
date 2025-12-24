export const runtime = "nodejs"

import { NextResponse } from "next/server"
import { getActiveFranchiseContext, isContextError, contextErrorResponse } from "@/lib/api/franchise-context"
import { sendPushToUser } from "@/lib/push/sendToUser"

export async function POST() {
  try {
    const ctx = await getActiveFranchiseContext()
    if (isContextError(ctx)) return contextErrorResponse(ctx)

    const result = await sendPushToUser({
      franchiseId: ctx.franchiseId,
      userId: ctx.user.id,
      payload: {
        title: "Test notification ✅",
        body: "If you can see this, push is working.",
        data: { url: "/" },
      },
    })

    return NextResponse.json({ ok: true, ...result })
  } catch (e: any) {
    console.error("[push test] fatal:", e)
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 })
  }
}
