// blog/types.ts
// Complete type system for a feature-rich Blog module.
// Covers: Posts, Categories, Series, Revisions, Locking, Featured/Pinned,
//         Scheduling, View Counting, Statistics.
// No tags (separate module). No SEO audit (separate module). No AI.
// Framework-agnostic — zero external dependencies.

/* ========================================================================== */
/*  ENUMS                                                                     */
/* ========================================================================== */

export const POST_STATUSES = ['DRAFT', 'PUBLISHED', 'SCHEDULED', 'ARCHIVED'] as const;
export type PostStatus = (typeof POST_STATUSES)[number];

export const SERIES_STATUSES = ['ACTIVE', 'COMPLETED', 'ARCHIVED'] as const;
export type SeriesStatus = (typeof SERIES_STATUSES)[number];

export const POST_SORT_FIELDS = [
  'createdAt', 'updatedAt', 'publishedAt', 'title',
  'viewCount', 'readingTime', 'wordCount', 'pinOrder',
] as const;
export type PostSortField = (typeof POST_SORT_FIELDS)[number];

export const SORT_ORDERS = ['asc', 'desc'] as const;
export type SortOrder = (typeof SORT_ORDERS)[number];

/* ========================================================================== */
/*  CORE ENTITIES                                                             */
/* ========================================================================== */

/** Blog post — core content entity. */
export interface Post {
  id: string;
  postNumber: number;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  status: PostStatus;
  authorId: string;

  // Media / Social
  featuredImage: string | null;
  featuredImageAlt: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  twitterTitle: string | null;
  twitterDescription: string | null;
  twitterImage: string | null;
  twitterCard: string | null;

  // SEO
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string[];
  autoTags: string[];
  noIndex: boolean;
  noFollow: boolean;
  structuredData: unknown;

  // Metrics
  viewCount: number;
  readingTime: number;
  wordCount: number;

  // Featured / Pinned
  isFeatured: boolean;
  isPinned: boolean;
  pinOrder: number;

  // Series
  seriesId: string | null;
  seriesOrder: number;

  // Access control
  password: string | null;
  allowComments: boolean;

  // Locking (concurrent edit prevention)
  isLocked: boolean;
  lockedBy: string | null;
  lockedAt: Date | null;

  // Versioning
  revision: number;
  canonicalUrl: string | null;

  // Guest posting
  isGuestPost: boolean;
  guestAuthorName: string | null;
  guestAuthorEmail: string | null;
  guestAuthorBio: string | null;
  guestAuthorAvatar: string | null;
  guestAuthorUrl: string | null;

  // Localization
  language: string | null;
  region: string | null;

  // Timestamps
  publishedAt: Date | null;
  scheduledFor: Date | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

/** Category — hierarchical content grouping. */
export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  image: string | null;
  featured: boolean;
  sortOrder: number;
  parentId: string | null;
  postCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/** Series — ordered multi-part post collections. */
export interface Series {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  coverImage: string | null;
  status: SeriesStatus;
  sortOrder: number;
  postCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/** Structured blockquote / pull-quote embedded in a post. */
export interface PostQuote {
  id: string;
  postId: string;
  text: string;
  attribution: string | null;
  source: string | null;
  sourceUrl: string | null;
  sortOrder: number;
  isPullQuote: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** Post revision — immutable content snapshot for version history. */
export interface PostRevision {
  id: string;
  postId: string;
  title: string;
  content: string;
  excerpt: string | null;
  revisionNumber: number;
  changeNote: string | null;
  createdBy: string;
  createdAt: Date;
}

/* ========================================================================== */
/*  RELATION SHAPES (populated)                                               */
/* ========================================================================== */

export interface PostWithRelations extends Post {
  author?: { id: string; username: string; displayName?: string | null; email?: string | null };
  categories?: Category[];
  series?: Series | null;
  quotes?: PostQuote[];
}

export interface CategoryWithChildren extends Category {
  parent?: Category | null;
  children?: Category[];
}

export interface SeriesWithPosts extends Series {
  posts?: Post[];
}

/* ========================================================================== */
/*  INPUT TYPES — Posts                                                       */
/* ========================================================================== */

export interface CreatePostInput {
  title: string;
  content: string;
  excerpt?: string | null;
  status?: PostStatus;
  authorId: string;

