/**
 * ============================================================================
 * MODULE:   components/users/middleware.ts
 * PURPOSE:  Next.js-compatible auth middleware helpers.
 *           Replaces NestJS guards, decorators, and Passport strategies.
 *
 * Usage (Next.js App Router API Route):
 *
 *   import { withAuth, withRoles } from '@/components/users';
 *
 *   // Protected route:
 *   export const GET = withAuth(async (req, user) => {
 *     return NextResponse.json({ user });
 *   });
 *
 *   // Admin-only route:
 *   export const POST = withRoles('ADMINISTRATOR', 'SUPER_ADMIN')(
 *     async (req, user) => { ... }
 *   );
 *
 * Usage (Next.js middleware.ts):
 *
 *   import { verifyAccessToken } from '@/components/users';
 *
 *   export async function middleware(req: NextRequest) {
 *     const token = getTokenFromRequest(req);
 *     if (!token) return NextResponse.redirect('/login');
 *     try {
 *       const payload = await verifyAccessToken(token);
 *       // attach to headers for downstream route
 *     } catch { return NextResponse.redirect('/login'); }
 *   }
 * ============================================================================
 */

import type { NextRequest } from 'next/server';
import type {
  UserRole,
  AuthenticatedUser,
  JwtSigner,
  AccessTokenPayload,
  UserConfig,
  SameSiteOption,
} from '../types';
import { AuthError } from '../types';
import { hasCapability, getUserCapabilities } from './capabilities';
import type { Capability } from './capabilities';

// ─── Token Extraction ───────────────────────────────────────────────────────

/**
 * Extract JWT from a request.
 * Priority: Cookie `access_token` → Authorization Bearer header.
 */
export function getTokenFromRequest(req: NextRequest | Request): string | null {
  // 1. Cookie
  if ('cookies' in req && typeof req.cookies?.get === 'function') {
    const cookie = (req as NextRequest).cookies.get('access_token');
    if (cookie?.value) return cookie.value;
  }

  // 2. Authorization header
  const authHeader =
    req.headers instanceof Headers
      ? req.headers.get('authorization')
      : null;

  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  return null;
}

// ─── Token Verification ─────────────────────────────────────────────────────

/**
 * Verify an access token and return the decoded payload.
 * Requires a `JwtSigner` instance (jose, jsonwebtoken, etc.).
 */
export async function verifyAccessToken(
  token: string,
  jwt: JwtSigner,
  secret?: string,
): Promise<AccessTokenPayload> {
  const payload = await jwt.verify<AccessTokenPayload>(token, {
    secret: secret ?? process.env.JWT_SECRET,
  });

  if (!payload.sub || !payload.email || !payload.role) {
    throw new AuthError('Invalid token payload');
  }

  return payload;
}

// ─── Route Handler Wrappers ─────────────────────────────────────────────────

type NextRouteHandler = (
  req: NextRequest,
  context?: { params?: Record<string, string> },
) => Response | Promise<Response>;

type AuthenticatedHandler = (
  req: NextRequest,
  user: AuthenticatedUser,
  context?: { params?: Record<string, string> },
) => Response | Promise<Response>;

/**
 * Wrap a Next.js route handler with JWT authentication.
 * Rejects with 401 if no valid token is present.
 *
 * ```ts
 * export const GET = withAuth(jwt)(async (req, user) => {
 *   return NextResponse.json({ userId: user.id });
 * });
 * ```
 */
export function withAuth(jwt: JwtSigner) {
  return (handler: AuthenticatedHandler): NextRouteHandler => {
    return async (req, context) => {
      const token = getTokenFromRequest(req);
      if (!token) {
        return new Response(
          JSON.stringify({ error: 'Authentication required' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } },
        );
      }

      try {
        const payload = await verifyAccessToken(token, jwt);
        const user: AuthenticatedUser = {
          id: payload.sub,
          email: payload.email,
          role: payload.role as UserRole,
          capabilities: getUserCapabilities(payload.role as UserRole),
        };
        return handler(req, user, context);
      } catch {
        return new Response(
          JSON.stringify({ error: 'Invalid or expired token' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } },
        );
      }
    };
  };
}

/**
 * Wrap a route handler with role-based access control.
 * Must be used after `withAuth` — requires an authenticated user.
 *
 * ```ts
 * export const DELETE = withRoles(jwt, 'ADMINISTRATOR', 'SUPER_ADMIN')(
 *   async (req, user) => { ... }
 * );
 * ```
 */
export function withRoles(jwt: JwtSigner, ...roles: UserRole[]) {
  return (handler: AuthenticatedHandler): NextRouteHandler => {
    return withAuth(jwt)(async (req, user, context) => {
      if (!roles.includes(user.role)) {
        return new Response(
          JSON.stringify({ error: 'Insufficient permissions' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } },
        );
      }
      return handler(req, user, context);
    });
  };
}

/**
 * Wrap a route handler with capability-based access control.
 *
 * ```ts
 * export const POST = withCapability(jwt, 'manage_users')(
 *   async (req, user) => { ... }
 * );
 * ```
 */
