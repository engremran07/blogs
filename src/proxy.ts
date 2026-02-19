/**
 * Root Next.js Middleware — runs before every matched request.
 *
 * Responsibilities:
 *  1. CSP nonce generation (injected into response headers)
 *  2. CRON secret verification on /api/cron
 *  3. CSRF validation on mutation API routes
 *  4. Rate limiting on mutation API routes (via @upstash/ratelimit)
 *
 * Auth is handled by NextAuth's `authorized` callback in auth.ts.
 * This middleware handles everything ELSE that should happen before
 * a function cold-starts.
 */
import { NextRequest, NextResponse } from "next/server";

/** Public mutation endpoints that skip CSRF (they have own protections). */
const CSRF_SKIP_PREFIXES = [
  "/api/auth",
  "/api/cron",
  "/api/contact",
  "/api/newsletter",
  "/api/captcha",
  "/api/ads/events",
  "/api/ads/ads-txt",
  "/api/ads/reserved-slots",
  "/api/health",
  "/api/settings/public",
];

function shouldSkipCsrf(pathname: string): boolean {
  return CSRF_SKIP_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── 1. CRON secret gate ──────────────────────────────────────────────────
  if (pathname.startsWith("/api/cron")) {
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const provided =
        req.headers.get("x-cron-secret") ||
        req.headers.get("authorization")?.replace("Bearer ", "");
      if (provided !== cronSecret) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
  }

  // ── 2. CSRF validation on mutation API routes ────────────────────────────
  const isMutation =
    req.method !== "GET" &&
    req.method !== "HEAD" &&
    req.method !== "OPTIONS";

  if (pathname.startsWith("/api/") && isMutation && !shouldSkipCsrf(pathname)) {
    const headerToken = req.headers.get("x-csrf-token");
    const cookieToken = req.cookies.get("csrf_token")?.value;
    if (!headerToken || !cookieToken || headerToken !== cookieToken) {
      return NextResponse.json(
        { success: false, error: "Invalid or missing CSRF token" },
        { status: 403 },
      );
    }
  }

  // ── 3. Rate limiting on mutation API routes ──────────────────────────────
  if (pathname.startsWith("/api/") && isMutation && !pathname.startsWith("/api/auth")) {
    const rateLimited = await checkRateLimit(req);
    if (rateLimited) {
      return NextResponse.json(
        { success: false, error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": "60" } },
      );
    }
  }

  // ── 4. Build response with CSRF cookie + CSP nonce ───────────────────────
  const nonce = generateNonce();
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);

  const response = NextResponse.next({ request: { headers: requestHeaders } });

  // Inject CSRF cookie if not present
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

  // Set CSP header with nonce (replaces static 'unsafe-inline' for scripts)
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://challenges.cloudflare.com https://www.google.com https://www.gstatic.com https://js.hcaptcha.com https://www.googletagmanager.com`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "frame-src https://challenges.cloudflare.com https://www.google.com https://newassets.hcaptcha.com",
    "connect-src 'self' https:",
    "media-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
  response.headers.set("Content-Security-Policy", csp);

  return response;
}

// ── Rate limiter (lazy-initialised) ─────────────────────────────────────────

let rateLimiter: {
  limit: (id: string) => Promise<{ success: boolean }>;
} | null = null;
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

// ── Helpers ─────────────────────────────────────────────────────────────────

function generateCsrfToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

// ── Matcher ─────────────────────────────────────────────────────────────────
// Run on API routes + all page routes (for CSP nonce injection).
// Skip static files, images, fonts, Next.js internals.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|uploads/).*)",
  ],
};
