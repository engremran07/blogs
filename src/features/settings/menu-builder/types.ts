/**
 * ============================================================================
 * SUB-MODULE: site-settings/menu-builder/types.ts
 * PURPOSE:    Pure TypeScript types for the Menu Builder system.
 *             Manages navigation menus for Header, Footer, and Top Bar.
 *
 *             Supports:
 *               - Hierarchical menu items with unlimited nesting
 *               - Mega menu layouts with columns & content blocks
 *               - Visibility rules (auth, roles, locale, device, time window)
 *               - Badges, icons, analytics tags, CTA templates
 *               - Auto-expanding categories/posts from content registry
 *               - Menu presets for quick scaffolding
 *               - Version history with rollback
 *
 *             No framework imports — works in Next.js, NestJS, or standalone.
 * ============================================================================
 */

// ─── Enums / Union Types ────────────────────────────────────────────────────

/** Physical location where a menu is rendered. */
export const MENU_SLOTS = ['header', 'footer', 'topbar', 'sidebar', 'mobile-drawer'] as const;
export type MenuSlot = (typeof MENU_SLOTS)[number];

/** The source / content type of a menu item. */
export const MENU_ITEM_TYPES = ['page', 'post', 'category', 'tag', 'route', 'custom', 'separator', 'heading'] as const;
export type MenuItemType = (typeof MENU_ITEM_TYPES)[number];

/** Visual appearance style of a menu item. */
export const MENU_ITEM_APPEARANCES = ['link', 'primary', 'outline', 'ghost', 'danger', 'accent'] as const;
export type MenuItemAppearance = (typeof MENU_ITEM_APPEARANCES)[number];

/** Content template for a menu item. */
export const MENU_ITEM_TEMPLATES = ['link', 'cta', 'card', 'featured', 'icon-only', 'image-card'] as const;
export type MenuItemTemplate = (typeof MENU_ITEM_TEMPLATES)[number];

/** Badge colour variants. */
export const MENU_ITEM_BADGE_VARIANTS = ['primary', 'success', 'warning', 'info', 'danger', 'neutral'] as const;
export type MenuItemBadgeVariant = (typeof MENU_ITEM_BADGE_VARIANTS)[number];

/** Target behaviour for menu links. */
export const MENU_LINK_TARGETS = ['_self', '_blank'] as const;
export type MenuLinkTarget = (typeof MENU_LINK_TARGETS)[number];

// ─── Menu Item Sub-types ────────────────────────────────────────────────────

/** Badge shown alongside a menu item label. */
export interface MenuItemBadge {
  text: string;
  variant?: MenuItemBadgeVariant;
}

/** Auto-expand children from content registry. */
export interface MenuItemAutoChildren {
  categories?: boolean;
  posts?: boolean;
  maxItems?: number;
}

/** A promotional / content block inside a mega menu. */
export interface MenuItemLayoutBlock {
  title?: string;
  description?: string;
  image?: string;
  ctaLabel?: string;
  ctaUrl?: string;
}

/** Layout configuration for mega menus. */
export interface MenuItemLayout {
  type?: 'standard' | 'mega';
  columns?: number;
  contentBlocks?: MenuItemLayoutBlock[];
  /** Show column dividers (on-request — default: false). */
  showDividers?: boolean;
  /** Whether the mega menu spans the full viewport width. */
  fullWidth?: boolean;
}

/** Visibility / access rules for a menu item. */
export interface MenuVisibility {
  roles?: string[];
  locales?: string[];
  requireAuth?: boolean;
  guestOnly?: boolean;
  devices?: Array<'desktop' | 'mobile' | 'tablet'>;
  timeWindow?: {
    start?: string;
    end?: string;
    timezone?: string;
  };
  /** Hide from specific page paths (regex patterns). */
  excludePaths?: string[];
  /** Only show on specific page paths (regex patterns). */
  includePaths?: string[];
}

/** Custom CSS overrides for a menu item. */
export interface MenuItemCustomStyle {
  className?: string;
  color?: string;
  backgroundColor?: string;
  fontWeight?: string;
  fontSize?: string;
  borderRadius?: string;
}

// ─── Core Menu Item ─────────────────────────────────────────────────────────

/** A single menu item (node in the menu tree). */
export interface MenuItem {
  /** Unique identifier. */
  id: string;
  /** Content type of this item. */
  type: MenuItemType;
  /** Display text for the item. */
  label: string;
  /** Target URL or route. */
  url: string;
  /** Sort order within its parent. */
  order: number;

  // ── Optional Fields ───────────────────────────────────────────────────
  /** Reference to a content-registry entity (page, post, etc.). */
  refId?: string;
  /** Parent item ID — builds tree hierarchy. */
  parentId?: string;
  /** Resolved nested children (populated by `buildMenuTree`). */
  children?: MenuItem[];

  // ── Appearance ────────────────────────────────────────────────────────
  /** Visual appearance style. */
  appearance?: MenuItemAppearance;
  /** Content template. */
  template?: MenuItemTemplate;
  /** Icon identifier (maps to an icon set). */
  icon?: string;
  /** Badge label & colour. */
  badge?: MenuItemBadge;
  /** Custom CSS overrides. */
  customStyle?: MenuItemCustomStyle;

