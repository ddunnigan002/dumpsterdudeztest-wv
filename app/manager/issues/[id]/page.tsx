// app/manager/issues/[id]/page.tsx
import { createClient } from "@/lib/supabase/server"
import Link from "next/link"

export default async function IssueDetailsPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const issueId = params.id

  // Auth check (optional but recommended)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="p-6">
        <p className="mb-4">You must be logged in to view this page.</p>
        <Link className="underline" href="/login">
          Go to login
        </Link>
      </div>
    )
  }

  const { data: issue, error } = await supabase
    .from("vehicle_issues")
    .select("id, vehicle_id, description, status, severity, reported_date, resolved_date, created_at, photos, franchise_id")
    .eq("id", issueId)
    .maybeSingle()

  if (error) {
    return (
      <div className="p-6">
        <Link className="underline" href="/manager">
          ← Back to dashboard
        </Link>
        <div className="mt-4 rounded-md border p-4">
          <p className="font-semibold">Error loading issue</p>
          <p className="text-sm text-muted-foreground">{error.message}</p>
        </div>
      </div>
    )
  }

  if (!issue) {
    return (
      <div className="p-6">
        <Link className="underline" href="/manager">
          ← Back to dashboard
        </Link>
        <div className="mt-4 rounded-md border p-4">
          <p className="font-semibold">Issue not found</p>
          <p className="text-sm text-muted-foreground">This issue may have been deleted or you may not have access.</p>
        </div>
      </div>
    )
  }

  const { data: vehicle } = await supabase
    .from("vehicles")
    .select("vehicle_number")
    .eq("id", issue.vehicle_id)
    .maybeSingle()

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <Link className="underline" href="/manager">
          ← Back to dashboard
        </Link>
        <Link className="underline" href="/manager/issues">
          View all issues
        </Link>
      </div>

      <div className="rounded-lg border p-5 space-y-2">
        <h1 className="text-xl font-bold">Issue Details</h1>

        <div className="text-sm">
          <span className="font-semibold">Truck:</span>{" "}
          {vehicle?.vehicle_number ?? "Unknown"}
        </div>

        <div className="text-sm">
          <span className="font-semibold">Status:</span> {issue.status ?? "open"}
        </div>

        <div className="text-sm">
          <span className="font-semibold">Severity:</span> {issue.severity ?? "medium"}
        </div>

        <div className="text-sm">
          <span className="font-semibold">Reported date:</span>{" "}
          {issue.reported_date ?? issue.created_at?.slice(0, 10) ?? "—"}
        </div>

        {issue.resolved_date ? (
          <div className="text-sm">
            <span className="font-semibold">Resolved date:</span> {issue.resolved_date}
          </div>
        ) : null}

        <div className="pt-2">
          <div className="font-semibold">Description</div>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{issue.description}</p>
        </div>

        {Array.isArray(issue.photos) && issue.photos.length > 0 ? (
          <div className="pt-2">
            <div className="font-semibold">Photos</div>
            <ul className="list-disc pl-5 text-sm">
              {issue.photos.map((p: string) => (
                <li key={p}>
                  <a className="underline" href={p} target="_blank" rel="noreferrer">
                    {p}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  )
}
