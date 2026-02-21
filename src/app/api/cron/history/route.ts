/**
 * GET /api/cron/history — Returns paginated cron execution history.
 * Protected by CRON_SECRET (Bearer token) — same as the main cron endpoint.
 */
import { NextRequest, NextResponse } from "next/server";
import { env } from "@/server/env";
import { prisma } from "@/server/wiring";
import { z } from "zod";

const cronHistoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export async function GET(request: NextRequest) {
  // Auth — reuse the same CRON_SECRET
  if (!env.CRON_SECRET) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 503 },
    );
  }

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (token !== env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const query = cronHistoryQuerySchema.safeParse({
    page: url.searchParams.get("page") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
  });

  if (!query.success) {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid query parameters",
        details: query.error.flatten(),
      },
      { status: 400 },
    );
  }

  const { page, limit } = query.data;
  const skip = (page - 1) * limit;

  try {
    const [logs, total] = await Promise.all([
      prisma.cronLog.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.cronLog.count(),
    ]);

    return NextResponse.json({
      success: true,
      data: logs,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
