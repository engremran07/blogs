// pages/types.ts
// Complete type system for the Pages module.
// Covers: Pages, System Pages, Revisions, Locking, Hierarchy, SEO,
//         Templates, Visibility, Scheduling, Admin Settings.
// Once plugged in this module is the single source of truth for all page management.
// Framework-agnostic — zero external dependencies.

/* ========================================================================== */
/*  ENUMS                                                                     */
/* ========================================================================== */

export const PAGE_STATUSES = ['DRAFT', 'PUBLISHED', 'SCHEDULED', 'ARCHIVED'] as const;
export type PageStatus = (typeof PAGE_STATUSES)[number];

export const PAGE_TEMPLATES = [
  'DEFAULT', 'FULL_WIDTH', 'SIDEBAR_LEFT', 'SIDEBAR_RIGHT',
  'LANDING', 'BLANK', 'CUSTOM',
] as const;
export type PageTemplate = (typeof PAGE_TEMPLATES)[number];

export const PAGE_VISIBILITIES = [
  'PUBLIC', 'PRIVATE', 'PASSWORD_PROTECTED', 'LOGGED_IN_ONLY',
] as const;
export type PageVisibility = (typeof PAGE_VISIBILITIES)[number];

export const PAGE_SORT_FIELDS = [
  'createdAt', 'updatedAt', 'publishedAt', 'title', 'sortOrder', 'slug',
] as const;
export type PageSortField = (typeof PAGE_SORT_FIELDS)[number];

export const SORT_ORDERS = ['asc', 'desc'] as const;
export type SortOrder = (typeof SORT_ORDERS)[number];

/**
 * System page keys — hardcoded routes that cannot be deleted.
 * Once the pages module is plugged in, system pages are auto-registered
 * in the database and become editable from the admin panel (content, SEO,
 * template, visibility), but their slug and systemKey are immutable.
 */
export const SYSTEM_PAGE_KEYS = [
  'HOME', 'ABOUT', 'CONTACT', 'PRIVACY_POLICY', 'TERMS_OF_SERVICE',
  'COOKIE_POLICY', 'DISCLAIMER', 'FAQ', 'SITEMAP',
  'NOT_FOUND', 'MAINTENANCE', 'COMING_SOON',
  'SEARCH_RESULTS', 'BLOG_INDEX', 'ARCHIVE', 'CATEGORIES', 'TAGS',
  'LOGIN', 'REGISTER', 'FORGOT_PASSWORD', 'RESET_PASSWORD',
  'DASHBOARD', 'PROFILE', 'SETTINGS',
] as const;
export type SystemPageKey = (typeof SYSTEM_PAGE_KEYS)[number];

/* ========================================================================== */
/*  CORE ENTITIES                                                             */
/* ========================================================================== */

/** Page — core content entity. Single source of truth for all pages. */
export interface Page {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  status: PageStatus;
  template: PageTemplate;
  visibility: PageVisibility;

  // System page (non-deleteable, slug-immutable)
  isSystem: boolean;
  systemKey: SystemPageKey | null;

  // Home page designation — any page can be set as home from admin panel
  isHomePage: boolean;

  // SEO
  metaTitle: string | null;
  metaDescription: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  canonicalUrl: string | null;
  noIndex: boolean;
  noFollow: boolean;
  structuredData: Record<string, unknown> | null;

  // Hierarchy
  parentId: string | null;
  sortOrder: number;
  path: string; // Full URL path, e.g. "/legal/privacy-policy"
  level: number; // Depth in the tree (0 = root)

  // Content metrics
  wordCount: number;
  readingTime: number;

  // Media
  featuredImage: string | null;
  featuredImageAlt: string | null;

  // Visibility guards
  password: string | null;

  // Custom code injection
  customCss: string | null;
  customJs: string | null;
  customHead: string | null;

  // Locking (concurrent edit prevention)
  isLocked: boolean;
  lockedBy: string | null;
  lockedAt: Date | null;

  // Versioning
  revision: number;

  // Author
  authorId: string;

