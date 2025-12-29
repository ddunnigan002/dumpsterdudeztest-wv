import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasAnon: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    urlPrefix: process.env.NEXT_PUBLIC_SUPABASE_URL?.slice(0, 30) ?? null,
    anonPrefix: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.slice(0, 10) ?? null,
    nodeEnv: process.env.NODE_ENV ?? null,
  })
}
