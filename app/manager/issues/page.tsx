// app/manager/issues/page.tsx
import { createClient } from "@/lib/supabase/server"
import Link from "next/link"

export default async function IssuesListPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="p-6">
        <p>You must be logged in to view this page.</p>
        <Link href="/login" className="underline">
          Go to login
        </Link>
      </div>
    )
  }

  const { data: issues, error } = await supabase
    .from("vehicle_issues")
    .select("id, description, status, severity, created_at, vehicle_id")
    .order("created_at", { ascending: false })
    .limit(50)

  if (error) {
    return (
      <div className="p-6">
        <p className="font-semibold">Failed to load issues</p>
        <p className="text-sm text-muted-foreground">{error.message}</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-bold">Vehicle Issues</h1>

      {issues?.length ? (
        <ul className="space-y-2">
          {issues.map((i) => (
            <li key={i.id} className="rounded-md border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{i.description}</p>
                  <p className="text-sm text-muted-foreground">
                    {i.status ?? "open"} • {i.severity ?? "medium"}
                  </p>
                </div>
                <Link href={`/manager/issues/${i.id}`} className="underline">
                  View
                </Link>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No issues found.</p>
      )}
    </div>
  )
}
