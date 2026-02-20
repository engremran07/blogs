/**
 * ============================================================================
 * MODULE:   server/api-auth.ts
 * PURPOSE:  Standardized API route authentication & authorization guard.
 *           Replaces 70+ inline hardcoded role-check patterns with a single
 *           capability-based helper that uses the existing ROLE_CAPABILITIES map.
 * ============================================================================
 *
 * Usage examples:
 *
 *   // Require any authenticated user
 *   const { session, errorResponse } = await requireAuth();
 *   if (errorResponse) return errorResponse;
 *
 *   // Require a specific capability (uses ROLE_CAPABILITIES map)
 *   const { session, errorResponse } = await requireAuth({ capability: 'manage_settings' });
 *   if (errorResponse) return errorResponse;
 *
 *   // Require admin-level role
 *   const { session, errorResponse } = await requireAuth({ level: 'admin' });
 *   if (errorResponse) return errorResponse;
 *
 *   // Require moderator-level role (EDITOR+)
 *   const { session, errorResponse } = await requireAuth({ level: 'moderator' });
 *   if (errorResponse) return errorResponse;
 *
 *   // Require content-creator level (AUTHOR+)
 *   const { session, errorResponse } = await requireAuth({ level: 'author' });
 *   if (errorResponse) return errorResponse;
 */

import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import type { Session } from "next-auth";
import type { UserRole } from "@/features/auth/types";
import type { Capability } from "@/features/auth/server/capabilities";
import {
  hasCapability,
  isAdminRole,
  isModeratorRole,
} from "@/features/auth/server/capabilities";

/* ── Convenience access level aliases ── */

const ROLE_LEVEL_MINIMUM: Record<string, readonly UserRole[]> = {
  /** Any authenticated user */
  any: [
    "SUBSCRIBER",
    "CONTRIBUTOR",
    "AUTHOR",
    "EDITOR",
    "ADMINISTRATOR",
    "SUPER_ADMIN",
  ],
  /** Content creators: AUTHOR and above */
  author: ["AUTHOR", "EDITOR", "ADMINISTRATOR", "SUPER_ADMIN"],
  /** Moderators: EDITOR and above */
  moderator: ["EDITOR", "ADMINISTRATOR", "SUPER_ADMIN"],
  /** Admins: ADMINISTRATOR and above */
  admin: ["ADMINISTRATOR", "SUPER_ADMIN"],
  /** Super admin only */
  superadmin: ["SUPER_ADMIN"],
} as const;

export type AccessLevel = keyof typeof ROLE_LEVEL_MINIMUM;

/* ── Options ── */

interface RequireAuthOptions {
  /** Check a specific capability from ROLE_CAPABILITIES map */
  capability?: Capability;
  /** Shorthand access level (mutually exclusive with `capability`) */
  level?: AccessLevel;
}

/* ── Result ── */

interface AuthSuccess {
  session: Session;
  userId: string;
  userRole: UserRole;
  errorResponse: null;
}

interface AuthFailure {
  session: null;
  userId: null;
  userRole: null;
  errorResponse: NextResponse;
}

type AuthResult = AuthSuccess | AuthFailure;

/* ── Main guard ── */

/**
 * Unified API route auth guard.
 * - No options → any authenticated user
 * - `capability` → checks ROLE_CAPABILITIES map
 * - `level` → checks minimum role level
 */
export async function requireAuth(
  options?: RequireAuthOptions,
): Promise<AuthResult> {
  const session = await auth();

  if (!session?.user) {
    return {
      session: null,
      userId: null,
      userRole: null,
      errorResponse: NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      ),
    };
  }

  const userRole = session.user.role as UserRole;
  const userId = session.user.id;
  const customCapabilities = (session.user.customCapabilities ??
    []) as Capability[];

  // Capability-based check
  if (options?.capability) {
    if (!hasCapability(userRole, options.capability, customCapabilities)) {
      return {
        session: null,
        userId: null,
        userRole: null,
        errorResponse: NextResponse.json(
          { success: false, error: "Insufficient permissions" },
          { status: 403 },
        ),
      };
    }
  }

  // Level-based check
  if (options?.level) {
    const allowedRoles = ROLE_LEVEL_MINIMUM[options.level];
    if (!allowedRoles || !allowedRoles.includes(userRole)) {
      return {
        session: null,
        userId: null,
        userRole: null,
        errorResponse: NextResponse.json(
          { success: false, error: "Insufficient permissions" },
          { status: 403 },
        ),
      };
    }
  }

  return {
    session,
    userId,
    userRole,
    errorResponse: null,
  };
}

/* ── Re-exports for convenience ── */

export { hasCapability, isAdminRole, isModeratorRole };
export type { Capability, UserRole };