  // Timestamps
  publishedAt: Date | null;
  scheduledFor: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

/** Page revision — immutable content snapshot for version history. */
export interface PageRevision {
  id: string;
  pageId: string;
  title: string;
  content: string;
  excerpt: string | null;
  template: PageTemplate;
  revisionNumber: number;
  changeNote: string | null;
  createdBy: string;
  createdAt: Date;
}

/* ========================================================================== */
/*  RELATION SHAPES (populated)                                               */
/* ========================================================================== */

export interface PageWithRelations extends Page {
  author?: { id: string; username: string; displayName?: string | null; email?: string | null };
  parent?: Page | null;
  children?: Page[];
  revisions?: PageRevision[];
}

export interface PageWithChildren extends Page {
  children: Page[];
}

export interface PageTreeNode extends Page {
  children: PageTreeNode[];
}

/* ========================================================================== */
/*  INPUT TYPES — Pages                                                       */
/* ========================================================================== */

export interface CreatePageInput {
  title: string;
  content: string;
  excerpt?: string | null;
  status?: PageStatus;
  template?: PageTemplate;
  visibility?: PageVisibility;
  authorId: string;

  // SEO
  metaTitle?: string | null;
  metaDescription?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  ogImage?: string | null;
  canonicalUrl?: string | null;
  noIndex?: boolean;
  noFollow?: boolean;
  structuredData?: Record<string, unknown> | null;

  // Hierarchy
  parentId?: string | null;
  sortOrder?: number;

  // Media
  featuredImage?: string | null;
  featuredImageAlt?: string | null;

  // Guards
  password?: string | null;

  // Code injection
  customCss?: string | null;
  customJs?: string | null;
  customHead?: string | null;

  // Scheduling
  scheduledFor?: Date | null;
}

export interface UpdatePageInput {
  title?: string;
  content?: string;
  excerpt?: string | null;
  status?: PageStatus;
  template?: PageTemplate;
  visibility?: PageVisibility;

  // SEO
  metaTitle?: string | null;
  metaDescription?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  ogImage?: string | null;
  canonicalUrl?: string | null;
  noIndex?: boolean;
  noFollow?: boolean;
  structuredData?: Record<string, unknown> | null;

  // Hierarchy
  parentId?: string | null;
  sortOrder?: number;

  // Media
  featuredImage?: string | null;
  featuredImageAlt?: string | null;

  // Guards
  password?: string | null;

  // Code injection
  customCss?: string | null;
  customJs?: string | null;
  customHead?: string | null;

  // Scheduling
  scheduledFor?: Date | null;

  // Revision note
  changeNote?: string | null;
}

/* ========================================================================== */
/*  INPUT TYPES — Queries                                                     */
/* ========================================================================== */

export interface PageListOptions {
  search?: string;
  status?: PageStatus;
  template?: PageTemplate;
  visibility?: PageVisibility;
  parentId?: string | null;
  isSystem?: boolean;
  systemKey?: SystemPageKey;
  authorId?: string;
  sortBy?: PageSortField;
  sortOrder?: SortOrder;
  page?: number;
  limit?: number;
  includeDeleted?: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/* ========================================================================== */
/*  RESULT TYPES                                                              */
/* ========================================================================== */

export interface PageLockInfo {
  pageId: string;
  isLocked: boolean;
  lockedBy: string | null;
  lockedAt: Date | null;
}

export interface ScheduledPage {
  id: string;
  title: string;
  slug: string;
  scheduledFor: Date;
}

export interface ScheduleProcessResult {
  processed: number;
  published: string[];
  errors: Array<{ id: string; error: string }>;
}

export interface PageStats {
  total: number;
  draft: number;
  published: number;
  scheduled: number;
  archived: number;
  system: number;
  custom: number;
  deleted: number;
}

export interface SystemPageRegistration {
  key: SystemPageKey;
  slug: string;
  title: string;
  template: PageTemplate;
  isRegistered: boolean;
}

/* ========================================================================== */
/*  MODULE CONFIG                                                             */
/* ========================================================================== */

/**
 * Pages module configuration.
 * All fields are optional — omitted values fall back to PAGES_DEFAULTS.
 */
export interface PagesConfig {
  /** Maximum pages per listing page. */
  pagesPerPage?: number;
  /** Minimum word count for pages. */
  minWordCount?: number;
  /** Average reading speed (words per minute). */
  readingSpeedWpm?: number;
  /** Base URL for pages (used in path generation). */
  pagesBaseUrl?: string;
  /** Default excerpt length in characters. */
  excerptLength?: number;
  /** Lock timeout in minutes — auto-unlock after this period. */
  lockTimeoutMinutes?: number;
  /** Maximum revisions to keep per page (0 = unlimited). */
  maxRevisionsPerPage?: number;
  /** Maximum nesting depth for page hierarchy. */
  maxDepth?: number;
  /** Allow custom code injection (CSS/JS/Head). Default: false (admin override). */
  allowCodeInjection?: boolean;
  /** Enable page versioning / revision history. */
  enableRevisions?: boolean;
  /** Enable page locking (concurrent edit prevention). */
  enableLocking?: boolean;
  /** Enable scheduled publishing. */
  enableScheduling?: boolean;
  /** Enable page hierarchy (parent/child). */
  enableHierarchy?: boolean;
  /** Enable password-protected pages. */
  enablePasswordProtection?: boolean;
  /** Auto-register system pages on bootstrap. */
  autoRegisterSystemPages?: boolean;
  /** Default template for new pages. */
  defaultTemplate?: PageTemplate;
  /** Default visibility for new pages. */
  defaultVisibility?: PageVisibility;
  /** Default status for new pages. */
  defaultStatus?: PageStatus;
}

/* ========================================================================== */
/*  ADMIN SETTINGS — DB-backed singleton                                      */
/* ========================================================================== */

export interface PagesSystemSettings {
  id: string;