  // Media / Social
  featuredImage?: string | null;
  featuredImageAlt?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  ogImage?: string | null;
  twitterTitle?: string | null;
  twitterDescription?: string | null;
  twitterImage?: string | null;

  // Scheduling
  scheduledFor?: Date | null;

  // Taxonomy
  categoryIds?: string[];

  // Series
  seriesId?: string | null;
  seriesOrder?: number;

  // Access control
  password?: string | null;
  allowComments?: boolean;

  // Guest posting
  isGuestPost?: boolean;
  guestAuthorName?: string | null;
  guestAuthorEmail?: string | null;
  guestAuthorBio?: string | null;
  guestAuthorAvatar?: string | null;
  guestAuthorUrl?: string | null;

  // Quotes
  quotes?: CreateQuoteInput[];

  // Meta
  canonicalUrl?: string | null;
  language?: string | null;
  region?: string | null;
}

export interface UpdatePostInput {
  title?: string;
  content?: string;
  excerpt?: string | null;
  status?: PostStatus;

  featuredImage?: string | null;
  featuredImageAlt?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  ogImage?: string | null;
  twitterTitle?: string | null;
  twitterDescription?: string | null;
  twitterImage?: string | null;

  scheduledFor?: Date | null;
  publishedAt?: Date | null;

  categoryIds?: string[];

  seriesId?: string | null;
  seriesOrder?: number;

  password?: string | null;
  allowComments?: boolean;

  canonicalUrl?: string | null;
  language?: string | null;
  region?: string | null;

  // Guest posting
  isGuestPost?: boolean;
  guestAuthorName?: string | null;
  guestAuthorEmail?: string | null;
  guestAuthorBio?: string | null;
  guestAuthorAvatar?: string | null;
  guestAuthorUrl?: string | null;

  // Quotes
  quotes?: CreateQuoteInput[];

