// pages/constants.ts
// Shared constants, defaults, system page registry, and helper functions.
// Framework-agnostic — zero external dependencies.

import type { SystemPageKey, PageTemplate } from '../types';

/* ========================================================================== */
/*  CACHE                                                                     */
/* ========================================================================== */

export const CACHE_PREFIX = 'pages';

export const CACHE_KEYS = {
  pageBySlug: (slug: string) => `${CACHE_PREFIX}:page:slug:${slug}`,
  pageById: (id: string) => `${CACHE_PREFIX}:page:id:${id}`,
  pageBySystemKey: (key: string) => `${CACHE_PREFIX}:page:system:${key}`,
  pageList: (hash: string) => `${CACHE_PREFIX}:pages:${hash}`,
  pageTree: () => `${CACHE_PREFIX}:tree`,
  systemPages: () => `${CACHE_PREFIX}:system:all`,
  pageStats: () => `${CACHE_PREFIX}:stats`,
  children: (parentId: string) => `${CACHE_PREFIX}:children:${parentId}`,
  breadcrumbs: (pageId: string) => `${CACHE_PREFIX}:breadcrumbs:${pageId}`,
  homePage: () => `${CACHE_PREFIX}:home`,
} as const;

export const CACHE_TTL = {
  pageDetail: 300,         // 5 min
  pageList: 120,           // 2 min
  pageTree: 600,           // 10 min
  systemPages: 600,        // 10 min
  stats: 300,              // 5 min
  children: 300,           // 5 min
  breadcrumbs: 600,        // 10 min
} as const;

/* ========================================================================== */
/*  LIMITS                                                                    */
/* ========================================================================== */

export const PAGE_LIMITS = {
  TITLE_MIN_LENGTH: 2,
  TITLE_MAX_LENGTH: 200,
  SLUG_MAX_LENGTH: 250,
  EXCERPT_MAX_LENGTH: 500,
  META_TITLE_MAX: 100,
  META_DESCRIPTION_MAX: 200,
  MAX_PAGES_PER_PAGE: 100,
  MAX_BULK_SIZE: 100,
  SLUG_COUNTER_MAX: 50,
  CHANGE_NOTE_MAX: 500,
  PASSWORD_MAX: 128,
  CANONICAL_URL_MAX: 2048,
  SEARCH_MAX_LENGTH: 200,
  MAX_DEPTH: 6,
  CUSTOM_CSS_MAX: 50_000,
  CUSTOM_JS_MAX: 50_000,
  CUSTOM_HEAD_MAX: 10_000,
  PATH_MAX_LENGTH: 1024,
} as const;

/* ========================================================================== */
/*  DEFAULTS                                                                  */
/* ========================================================================== */

export const PAGES_DEFAULTS: Required<{
  pagesPerPage: number;
  minWordCount: number;
  readingSpeedWpm: number;
  pagesBaseUrl: string;
  excerptLength: number;
  lockTimeoutMinutes: number;
  maxRevisionsPerPage: number;
  maxDepth: number;
  allowCodeInjection: boolean;
  enableRevisions: boolean;
  enableLocking: boolean;
  enableScheduling: boolean;
  enableHierarchy: boolean;
  enablePasswordProtection: boolean;
  autoRegisterSystemPages: boolean;
  defaultTemplate: string;
  defaultVisibility: string;
  defaultStatus: string;
}> = {
  pagesPerPage: 20,
  minWordCount: 0,
  readingSpeedWpm: 200,
  pagesBaseUrl: '',
  excerptLength: 200,
  lockTimeoutMinutes: 30,
  maxRevisionsPerPage: 50,
  maxDepth: 6,
  allowCodeInjection: false,
  enableRevisions: true,
  enableLocking: true,
  enableScheduling: true,
  enableHierarchy: true,
  enablePasswordProtection: true,
  autoRegisterSystemPages: true,
  defaultTemplate: 'DEFAULT',
  defaultVisibility: 'PUBLIC',
  defaultStatus: 'DRAFT',
};

/* ========================================================================== */
/*  SYSTEM PAGES REGISTRY                                                     */
/* ========================================================================== */

/**
 * Registry of all system pages.
 * These are auto-created in the database on bootstrap.
 * They cannot be deleted, and their slug/systemKey are immutable.
 * Content, SEO, template, visibility are fully editable from admin panel.
 */
export interface SystemPageDefinition {
  key: SystemPageKey;
  slug: string;
  title: string;
  template: PageTemplate;
  description: string;
}