  // Config
  pagesPerPage: number;
  minWordCount: number;
  readingSpeedWpm: number;
  pagesBaseUrl: string;
  excerptLength: number;
  lockTimeoutMinutes: number;
  maxRevisionsPerPage: number;
  maxDepth: number;

  // Feature toggles
  allowCodeInjection: boolean;
  enableRevisions: boolean;
  enableLocking: boolean;
  enableScheduling: boolean;
  enableHierarchy: boolean;
  enablePasswordProtection: boolean;
  autoRegisterSystemPages: boolean;

  // Defaults
  defaultTemplate: string;
  defaultVisibility: string;
  defaultStatus: string;

  // Audit
  updatedBy: string | null;
  updatedAt: Date;
}

export interface PagesConfigConsumer {
  updateConfig(cfg: Required<PagesConfig>): void;
}

/* ========================================================================== */
/*  API RESPONSE ENVELOPE                                                     */
/* ========================================================================== */

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
  timestamp: string;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string | string[];
    statusCode: number;
  };
  timestamp: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

/* ========================================================================== */
/*  DEPENDENCY INJECTION INTERFACES                                           */
/* ========================================================================== */

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface PagesPrismaDelegate {
  create(args: any): Promise<any>;
  findUnique(args: any): Promise<any>;
  findFirst(args: any): Promise<any>;
  findMany(args: any): Promise<any[]>;
  update(args: any): Promise<any>;
  updateMany(args: any): Promise<{ count: number }>;
  delete(args: any): Promise<any>;
  deleteMany(args: any): Promise<{ count: number }>;
  count(args?: any): Promise<number>;
}

export interface PagesPrismaClient {
  page: PagesPrismaDelegate;
  pageRevision: PagesPrismaDelegate;
  pageSettings: {
    findFirst(args?: any): Promise<any>;
    create(args: { data: Record<string, unknown> }): Promise<any>;
    update(args: { where: { id: string }; data: Record<string, unknown> }): Promise<any>;
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Cache provider for the pages module. */
export interface PagesCacheProvider {
  get<T = unknown>(key: string): Promise<T | null>;
  set(key: string, value: unknown, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  flush(pattern: string): Promise<void>;
}

/** Logger interface for structured logging. */
export interface PagesLogger {
  log(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

/** Revalidation callback — trigger ISR/CDN cache invalidation after mutations. */
export type PagesRevalidationCallback = (paths: string[]) => Promise<void>;

/* ========================================================================== */
/*  ERROR CLASS                                                               */
/* ========================================================================== */

export class PageError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = 'PageError';
  }
}
