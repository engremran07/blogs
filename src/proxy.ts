/**
 * Root Next.js Proxy — runs before every matched request (src/proxy.ts).
 *
 * Responsibilities:
 *  1. CSP nonce generation (injected into response headers)
 *  2. CSRF validation on mutation API routes
 *  3. Rate limiting on mutation API routes (via @upstash/ratelimit)
 *
 * Auth is handled by NextAuth's `authorized` callback in auth.ts.
 * This proxy handles everything ELSE that should happen before
 * a function cold-starts.
 */
import { NextRequest, NextResponse } from "next/server";

/** Public mutation endpoints that skip CSRF (they have own protections). */
const CSRF_SKIP_PREFIXES = [
  "/api/auth",
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

  // ── 1. CSRF validation on mutation API routes ────────────────────────────
  const isMutation =
    req.method !== "GET" && req.method !== "HEAD" && req.method !== "OPTIONS";

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
  if (
    pathname.startsWith("/api/") &&
    isMutation &&
    !pathname.startsWith("/api/auth")
  ) {
    const rateLimited = await checkRateLimit(req);
    if (rateLimited) {
      return NextResponse.json(
        { success: false, error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": "60" } },
      );
    }
  }

  // ── 4. Sitemap / XSL routes — skip CSP (browsers need unrestricted XML→XSL)
  if (pathname.startsWith("/sitemap") || pathname === "/robots.txt") {
    return NextResponse.next();
  }

  // ── 5. Build response with CSRF cookie + CSP nonce ───────────────────────
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
  const isDev = process.env.NODE_ENV !== "production";
  const scriptSrc = isDev
    ? `script-src 'self' 'unsafe-eval' 'nonce-${nonce}' 'strict-dynamic' https://challenges.cloudflare.com https://www.google.com https://www.gstatic.com https://js.hcaptcha.com https://www.googletagmanager.com`
    : `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://challenges.cloudflare.com https://www.google.com https://www.gstatic.com https://js.hcaptcha.com https://www.googletagmanager.com`;
  const csp = [
    "default-src 'self'",
    scriptSrc,
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

// ── In-memory fallback rate limiter ─────────────────────────────────────────
const MEMORY_RATE_LIMIT = 30;
const MEMORY_RATE_WINDOW_MS = 60_000;
const inMemoryRateMap = new Map<string, { count: number; resetAt: number }>();

function checkInMemoryRateLimit(ip: string): boolean {
  const now = Date.now();

  // Periodically clean expired entries (every call, cheap for small maps)
  for (const [key, entry] of inMemoryRateMap) {
    if (now >= entry.resetAt) {
      inMemoryRateMap.delete(key);
    }
  }

  const existing = inMemoryRateMap.get(ip);
  if (!existing || now >= existing.resetAt) {
    inMemoryRateMap.set(ip, { count: 1, resetAt: now + MEMORY_RATE_WINDOW_MS });
    return false; // not rate-limited
  }

  existing.count += 1;
  return existing.count > MEMORY_RATE_LIMIT;
}

async function checkRateLimit(req: NextRequest): Promise<boolean> {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "127.0.0.1";

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
      // No Redis configured — fall through to in-memory limiter
    }
  }

  // If no Redis rate limiter, use in-memory fallback (never fail open)
  if (!rateLimiter) return checkInMemoryRateLimit(ip);

  try {
    const { success } = await rateLimiter.limit(ip);
    return !success;
  } catch {
    // Redis call failed — fall back to in-memory limiter instead of failing open
    return checkInMemoryRateLimit(ip);
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
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|uploads/).*)"],
};