export const SYSTEM_PAGES_REGISTRY: readonly SystemPageDefinition[] = [
  // Public-facing content pages
  { key: 'HOME',              slug: '',                   title: 'Home',               template: 'FULL_WIDTH', description: 'Site homepage / landing page' },
  { key: 'ABOUT',             slug: 'about',              title: 'About',              template: 'DEFAULT',    description: 'About us / company info' },
  { key: 'CONTACT',           slug: 'contact',            title: 'Contact',            template: 'DEFAULT',    description: 'Contact form / info' },
  { key: 'FAQ',               slug: 'faq',                title: 'FAQ',                template: 'DEFAULT',    description: 'Frequently asked questions' },

  // Legal pages
  { key: 'PRIVACY_POLICY',    slug: 'privacy-policy',     title: 'Privacy Policy',     template: 'DEFAULT',    description: 'Privacy policy / GDPR' },
  { key: 'TERMS_OF_SERVICE',  slug: 'terms-of-service',   title: 'Terms of Service',   template: 'DEFAULT',    description: 'Terms and conditions' },
  { key: 'COOKIE_POLICY',     slug: 'cookie-policy',      title: 'Cookie Policy',      template: 'DEFAULT',    description: 'Cookie usage policy' },
  { key: 'DISCLAIMER',        slug: 'disclaimer',         title: 'Disclaimer',         template: 'DEFAULT',    description: 'Legal disclaimer' },

  // Utility system pages
  { key: 'SITEMAP',           slug: 'sitemap',            title: 'Sitemap',            template: 'FULL_WIDTH', description: 'HTML sitemap navigation' },
  { key: 'NOT_FOUND',         slug: '404',                title: 'Page Not Found',     template: 'BLANK',      description: '404 error page' },
  { key: 'MAINTENANCE',       slug: 'maintenance',        title: 'Under Maintenance',  template: 'BLANK',      description: 'Maintenance mode page' },
  { key: 'COMING_SOON',       slug: 'coming-soon',        title: 'Coming Soon',        template: 'LANDING',    description: 'Pre-launch holding page' },

  // Blog / content index pages
  { key: 'SEARCH_RESULTS',    slug: 'search',             title: 'Search Results',     template: 'DEFAULT',    description: 'Search results listing' },
  { key: 'BLOG_INDEX',        slug: 'blog',               title: 'Blog',               template: 'DEFAULT',    description: 'Blog post listing' },
  { key: 'ARCHIVE',           slug: 'archive',            title: 'Archive',            template: 'DEFAULT',    description: 'Content archive' },
  { key: 'CATEGORIES',        slug: 'categories',         title: 'Categories',         template: 'DEFAULT',    description: 'Category listing page' },
  { key: 'TAGS',              slug: 'tags',               title: 'Tags',               template: 'DEFAULT',    description: 'Tag listing page' },

  // Auth pages
  { key: 'LOGIN',             slug: 'login',              title: 'Login',              template: 'BLANK',      description: 'User login page' },
  { key: 'REGISTER',          slug: 'register',           title: 'Register',           template: 'BLANK',      description: 'User registration page' },
  { key: 'FORGOT_PASSWORD',   slug: 'forgot-password',    title: 'Forgot Password',    template: 'BLANK',      description: 'Password recovery page' },
  { key: 'RESET_PASSWORD',    slug: 'reset-password',     title: 'Reset Password',     template: 'BLANK',      description: 'Password reset form page' },

  // Authenticated user pages
  { key: 'DASHBOARD',         slug: 'dashboard',          title: 'Dashboard',          template: 'SIDEBAR_LEFT', description: 'User dashboard' },
  { key: 'PROFILE',           slug: 'profile',            title: 'Profile',            template: 'DEFAULT',    description: 'User profile page' },
  { key: 'SETTINGS',          slug: 'settings',           title: 'Settings',           template: 'DEFAULT',    description: 'User settings page' },
] as const;

/** Set of all reserved slugs (system pages). */
export const RESERVED_SLUGS = new Set<string>(
  SYSTEM_PAGES_REGISTRY.map(sp => sp.slug),
);

/* ========================================================================== */
/*  HELPERS                                                                   */
/* ========================================================================== */

/** Generate a URL-friendly slug from text. */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .trim();
}

/** Calculate reading time in minutes. */
export function calculateReadingTime(wordCount: number, wpm = 200): number {
  return Math.max(1, Math.ceil(wordCount / wpm));
}

/** Count words in text (strips HTML tags). */
export function countWords(text: string): number {
  const clean = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!clean) return 0;
  return clean.split(' ').filter(w => w.length > 0).length;
}

/** Extract plain text from HTML. */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Truncate text to a maximum length, appending '…' if truncated. */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  const cut = text.slice(0, maxLength - 1);
  const lastSpace = cut.lastIndexOf(' ');
  const breakAt = lastSpace > maxLength * 0.6 ? lastSpace : maxLength - 1;
  return `${text.slice(0, breakAt).trimEnd()}…`;
}

/** Generate an excerpt from HTML content. */
export function generateExcerpt(content: string, maxLength = 200): string {
  const plain = stripHtml(content);
  if (!plain) return '';
  return truncate(plain, maxLength);
}

/** Check if a date is in the past. */
export function isPast(date: Date): boolean {
  return date.getTime() <= Date.now();
}

/** Normalize an array of IDs — deduplicate and filter empty. */
export function normalizeIds(ids: unknown): string[] {
  if (!Array.isArray(ids)) return [];
  return [...new Set(
    ids.filter((id): id is string => typeof id === 'string' && id.trim().length > 0),
  )];
}

/** Build the full URL path for a page given its slug and parent path. */
export function buildPagePath(slug: string, parentPath?: string | null, baseUrl?: string): string {
  const base = baseUrl ?? '';
  if (!slug) return base || '/';
  const parent = parentPath && parentPath !== '/' ? parentPath : '';
  return `${parent}/${slug}`;
}

/** Create a stable hash from listing options for cache keys. */
export function hashListOptions(opts: Record<string, unknown>): string {
  const sorted = Object.keys(opts)
    .sort()
    .filter(k => opts[k] !== undefined && opts[k] !== null)
    .map(k => `${k}=${String(opts[k])}`)
    .join('&');
  let hash = 5381;
  for (let i = 0; i < sorted.length; i++) {
    hash = ((hash << 5) + hash + sorted.charCodeAt(i)) & 0x7fffffff;
  }
  return hash.toString(36);
}
