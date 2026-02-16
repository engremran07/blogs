import { prisma } from "@/server/db/prisma";
import { redis } from "@/server/cache/redis";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/health
 * Lightweight health-check for Docker HEALTHCHECK, load-balancers, and uptime monitors.
 * Returns 200 when all dependencies are reachable, 503 otherwise.
 */
export async function GET() {
  const start = Date.now();
  let dbOk = false;
  let redisOk = false;

  // Ping database
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch {
    /* db unreachable */
  }

  // Ping Redis (returns null on no-op fallback — that's fine)
  try {
    await redis.ping();
    redisOk = true;
  } catch {
    /* redis unreachable */
  }

  const healthy = dbOk; // Redis is optional — only DB is critical
  const body = {
    status: healthy ? "ok" : "degraded",
    uptime: Math.floor(process.uptime()),
    latency: Date.now() - start,
    db: dbOk ? "ok" : "error",
    redis: redisOk ? "ok" : "unavailable",
  };

  return NextResponse.json(body, { status: healthy ? 200 : 503 });
}
