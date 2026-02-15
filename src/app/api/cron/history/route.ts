/**
 * GET /api/cron/history — Returns paginated cron execution history.
 * Protected by CRON_SECRET (Bearer token) — same as the main cron endpoint.
 */
import { NextRequest, NextResponse } from "next/server";
import { env } from "@/server/env";
import { prisma } from "@/server/wiring";

export async function GET(request: NextRequest) {
  // Auth — reuse the same CRON_SECRET
  if (!env.CRON_SECRET) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  }

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (token !== env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "20", 10)));
  const skip = (page - 1) * limit;

  try {
    const [logs, total] = await Promise.all([
      (prisma as any).cronLog.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      (prisma as any).cronLog.count(),
    ]);

    return NextResponse.json({
      success: true,
      data: logs,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