export function withCapability(jwt: JwtSigner, capability: Capability) {
  return (handler: AuthenticatedHandler): NextRouteHandler => {
    return withAuth(jwt)(async (req, user, context) => {
      if (!hasCapability(user.role, capability)) {
        return new Response(
          JSON.stringify({ error: 'Insufficient permissions' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } },
        );
      }
      return handler(req, user, context);
    });
  };
}

// ─── Cookie Helpers ─────────────────────────────────────────────────────────

export interface CookieOptions {
  secure: boolean;
  sameSite: SameSiteOption;
  domain: string;
  path: string;
}

const defaultCookieOpts: CookieOptions = {
  secure: true,
  sameSite: 'lax',
  domain: '',
  path: '/',
};

/**
 * Build Set-Cookie headers for auth tokens.
 * Returns an array of `Set-Cookie` header values.
 */
export function buildAuthCookies(
  accessToken: string,
  refreshToken: string,
  config: Partial<UserConfig> & {
    accessTokenExpiryMs: number;
    refreshTokenExpiryMs: number;
  },
  opts: Partial<CookieOptions> = {},
): string[] {
  const o = { ...defaultCookieOpts, ...opts };

  const sameSite = o.sameSite.charAt(0).toUpperCase() + o.sameSite.slice(1);
  const domainPart = o.domain ? `; Domain=${o.domain}` : '';

  return [
    `access_token=${accessToken}; HttpOnly; Path=${o.path}; Max-Age=${Math.floor(config.accessTokenExpiryMs / 1000)}; SameSite=${sameSite}${o.secure ? '; Secure' : ''}${domainPart}`,
    `refresh_token=${refreshToken}; HttpOnly; Path=${o.path}; Max-Age=${Math.floor(config.refreshTokenExpiryMs / 1000)}; SameSite=${sameSite}${o.secure ? '; Secure' : ''}${domainPart}`,
  ];
}

/**
 * Build Set-Cookie headers that clear auth cookies (logout).
 */
export function buildClearAuthCookies(opts: Partial<CookieOptions> = {}): string[] {
  const o = { ...defaultCookieOpts, ...opts };
  const domainPart = o.domain ? `; Domain=${o.domain}` : '';
  const sameSite = o.sameSite.charAt(0).toUpperCase() + o.sameSite.slice(1);

  return [
    `access_token=; HttpOnly; Path=${o.path}; Max-Age=0; SameSite=${sameSite}${o.secure ? '; Secure' : ''}${domainPart}`,
    `refresh_token=; HttpOnly; Path=${o.path}; Max-Age=0; SameSite=${sameSite}${o.secure ? '; Secure' : ''}${domainPart}`,
  ];
}

/**
 * Build a CSRF token cookie value.
 * The CSRF token should also be injected as a meta tag or header for client-side use.
 */
export function buildCsrfCookie(
  csrfToken: string,
  opts: Partial<CookieOptions> = {},
): string {
  const o = { ...defaultCookieOpts, ...opts };
  const domainPart = o.domain ? `; Domain=${o.domain}` : '';
  const sameSite = o.sameSite.charAt(0).toUpperCase() + o.sameSite.slice(1);

  // CSRF cookie is NOT HttpOnly — client JS needs to read it
  return `csrf_token=${csrfToken}; Path=${o.path}; Max-Age=86400; SameSite=${sameSite}${o.secure ? '; Secure' : ''}${domainPart}`;
}

/**
 * Validate a CSRF token from a request header against the cookie value.
 */
export function validateCsrf(req: NextRequest | Request): boolean {
  const headerToken =
    req.headers instanceof Headers
      ? req.headers.get('x-csrf-token')
      : null;

  if (!headerToken) return false;

  // Read from cookie
  if ('cookies' in req && typeof (req as NextRequest).cookies?.get === 'function') {
    const cookieToken = (req as NextRequest).cookies.get('csrf_token')?.value;
    return !!cookieToken && cookieToken === headerToken;
  }

  return false;
}

// ─── Server Component Session Helper ────────────────────────────────────────

/**
 * Get the authenticated user from cookies in a Server Component or Server Action.
 * Returns null if no valid session.
 *
 * ```ts
 * // app/dashboard/page.tsx
 * import { cookies } from 'next/headers';
 * import { getServerSession } from '@/components/users';
 *
 * export default async function Dashboard() {
 *   const user = await getServerSession(jwt);
 *   if (!user) redirect('/login');
 *   return <h1>Welcome {user.email}</h1>;
 * }
 * ```
 */
export async function getServerSession(
  jwt: JwtSigner,
  cookieStore: { get(name: string): { value: string } | undefined },
  secret?: string,
): Promise<AuthenticatedUser | null> {
  const token = cookieStore.get('access_token')?.value;
  if (!token) return null;

  try {
    const payload = await verifyAccessToken(token, jwt, secret);
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role as UserRole,
      capabilities: getUserCapabilities(payload.role as UserRole),
    };
  } catch {
    return null;
  }
}
