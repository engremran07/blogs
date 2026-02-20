/**
 * Shared AdminBar types, constants, and helpers.
 * Single source of truth — consumed by AdminBarProvider, settings page, etc.
 */

/* ── Post/Page status union (matches Prisma enum) ── */
export type DocumentStatus = "DRAFT" | "PUBLISHED" | "SCHEDULED" | "ARCHIVED";

/* ── Admin Bar settings shape (matches Prisma SiteSettings fields) ── */
export interface AdminBarSettings {
  adminBarEnabled: boolean;
  adminBarShowBreadcrumbs: boolean;
  adminBarShowNewButton: boolean;
  adminBarShowSeoScore: boolean;
  adminBarShowStatusToggle: boolean;
  adminBarShowWordCount: boolean;
  adminBarShowLastSaved: boolean;
  adminBarShowSaveButton: boolean;
  adminBarShowPublishButton: boolean;
  adminBarShowPreviewButton: boolean;
  adminBarShowViewSiteButton: boolean;
  adminBarShowSiteNameDropdown: boolean;
  adminBarShowUserDropdown: boolean;
  adminBarShowEnvBadge: boolean;
  adminBarBackgroundColor: string;
  adminBarAccentColor: string;
}

export const DEFAULT_ADMIN_BAR_SETTINGS: AdminBarSettings = {
  adminBarEnabled: true,
  adminBarShowBreadcrumbs: true,
  adminBarShowNewButton: true,
  adminBarShowSeoScore: true,
  adminBarShowStatusToggle: true,
  adminBarShowWordCount: true,
  adminBarShowLastSaved: true,
  adminBarShowSaveButton: true,
  adminBarShowPublishButton: true,
  adminBarShowPreviewButton: true,
  adminBarShowViewSiteButton: true,
  adminBarShowSiteNameDropdown: true,
  adminBarShowUserDropdown: true,
  adminBarShowEnvBadge: true,
  adminBarBackgroundColor: "#0d0d18",
  adminBarAccentColor: "#6c63ff",
};

/* ── SEO score thresholds ── */
export const SEO_SCORE_GOOD = 80;
export const SEO_SCORE_FAIR = 50;

/* ── Display limits ── */
export const SEO_MAX_CHECKS = 8;
export const SEO_MAX_RECOMMENDATIONS = 3;

/* ── Timing ── */
export const LAST_SAVED_INTERVAL_MS = 30_000;

/* ── Admin Bar height in px ── */
export const ADMIN_BAR_HEIGHT_PX = 44;

/* ── Default site name fallback ── */
export const DEFAULT_SITE_NAME = "MyBlog";

/* ── All user roles for exhaustive maps ── */
export const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: "from-red-500 to-red-700",
  ADMINISTRATOR: "from-red-500 to-red-700",
  EDITOR: "from-blue-500 to-blue-700",
  AUTHOR: "from-green-500 to-green-700",
  CONTRIBUTOR: "from-yellow-500 to-yellow-700",
  SUBSCRIBER: "from-gray-500 to-gray-700",
};

export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMINISTRATOR: "Administrator",
  EDITOR: "Editor",
  AUTHOR: "Author",
  CONTRIBUTOR: "Contributor",
  SUBSCRIBER: "Subscriber",
};

/* ── CSS color validation ── */
const CSS_COLOR_RE =
  /^(#[\da-f]{3,8}|rgb\(\s*\d{1,3}[\s,]+\d{1,3}[\s,]+\d{1,3}\s*\)|rgba\(\s*\d{1,3}[\s,]+\d{1,3}[\s,]+\d{1,3}[\s,]+[\d.]+\s*\)|[a-z]{3,20})$/i;

/** Returns true if the value looks like a safe CSS color. */
export function isValidCssColor(value: string): boolean {
  return CSS_COLOR_RE.test(value.trim());
}