  // ── Behaviour ─────────────────────────────────────────────────────────
  /** Link target (_self, _blank). */
  target?: MenuLinkTarget;
  /** Rel attribute (nofollow, noreferrer, etc.). */
  rel?: string;
  /** ARIA label override. */
  ariaLabel?: string;
  /** Analytics event tag. */
  analyticsTag?: string;
  /** Tooltip text on hover. */
  tooltip?: string;

  // ── Content ───────────────────────────────────────────────────────────
  /** Short description for cards/mega menus. */
  description?: string;
  /** Image URL for cards/featured templates. */
  image?: string;
  /** Group label for mega menu column grouping. */
  group?: string;
  /** Explicit column assignment (1-based) for mega menus. */
  column?: number;

  // ── Mega Menu ─────────────────────────────────────────────────────────
  /** Layout configuration for this item as a dropdown container. */
  layout?: MenuItemLayout;

  // ── Auto Children ─────────────────────────────────────────────────────
  /** Automatically populate children from content registry. */
  autoChildren?: MenuItemAutoChildren;

  // ── Visibility ────────────────────────────────────────────────────────
  /** Access & visibility rules. */
  visibility?: MenuVisibility;
}

// ─── Menu ───────────────────────────────────────────────────────────────────

/** A named collection of menu items assigned to one or more slots. */
export interface Menu {
  /** Unique identifier. */
  id: string;
  /** Display name (e.g., "Main Menu", "Footer Links"). */
  name: string;
  /** Which page zones this menu is rendered in. */
  slots: MenuSlot[];
  /** Flat list of items (tree built at runtime). */
  items: MenuItem[];
  /** Optional description for admin reference. */
  description?: string;
  /** Whether this menu is active (CORE — default: true). */
  enabled?: boolean;
  /** CSS class applied to the menu container. */
  containerClass?: string;
}

// ─── Versioning ─────────────────────────────────────────────────────────────

/** A snapshot of the entire menu structure for rollback. */
export interface MenuVersion {
  id: string;
  version: number;
  createdAt: string;
  createdBy?: string;
  note?: string;
  menus: Menu[];
}

/** Top-level menu structure stored in site settings. */
export interface MenuStructure {
  version?: number;
  updatedAt?: string;
  updatedBy?: string;
  menus: Menu[];
  history?: MenuVersion[];
  /** Maximum number of historical versions to keep (default: 20). */
  maxHistory?: number;
}

// ─── Content Registry Integration ───────────────────────────────────────────

/** An item from the content registry that can be linked in menus. */
export interface MenuRegistryItem {
  id: string;
  type: 'page' | 'post' | 'category' | 'tag' | 'route';
  label?: string;
  url?: string;
  slug?: string | null;
  parentId?: string | null;
  categoryIds?: string[];
  status?: string;
  locale?: string;
}

// ─── Visibility Context ─────────────────────────────────────────────────────

/** Runtime context used to evaluate visibility rules. */
export interface MenuVisibilityContext {
  role?: string | null;
  locale?: string | null;
  isAuthenticated: boolean;
  device?: 'mobile' | 'desktop' | 'tablet';
  now?: Date;
  pathname?: string;
}

// ─── Menu Preset ────────────────────────────────────────────────────────────

/** A factory-defined menu configuration that can be loaded as a starting point. */
export interface MenuPreset {
  id: string;
  name: string;
  description: string;
  category: MenuPresetCategory;
  menus: Menu[];
  /** Preview image URL (for admin UI). */
  thumbnail?: string;
  /** Tags for search/filter in admin. */
  tags?: string[];
}

export const MENU_PRESET_CATEGORIES = [
  'business', 'portfolio', 'ecommerce', 'blog', 'saas',
  'corporate', 'community', 'education', 'media', 'minimal',
] as const;
export type MenuPresetCategory = (typeof MENU_PRESET_CATEGORIES)[number];

// ─── Admin State Types ──────────────────────────────────────────────────────

/** Registry item parsed for admin consumption. */
export interface AdminRegistryItem {
  id: string;
  type: MenuItemType;
  label?: string;
  url?: string;
  slug?: string;
  status?: string;
  locale?: string;
  source?: string;
  roles?: string[];
  requireAuth?: boolean;
  guestOnly?: boolean;
  selectable?: boolean;
}

/** Menu history entry for admin version panel. */
export interface MenuHistoryEntry {
  id: string;
  version: number;
  createdAt: string;
  createdBy?: string;
  note?: string;
}

// ─── Prisma Interface ───────────────────────────────────────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface MenuBuilderPrismaClient {
  siteSettings: {
    findFirst(args?: any): Promise<any>;
    update(args: any): Promise<any>;
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ── API Response ────────────────────────────────────────────────────────────
interface ApiSuccess<T> { success: true; data: T; message?: string; timestamp?: string }
interface ApiError { success: false; error: string | { code: string; message: string; statusCode: number }; code?: string; timestamp?: string }
export type ApiResponse<T> = ApiSuccess<T> | ApiError;
