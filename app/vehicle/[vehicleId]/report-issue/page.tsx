import ReportIssue from "@/components/report-issue"

interface ReportIssuePageProps {
  params: {
    vehicleId: string
  }
}

export default function ReportIssuePage({ params }: ReportIssuePageProps) {
  const vehicleId = params.vehicleId.toUpperCase()

  return <ReportIssue vehicleId={vehicleId} />
}
