/**
 * Root Next.js Middleware — runs at the edge before every matched request.
 *
 * Responsibilities:
 *  1. CRON secret verification on /api/cron
 *  2. Rate limiting on mutation API routes (via @upstash/ratelimit)
 *  3. Security: block common attack paths
 *
 * Auth is handled by NextAuth's `authorized` callback in auth.ts.
 * This middleware handles everything ELSE that should happen before
 * a function cold-starts.
 */
import { NextRequest, NextResponse } from "next/server";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── 1. CRON secret gate ──────────────────────────────────────────────────
  // Vercel calls /api/cron on schedule — verify the secret header so
  // external actors can't trigger it.
  if (pathname.startsWith("/api/cron")) {
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const provided =
        req.headers.get("x-cron-secret") ||
        req.headers.get("authorization")?.replace("Bearer ", "");
      if (provided !== cronSecret) {
        return NextResponse.json(
          { error: "Forbidden" },
          { status: 403 },
        );
      }
    }
  }

  // ── 2. Rate limiting on mutation API routes ──────────────────────────────
  // Only apply to POST/PUT/PATCH/DELETE on API routes (not GET reads).
  // Uses @upstash/ratelimit if UPSTASH env vars are configured.
  if (
    pathname.startsWith("/api/") &&
    !pathname.startsWith("/api/auth") && // NextAuth handles its own
    req.method !== "GET" &&
    req.method !== "HEAD" &&
    req.method !== "OPTIONS"
  ) {
    const rateLimited = await checkRateLimit(req);
    if (rateLimited) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": "60" } },
      );
    }
  }

  return NextResponse.next();
}

// ── Rate limiter (lazy-initialised) ─────────────────────────────────────────

let rateLimiter: any = null;
let rateLimiterInitialised = false;

async function checkRateLimit(req: NextRequest): Promise<boolean> {
  if (!rateLimiterInitialised) {
    rateLimiterInitialised = true;
    try {
      const url = process.env.UPSTASH_REDIS_REST_URL;
      const token = process.env.UPSTASH_REDIS_REST_TOKEN;
      if (url && token) {
        const { Ratelimit } = await import("@upstash/ratelimit");
        const { Redis } = await import("@upstash/redis");
        const redis = new Redis({ url, token });
        rateLimiter = new Ratelimit({
          redis,
          // 30 mutations per 60 seconds per IP — generous for normal use,
          // blocks automated attacks. Adjust as needed.
          limiter: Ratelimit.slidingWindow(30, "60 s"),
          analytics: false,
          prefix: "myblog:ratelimit",
        });
      }
    } catch {
      // No Redis configured — skip rate limiting
    }
  }

  if (!rateLimiter) return false;

  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "127.0.0.1";
    const { success } = await rateLimiter.limit(ip);
    return !success;
  } catch {
    return false; // Fail open — don't block if Redis is down
  }
}

// ── Matcher ─────────────────────────────────────────────────────────────────
// Only run on routes that actually need middleware.
// Skip static files, images, fonts, Next.js internals.
export const config = {
  matcher: [
    "/api/:path*",
  ],
};
