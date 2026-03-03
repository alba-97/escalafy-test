import ReportingDashboardClient from "@/components/ReportingDashboardClient";
import type { ReportingMetric } from "@/interfaces/reporting";
import { getReporting } from "@/lib/reporting";

function toIsoDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default async function Home() {
  const orgId = 1;
  const today = new Date();
  const start = new Date(
    Date.UTC(
      today.getUTCFullYear(),
      today.getUTCMonth(),
      today.getUTCDate() - 29,
    ),
  );
  const end = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  );

  const startDate = toIsoDate(start);
  const endDate = toIsoDate(end);

  const metrics: ReportingMetric[] = [
    "revenue",
    "total_spend",
    "profit",
    "roas",
  ];

  const initialData = await getReporting({
    orgId,
    startDate,
    endDate,
    metrics,
  });

  return (
    <ReportingDashboardClient
      initialOrgId={orgId}
      initialStartDate={startDate}
      initialEndDate={endDate}
      initialMetrics={metrics}
      initialData={initialData}
    />
  );
}
