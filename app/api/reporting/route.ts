import { NextResponse, type NextRequest } from "next/server";
import { getReporting } from "@/lib/reporting";
import type { ReportingMetric } from "@/interfaces/reporting";

function badRequest(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);

  const orgIdRaw = searchParams.get("orgId");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const metricsRaw = searchParams.get("metrics");

  if (!orgIdRaw) return badRequest("orgId is required");
  if (!startDate) return badRequest("startDate is required");
  if (!endDate) return badRequest("endDate is required");
  if (!metricsRaw) return badRequest("metrics is required");

  const orgId = Number(orgIdRaw);
  if (!Number.isInteger(orgId) || orgId <= 0)
    return badRequest("orgId must be a positive integer");

  const metrics = metricsRaw
    .split(",")
    .map((m) => m.trim())
    .filter((m) => m.length > 0) as ReportingMetric[];

  if (metrics.length === 0) return badRequest("metrics must not be empty");

  try {
    const data = await getReporting({ orgId, startDate, endDate, metrics });
    return NextResponse.json(data);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return badRequest(message);
  }
}
