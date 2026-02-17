/**
 * /api/ads/events — Record ad events (impression, click, viewable, close)
 * Public endpoint — rate-limited per IP using in-memory sliding window
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adsService, adsAdminSettings } from "@/server/wiring";
import { recordEventSchema } from "@/features/ads/server/schemas";

/* ── Simple in-memory rate limiter (per IP) ──────────────────────────────── */
const ipHits = new Map<string, number[]>();

function isRateLimited(ip: string, windowMs: number, max: number): boolean {
  const now = Date.now();
  const hits = ipHits.get(ip) ?? [];
  const recent = hits.filter((t) => now - t < windowMs);
  if (recent.length >= max) return true;
  recent.push(now);
  ipHits.set(ip, recent);
  return false;
}

// Periodic cleanup to prevent memory leaks (every 5 minutes)
setInterval(() => {
  const cutoff = Date.now() - 120_000;
  for (const [ip, hits] of ipHits.entries()) {
    const recent = hits.filter((t) => t > cutoff);
    if (recent.length === 0) ipHits.delete(ip);
    else ipHits.set(ip, recent);
  }
}, 300_000);

export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const config = await adsAdminSettings.getConfig();
    if (isRateLimited(ip, config.eventRateLimitWindowMs, config.eventRateLimitMax)) {
      return NextResponse.json(
        { success: false, error: { code: "RATE_LIMITED", message: "Too many requests" } },
        { status: 429 },
      );
    }

    const body = await req.json();
    const input = recordEventSchema.parse(body);
    await adsService.recordEvent(input.placementId, input.eventType, input.metadata);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: error.issues.map((e: any) => e.message).join(", ") } },
        { status: 400 },
      );
    }
    const status = (error as any)?.statusCode ?? 500;
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status },
    );
  }
}
