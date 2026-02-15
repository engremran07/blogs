/**
 * ============================================================================
 * SUB-MODULE: site-settings/menu-builder/constants.ts
 * PURPOSE:    Defaults, option lists, and icon mappings for the Menu Builder.
 * ============================================================================
 */

import type {
  MenuSlot,
  MenuItemType,
  MenuItemAppearance,
  MenuItemTemplate,
  MenuItemBadgeVariant,
  MenuStructure,
} from '../types';

// ─── Default Empty Structure ────────────────────────────────────────────────

export const DEFAULT_MENU_STRUCTURE: MenuStructure = {
  version: 1,
  menus: [
    {
      id: 'main-menu',
      name: 'Main Menu',
      slots: ['header'],
      items: [],
      enabled: true,
    },
  ],
  maxHistory: 20,
};

// ─── Option Lists (for admin UI selects) ────────────────────────────────────

export const MENU_SLOT_OPTIONS: Array<{ value: MenuSlot; label: string; description: string }> = [
  { value: 'header', label: 'Header', description: 'Main site navigation bar' },
  { value: 'footer', label: 'Footer', description: 'Bottom-of-page navigation' },
  { value: 'topbar', label: 'Top Bar', description: 'Slim bar above the header' },
  { value: 'sidebar', label: 'Sidebar', description: 'Side navigation panel' },
  { value: 'mobile-drawer', label: 'Mobile Drawer', description: 'Slide-out mobile menu' },
];

export const ITEM_TYPE_OPTIONS: Array<{ value: MenuItemType; label: string; icon: string }> = [
  { value: 'custom', label: 'Custom Link', icon: 'link' },
  { value: 'page', label: 'Page', icon: 'page' },
  { value: 'post', label: 'Post', icon: 'blog' },
  { value: 'category', label: 'Category', icon: 'category' },
  { value: 'tag', label: 'Tag', icon: 'tag' },
  { value: 'route', label: 'System Route', icon: 'settings' },
  { value: 'separator', label: 'Visual Separator', icon: 'divider' },
  { value: 'heading', label: 'Section Heading', icon: 'heading' },
];

export const ITEM_APPEARANCE_OPTIONS: Array<{ value: MenuItemAppearance; label: string }> = [
  { value: 'link', label: 'Text Link' },
  { value: 'primary', label: 'Primary Button' },
  { value: 'outline', label: 'Outline Button' },
  { value: 'ghost', label: 'Ghost Button' },
  { value: 'danger', label: 'Danger Button' },
  { value: 'accent', label: 'Accent Button' },
];

export const ITEM_TEMPLATE_OPTIONS: Array<{ value: MenuItemTemplate; label: string; description: string }> = [
  { value: 'link', label: 'Standard Link', description: 'Simple text link' },
  { value: 'cta', label: 'Call To Action', description: 'Prominent action button' },
  { value: 'card', label: 'Card', description: 'Card with optional image and description' },
  { value: 'featured', label: 'Featured', description: 'Highlighted with emphasis styling' },
  { value: 'icon-only', label: 'Icon Only', description: 'Icon without text label' },
  { value: 'image-card', label: 'Image Card', description: 'Full-image card layout' },
];

export const BADGE_VARIANT_OPTIONS: Array<{ value: MenuItemBadgeVariant; label: string; color: string }> = [
  { value: 'primary', label: 'Primary', color: '#3b82f6' },
  { value: 'success', label: 'Success', color: '#22c55e' },
  { value: 'warning', label: 'Warning', color: '#f59e0b' },
  { value: 'info', label: 'Info', color: '#06b6d4' },
  { value: 'danger', label: 'Danger', color: '#ef4444' },
  { value: 'neutral', label: 'Neutral', color: '#6b7280' },
];

// ─── Comprehensive Icon Map ─────────────────────────────────────────────────

/**
 * Exhaustive map of icon identifiers → display labels.
 * This is the single source of truth for icon availability across
 * the Navbar, Footer, TopBar, and admin UI.
 */
