import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { cache } from "react"

export const isSupabaseConfigured =
  typeof process.env.NEXT_PUBLIC_SUPABASE_URL === "string" &&
  process.env.NEXT_PUBLIC_SUPABASE_URL.length > 0 &&
  typeof process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === "string" &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length > 0

export const createClient = cache(() => {
  const cookieStore = cookies()

  if (!isSupabaseConfigured) {
    console.warn("Supabase environment variables are not set. Using dummy client.")

    const createDummyQueryBuilder = () => ({
      select: () => createDummyQueryBuilder(),
      insert: () => createDummyQueryBuilder(),
      update: () => createDummyQueryBuilder(),
      delete: () => createDummyQueryBuilder(),
      eq: () => createDummyQueryBuilder(),
      neq: () => createDummyQueryBuilder(),
      gt: () => createDummyQueryBuilder(),
      gte: () => createDummyQueryBuilder(),
      lt: () => createDummyQueryBuilder(),
      lte: () => createDummyQueryBuilder(),
      like: () => createDummyQueryBuilder(),
      ilike: () => createDummyQueryBuilder(),
      is: () => createDummyQueryBuilder(),
      in: () => createDummyQueryBuilder(),
      contains: () => createDummyQueryBuilder(),
      containedBy: () => createDummyQueryBuilder(),
      rangeGt: () => createDummyQueryBuilder(),
      rangeGte: () => createDummyQueryBuilder(),
      rangeLt: () => createDummyQueryBuilder(),
      rangeLte: () => createDummyQueryBuilder(),
      rangeAdjacent: () => createDummyQueryBuilder(),
      overlaps: () => createDummyQueryBuilder(),
      textSearch: () => createDummyQueryBuilder(),
      match: () => createDummyQueryBuilder(),
      not: () => createDummyQueryBuilder(),
      or: () => createDummyQueryBuilder(),
      filter: () => createDummyQueryBuilder(),
      order: () => createDummyQueryBuilder(),
      limit: () => createDummyQueryBuilder(),
      range: () => createDummyQueryBuilder(),
      abortSignal: () => createDummyQueryBuilder(),
      single: () => Promise.resolve({ data: null, error: null }),
      maybeSingle: () => Promise.resolve({ data: null, error: null }),
      then: (resolve: any) => resolve({ data: [], error: null }),
    })

    return {
      auth: {
        getUser: () => Promise.resolve({ data: { user: null }, error: null }),
        getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      },
      from: () => createDummyQueryBuilder(),
    }
  }

  return createServerComponentClient({ cookies: () => cookieStore })
})
