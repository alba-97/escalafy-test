import { query } from "@/lib/db";
import type {
  GetReportingInput,
  GetReportingOutput,
  ReportingDailyRow,
  ReportingMetric,
  ReportingTotals,
} from "@/interfaces/reporting";

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const baseMetrics = new Set<ReportingMetric>([
  "meta_spend",
  "meta_impressions",
  "google_spend",
  "google_impressions",
  "revenue",
  "orders",
  "fees",
]);

const allowedMetrics = new Set<ReportingMetric>([
  ...baseMetrics,
  "meta_cpm",
  "google_cpm",
  "average_order_value",
  "total_spend",
  "profit",
  "roas",
]);

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function safeDiv(numerator: number, denominator: number): number {
  if (
    !Number.isFinite(numerator) ||
    !Number.isFinite(denominator) ||
    denominator === 0
  ) {
    return 0;
  }
  return numerator / denominator;
}

function validateInput(input: GetReportingInput): void {
  if (!Number.isInteger(input.orgId) || input.orgId <= 0) {
    throw new Error("orgId must be a positive integer");
  }
  if (!dateRegex.test(input.startDate) || !dateRegex.test(input.endDate)) {
    throw new Error("startDate and endDate must be in YYYY-MM-DD format");
  }
  if (input.startDate > input.endDate) {
    throw new Error("startDate must be <= endDate");
  }
  if (!Array.isArray(input.metrics) || input.metrics.length === 0) {
    throw new Error("metrics is required");
  }
  for (const metric of input.metrics) {
    if (!allowedMetrics.has(metric)) {
      throw new Error(`Unsupported metric: ${metric}`);
    }
  }
}

type DailyBaseRow = {
  date: string;
  meta_spend: string;
  meta_impressions: string;
  google_spend: string;
  google_impressions: string;
  revenue: string;
  orders: string;
  fees: string;
};

function toNumber(value: string): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return n;
}

function computeMetric(
  metric: ReportingMetric,
  values: Record<string, number>,
): number {
  switch (metric) {
    case "meta_cpm":
      return round2(safeDiv(values.meta_spend, values.meta_impressions) * 1000);
    case "google_cpm":
      return round2(
        safeDiv(values.google_spend, values.google_impressions) * 1000,
      );
    case "average_order_value":
      return round2(safeDiv(values.revenue, values.orders));
    case "total_spend":
      return round2(values.meta_spend + values.google_spend);
    case "profit":
      return round2(
        values.revenue - values.meta_spend - values.google_spend - values.fees,
      );
    case "roas":
      return round2(
        safeDiv(values.revenue, values.meta_spend + values.google_spend),
      );
    default:
      return round2(values[metric] ?? 0);
  }
}

function buildValuesFromBase(
  base: Record<string, number>,
): Record<string, number> {
  return {
    meta_spend: base.meta_spend ?? 0,
    meta_impressions: base.meta_impressions ?? 0,
    google_spend: base.google_spend ?? 0,
    google_impressions: base.google_impressions ?? 0,
    revenue: base.revenue ?? 0,
    orders: base.orders ?? 0,
    fees: base.fees ?? 0,
  };
}

export async function getReporting(
  input: GetReportingInput,
): Promise<GetReportingOutput> {
  validateInput(input);

  const rows = await query<DailyBaseRow>(
    `
    WITH org AS (
      SELECT meta_account_id, google_account_id, store_id
      FROM organization
      WHERE id = $1
      LIMIT 1
    ),
    dates AS (
      SELECT generate_series($2::date, $3::date, interval '1 day')::date AS date
    ),
    meta AS (
      SELECT m.date,
             SUM(m.spend)::numeric AS meta_spend,
             SUM(m.impressions)::bigint AS meta_impressions
      FROM meta_ads_data m
      JOIN org o ON o.meta_account_id = m.account_id
      WHERE m.date BETWEEN $2::date AND $3::date
      GROUP BY m.date
    ),
    google AS (
      SELECT g.date,
             SUM(g.spend)::numeric AS google_spend,
             SUM(g.impressions)::bigint AS google_impressions
      FROM google_ads_data g
      JOIN org o ON o.google_account_id = g.account_id
      WHERE g.date BETWEEN $2::date AND $3::date
      GROUP BY g.date
    ),
    store AS (
      SELECT s.date,
             SUM(s.revenue)::numeric AS revenue,
             SUM(s.orders)::bigint AS orders,
             SUM(s.fees)::numeric AS fees
      FROM store_data s
      JOIN org o ON o.store_id = s.store_id
      WHERE s.date BETWEEN $2::date AND $3::date
      GROUP BY s.date
    )
    SELECT
      d.date::text AS date,
      COALESCE(m.meta_spend, 0)::text AS meta_spend,
      COALESCE(m.meta_impressions, 0)::text AS meta_impressions,
      COALESCE(g.google_spend, 0)::text AS google_spend,
      COALESCE(g.google_impressions, 0)::text AS google_impressions,
      COALESCE(s.revenue, 0)::text AS revenue,
      COALESCE(s.orders, 0)::text AS orders,
      COALESCE(s.fees, 0)::text AS fees
    FROM dates d
    LEFT JOIN meta m ON m.date = d.date
    LEFT JOIN google g ON g.date = d.date
    LEFT JOIN store s ON s.date = d.date
    ORDER BY d.date ASC;
    `,
    [input.orgId, input.startDate, input.endDate],
  );

  if (rows.length === 0) {
    return { totals: {}, daily: [] };
  }

  const requested = new Set(input.metrics);

  const totalsBase: Record<string, number> = {
    meta_spend: 0,
    meta_impressions: 0,
    google_spend: 0,
    google_impressions: 0,
    revenue: 0,
    orders: 0,
    fees: 0,
  };

  const daily: ReportingDailyRow[] = rows.map((r) => {
    const base: Record<string, number> = {
      meta_spend: toNumber(r.meta_spend),
      meta_impressions: toNumber(r.meta_impressions),
      google_spend: toNumber(r.google_spend),
      google_impressions: toNumber(r.google_impressions),
      revenue: toNumber(r.revenue),
      orders: toNumber(r.orders),
      fees: toNumber(r.fees),
    };

    totalsBase.meta_spend += base.meta_spend;
    totalsBase.meta_impressions += base.meta_impressions;
    totalsBase.google_spend += base.google_spend;
    totalsBase.google_impressions += base.google_impressions;
    totalsBase.revenue += base.revenue;
    totalsBase.orders += base.orders;
    totalsBase.fees += base.fees;

    const values = buildValuesFromBase(base);

    const row: ReportingDailyRow = { date: r.date };
    for (const metric of requested) {
      if (
        metric === "meta_spend" ||
        metric === "meta_impressions" ||
        metric === "google_spend" ||
        metric === "google_impressions" ||
        metric === "revenue" ||
        metric === "orders" ||
        metric === "fees"
      ) {
        row[metric] = round2(values[metric]);
      } else {
        row[metric] = computeMetric(metric, values);
      }
    }

    return row;
  });

  const totalsValues = buildValuesFromBase(totalsBase);
  const totals: ReportingTotals = {};
  for (const metric of requested) {
    if (baseMetrics.has(metric)) {
      totals[metric] = round2(totalsValues[metric]);
    } else {
      totals[metric] = computeMetric(metric, totalsValues);
    }
  }

  return { totals, daily };
}
