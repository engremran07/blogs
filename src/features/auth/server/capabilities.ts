/**
 * ============================================================================
 * MODULE:   features/auth/capabilities.ts
 * PURPOSE:  Role → capability mapping with full TypeScript type safety.
 *           All capabilities are derived from `as const` objects —
 *           no magic strings, no runtime `Record<string, string[]>` casts.
 * ============================================================================
 */

import type { UserRole } from "../types";

// ─── All Known Capabilities ─────────────────────────────────────────────────

export const ALL_CAPABILITIES = [
  // Content reading
  "read_posts",
  "read_comments",

  // Profile
  "edit_profile",

  // Post authoring
  "create_posts",
  "edit_own_posts",
  "delete_own_posts",
  "publish_posts",

  // File management
  "upload_files",

  // Post editing (others)
  "edit_posts",
  "edit_others_posts",
  "delete_posts",
  "delete_others_posts",

  // Taxonomy
  "manage_categories",
  "manage_tags",

  // Moderation
  "moderate_comments",

  // Administration
  "manage_users",
  "create_users",
  "edit_users",
  "delete_users",
  "manage_settings",
  "manage_pages",
  "edit_theme",
  "install_plugins",
] as const;

export type Capability = (typeof ALL_CAPABILITIES)[number];

// ─── Capability Categories (for grouped display) ────────────────────────────

export interface CapabilityCategory {
  label: string;
  icon: string; // lucide-react icon name
  color: string; // tailwind color stem (e.g. "blue")
  capabilities: Capability[];
}

export const CAPABILITY_CATEGORIES: CapabilityCategory[] = [
  {
    label: "Posts & Pages",
    icon: "FileText",
    color: "blue",
    capabilities: [
      "read_posts",
      "create_posts",
      "edit_own_posts",
      "delete_own_posts",
      "publish_posts",
      "edit_posts",
      "edit_others_posts",
      "delete_posts",
      "delete_others_posts",
      "manage_pages",
    ],
  },
  {
    label: "Comments",
    icon: "MessageSquare",
    color: "amber",
    capabilities: ["read_comments", "moderate_comments"],
  },
  {
    label: "Tags & Categories",
    icon: "Tag",
    color: "green",
    capabilities: ["manage_categories", "manage_tags"],
  },
  {
    label: "Media & Files",
    icon: "Image",
    color: "purple",
    capabilities: ["upload_files"],
  },
  {
    label: "Users",
    icon: "Users",
    color: "rose",
    capabilities: [
      "manage_users",
      "create_users",
      "edit_users",
      "delete_users",
    ],
  },
  {
    label: "Settings & Theme",
    icon: "Settings",
    color: "indigo",
    capabilities: ["manage_settings", "edit_theme", "install_plugins"],
  },
  {
    label: "Profile",
    icon: "User",
    color: "gray",
    capabilities: ["edit_profile"],
  },
];

// ─── Role Display Metadata ──────────────────────────────────────────────────

export interface RoleMeta {
  label: string;
  description: string;
  color: string; // tailwind color stem
  icon: string; // lucide-react icon name
  level: number; // hierarchy rank (0 = lowest)
}

export const ROLE_META: Record<UserRole, RoleMeta> = {
  SUBSCRIBER: {
    label: "Subscriber",
    description: "Can read content and manage their profile",
    color: "gray",
    icon: "User",
    level: 0,
  },
  CONTRIBUTOR: {
    label: "Contributor",
    description: "Can write draft posts but cannot publish",
    color: "yellow",
    icon: "Pencil",
    level: 1,
  },
  AUTHOR: {
    label: "Author",
    description: "Can write and publish their own posts",
    color: "green",
    icon: "BookOpen",
    level: 2,
  },
  EDITOR: {
    label: "Editor",
    description: "Can edit all posts, manage tags and moderate comments",
    color: "blue",
    icon: "Edit3",
    level: 3,
  },
  ADMINISTRATOR: {
    label: "Administrator",
    description: "Full site management except system settings",
    color: "purple",
    icon: "Shield",
    level: 4,
  },
  SUPER_ADMIN: {
    label: "Super Admin",
    description: "Unrestricted access to everything",
    color: "red",
    icon: "Crown",
    level: 5,
  },
};

// ─── Role → Capability Map ─────────────────────────────────────────────────

const SUBSCRIBER_CAPS = [
  "read_posts",
  "read_comments",
  "edit_profile",
] as const satisfies readonly Capability[];

const CONTRIBUTOR_CAPS = [
  ...SUBSCRIBER_CAPS,
  "create_posts",
  "edit_own_posts",
  "delete_own_posts",
] as const satisfies readonly Capability[];

const AUTHOR_CAPS = [
  ...CONTRIBUTOR_CAPS,
  "publish_posts",
  "upload_files",
] as const satisfies readonly Capability[];

const EDITOR_CAPS = [
  ...AUTHOR_CAPS,
  "edit_posts",
  "edit_others_posts",
  "delete_posts",
  "delete_others_posts",
  "manage_categories",
  "manage_tags",
  "moderate_comments",
] as const satisfies readonly Capability[];

const ADMINISTRATOR_CAPS = [
  ...EDITOR_CAPS,
  "manage_users",
  "create_users",
  "edit_users",
  "delete_users",
  "manage_settings",
  "manage_pages",
  "edit_theme",
  "install_plugins",
] as const satisfies readonly Capability[];

/**
 * Map from role name to its capability list.
 * SUPER_ADMIN is handled separately — it implicitly has every capability.
 */
export const ROLE_CAPABILITIES: Record<
  Exclude<UserRole, "SUPER_ADMIN">,
  readonly Capability[]
> = {
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
  if (userRole === "SUPER_ADMIN") return true;

  const caps = ROLE_CAPABILITIES[userRole as Exclude<UserRole, "SUPER_ADMIN">];
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
  if (userRole === "SUPER_ADMIN") {
    return [...ALL_CAPABILITIES];
  }

  const roleCaps =
    ROLE_CAPABILITIES[userRole as Exclude<UserRole, "SUPER_ADMIN">] ?? [];
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
export const ADMIN_ROLES: readonly UserRole[] = [
  "ADMINISTRATOR",
  "SUPER_ADMIN",
] as const;

/** Roles that can moderate content (comments, tags, posts). */
export const MODERATOR_ROLES: readonly UserRole[] = [
  "EDITOR",
  "ADMINISTRATOR",
  "SUPER_ADMIN",
] as const;

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
  const adminPath = paths?.admin ?? "/admin/dashboard";
  const userPath = paths?.user ?? "/dashboard";
  return isAdminRole(role) ? adminPath : userPath;
}