  /** Note attached to this revision (for version history). */
  changeNote?: string | null;
}

/* ========================================================================== */
/*  INPUT TYPES — Quotes                                                      */
/* ========================================================================== */

export interface CreateQuoteInput {
  text: string;
  attribution?: string | null;
  source?: string | null;
  sourceUrl?: string | null;
  sortOrder?: number;
  isPullQuote?: boolean;
}

export interface UpdateQuoteInput {
  text?: string;
  attribution?: string | null;
  source?: string | null;
  sourceUrl?: string | null;
  sortOrder?: number;
  isPullQuote?: boolean;
}

/* ========================================================================== */
/*  INPUT TYPES — Categories                                                  */
/* ========================================================================== */

export interface CreateCategoryInput {
  name: string;
  description?: string | null;
  color?: string | null;
  icon?: string | null;
  image?: string | null;
  featured?: boolean;
  sortOrder?: number;
  parentId?: string | null;
}

export interface UpdateCategoryInput {
  name?: string;
  description?: string | null;
  color?: string | null;
  icon?: string | null;
  image?: string | null;
  featured?: boolean;
  sortOrder?: number;
  parentId?: string | null;
}

/* ========================================================================== */
/*  INPUT TYPES — Series                                                      */
/* ========================================================================== */

export interface CreateSeriesInput {
  title: string;
  description?: string | null;
  coverImage?: string | null;
  status?: SeriesStatus;
  sortOrder?: number;
}

export interface UpdateSeriesInput {
  title?: string;
  description?: string | null;
  coverImage?: string | null;
  status?: SeriesStatus;
  sortOrder?: number;
}

/* ========================================================================== */
/*  LISTING / FILTER TYPES                                                    */
/* ========================================================================== */

export interface PostListOptions {
  page?: number;
  limit?: number;
  status?: PostStatus;
  authorId?: string;
  categoryId?: string;
  tagId?: string;
  seriesId?: string;
  search?: string;
  sortBy?: PostSortField;
  sortOrder?: SortOrder;
  isFeatured?: boolean;
  isPinned?: boolean;
  isGuestPost?: boolean;
  language?: string;
  region?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/* ========================================================================== */
/*  RELATED POSTS                                                             */
/* ========================================================================== */

export interface RelatedPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  featuredImage: string | null;
  publishedAt: Date | null;
  readingTime: number;
  relevanceScore: number;
}

/* ========================================================================== */
/*  SCHEDULED PUBLISHING                                                      */
/* ========================================================================== */

export interface ScheduledPost {
  id: string;
  title: string;
  slug: string;
  scheduledFor: Date;
  status: PostStatus;
  authorId: string;
}

export interface ScheduleProcessResult {
  processed: number;
  published: string[];
  errors: Array<{ postId: string; error: string }>;
}

/* ========================================================================== */
/*  POST LOCKING                                                              */
/* ========================================================================== */

export interface PostLockInfo {
  postId: string;
  isLocked: boolean;
  lockedBy: string | null;
  lockedAt: Date | null;
}

/* ========================================================================== */
/*  POST STATISTICS                                                           */
/* ========================================================================== */

export interface PostStats {
  total: number;
  draft: number;
  published: number;
  scheduled: number;
  archived: number;
  totalViews: number;
  averageReadingTime: number;
  averageWordCount: number;
}

/* ========================================================================== */
/*  VIEW TRACKING                                                             */
/* ========================================================================== */

export interface ViewIncrementResult {
  postId: string;
  viewCount: number;
}

/* ========================================================================== */
/*  ADJACENT POSTS (prev/next navigation)                                     */
/* ========================================================================== */

export interface AdjacentPosts {
  previous: { id: string; title: string; slug: string; featuredImage: string | null } | null;
  next: { id: string; title: string; slug: string; featuredImage: string | null } | null;
}

/* ========================================================================== */
/*  CATEGORY BREADCRUMB                                                       */
/* ========================================================================== */

export interface CategoryBreadcrumb {
  id: string;
  name: string;
  slug: string;
}

/* ========================================================================== */
/*  SEARCH SUGGESTIONS                                                        */
/* ========================================================================== */

export interface SearchSuggestion {
  id: string;
  title: string;
  slug: string;
  type: 'post' | 'category' | 'series';
}

/* ========================================================================== */
/*  TABLE OF CONTENTS                                                         */
/* ========================================================================== */

export interface TocEntry {
  id: string;
  text: string;
  level: number;
  children: TocEntry[];
}

/* ========================================================================== */
/*  RSS FEED                                                                  */
/* ========================================================================== */

export interface RssFeedItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  guid: string;
  author: string;
  categories: string[];
}

export interface RssFeed {
  title: string;
  link: string;
  description: string;
  language: string;
  lastBuildDate: string;
  items: RssFeedItem[];
}

/* ========================================================================== */
/*  SITEMAP                                                                   */
/* ========================================================================== */

export interface SitemapEntry {
  loc: string;
  lastmod: string;
  changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority: number;
}

/* ========================================================================== */
/*  REVISION DIFF                                                             */
/* ========================================================================== */

export interface RevisionDiff {
  fromRevision: number;
  toRevision: number;
  titleChanged: boolean;
  contentChanged: boolean;
  excerptChanged: boolean;
  changes: DiffChange[];
}

export interface DiffChange {
  field: 'title' | 'content' | 'excerpt';
  before: string;
  after: string;
}

/* ========================================================================== */
/*  BLOG CONFIGURATION                                                        */
/* ========================================================================== */

export interface BlogConfig {
  /** Posts per page default. */
  postsPerPage?: number;
  /** Maximum categories per post. */
  maxCategoriesPerPost?: number;
  /** Minimum word count for posts. */
  minWordCount?: number;
  /** Average reading speed (words per minute). */
  readingSpeedWpm?: number;
  /** Base URL for blog posts (used in slug generation). */
  blogBaseUrl?: string;
  /** Default excerpt length in characters. */
  excerptLength?: number;
  /** Lock timeout in minutes — auto-unlock after this period. */
  lockTimeoutMinutes?: number;
  /** Maximum revisions to keep per post (0 = unlimited). */
  maxRevisionsPerPost?: number;
  /** Maximum related posts to return. */
  maxRelatedPosts?: number;
  /** RSS feed title. */
  blogFeedTitle?: string;
  /** RSS feed description. */
  blogFeedDescription?: string;
  /** RSS feed language code (e.g. 'en'). */
  blogFeedLanguage?: string;
}

/* ========================================================================== */
/*  DEPENDENCY INJECTION INTERFACES                                           */
/* ========================================================================== */

/**
 * Typed subset of Prisma client needed by the Blog module.
 * Implement this interface to bridge your actual Prisma client.
 */
export interface BlogPrismaClient {
  post: {
    create(args: { data: Record<string, unknown> }): Promise<Post>;
    findUnique(args: { where: Record<string, unknown>; include?: Record<string, unknown> }): Promise<PostWithRelations | null>;
    findFirst(args: Record<string, unknown>): Promise<Post | null>;
    findMany(args: Record<string, unknown>): Promise<Post[]>;
    update(args: { where: Record<string, unknown>; data: Record<string, unknown>; include?: Record<string, unknown> }): Promise<Post>;
    updateMany(args: { where: Record<string, unknown>; data: Record<string, unknown> }): Promise<{ count: number }>;
    delete(args: { where: Record<string, unknown> }): Promise<Post>;
    deleteMany(args: { where: Record<string, unknown> }): Promise<{ count: number }>;
    count(args?: Record<string, unknown>): Promise<number>;
  };
  category: {
    create(args: { data: Record<string, unknown> }): Promise<Category>;
    findUnique(args: { where: Record<string, unknown>; include?: Record<string, unknown> }): Promise<Category | null>;
    findFirst(args: Record<string, unknown>): Promise<Category | null>;
    findMany(args: Record<string, unknown>): Promise<Category[]>;
    update(args: { where: Record<string, unknown>; data: Record<string, unknown> }): Promise<Category>;
    delete(args: { where: Record<string, unknown> }): Promise<Category>;
    count(args?: Record<string, unknown>): Promise<number>;
  };
  series: {
    create(args: { data: Record<string, unknown> }): Promise<Series>;
    findUnique(args: { where: Record<string, unknown>; include?: Record<string, unknown> }): Promise<Series | null>;
    findFirst(args: Record<string, unknown>): Promise<Series | null>;
    findMany(args: Record<string, unknown>): Promise<Series[]>;
    update(args: { where: Record<string, unknown>; data: Record<string, unknown> }): Promise<Series>;
    delete(args: { where: Record<string, unknown> }): Promise<Series>;
    count(args?: Record<string, unknown>): Promise<number>;
  };
  postRevision: {
    create(args: { data: Record<string, unknown> }): Promise<PostRevision>;
    findMany(args: Record<string, unknown>): Promise<PostRevision[]>;
    findUnique(args: { where: Record<string, unknown> }): Promise<PostRevision | null>;
    delete(args: { where: Record<string, unknown> }): Promise<PostRevision>;
    deleteMany(args: { where: Record<string, unknown> }): Promise<{ count: number }>;
    count(args?: Record<string, unknown>): Promise<number>;
  };
  postQuote: {
    create(args: { data: Record<string, unknown> }): Promise<PostQuote>;
    findMany(args: Record<string, unknown>): Promise<PostQuote[]>;
    findUnique(args: { where: Record<string, unknown> }): Promise<PostQuote | null>;
    update(args: { where: Record<string, unknown>; data: Record<string, unknown> }): Promise<PostQuote>;
    delete(args: { where: Record<string, unknown> }): Promise<PostQuote>;
    deleteMany(args: { where: Record<string, unknown> }): Promise<{ count: number }>;
    count(args?: Record<string, unknown>): Promise<number>;
  };
}

/** Cache provider for blog module. */
export interface BlogCacheProvider {
  get<T = unknown>(key: string): Promise<T | null>;
  set(key: string, value: unknown, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  flush(pattern: string): Promise<void>;
}

/** Logger interface for structured logging. */
export interface BlogLogger {
  log(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

/** Revalidation callback — trigger ISR/CDN cache invalidation after mutations. */
export type RevalidationCallback = (paths: string[]) => Promise<void>;

/* ========================================================================== */
/*  ERROR CLASS                                                               */
/* ========================================================================== */

export class BlogError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = 'BlogError';
  }
}
