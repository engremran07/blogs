/**
 * ============================================================================
 * MODULE:   features/auth/capabilities.ts
 * PURPOSE:  Role → capability mapping with full TypeScript type safety.
 *           All capabilities are derived from `as const` objects —
 *           no magic strings, no runtime `Record<string, string[]>` casts.
 * ============================================================================
 */

import type { UserRole } from '../types';

// ─── All Known Capabilities ─────────────────────────────────────────────────

export const ALL_CAPABILITIES = [
  // Content reading
  'read_posts',
  'read_comments',

  // Profile
  'edit_profile',

  // Post authoring
  'create_posts',
  'edit_own_posts',
  'delete_own_posts',
  'publish_posts',

  // File management
  'upload_files',

  // Post editing (others)
  'edit_posts',
  'edit_others_posts',
  'delete_posts',
  'delete_others_posts',

  // Taxonomy
  'manage_categories',
  'manage_tags',

  // Moderation
  'moderate_comments',

  // Administration
  'manage_users',
  'create_users',
  'edit_users',
  'delete_users',
  'manage_settings',
  'manage_pages',
  'edit_theme',
  'install_plugins',
] as const;

export type Capability = (typeof ALL_CAPABILITIES)[number];

// ─── Role → Capability Map ─────────────────────────────────────────────────

const SUBSCRIBER_CAPS = [
  'read_posts',
  'read_comments',
  'edit_profile',
] as const satisfies readonly Capability[];

const CONTRIBUTOR_CAPS = [
  ...SUBSCRIBER_CAPS,
  'create_posts',
  'edit_own_posts',
  'delete_own_posts',
] as const satisfies readonly Capability[];

const AUTHOR_CAPS = [
  ...CONTRIBUTOR_CAPS,
  'publish_posts',
  'upload_files',
] as const satisfies readonly Capability[];

const EDITOR_CAPS = [
  ...AUTHOR_CAPS,
  'edit_posts',
  'edit_others_posts',
  'delete_posts',
  'delete_others_posts',
  'manage_categories',
  'manage_tags',
  'moderate_comments',
] as const satisfies readonly Capability[];

const ADMINISTRATOR_CAPS = [
  ...EDITOR_CAPS,
  'manage_users',
  'create_users',
  'edit_users',
  'delete_users',
  'manage_settings',
  'manage_pages',
  'edit_theme',
  'install_plugins',
] as const satisfies readonly Capability[];

/**
 * Map from role name to its capability list.
 * SUPER_ADMIN is handled separately — it implicitly has every capability.
 */
export const ROLE_CAPABILITIES: Record<Exclude<UserRole, 'SUPER_ADMIN'>, readonly Capability[]> = {
  SUBSCRIBER: SUBSCRIBER_CAPS,
  CONTRIBUTOR: CONTRIBUTOR_CAPS,
  AUTHOR: AUTHOR_CAPS,
  EDITOR: EDITOR_CAPS,
  ADMINISTRATOR: ADMINISTRATOR_CAPS,
};

// ─── API ────────────────────────────────────────────────────────────────────

/**
 * Check whether a role (or custom capability list) includes a capability.
 * SUPER_ADMIN always returns true.
 */
export function hasCapability(
  userRole: UserRole,
  capability: Capability,
  customCapabilities?: Capability[],
): boolean {
  if (customCapabilities?.includes(capability)) return true;
  if (userRole === 'SUPER_ADMIN') return true;

  const caps = ROLE_CAPABILITIES[userRole as Exclude<UserRole, 'SUPER_ADMIN'>];
  return caps ? (caps as readonly Capability[]).includes(capability) : false;
}

/**
 * Return the full list of capabilities for a given role.
 * SUPER_ADMIN receives the complete set.
 */
export function getUserCapabilities(
  userRole: UserRole,
  customCapabilities?: Capability[],
): Capability[] {
  if (userRole === 'SUPER_ADMIN') {
    return [...ALL_CAPABILITIES];
  }

  const roleCaps = ROLE_CAPABILITIES[userRole as Exclude<UserRole, 'SUPER_ADMIN'>] ?? [];
  if (!customCapabilities?.length) return [...roleCaps];
  return [...new Set([...roleCaps, ...customCapabilities])];
}

/**
 * Check whether `roleA` outranks `roleB` in the role hierarchy.
 * Useful for preventing lower-ranked users from modifying higher-ranked ones.
 */
export function outranks(roleA: UserRole, roleB: UserRole): boolean {
  const hierarchy: Record<UserRole, number> = {
    SUBSCRIBER: 0,
    CONTRIBUTOR: 1,
    AUTHOR: 2,
    EDITOR: 3,
    ADMINISTRATOR: 4,
    SUPER_ADMIN: 5,
  };
  return hierarchy[roleA] > hierarchy[roleB];
}

// ─── Admin / Redirect Helpers ───────────────────────────────────────────────

/** Roles that grant access to the admin panel. */
export const ADMIN_ROLES: readonly UserRole[] = ['ADMINISTRATOR', 'SUPER_ADMIN'] as const;

/** Roles that can moderate content (comments, tags, posts). */
export const MODERATOR_ROLES: readonly UserRole[] = ['EDITOR', 'ADMINISTRATOR', 'SUPER_ADMIN'] as const;

/**
 * Check whether a role is an admin-level role (ADMINISTRATOR or SUPER_ADMIN).
 */
export function isAdminRole(role: UserRole): boolean {
  return (ADMIN_ROLES as readonly string[]).includes(role);
}

/**
 * Check whether a role has moderator-level access (EDITOR, ADMINISTRATOR, SUPER_ADMIN).
 * Use this for admin-panel visibility, comment moderation, tag management, etc.
 */
export function isModeratorRole(role: string | undefined | null): boolean {
  if (!role) return false;
  return (MODERATOR_ROLES as readonly string[]).includes(role);
}

/**
 * Return the post-login redirect path based on the user's role.
 * Admin-level roles → '/admin/dashboard', everyone else → '/dashboard'.
 *
 * Override defaults with the optional `paths` argument:
 * ```ts
 * getLoginRedirectPath(user.role, { admin: '/admin', user: '/' });
 * ```
 */
export function getLoginRedirectPath(
  role: UserRole,
  paths?: { admin?: string; user?: string },
): string {
  const adminPath = paths?.admin ?? '/admin/dashboard';
  const userPath = paths?.user ?? '/dashboard';
  return isAdminRole(role) ? adminPath : userPath;
}