export const MENU_ICON_OPTIONS: Array<{ value: string; label: string; category: string }> = [
  // Navigation
  { value: '', label: 'None', category: 'misc' },
  { value: 'home', label: 'Home', category: 'navigation' },
  { value: 'menu', label: 'Menu', category: 'navigation' },
  { value: 'search', label: 'Search', category: 'navigation' },
  { value: 'arrow-right', label: 'Arrow Right', category: 'navigation' },
  { value: 'arrow-left', label: 'Arrow Left', category: 'navigation' },
  { value: 'external-link', label: 'External Link', category: 'navigation' },

  // Content
  { value: 'blog', label: 'Blog / News', category: 'content' },
  { value: 'page', label: 'Page', category: 'content' },
  { value: 'category', label: 'Category', category: 'content' },
  { value: 'tag', label: 'Tag', category: 'content' },
  { value: 'gallery', label: 'Gallery', category: 'content' },
  { value: 'video', label: 'Video', category: 'content' },
  { value: 'podcast', label: 'Podcast', category: 'content' },
  { value: 'calendar', label: 'Calendar', category: 'content' },
  { value: 'bookmark', label: 'Bookmark', category: 'content' },

  // Communication
  { value: 'mail', label: 'Email', category: 'communication' },
  { value: 'phone', label: 'Phone', category: 'communication' },
  { value: 'chat', label: 'Chat', category: 'communication' },
  { value: 'support', label: 'Support', category: 'communication' },
  { value: 'notification', label: 'Notification', category: 'communication' },

  // Commerce
  { value: 'shop', label: 'Shop / Store', category: 'commerce' },
  { value: 'cart', label: 'Cart', category: 'commerce' },
  { value: 'pricing', label: 'Pricing', category: 'commerce' },
  { value: 'gift', label: 'Gift', category: 'commerce' },
  { value: 'coupon', label: 'Coupon', category: 'commerce' },

  // Business
  { value: 'company', label: 'Company', category: 'business' },
  { value: 'services', label: 'Services', category: 'business' },
  { value: 'portfolio', label: 'Portfolio', category: 'business' },
  { value: 'team', label: 'Team', category: 'business' },
  { value: 'careers', label: 'Careers', category: 'business' },
  { value: 'briefcase', label: 'Briefcase', category: 'business' },

  // User
  { value: 'user', label: 'User / Profile', category: 'user' },
  { value: 'settings', label: 'Settings', category: 'user' },
  { value: 'login', label: 'Login', category: 'user' },
  { value: 'logout', label: 'Logout', category: 'user' },
  { value: 'dashboard', label: 'Dashboard', category: 'user' },

  // UI
  { value: 'star', label: 'Star / Featured', category: 'ui' },
  { value: 'heart', label: 'Heart / Favourite', category: 'ui' },
  { value: 'info', label: 'Info', category: 'ui' },
  { value: 'help', label: 'Help', category: 'ui' },
  { value: 'palette', label: 'Palette / Design', category: 'ui' },
  { value: 'layout', label: 'Layout / Grid', category: 'ui' },
  { value: 'download', label: 'Download', category: 'ui' },
  { value: 'upload', label: 'Upload', category: 'ui' },
  { value: 'link', label: 'Link', category: 'ui' },
  { value: 'globe', label: 'Globe / World', category: 'ui' },
  { value: 'map', label: 'Map / Location', category: 'ui' },
  { value: 'lock', label: 'Lock / Security', category: 'ui' },
  { value: 'shield', label: 'Shield / Trust', category: 'ui' },

  // Education
  { value: 'book', label: 'Book / Docs', category: 'education' },
  { value: 'graduation', label: 'Graduation', category: 'education' },
  { value: 'tutorial', label: 'Tutorial', category: 'education' },
  { value: 'certificate', label: 'Certificate', category: 'education' },

  // Social (for topbar / footer social section icons)
  { value: 'facebook', label: 'Facebook', category: 'social' },
  { value: 'twitter', label: 'Twitter / X', category: 'social' },
  { value: 'instagram', label: 'Instagram', category: 'social' },
  { value: 'linkedin', label: 'LinkedIn', category: 'social' },
  { value: 'youtube', label: 'YouTube', category: 'social' },
  { value: 'github', label: 'GitHub', category: 'social' },
  { value: 'tiktok', label: 'TikTok', category: 'social' },
  { value: 'telegram', label: 'Telegram', category: 'social' },
  { value: 'whatsapp', label: 'WhatsApp', category: 'social' },
  { value: 'pinterest', label: 'Pinterest', category: 'social' },
  { value: 'discord', label: 'Discord', category: 'social' },
  { value: 'reddit', label: 'Reddit', category: 'social' },
  { value: 'rss', label: 'RSS Feed', category: 'social' },
];

// ─── Role Options ───────────────────────────────────────────────────────────

export const MENU_ROLE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'SUBSCRIBER', label: 'Subscriber' },
  { value: 'CONTRIBUTOR', label: 'Contributor' },
  { value: 'AUTHOR', label: 'Author' },
  { value: 'EDITOR', label: 'Editor' },
  { value: 'MODERATOR', label: 'Moderator' },
  { value: 'ADMINISTRATOR', label: 'Administrator' },
  { value: 'SUPER_ADMIN', label: 'Super Admin' },
];

// ─── Device Options ─────────────────────────────────────────────────────────

export const MENU_DEVICE_OPTIONS: Array<{ value: 'desktop' | 'mobile' | 'tablet'; label: string }> = [
  { value: 'desktop', label: 'Desktop' },
  { value: 'tablet', label: 'Tablet' },
  { value: 'mobile', label: 'Mobile' },
];

// ─── Limits ─────────────────────────────────────────────────────────────────

/** Maximum menu items per menu. */
export const MAX_MENU_ITEMS = 200;

/** Maximum nesting depth for menu hierarchy. */
export const MAX_MENU_DEPTH = 5;

/** Maximum number of menus per site. */
export const MAX_MENUS = 20;

/** Maximum historical versions to retain. */
export const MAX_MENU_HISTORY = 50;

/** Maximum content blocks in a mega menu. */
export const MAX_CONTENT_BLOCKS = 6;

/** Maximum columns in a mega menu. */
export const MAX_MEGA_COLUMNS = 6;
