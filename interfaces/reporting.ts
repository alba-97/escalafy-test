export type ReportingMetric =
  | "meta_spend"
  | "meta_impressions"
  | "google_spend"
  | "google_impressions"
  | "revenue"
  | "orders"
  | "fees"
  | "meta_cpm"
  | "google_cpm"
  | "average_order_value"
  | "total_spend"
  | "profit"
  | "roas";

export interface GetReportingInput {
  orgId: number;
  startDate: string;
  endDate: string;
  metrics: ReportingMetric[];
}

export type ReportingTotals = Partial<Record<ReportingMetric, number>>;

export type ReportingDailyRow = { date: string } & Partial<
  Record<ReportingMetric, number>
>;

export interface GetReportingOutput {
  totals: ReportingTotals;
  daily: ReportingDailyRow[];
}
