/**
 * Root Next.js Proxy — runs at the edge before every matched request.
 *
 * Responsibilities:
 *  1. CRON secret verification on /api/cron
 *  2. Rate limiting on mutation API routes (via @upstash/ratelimit)
 *  3. Security: block common attack paths
 *
 * Auth is handled by NextAuth's `authorized` callback in auth.ts.
 * This proxy handles everything ELSE that should happen before
 * a function cold-starts.
 */
import { NextRequest, NextResponse } from "next/server";

export async function proxy(req: NextRequest) {
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

  // ── 2. CSRF validation on mutation API routes ────────────────────────────
  // Validates x-csrf-token header against csrf_token cookie for all
  // state-changing requests. Skips auth (NextAuth handles it) and cron.
  if (
    pathname.startsWith("/api/") &&
    !pathname.startsWith("/api/auth") &&
    !pathname.startsWith("/api/cron") &&
    req.method !== "GET" &&
    req.method !== "HEAD" &&
    req.method !== "OPTIONS"
  ) {
    const csrfEnabled = await isCsrfEnabled();
    if (csrfEnabled) {
      const headerToken = req.headers.get("x-csrf-token");
      const cookieToken = req.cookies.get("csrf_token")?.value;
      if (!headerToken || !cookieToken || headerToken !== cookieToken) {
        return NextResponse.json(
          { error: "Invalid or missing CSRF token" },
          { status: 403 },
        );
      }
    }
  }

  // ── 3. Rate limiting on mutation API routes ──────────────────────────────
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

  // Inject CSRF cookie if not present (for SPA clients to read)
  const response = NextResponse.next();
  if (!req.cookies.get("csrf_token")?.value) {
    const token = generateCsrfToken();
    response.cookies.set("csrf_token", token, {
      httpOnly: false, // Client JS needs to read it
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 86400,
    });
  }
  return response;
}

// ── Rate limiter (lazy-initialised) ─────────────────────────────────────────

let rateLimiter: { limit: (id: string) => Promise<{ success: boolean }> } | null = null;
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

// ── CSRF helpers ────────────────────────────────────────────────────────────

let _csrfEnabled: boolean | null = null;
let _csrfCheckedAt = 0;

async function isCsrfEnabled(): Promise<boolean> {
  // Cache the DB lookup for 60 seconds
  if (_csrfEnabled !== null && Date.now() - _csrfCheckedAt < 60_000) {
    return _csrfEnabled;
  }
  try {
    // Dynamic import to avoid edge runtime issues
    const { prisma } = await import("@/server/db/prisma");
    const row = await (prisma as unknown as Record<string, { findFirst: (args: Record<string, unknown>) => Promise<{ value: unknown } | null> }>).siteSettings.findFirst({
      where: { key: "csrfEnabled" },
      select: { value: true },
    });
    _csrfEnabled = row?.value === "true" || row?.value === true;
  } catch {
    _csrfEnabled = true; // Default to enabled if DB unavailable
  }
  _csrfCheckedAt = Date.now();
  return _csrfEnabled!;
}

function generateCsrfToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

// ── Matcher ─────────────────────────────────────────────────────────────────
// Only run on routes that actually need the proxy.
// Skip static files, images, fonts, Next.js internals.
export const config = {
  matcher: [
    "/api/:path*",
  ],
};
