"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  GetReportingOutput,
  ReportingMetric,
} from "@/interfaces/reporting";

const allMetrics: {
  key: ReportingMetric;
  label: string;
  format: "currency" | "number";
}[] = [
  { key: "revenue", label: "Revenue", format: "currency" },
  { key: "orders", label: "Orders", format: "number" },
  { key: "fees", label: "Fees", format: "currency" },
  { key: "meta_spend", label: "Meta Spend", format: "currency" },
  { key: "meta_impressions", label: "Meta Impressions", format: "number" },
  { key: "meta_cpm", label: "Meta CPM", format: "currency" },
  { key: "google_spend", label: "Google Spend", format: "currency" },
  { key: "google_impressions", label: "Google Impressions", format: "number" },
  { key: "google_cpm", label: "Google CPM", format: "currency" },
  {
    key: "average_order_value",
    label: "Average Order Value",
    format: "currency",
  },
  { key: "total_spend", label: "Total Spend", format: "currency" },
  { key: "profit", label: "Profit", format: "currency" },
  { key: "roas", label: "ROAS", format: "number" },
];

function formatValue(
  metric: ReportingMetric,
  value: number | undefined,
): string {
  const config = allMetrics.find((m) => m.key === metric);
  if (!config) return String(value ?? 0);

  if (config.format === "currency") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    }).format(value ?? 0);
  }

  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(
    value ?? 0,
  );
}

export interface ReportingDashboardClientProps {
  initialOrgId: number;
  initialStartDate: string;
  initialEndDate: string;
  initialMetrics: ReportingMetric[];
  initialData: GetReportingOutput;
}

export default function ReportingDashboardClient(
  props: ReportingDashboardClientProps,
) {
  const [orgId] = useState<number>(props.initialOrgId);
  const [startDate, setStartDate] = useState<string>(props.initialStartDate);
  const [endDate, setEndDate] = useState<string>(props.initialEndDate);
  const [metrics, setMetrics] = useState<ReportingMetric[]>(
    props.initialMetrics,
  );
  const [data, setData] = useState<GetReportingOutput>(props.initialData);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const selectedMetrics = useMemo(() => {
    const allowed = new Set(metrics);
    return allMetrics.filter((m) => allowed.has(m.key));
  }, [metrics]);

  useEffect(() => {
    const controller = new AbortController();

    async function run() {
      setStatus("loading");
      setErrorMessage("");

      const url = new URL("/api/reporting", window.location.origin);
      url.searchParams.set("orgId", String(orgId));
      url.searchParams.set("startDate", startDate);
      url.searchParams.set("endDate", endDate);
      url.searchParams.set("metrics", metrics.join(","));

      try {
        const res = await fetch(url.toString(), { signal: controller.signal });
        const json = (await res.json()) as unknown;

        if (!res.ok) {
          const message =
            typeof json === "object" &&
            json !== null &&
            "error" in json &&
            typeof (json as { error: unknown }).error === "string"
              ? (json as { error: string }).error
              : "Request failed";
          throw new Error(message);
        }

        setData(json as GetReportingOutput);
        setStatus("idle");
      } catch (e) {
        if (controller.signal.aborted) return;
        setStatus("error");
        setErrorMessage(e instanceof Error ? e.message : "Unknown error");
      }
    }

    if (startDate && endDate && metrics.length > 0) {
      void run();
    }

    return () => controller.abort();
  }, [orgId, startDate, endDate, metrics]);

  function toggleMetric(metric: ReportingMetric) {
    setMetrics((prev) => {
      const set = new Set(prev);
      if (set.has(metric)) {
        set.delete(metric);
      } else {
        set.add(metric);
      }
      return Array.from(set);
    });
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto w-full max-w-6xl px-6 py-10">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">
            Reporting Dashboard
          </h1>
          <p className="text-muted-foreground">
            Multi-channel reporting for a single organization. Change date range
            and metrics to refresh.
          </p>
        </header>

        <section className="mt-8 rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="text-base font-medium">Filters</h2>

          <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="flex flex-col gap-2">
              <label
                className="text-sm text-muted-foreground"
                htmlFor="start-date"
              >
                Start date
              </label>
              <input
                id="start-date"
                aria-label="Start date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-10 rounded-md border bg-background px-3 text-sm"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label
                className="text-sm text-muted-foreground"
                htmlFor="end-date"
              >
                End date
              </label>
              <input
                id="end-date"
                aria-label="End date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-10 rounded-md border bg-background px-3 text-sm"
              />
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-sm text-muted-foreground">Status</span>
              <div className="h-10 rounded-md border bg-background px-3 text-sm flex items-center">
                {status === "loading"
                  ? "Loading..."
                  : status === "error"
                    ? "Error"
                    : "Ready"}
              </div>
            </div>
          </div>

          {status === "error" ? (
            <p className="mt-4 text-sm text-destructive">{errorMessage}</p>
          ) : null}

          <fieldset className="mt-6">
            <legend className="text-sm font-medium">Metrics</legend>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {allMetrics.map((m) => {
                const checked = metrics.includes(m.key);
                return (
                  <label
                    key={m.key}
                    className="flex items-center gap-3 rounded-lg border bg-background px-3 py-2"
                  >
                    <input
                      aria-label={`Toggle metric ${m.label}`}
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleMetric(m.key)}
                      className="h-4 w-4"
                    />
                    <span className="text-sm">{m.label}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        </section>

        <section className="mt-8">
          <h2 className="text-base font-medium">Totals</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {selectedMetrics.map((m) => (
              <article
                key={m.key}
                className="rounded-xl border bg-card p-5 shadow-sm"
              >
                <h3 className="text-sm text-muted-foreground">{m.label}</h3>
                <p className="mt-2 text-2xl font-semibold">
                  {formatValue(m.key, data.totals[m.key])}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-base font-medium">Daily breakdown</h2>

          <div className="mt-4 overflow-x-auto rounded-xl border bg-card shadow-sm">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b">
                  <th className="px-4 py-3 text-left font-medium">Date</th>
                  {selectedMetrics.map((m) => (
                    <th key={m.key} className="px-4 py-3 text-left font-medium">
                      {m.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.daily.map((row) => (
                  <tr key={row.date} className="border-b last:border-b-0">
                    <td className="px-4 py-3 text-muted-foreground">
                      {row.date}
                    </td>
                    {selectedMetrics.map((m) => (
                      <td key={m.key} className="px-4 py-3">
                        {formatValue(m.key, row[m.key])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </main>
  );
}
