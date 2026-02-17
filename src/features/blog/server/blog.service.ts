// blog/blog.service.ts
// Enriched, full-featured Blog service — single airtight implementation.
// Covers: Post CRUD, categories, series, revisions, featured/pinned,
//         locking, scheduled publishing, view counting, related posts,
//         statistics, bulk operations, search.
// No tags (separate module). No SEO (separate module). No AI.
// Framework-agnostic with constructor dependency injection.

import type {
  BlogPrismaClient, BlogCacheProvider, BlogLogger, RevalidationCallback, BlogConfig,
  Post, PostWithRelations, PostStatus,
  Category, CategoryWithChildren,
  Series, SeriesWithPosts, SeriesStatus,
  PostRevision, PostQuote,
  CreatePostInput, UpdatePostInput,
  CreateCategoryInput, UpdateCategoryInput,
  CreateSeriesInput, UpdateSeriesInput,
  CreateQuoteInput, UpdateQuoteInput,
  PostListOptions, PaginatedResult,
  ViewIncrementResult,
  RelatedPost, ScheduledPost, ScheduleProcessResult,
  PostLockInfo, PostStats,
  AdjacentPosts, CategoryBreadcrumb, SearchSuggestion,
  TocEntry, RssFeedItem, RssFeed, SitemapEntry,
  RevisionDiff, DiffChange,
} from '../types';
import { BlogError } from '../types';
import {
  CACHE_KEYS, CACHE_TTL, BLOG_DEFAULTS, BLOG_LIMITS,
  generateSlug, countWords, calculateReadingTime, normalizeIds,
  generateExcerpt, isPast, hashListOptions,
  extractHeadings, buildTocTree, toRfc822, toW3CDate,
} from './constants';
import { sanitizeContent, sanitizeText, sanitizeCategoryName, escapeHtml } from './sanitization.util';

/* ========================================================================== */
/*  DEPENDENCY INTERFACE                                                      */
/* ========================================================================== */

export interface BlogServiceDeps {
  prisma: BlogPrismaClient;
  cache: BlogCacheProvider;
  logger: BlogLogger;
  revalidate?: RevalidationCallback;
  getConfig?: () => Promise<BlogConfig> | BlogConfig;
}

/* ========================================================================== */
/*  SERVICE                                                                   */
/* ========================================================================== */

export class BlogService {
  private readonly prisma: BlogPrismaClient;
  private readonly cache: BlogCacheProvider;
  private readonly logger: BlogLogger;
  private readonly revalidate?: RevalidationCallback;
  private readonly _getConfig?: () => Promise<BlogConfig> | BlogConfig;

  constructor(deps: BlogServiceDeps) {
    this.prisma = deps.prisma;
    this.cache = deps.cache;
    this.logger = deps.logger;
    this.revalidate = deps.revalidate;
    this._getConfig = deps.getConfig;
  }

  /** Resolve config with BLOG_DEFAULTS as fallback for every field. */
  private async getConfig(): Promise<Required<BlogConfig>> {
    const custom = this._getConfig ? await this._getConfig() : {};
    return { ...BLOG_DEFAULTS, ...custom } as Required<BlogConfig>;
  }

  /* ──────────────────────────────────────────────────────────────────────── */
  /*  POST CRUD                                                              */
  /* ──────────────────────────────────────────────────────────────────────── */

  /** Create a new blog post with auto-computed fields. */
  async createPost(input: CreatePostInput): Promise<PostWithRelations> {
    const title = sanitizeText(input.title);
    const content = sanitizeContent(input.content);
    const wordCount = countWords(content);
    const config = await this.getConfig();
    const readingTime = calculateReadingTime(wordCount, config.readingSpeedWpm);
    const slug = await this.generateUniqueSlug(title);
    const excerpt = input.excerpt ? sanitizeText(input.excerpt) : generateExcerpt(content, config.excerptLength);

    const categoryIds = normalizeIds(input.categoryIds);
    if (categoryIds.length > config.maxCategoriesPerPost) {
      throw new BlogError(`Maximum ${config.maxCategoriesPerPost} categories per post`, 'CATEGORY_LIMIT', 400);
    }

    // Enforce minimum word count
    if (config.minWordCount > 0 && wordCount < config.minWordCount) {
      throw new BlogError(`Post must be at least ${config.minWordCount} words (currently ${wordCount})`, 'WORD_COUNT', 400);
    }

    // Validate guest posting fields
    if (input.isGuestPost && !input.guestAuthorName) {
      throw new BlogError('Guest author name is required for guest posts', 'VALIDATION', 400);
    }

    const now = new Date();
    const isPublishing = input.status === 'PUBLISHED';
    const isScheduling = input.status === 'SCHEDULED';

    if (isScheduling && !input.scheduledFor) {
      throw new BlogError('scheduledFor is required when status is SCHEDULED', 'VALIDATION', 400);
    }

    const post = await this.prisma.post.create({
      data: {
        title,
        content,
        slug,
        excerpt,
        status: input.status ?? 'DRAFT',
        authorId: input.authorId,
        wordCount,
        readingTime,

        // Media / Social
        featuredImage: input.featuredImage ?? null,
        featuredImageAlt: input.featuredImageAlt ?? null,
        ogTitle: input.ogTitle ?? null,
        ogDescription: input.ogDescription ?? null,
        ogImage: input.ogImage ?? null,
        twitterTitle: input.twitterTitle ?? null,
        twitterDescription: input.twitterDescription ?? null,
        twitterImage: input.twitterImage ?? null,

        // Scheduling
        scheduledFor: input.scheduledFor ?? null,
        publishedAt: isPublishing ? now : null,

        // Series
        seriesId: input.seriesId ?? null,
        seriesOrder: input.seriesOrder ?? 0,

        // Access
        password: input.password ?? null,
        allowComments: input.allowComments ?? BLOG_DEFAULTS.allowComments,

        // Guest posting
        isGuestPost: input.isGuestPost ?? false,
        guestAuthorName: input.isGuestPost ? sanitizeText(input.guestAuthorName!) : null,
        guestAuthorEmail: input.guestAuthorEmail ?? null,
        guestAuthorBio: input.guestAuthorBio ?? null,
        guestAuthorAvatar: input.guestAuthorAvatar ?? null,
        guestAuthorUrl: input.guestAuthorUrl ?? null,

        // Meta
        canonicalUrl: input.canonicalUrl ?? null,
        language: input.language ?? null,
        region: input.region ?? null,

        // Defaults
        revision: 1,
        isFeatured: false,
        isPinned: false,
        pinOrder: 0,
        viewCount: 0,
        isLocked: false,

        // Relations
        ...(categoryIds.length > 0
          ? { categories: { connect: categoryIds.map(id => ({ id })) } }
          : {}),
      },
    }) as PostWithRelations;

    // Create initial revision
    await this.createRevisionSnapshot(post.id, title, content, excerpt, 1, input.authorId, 'Initial version');

    // Update series post count if applicable
    if (input.seriesId) {
      await this.recalculateSeriesPostCount(input.seriesId);
    }

    // Recalculate category post counts
    if (categoryIds.length > 0) {
      for (const catId of categoryIds) {
        await this.recalculateCategoryPostCount(catId);
      }
    }

    // Create inline quotes
    if (input.quotes && input.quotes.length > 0) {
      for (const q of input.quotes) {
        await this.prisma.postQuote.create({
          data: {
            postId: post.id,
            text: sanitizeText(q.text),
            attribution: q.attribution ?? null,
            source: q.source ?? null,
            sourceUrl: q.sourceUrl ?? null,
            sortOrder: q.sortOrder ?? 0,
            isPullQuote: q.isPullQuote ?? false,
          },
        });
      }
    }

    await this.invalidatePostCaches();
    this.logger.log(`Post created: "${title}" [${slug}]`);
    return post;
  }

  /** Find a post by ID (cached). */
  async findById(id: string): Promise<PostWithRelations | null> {
    const cached = await this.cache.get<PostWithRelations>(CACHE_KEYS.postById(id));
    if (cached) return cached;

    const post = await this.prisma.post.findUnique({
      where: { id },
      include: {
        categories: true,
        series: true,
        author: { select: { id: true, username: true, displayName: true, email: true } },
      },
    });

    if (post && !post.deletedAt) {
      await this.cache.set(CACHE_KEYS.postById(id), post, CACHE_TTL.postDetail);
    }
    return post;
  }

  /** Find a post by slug (cached). Returns null for soft-deleted posts. */
  async findBySlug(slug: string): Promise<PostWithRelations | null> {
    const cached = await this.cache.get<PostWithRelations>(CACHE_KEYS.postBySlug(slug));
    if (cached) return cached;

    const post = await this.prisma.post.findFirst({
      where: { slug, deletedAt: null },
      include: {
        categories: true,
        series: true,
        author: { select: { id: true, username: true, displayName: true, email: true } },
      },
    }) as PostWithRelations | null;

    if (post) {
      await this.cache.set(CACHE_KEYS.postBySlug(slug), post, CACHE_TTL.postDetail);
    }
    return post;
  }

  /** Paginated listing with filtering, search, and sorting. */
  async findAll(options: PostListOptions = {}): Promise<PaginatedResult<PostWithRelations>> {
    const page = Math.max(1, options.page ?? 1);
    const limit = Math.min(BLOG_LIMITS.MAX_POSTS_PER_PAGE, Math.max(1, options.limit ?? BLOG_DEFAULTS.postsPerPage));
    const skip = (page - 1) * limit;

    // Cache check
    const cacheKey = CACHE_KEYS.postList(hashListOptions({ ...options, page, limit }));
    const cached = await this.cache.get<PaginatedResult<PostWithRelations>>(cacheKey);
    if (cached) return cached;

    const where: Record<string, unknown> = { deletedAt: null };
    if (options.status) where.status = options.status;
    if (options.authorId) where.authorId = options.authorId;
    if (options.language) where.language = options.language;
    if (options.region) where.region = options.region;
    if (options.seriesId) where.seriesId = options.seriesId;
    if (options.isFeatured !== undefined) where.isFeatured = options.isFeatured;
    if (options.isPinned !== undefined) where.isPinned = options.isPinned;
    if ((options as Record<string, unknown>).isGuestPost !== undefined) {
      where.isGuestPost = (options as Record<string, unknown>).isGuestPost;
    }
    if (options.categoryId) {
      where.categories = { some: { id: options.categoryId } };
    }
    if (options.tagId) {
      where.tags = { some: { id: options.tagId } };
    }
    if (options.search) {
      const s = options.search.trim();
      where.OR = [
        { title: { contains: s, mode: 'insensitive' } },
        { content: { contains: s, mode: 'insensitive' } },
        { excerpt: { contains: s, mode: 'insensitive' } },
      ];
    }

    const orderBy: Record<string, string> = {};
    orderBy[options.sortBy ?? 'createdAt'] = options.sortOrder ?? 'desc';

    const [data, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          categories: true,
          series: true,
          author: { select: { id: true, username: true, displayName: true, email: true } },
        },
      }) as Promise<PostWithRelations[]>,
      this.prisma.post.count({ where }),
    ]);

    const result: PaginatedResult<PostWithRelations> = {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };

    await this.cache.set(cacheKey, result, CACHE_TTL.postList);
    return result;
  }

  /** Update a post. Creates a revision snapshot automatically. */
  async updatePost(id: string, input: UpdatePostInput): Promise<PostWithRelations> {
    const existing = await this.prisma.post.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      throw new BlogError('Post not found', 'NOT_FOUND', 404);
    }

    // Check lock
    if (existing.isLocked && existing.lockedBy) {
      throw new BlogError(
        `Post is locked for editing by another user`,
        'POST_LOCKED', 423,
      );
    }

    const data: Record<string, unknown> = {};
    const contentChanged = input.content !== undefined;
    const titleChanged = input.title !== undefined;

    if (titleChanged) data.title = sanitizeText(input.title!);
    if (contentChanged) {
      data.content = sanitizeContent(input.content!);
      const config = await this.getConfig();
      const wc = countWords(data.content as string);
      data.wordCount = wc;
      data.readingTime = calculateReadingTime(wc, config.readingSpeedWpm);
    }
    if (input.excerpt !== undefined) {
      data.excerpt = input.excerpt ? sanitizeText(input.excerpt) : null;
    }
    if (input.status !== undefined) {
      data.status = input.status;
      if (input.status === 'PUBLISHED' && !existing.publishedAt) {
        data.publishedAt = new Date();
      }
      if (input.status === 'ARCHIVED') {
        data.archivedAt = new Date();
      }
      if (input.status === 'SCHEDULED' && !input.scheduledFor && !existing.scheduledFor) {
        throw new BlogError('scheduledFor is required when status is SCHEDULED', 'VALIDATION', 400);
      }
    }

    // Media / Social
    if (input.featuredImage !== undefined) data.featuredImage = input.featuredImage;
    if (input.featuredImageAlt !== undefined) data.featuredImageAlt = input.featuredImageAlt;
    if (input.ogTitle !== undefined) data.ogTitle = input.ogTitle;
    if (input.ogDescription !== undefined) data.ogDescription = input.ogDescription;
    if (input.ogImage !== undefined) data.ogImage = input.ogImage;
    if (input.twitterTitle !== undefined) data.twitterTitle = input.twitterTitle;
    if (input.twitterDescription !== undefined) data.twitterDescription = input.twitterDescription;
    if (input.twitterImage !== undefined) data.twitterImage = input.twitterImage;

    // Scheduling
    if (input.scheduledFor !== undefined) data.scheduledFor = input.scheduledFor;
    if (input.publishedAt !== undefined) data.publishedAt = input.publishedAt;

    // Series
    if (input.seriesId !== undefined) data.seriesId = input.seriesId;
    if (input.seriesOrder !== undefined) data.seriesOrder = input.seriesOrder;

    // Access
    if (input.password !== undefined) data.password = input.password;
    if (input.allowComments !== undefined) data.allowComments = input.allowComments;

    // Guest posting
    if (input.isGuestPost !== undefined) data.isGuestPost = input.isGuestPost;
    if (input.guestAuthorName !== undefined) data.guestAuthorName = input.guestAuthorName ? sanitizeText(input.guestAuthorName) : null;
    if (input.guestAuthorEmail !== undefined) data.guestAuthorEmail = input.guestAuthorEmail;
    if (input.guestAuthorBio !== undefined) data.guestAuthorBio = input.guestAuthorBio;
    if (input.guestAuthorAvatar !== undefined) data.guestAuthorAvatar = input.guestAuthorAvatar;
    if (input.guestAuthorUrl !== undefined) data.guestAuthorUrl = input.guestAuthorUrl;

    // Meta
    if (input.canonicalUrl !== undefined) data.canonicalUrl = input.canonicalUrl;
    if (input.language !== undefined) data.language = input.language;
    if (input.region !== undefined) data.region = input.region;

    // Categories
    const categoryIds = input.categoryIds ? normalizeIds(input.categoryIds) : undefined;
    if (categoryIds) {
      data.categories = { set: categoryIds.map(cid => ({ id: cid })) };
    }

    // Bump revision
    const newRevision = (existing.revision ?? 0) + 1;
    data.revision = newRevision;

    const post = await this.prisma.post.update({
      where: { id },
      data,
      include: {
        categories: true,
        series: true,
        author: { select: { id: true, username: true, displayName: true, email: true } },
      },
    }) as PostWithRelations;

    // Create revision snapshot if content or title changed
    if (contentChanged || titleChanged) {
      await this.createRevisionSnapshot(
        id,
        (data.title as string) ?? existing.title,
        (data.content as string) ?? existing.content,
        (data.excerpt as string | null) ?? existing.excerpt,
        newRevision,
        existing.authorId,
        input.changeNote ?? null,
      );
    }

    // Recalculate series if changed
    if (input.seriesId !== undefined) {
      if (existing.seriesId) await this.recalculateSeriesPostCount(existing.seriesId);
      if (input.seriesId) await this.recalculateSeriesPostCount(input.seriesId);
    }

    // Recalculate category post counts when categories change
    if (categoryIds) {
      for (const catId of categoryIds) {
        await this.recalculateCategoryPostCount(catId);
      }
    }

    // Update inline quotes if provided
    if (input.quotes !== undefined) {
      await this.prisma.postQuote.deleteMany({ where: { postId: id } });
      for (const q of input.quotes) {
        await this.prisma.postQuote.create({
          data: {
            postId: id,
            text: sanitizeText(q.text),
            attribution: q.attribution ?? null,
            source: q.source ?? null,
            sourceUrl: q.sourceUrl ?? null,
            sortOrder: q.sortOrder ?? 0,
            isPullQuote: q.isPullQuote ?? false,
          },
        });
      }
    }

    // Invalidate caches
    await Promise.all([
      this.cache.del(CACHE_KEYS.postById(id)),
      this.cache.del(CACHE_KEYS.postBySlug(existing.slug)),
      this.invalidatePostCaches(),
    ]);

    // Trigger revalidation for published posts
    if (post.status === 'PUBLISHED' || existing.status === 'PUBLISHED') {
      await this.triggerRevalidation([`/blog/${post.slug}`]);
    }

    this.logger.log(`Post updated: "${post.title}" rev=${newRevision}`);
    return post;
  }

  /** Soft-delete a post (moves to ARCHIVED + sets deletedAt). */
  async deletePost(id: string): Promise<void> {
    const post = await this.prisma.post.findUnique({ where: { id } });
    if (!post) throw new BlogError('Post not found', 'NOT_FOUND', 404);

    await this.prisma.post.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'ARCHIVED' as PostStatus, archivedAt: new Date() },
    });

    await Promise.all([
      this.cache.del(CACHE_KEYS.postById(id)),
      this.cache.del(CACHE_KEYS.postBySlug(post.slug)),
      this.invalidatePostCaches(),
    ]);

    if (post.status === 'PUBLISHED') {
      await this.triggerRevalidation([`/blog/${post.slug}`]);
    }
    if (post.seriesId) {
      await this.recalculateSeriesPostCount(post.seriesId);
    }

    this.logger.log(`Post soft-deleted: "${post.title}"`);
  }

  /** Permanently delete a post and all its revisions. */
  async hardDeletePost(id: string): Promise<void> {
    const post = await this.prisma.post.findUnique({ where: { id } });
    if (!post) throw new BlogError('Post not found', 'NOT_FOUND', 404);

    await this.prisma.postRevision.deleteMany({ where: { postId: id } });
    await this.prisma.post.delete({ where: { id } });

    await Promise.all([
      this.cache.del(CACHE_KEYS.postById(id)),
      this.cache.del(CACHE_KEYS.postBySlug(post.slug)),
      this.invalidatePostCaches(),
    ]);

    if (post.seriesId) {
      await this.recalculateSeriesPostCount(post.seriesId);
    }

    this.logger.log(`Post hard-deleted: "${post.title}"`);
  }

  /** Restore a soft-deleted post back to DRAFT. */
  async restorePost(id: string): Promise<PostWithRelations> {
    const post = await this.prisma.post.findUnique({ where: { id } });
    if (!post) throw new BlogError('Post not found', 'NOT_FOUND', 404);
    if (!post.deletedAt) throw new BlogError('Post is not deleted', 'VALIDATION', 400);

    const restored = await this.prisma.post.update({
      where: { id },
      data: { deletedAt: null, status: 'DRAFT' as PostStatus, archivedAt: null },
      include: {
        categories: true,
        series: true,
        author: { select: { id: true, username: true, displayName: true, email: true } },
      },
    }) as PostWithRelations;

    await this.invalidatePostCaches();
    if (post.seriesId) await this.recalculateSeriesPostCount(post.seriesId);

    this.logger.log(`Post restored: "${post.title}"`);
    return restored;
  }

  /* ──────────────────────────────────────────────────────────────────────── */
  /*  BULK OPERATIONS                                                        */
  /* ──────────────────────────────────────────────────────────────────────── */

  async bulkUpdateStatus(postIds: string[], status: PostStatus): Promise<number> {
    this.assertBulkLimit(postIds);

    const data: Record<string, unknown> = { status };
    if (status === 'PUBLISHED') data.publishedAt = new Date();
    if (status === 'ARCHIVED') data.archivedAt = new Date();

    const result = await this.prisma.post.updateMany({
      where: { id: { in: postIds } },
      data,
    });

    await this.invalidatePostCaches();
    this.logger.log(`Bulk status → ${status}: ${result.count} posts`);
    return result.count;
  }

  async bulkDelete(postIds: string[]): Promise<number> {
    this.assertBulkLimit(postIds);
    const now = new Date();
    const result = await this.prisma.post.updateMany({
      where: { id: { in: postIds } },
      data: { deletedAt: now, status: 'ARCHIVED' as PostStatus, archivedAt: now },
    });
    await this.invalidatePostCaches();
    this.logger.log(`Bulk soft-delete: ${result.count} posts`);
    return result.count;
  }

  async bulkSchedule(postIds: string[], scheduledFor: Date): Promise<number> {
    this.assertBulkLimit(postIds);
    if (isPast(scheduledFor)) {
      throw new BlogError('Scheduled date must be in the future', 'VALIDATION', 400);
    }
    const result = await this.prisma.post.updateMany({
      where: { id: { in: postIds } },
      data: { scheduledFor, status: 'SCHEDULED' as PostStatus },
    });
    await this.invalidatePostCaches();
    this.logger.log(`Bulk schedule: ${result.count} posts → ${scheduledFor.toISOString()}`);
    return result.count;
  }

  async bulkFeature(postIds: string[], isFeatured: boolean): Promise<number> {
    this.assertBulkLimit(postIds);
    const result = await this.prisma.post.updateMany({
      where: { id: { in: postIds } },
      data: { isFeatured },
    });
    await this.cache.del(CACHE_KEYS.featuredPosts());
    await this.invalidatePostCaches();
    this.logger.log(`Bulk feature=${isFeatured}: ${result.count} posts`);
    return result.count;
  }

  async bulkSetCategories(postIds: string[], categoryIds: string[]): Promise<number> {
    this.assertBulkLimit(postIds);
    // Must update individually due to relation set
    let updated = 0;
    for (const postId of postIds) {
      try {
        await this.prisma.post.update({
          where: { id: postId },
          data: { categories: { set: categoryIds.map(id => ({ id })) } },
        });
        updated++;
      } catch {
        this.logger.warn(`Failed to set categories for post ${postId}`);
      }
    }
    await this.invalidatePostCaches();
    return updated;
  }

  /* ──────────────────────────────────────────────────────────────────────── */
  /*  STATUS SHORTCUTS                                                       */
  /* ──────────────────────────────────────────────────────────────────────── */

  /** Publish a post immediately. */
  async publish(id: string): Promise<PostWithRelations> {
    return this.updatePost(id, { status: 'PUBLISHED' });
  }

  /** Unpublish a post (revert to DRAFT). */
  async unpublish(id: string): Promise<PostWithRelations> {
    return this.updatePost(id, { status: 'DRAFT' });
  }

  /** Archive a post. */
  async archive(id: string): Promise<PostWithRelations> {
    return this.updatePost(id, { status: 'ARCHIVED' });
  }

  /** Schedule a post for future publication. */
  async schedule(id: string, scheduledFor: Date): Promise<PostWithRelations> {
    if (isPast(scheduledFor)) {
      throw new BlogError('Scheduled date must be in the future', 'VALIDATION', 400);
    }
    return this.updatePost(id, { status: 'SCHEDULED', scheduledFor });
  }

  /* ──────────────────────────────────────────────────────────────────────── */
  /*  FEATURED / PINNED                                                      */
  /* ──────────────────────────────────────────────────────────────────────── */

  /** Toggle the featured flag on a post. */
  async toggleFeatured(id: string): Promise<Post> {
    const post = await this.prisma.post.findUnique({ where: { id } });
    if (!post) throw new BlogError('Post not found', 'NOT_FOUND', 404);

    const updated = await this.prisma.post.update({
      where: { id },
      data: { isFeatured: !post.isFeatured },
    });
    await this.cache.del(CACHE_KEYS.featuredPosts());
    await this.cache.del(CACHE_KEYS.postById(id));
    return updated;
  }

  /** Toggle the pinned flag on a post. Sets pinOrder to 0 when unpinning. */
  async togglePinned(id: string, pinOrder = 0): Promise<Post> {
    const post = await this.prisma.post.findUnique({ where: { id } });
    if (!post) throw new BlogError('Post not found', 'NOT_FOUND', 404);

    const nowPinned = !post.isPinned;
    const updated = await this.prisma.post.update({
      where: { id },
      data: { isPinned: nowPinned, pinOrder: nowPinned ? pinOrder : 0 },
    });
    await this.cache.del(CACHE_KEYS.pinnedPosts());
    await this.cache.del(CACHE_KEYS.postById(id));
    return updated;
  }

  /** Get all featured posts. */
  async getFeaturedPosts(maxItems = 10): Promise<Post[]> {
    const cached = await this.cache.get<Post[]>(CACHE_KEYS.featuredPosts());
    if (cached) return cached;

    const posts = await this.prisma.post.findMany({
      where: { isFeatured: true, status: 'PUBLISHED' as PostStatus, deletedAt: null },
      orderBy: { publishedAt: 'desc' },
      take: maxItems,
    });

    await this.cache.set(CACHE_KEYS.featuredPosts(), posts, CACHE_TTL.featured);
    return posts;
  }

  /** Get all pinned posts, ordered by pinOrder ascending. */
  async getPinnedPosts(): Promise<Post[]> {
    const cached = await this.cache.get<Post[]>(CACHE_KEYS.pinnedPosts());
    if (cached) return cached;

    const posts = await this.prisma.post.findMany({
      where: { isPinned: true, status: 'PUBLISHED' as PostStatus, deletedAt: null },
      orderBy: { pinOrder: 'asc' },
    });

    await this.cache.set(CACHE_KEYS.pinnedPosts(), posts, CACHE_TTL.pinned);
    return posts;
  }

  /** Reorder pinned posts. The array index becomes the pinOrder. */
  async reorderPinned(postIds: string[]): Promise<void> {
    for (let i = 0; i < postIds.length; i++) {
      await this.prisma.post.update({
        where: { id: postIds[i] },
        data: { isPinned: true, pinOrder: i },
      });
    }
    await this.cache.del(CACHE_KEYS.pinnedPosts());
    this.logger.log(`Reordered ${postIds.length} pinned posts`);
  }

  /* ──────────────────────────────────────────────────────────────────────── */
  /*  VIEW COUNTING & POPULARITY                                             */
  /* ──────────────────────────────────────────────────────────────────────── */

  /** Atomically increment view count. */
  async incrementViewCount(postId: string): Promise<ViewIncrementResult> {
    const post = await this.prisma.post.update({
      where: { id: postId },
      data: { viewCount: { increment: 1 } as unknown as number },
    });
    // Don't invalidate full cache for a view count bump — stale-while-revalidate
    return { postId: post.id, viewCount: post.viewCount };
  }

  /** Get the most viewed published posts. */
  async getPopularPosts(limit = 10): Promise<Post[]> {
    const cacheKey = CACHE_KEYS.popularPosts(limit);
    const cached = await this.cache.get<Post[]>(cacheKey);
    if (cached) return cached;

    const posts = await this.prisma.post.findMany({
      where: { status: 'PUBLISHED' as PostStatus, deletedAt: null },
      orderBy: { viewCount: 'desc' },
      take: limit,
    });

    await this.cache.set(cacheKey, posts, CACHE_TTL.popularPosts);
    return posts;
  }

  /* ──────────────────────────────────────────────────────────────────────── */
  /*  SCHEDULED PUBLISHING                                                   */
  /* ──────────────────────────────────────────────────────────────────────── */

  /** Get all posts currently scheduled for future publication. */
  async getScheduledPosts(): Promise<ScheduledPost[]> {
    const posts = await this.prisma.post.findMany({
      where: { status: 'SCHEDULED' as PostStatus, deletedAt: null },
      orderBy: { scheduledFor: 'asc' },
    });
    return posts.map(p => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      scheduledFor: p.scheduledFor!,
      status: p.status,
      authorId: p.authorId,
    }));
  }

  /**
   * Publish all scheduled posts whose scheduledFor is in the past.
   * Call this from a cron job (e.g. every minute).
   */
  async processScheduledPosts(): Promise<ScheduleProcessResult> {
    const now = new Date();
    const due = await this.prisma.post.findMany({
      where: {
        status: 'SCHEDULED' as PostStatus,
        scheduledFor: { lte: now } as unknown as Date,
        deletedAt: null,
      },
    });

    const result: ScheduleProcessResult = { processed: 0, published: [], errors: [] };

    for (const post of due) {
      try {
        await this.prisma.post.update({
          where: { id: post.id },
          data: { status: 'PUBLISHED' as PostStatus, publishedAt: now },
        });
        result.published.push(post.id);
        result.processed++;
        await this.triggerRevalidation([`/blog/${post.slug}`]);
      } catch (err) {
        result.errors.push({
          postId: post.id,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    if (result.processed > 0) {
      await this.invalidatePostCaches();
      this.logger.log(`Scheduled publishing: ${result.processed} posts published`);
    }

    return result;
  }

  /* ──────────────────────────────────────────────────────────────────────── */
  /*  POST LOCKING (concurrent edit prevention)                              */
  /* ──────────────────────────────────────────────────────────────────────── */

  /** Lock a post for editing by a specific user. */
  async lockPost(postId: string, userId: string): Promise<PostLockInfo> {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new BlogError('Post not found', 'NOT_FOUND', 404);

    // Already locked by someone else?
    if (post.isLocked && post.lockedBy && post.lockedBy !== userId) {
      // Check if stale
      const config = await this.getConfig();
      const lockAge = post.lockedAt ? Date.now() - new Date(post.lockedAt).getTime() : Infinity;
      const timeout = config.lockTimeoutMinutes * 60 * 1000;
      if (lockAge < timeout) {
        throw new BlogError(
          `Post is locked by another user`,
          'POST_LOCKED', 423,
        );
      }
      // Stale lock — take over
    }

    const updated = await this.prisma.post.update({
      where: { id: postId },
      data: { isLocked: true, lockedBy: userId, lockedAt: new Date() },
    });

    await this.cache.del(CACHE_KEYS.postById(postId));
    return { postId, isLocked: true, lockedBy: updated.lockedBy, lockedAt: updated.lockedAt };
  }

  /** Unlock a post. Only the lock holder or forced unlock can do this. */
  async unlockPost(postId: string, userId: string, force = false): Promise<PostLockInfo> {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new BlogError('Post not found', 'NOT_FOUND', 404);

    if (!post.isLocked) {
      return { postId, isLocked: false, lockedBy: null, lockedAt: null };
    }

    if (!force && post.lockedBy !== userId) {
      throw new BlogError('Only the lock holder can unlock', 'FORBIDDEN', 403);
    }

    await this.prisma.post.update({
      where: { id: postId },
      data: { isLocked: false, lockedBy: null, lockedAt: null },
    });

    await this.cache.del(CACHE_KEYS.postById(postId));
    return { postId, isLocked: false, lockedBy: null, lockedAt: null };
  }

  /** Check lock status of a post. */
  async getLockInfo(postId: string): Promise<PostLockInfo> {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new BlogError('Post not found', 'NOT_FOUND', 404);
    return {
      postId,
      isLocked: post.isLocked,
      lockedBy: post.lockedBy,
      lockedAt: post.lockedAt,
    };
  }

  /** Release all stale locks (older than configured timeout). */
  async releaseStaleLocksAll(): Promise<number> {
    const config = await this.getConfig();
    const cutoff = new Date(Date.now() - config.lockTimeoutMinutes * 60 * 1000);
    const result = await this.prisma.post.updateMany({
      where: {
        isLocked: true,
        lockedAt: { lt: cutoff } as unknown as Date,
      },
      data: { isLocked: false, lockedBy: null, lockedAt: null },
    });
    if (result.count > 0) {
      this.logger.log(`Released ${result.count} stale locks`);
    }
    return result.count;
  }

  /* ──────────────────────────────────────────────────────────────────────── */
  /*  REVISIONS (version history)                                            */
  /* ──────────────────────────────────────────────────────────────────────── */

  /** Get all revisions for a post, most recent first. */
  async getRevisions(postId: string): Promise<PostRevision[]> {
    return this.prisma.postRevision.findMany({
      where: { postId },
      orderBy: { revisionNumber: 'desc' },
    }) as Promise<PostRevision[]>;
  }

  /** Get a specific revision by ID. */
  async getRevision(revisionId: string): Promise<PostRevision | null> {
    return this.prisma.postRevision.findUnique({ where: { id: revisionId } });
  }

  /** Restore a post to a specific revision. Creates a new revision for the current state first. */
  async restoreRevision(revisionId: string, userId: string): Promise<PostWithRelations> {
    const revision = await this.prisma.postRevision.findUnique({ where: { id: revisionId } });
    if (!revision) throw new BlogError('Revision not found', 'NOT_FOUND', 404);

    const post = await this.prisma.post.findUnique({ where: { id: revision.postId } });
    if (!post) throw new BlogError('Post not found', 'NOT_FOUND', 404);

    // Snapshot current state before overwriting
    const snapshotRev = (post.revision ?? 0) + 1;
    await this.createRevisionSnapshot(
      post.id, post.title, post.content, post.excerpt,
      snapshotRev, userId, `Snapshot before restoring revision #${revision.revisionNumber}`,
    );

    // Apply the old revision
    const restoredRev = snapshotRev + 1;
    const config = await this.getConfig();
    const wc = countWords(revision.content);
    const updated = await this.prisma.post.update({
      where: { id: post.id },
      data: {
        title: revision.title,
        content: revision.content,
        excerpt: revision.excerpt,
        wordCount: wc,
        readingTime: calculateReadingTime(wc, config.readingSpeedWpm),
        revision: restoredRev,
      },
      include: {
        categories: true,
        series: true,
        author: { select: { id: true, username: true, displayName: true, email: true } },
      },
    }) as PostWithRelations;

    await this.createRevisionSnapshot(
      post.id, revision.title, revision.content, revision.excerpt,
      restoredRev, userId, `Restored from revision #${revision.revisionNumber}`,
    );

    await this.cache.del(CACHE_KEYS.postById(post.id));
    await this.cache.del(CACHE_KEYS.postBySlug(post.slug));
    this.logger.log(`Post "${post.title}" restored to revision #${revision.revisionNumber}`);

    return updated;
  }

  /* ──────────────────────────────────────────────────────────────────────── */
  /*  CATEGORIES                                                             */
  /* ──────────────────────────────────────────────────────────────────────── */

  async createCategory(input: CreateCategoryInput): Promise<Category> {
    const name = sanitizeCategoryName(input.name);
    const slug = generateSlug(name);

    const existing = await this.prisma.category.findFirst({
      where: {
        OR: [
          { slug },
          { name: { equals: name, mode: 'insensitive' } as unknown as string },
        ],
      },
    });
    if (existing) throw new BlogError(`Category "${name}" already exists`, 'DUPLICATE', 409);

    // Validate parent exists and prevent deep nesting
    if (input.parentId) {
      await this.assertCategoryDepth(input.parentId);
    }

    const cat = await this.prisma.category.create({
      data: {
        name,
        slug,
        description: input.description ? sanitizeText(input.description) : null,
        color: input.color ?? null,
        icon: input.icon ?? null,
        image: input.image ?? null,
        featured: input.featured ?? false,
        sortOrder: input.sortOrder ?? 0,
        parentId: input.parentId ?? null,
        postCount: 0,
      },
    });

    await this.invalidateCategoryCaches();
    this.logger.log(`Category created: "${name}"`);
    return cat;
  }

  async updateCategory(id: string, input: UpdateCategoryInput): Promise<Category> {
    const existing = await this.prisma.category.findUnique({ where: { id } });
    if (!existing) throw new BlogError('Category not found', 'NOT_FOUND', 404);

    const data: Record<string, unknown> = {};
    if (input.name !== undefined) {
      data.name = sanitizeCategoryName(input.name);
      data.slug = generateSlug(data.name as string);

      // Check slug uniqueness (exclude current category)
      const slugConflict = await this.prisma.category.findFirst({
        where: {
          slug: data.slug as string,
          id: { not: id },
        },
      });
      if (slugConflict) {
        throw new BlogError(
          `A category with slug "${data.slug}" already exists`,
          'DUPLICATE',
          409,
        );
      }
    }
    if (input.description !== undefined) data.description = input.description ? sanitizeText(input.description) : null;
    if (input.color !== undefined) data.color = input.color;
    if (input.icon !== undefined) data.icon = input.icon;
    if (input.image !== undefined) data.image = input.image;
    if (input.featured !== undefined) data.featured = input.featured;
    if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder;
    if (input.parentId !== undefined) {
      if (input.parentId === id) {
        throw new BlogError('Category cannot be its own parent', 'VALIDATION', 400);
      }
      if (input.parentId) {
        await this.assertCategoryDepth(input.parentId);
        // Prevent circular reference
        if (await this.isCategoryDescendant(input.parentId, id)) {
          throw new BlogError('Circular category hierarchy detected', 'VALIDATION', 400);
        }
      }
      data.parentId = input.parentId;
    }

    const cat = await this.prisma.category.update({ where: { id }, data });

    await this.invalidateCategoryCaches();
    this.logger.log(`Category updated: "${cat.name}"`);
    return cat;
  }

  async deleteCategory(id: string): Promise<void> {
    const cat = await this.prisma.category.findUnique({ where: { id } });
    if (!cat) throw new BlogError('Category not found', 'NOT_FOUND', 404);

    // Move children to parent (or root)
    const children = await this.prisma.category.findMany({ where: { parentId: id } });
    for (const child of children) {
      await this.prisma.category.update({
        where: { id: child.id },
        data: { parentId: cat.parentId ?? null },
      });
    }

    await this.prisma.category.delete({ where: { id } });

    await this.invalidateCategoryCaches();
    this.logger.log(`Category deleted: "${cat.name}"`);
  }

  /** Get all categories (optionally featured only). */
  async getCategories(featuredOnly = false): Promise<Category[]> {
    const cacheKey = CACHE_KEYS.categories(featuredOnly);
    const cached = await this.cache.get<Category[]>(cacheKey);
    if (cached) return cached;

    const where: Record<string, unknown> = {};
    if (featuredOnly) where.featured = true;

    const cats = await this.prisma.category.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
    });

    await this.cache.set(cacheKey, cats, CACHE_TTL.categories);
    return cats;
  }

  /** Build a tree of categories with parent→children relationships. */
  async getCategoryTree(): Promise<CategoryWithChildren[]> {
    const cached = await this.cache.get<CategoryWithChildren[]>(CACHE_KEYS.categoryTree());
    if (cached) return cached;

    const all = await this.prisma.category.findMany({
      orderBy: { sortOrder: 'asc' },
    }) as CategoryWithChildren[];

    const map = new Map<string, CategoryWithChildren>();
    for (const cat of all) {
      cat.children = [];
      map.set(cat.id, cat);
    }

    const roots: CategoryWithChildren[] = [];
    for (const cat of all) {
      if (cat.parentId && map.has(cat.parentId)) {
        const parent = map.get(cat.parentId)!;
        cat.parent = { ...parent, children: undefined } as Category;
        parent.children!.push(cat);
      } else {
        roots.push(cat);
      }
    }

    await this.cache.set(CACHE_KEYS.categoryTree(), roots, CACHE_TTL.categories);
    return roots;
  }

  /** Look up a single category by ID. */
  async getCategoryById(id: string): Promise<Category | null> {
    return this.prisma.category.findUnique({ where: { id } });
  }

  /** Look up a single category by slug. */
  async getCategoryBySlug(slug: string): Promise<Category | null> {
    return this.prisma.category.findFirst({ where: { slug } });
  }

  /** Get breadcrumb path from root to a specific category. */
  async getCategoryBreadcrumb(categoryId: string): Promise<CategoryBreadcrumb[]> {
    const cacheKey = CACHE_KEYS.categoryBreadcrumb(categoryId);
    const cached = await this.cache.get<CategoryBreadcrumb[]>(cacheKey);
    if (cached) return cached;

    const trail: CategoryBreadcrumb[] = [];
    let currentId: string | null = categoryId;
    let depth = 0;

    while (currentId && depth < BLOG_LIMITS.MAX_DEPTH_CATEGORY) {
      const cat = await this.prisma.category.findUnique({ where: { id: currentId } });
      if (!cat) break;
      trail.unshift({ id: cat.id, name: cat.name, slug: cat.slug });
      currentId = cat.parentId;
      depth++;
    }

    await this.cache.set(cacheKey, trail, CACHE_TTL.breadcrumb);
    return trail;
  }

  /* ──────────────────────────────────────────────────────────────────────── */
  /*  SERIES (multi-part collections)                                        */
  /* ──────────────────────────────────────────────────────────────────────── */

  async createSeries(input: CreateSeriesInput): Promise<Series> {
    const title = sanitizeText(input.title);
    const slug = await this.generateUniqueSeriesSlug(title);

    const series = await this.prisma.series.create({
      data: {
        title,
        slug,
        description: input.description ? sanitizeText(input.description) : null,
        coverImage: input.coverImage ?? null,
        status: input.status ?? 'ACTIVE',
        sortOrder: input.sortOrder ?? 0,
        postCount: 0,
      },
    });

    await this.cache.del(CACHE_KEYS.seriesList());
    this.logger.log(`Series created: "${title}"`);
    return series;
  }

  async updateSeries(id: string, input: UpdateSeriesInput): Promise<Series> {
    const existing = await this.prisma.series.findUnique({ where: { id } });
    if (!existing) throw new BlogError('Series not found', 'NOT_FOUND', 404);

    const data: Record<string, unknown> = {};
    if (input.title !== undefined) {
      data.title = sanitizeText(input.title);
      data.slug = generateSlug(data.title as string);
    }
    if (input.description !== undefined) data.description = input.description ? sanitizeText(input.description) : null;
    if (input.coverImage !== undefined) data.coverImage = input.coverImage;
    if (input.status !== undefined) data.status = input.status;
    if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder;

    const series = await this.prisma.series.update({ where: { id }, data });

    await this.cache.del(CACHE_KEYS.series(id));
    await this.cache.del(CACHE_KEYS.seriesList());
    this.logger.log(`Series updated: "${series.title}"`);
    return series;
  }

  async deleteSeries(id: string): Promise<void> {
    const series = await this.prisma.series.findUnique({ where: { id } });
    if (!series) throw new BlogError('Series not found', 'NOT_FOUND', 404);

    // Un-assign all posts in this series
    await this.prisma.post.updateMany({
      where: { seriesId: id },
      data: { seriesId: null, seriesOrder: 0 },
    });

    await this.prisma.series.delete({ where: { id } });
    await this.cache.del(CACHE_KEYS.series(id));
    await this.cache.del(CACHE_KEYS.seriesList());
    await this.invalidatePostCaches();
    this.logger.log(`Series deleted: "${series.title}"`);
  }

  async listSeries(status?: SeriesStatus): Promise<Series[]> {
    const cached = await this.cache.get<Series[]>(CACHE_KEYS.seriesList());
    if (cached && !status) return cached;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;

    const list = await this.prisma.series.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
    });

    if (!status) {
      await this.cache.set(CACHE_KEYS.seriesList(), list, CACHE_TTL.series);
    }
    return list;
  }

  /** Get a single series by ID with its posts. */
  async getSeriesWithPosts(seriesId: string): Promise<SeriesWithPosts | null> {
    const cached = await this.cache.get<SeriesWithPosts>(CACHE_KEYS.series(seriesId));
    if (cached) return cached;

    const series = await this.prisma.series.findUnique({
      where: { id: seriesId },
      include: { posts: { orderBy: { seriesOrder: 'asc' } } },
    }) as SeriesWithPosts | null;

    if (series) {
      await this.cache.set(CACHE_KEYS.series(seriesId), series, CACHE_TTL.series);
    }
    return series;
  }

  /** Add a post to a series at a given position. */
  async addPostToSeries(postId: string, seriesId: string, order?: number): Promise<void> {
    const [post, series] = await Promise.all([
      this.prisma.post.findUnique({ where: { id: postId } }),
      this.prisma.series.findUnique({ where: { id: seriesId } }),
    ]);
    if (!post) throw new BlogError('Post not found', 'NOT_FOUND', 404);
    if (!series) throw new BlogError('Series not found', 'NOT_FOUND', 404);

    const seriesOrder = order ?? series.postCount;
    await this.prisma.post.update({
      where: { id: postId },
      data: { seriesId, seriesOrder },
    });

    await this.recalculateSeriesPostCount(seriesId);
    await this.cache.del(CACHE_KEYS.series(seriesId));
    await this.cache.del(CACHE_KEYS.postById(postId));
  }

  /** Remove a post from its series. */
  async removePostFromSeries(postId: string): Promise<void> {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new BlogError('Post not found', 'NOT_FOUND', 404);

    const oldSeriesId = post.seriesId;
    await this.prisma.post.update({
      where: { id: postId },
      data: { seriesId: null, seriesOrder: 0 },
    });

    if (oldSeriesId) {
      await this.recalculateSeriesPostCount(oldSeriesId);
      await this.cache.del(CACHE_KEYS.series(oldSeriesId));
    }
    await this.cache.del(CACHE_KEYS.postById(postId));
  }

  /** Reorder posts within a series. Array index → seriesOrder. */
  async reorderSeriesPosts(seriesId: string, postIds: string[]): Promise<void> {
    const series = await this.prisma.series.findUnique({ where: { id: seriesId } });
    if (!series) throw new BlogError('Series not found', 'NOT_FOUND', 404);

    for (let i = 0; i < postIds.length; i++) {
      await this.prisma.post.update({
        where: { id: postIds[i] },
        data: { seriesOrder: i },
      });
    }

    await this.cache.del(CACHE_KEYS.series(seriesId));
    this.logger.log(`Reordered ${postIds.length} posts in series "${series.title}"`);
  }

  /* ──────────────────────────────────────────────────────────────────────── */
  /*  RELATED POSTS (category-based similarity + recency)                    */
  /* ──────────────────────────────────────────────────────────────────────── */

  /** Find related posts based on shared categories and recency. */
  async findRelatedPosts(postId: string, maxResults?: number): Promise<RelatedPost[]> {
    const config = await this.getConfig();
    const limit = maxResults ?? config.maxRelatedPosts;

    const cacheKey = CACHE_KEYS.relatedPosts(postId);
    const cached = await this.cache.get<RelatedPost[]>(cacheKey);
    if (cached) return cached;

    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: { categories: true },
    }) as PostWithRelations | null;
    if (!post) return [];

    const categoryIds = post.categories?.map(c => c.id) ?? [];
    if (categoryIds.length === 0) return [];

    // Get published posts sharing at least one category
    const candidates = await this.prisma.post.findMany({
      where: {
        id: { not: postId } as unknown as string,
        status: 'PUBLISHED' as PostStatus,
        deletedAt: null,
        categories: { some: { id: { in: categoryIds } } },
      },
      include: { categories: true },
      take: limit * 3, // fetch extra for scoring
    }) as PostWithRelations[];

    // Score by category overlap + recency
    const now = Date.now();
    const scored: RelatedPost[] = candidates.map(c => {
      const sharedCats = c.categories?.filter(cat => categoryIds.includes(cat.id)).length ?? 0;
      const categoryScore = sharedCats / Math.max(categoryIds.length, 1);

      // Recency bonus: posts from last 30 days get up to 0.2 extra
      const ageMs = now - (c.publishedAt ? new Date(c.publishedAt).getTime() : new Date(c.createdAt).getTime());
      const ageDays = ageMs / (1000 * 60 * 60 * 24);
      const recencyBonus = Math.max(0, 0.2 * (1 - ageDays / 30));

      return {
        id: c.id,
        title: c.title,
        slug: c.slug,
        excerpt: c.excerpt,
        featuredImage: c.featuredImage,
        publishedAt: c.publishedAt,
        readingTime: c.readingTime,
        relevanceScore: Math.min(1, categoryScore + recencyBonus),
      };
    });

    scored.sort((a, b) => b.relevanceScore - a.relevanceScore);
    const result = scored.slice(0, limit);

    await this.cache.set(cacheKey, result, CACHE_TTL.relatedPosts);
    return result;
  }

  /* ──────────────────────────────────────────────────────────────────────── */
  /*  ADJACENT POSTS (prev / next navigation)                                */
  /* ──────────────────────────────────────────────────────────────────────── */

  async getAdjacentPosts(postId: string): Promise<AdjacentPosts> {
    const cacheKey = CACHE_KEYS.adjacentPosts(postId);
    const cached = await this.cache.get<AdjacentPosts>(cacheKey);
    if (cached) return cached;

    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post || !post.publishedAt) return { previous: null, next: null };

    const select = { id: true, title: true, slug: true, featuredImage: true };

    const [prevArr, nextArr] = await Promise.all([
      this.prisma.post.findMany({
        where: {
          status: 'PUBLISHED' as PostStatus,
          deletedAt: null,
          publishedAt: { lt: post.publishedAt },
        },
        orderBy: { publishedAt: 'desc' },
        take: 1,
        select,
      } as Record<string, unknown>),
      this.prisma.post.findMany({
        where: {
          status: 'PUBLISHED' as PostStatus,
          deletedAt: null,
          publishedAt: { gt: post.publishedAt },
        },
        orderBy: { publishedAt: 'asc' },
        take: 1,
        select,
      } as Record<string, unknown>),
    ]);

    const result: AdjacentPosts = {
      previous: prevArr.length ? prevArr[0] as AdjacentPosts['previous'] : null,
      next: nextArr.length ? nextArr[0] as AdjacentPosts['next'] : null,
    };

    await this.cache.set(cacheKey, result, CACHE_TTL.adjacent);
    return result;
  }

  /* ──────────────────────────────────────────────────────────────────────── */
  /*  POST CLONING / DUPLICATION                                             */
  /* ──────────────────────────────────────────────────────────────────────── */

  /** Clone an existing post as a new DRAFT with a unique slug. */
  async clonePost(postId: string, newAuthorId?: string): Promise<PostWithRelations> {
    const source = await this.prisma.post.findUnique({
      where: { id: postId },
      include: { categories: true },
    }) as PostWithRelations | null;
    if (!source) throw new BlogError('Source post not found', 'NOT_FOUND', 404);

    // Also clone quotes
    const sourceQuotes = await this.prisma.postQuote.findMany({
      where: { postId },
      orderBy: { sortOrder: 'asc' },
    }) as PostQuote[];

    const input: CreatePostInput = {
      title: `${source.title} (Copy)`,
      content: source.content,
      excerpt: source.excerpt,
      status: 'DRAFT',
      authorId: newAuthorId ?? source.authorId,
      featuredImage: source.featuredImage,
      featuredImageAlt: source.featuredImageAlt,
      ogTitle: source.ogTitle,
      ogDescription: source.ogDescription,
      ogImage: source.ogImage,
      twitterTitle: source.twitterTitle,
      twitterDescription: source.twitterDescription,
      twitterImage: source.twitterImage,
      categoryIds: source.categories?.map(c => c.id) ?? [],
      seriesId: source.seriesId,
      password: source.password,
      allowComments: source.allowComments,
      isGuestPost: source.isGuestPost,
      guestAuthorName: source.guestAuthorName,
      guestAuthorEmail: source.guestAuthorEmail,
      guestAuthorBio: source.guestAuthorBio,
      guestAuthorAvatar: source.guestAuthorAvatar,
      guestAuthorUrl: source.guestAuthorUrl,
      canonicalUrl: null,
      language: source.language,
      region: source.region,
      quotes: sourceQuotes.map(q => ({
        text: q.text,
        attribution: q.attribution,
        source: q.source,
        sourceUrl: q.sourceUrl,
        sortOrder: q.sortOrder,
        isPullQuote: q.isPullQuote,
      })),
    };

    const cloned = await this.createPost(input);
    this.logger.log(`Post cloned: "${source.title}" → "${cloned.title}"`);
    return cloned;
  }

  /* ──────────────────────────────────────────────────────────────────────── */
  /*  SEARCH SUGGESTIONS (typeahead)                                         */
  /* ──────────────────────────────────────────────────────────────────────── */

  async searchSuggestions(query: string, limit = 5): Promise<SearchSuggestion[]> {
    const cacheKey = CACHE_KEYS.searchSuggestions(query.toLowerCase().trim());
    const cached = await this.cache.get<SearchSuggestion[]>(cacheKey);
    if (cached) return cached;

    const safeQuery = sanitizeText(query).slice(0, BLOG_LIMITS.SEARCH_MAX_LENGTH);
    const cap = Math.min(limit, BLOG_LIMITS.SEARCH_SUGGESTIONS_MAX);
    const results: SearchSuggestion[] = [];

    // Search posts
    const posts = await this.prisma.post.findMany({
      where: {
        title: { contains: safeQuery, mode: 'insensitive' } as unknown as string,
        status: 'PUBLISHED' as PostStatus,
        deletedAt: null,
      },
      take: cap,
      select: { id: true, title: true, slug: true },
    } as Record<string, unknown>) as Array<{ id: string; title: string; slug: string }>;
    for (const p of posts) {
      results.push({ id: p.id, title: p.title, slug: p.slug, type: 'post' });
    }

    // Search categories
    if (results.length < cap) {
      const cats = await this.prisma.category.findMany({
        where: { name: { contains: safeQuery, mode: 'insensitive' } as unknown as string },
        take: cap - results.length,
      }) as Category[];
      for (const c of cats) {
        results.push({ id: c.id, title: c.name, slug: c.slug, type: 'category' });
      }
    }

    // Search series
    if (results.length < cap) {
      const series = await this.prisma.series.findMany({
        where: { title: { contains: safeQuery, mode: 'insensitive' } as unknown as string },
        take: cap - results.length,
      }) as Series[];
      for (const s of series) {
        results.push({ id: s.id, title: s.title, slug: s.slug, type: 'series' });
      }
    }

    await this.cache.set(cacheKey, results, CACHE_TTL.suggestions);
    return results;
  }

  /* ──────────────────────────────────────────────────────────────────────── */
  /*  QUOTES / BLOCKQUOTES (structured pull-quotes)                          */
  /* ──────────────────────────────────────────────────────────────────────── */

  async getPostQuotes(postId: string): Promise<PostQuote[]> {
    const cacheKey = CACHE_KEYS.postQuotes(postId);
    const cached = await this.cache.get<PostQuote[]>(cacheKey);
    if (cached) return cached;

    const quotes = await this.prisma.postQuote.findMany({
      where: { postId },
      orderBy: { sortOrder: 'asc' },
    }) as PostQuote[];

    await this.cache.set(cacheKey, quotes, CACHE_TTL.quotes);
    return quotes;
  }

  async addQuote(postId: string, input: CreateQuoteInput): Promise<PostQuote> {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new BlogError('Post not found', 'NOT_FOUND', 404);

    const count = await this.prisma.postQuote.count({ where: { postId } });
    if (count >= BLOG_LIMITS.MAX_QUOTES_PER_POST) {
      throw new BlogError(`Maximum ${BLOG_LIMITS.MAX_QUOTES_PER_POST} quotes per post`, 'QUOTE_LIMIT', 400);
    }

    const quote = await this.prisma.postQuote.create({
      data: {
        postId,
        text: sanitizeText(input.text),
        attribution: input.attribution ?? null,
        source: input.source ?? null,
        sourceUrl: input.sourceUrl ?? null,
        sortOrder: input.sortOrder ?? count,
        isPullQuote: input.isPullQuote ?? false,
      },
    }) as PostQuote;

    await this.cache.del(CACHE_KEYS.postQuotes(postId));
    this.logger.log(`Quote added to post ${postId}`);
    return quote;
  }

  async updateQuote(quoteId: string, input: UpdateQuoteInput): Promise<PostQuote> {
    const existing = await this.prisma.postQuote.findUnique({ where: { id: quoteId } });
    if (!existing) throw new BlogError('Quote not found', 'NOT_FOUND', 404);

    const data: Record<string, unknown> = {};
    if (input.text !== undefined) data.text = sanitizeText(input.text);
    if (input.attribution !== undefined) data.attribution = input.attribution;
    if (input.source !== undefined) data.source = input.source;
    if (input.sourceUrl !== undefined) data.sourceUrl = input.sourceUrl;
    if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder;
    if (input.isPullQuote !== undefined) data.isPullQuote = input.isPullQuote;

    const updated = await this.prisma.postQuote.update({ where: { id: quoteId }, data }) as PostQuote;
    await this.cache.del(CACHE_KEYS.postQuotes(existing.postId));
    return updated;
  }

  async deleteQuote(quoteId: string): Promise<void> {
    const existing = await this.prisma.postQuote.findUnique({ where: { id: quoteId } });
    if (!existing) throw new BlogError('Quote not found', 'NOT_FOUND', 404);

    await this.prisma.postQuote.delete({ where: { id: quoteId } });
    await this.cache.del(CACHE_KEYS.postQuotes(existing.postId));
    this.logger.log(`Quote deleted: ${quoteId}`);
  }

  /** Get only pull-quotes (highlighted quotes for sidebar/feature display). */
  async getPullQuotes(postId: string): Promise<PostQuote[]> {
    const all = await this.getPostQuotes(postId);
    return all.filter(q => q.isPullQuote);
  }

  /* ──────────────────────────────────────────────────────────────────────── */
  /*  TABLE OF CONTENTS (heading extraction)                                 */
  /* ──────────────────────────────────────────────────────────────────────── */

  async extractToc(postId: string): Promise<TocEntry[]> {
    const cacheKey = CACHE_KEYS.toc(postId);
    const cached = await this.cache.get<TocEntry[]>(cacheKey);
    if (cached) return cached;

    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) return [];

    const headings = extractHeadings(post.content);
    const tree = buildTocTree(headings) as TocEntry[];

    await this.cache.set(cacheKey, tree, CACHE_TTL.toc);
    return tree;
  }

  /* ──────────────────────────────────────────────────────────────────────── */
  /*  REVISION DIFFING                                                       */
  /* ──────────────────────────────────────────────────────────────────────── */

  /** Compare two revisions of the same post field-by-field. */
  async diffRevisions(revisionIdA: string, revisionIdB: string): Promise<RevisionDiff> {
    const [revA, revB] = await Promise.all([
      this.prisma.postRevision.findUnique({ where: { id: revisionIdA } }),
      this.prisma.postRevision.findUnique({ where: { id: revisionIdB } }),
    ]);
    if (!revA) throw new BlogError('Revision A not found', 'NOT_FOUND', 404);
    if (!revB) throw new BlogError('Revision B not found', 'NOT_FOUND', 404);
    if (revA.postId !== revB.postId) {
      throw new BlogError('Revisions belong to different posts', 'VALIDATION', 400);
    }

    const a = revA as PostRevision;
    const b = revB as PostRevision;
    const changes: DiffChange[] = [];

    const titleChanged = a.title !== b.title;
    const contentChanged = a.content !== b.content;
    const excerptChanged = (a.excerpt ?? '') !== (b.excerpt ?? '');

    if (titleChanged) changes.push({ field: 'title', before: a.title, after: b.title });
    if (contentChanged) changes.push({ field: 'content', before: a.content, after: b.content });
    if (excerptChanged) changes.push({ field: 'excerpt', before: a.excerpt ?? '', after: b.excerpt ?? '' });

    return {
      fromRevision: a.revisionNumber,
      toRevision: b.revisionNumber,
      titleChanged,
      contentChanged,
      excerptChanged,
      changes,
    };
  }

  /* ──────────────────────────────────────────────────────────────────────── */
  /*  RSS FEED                                                               */
  /* ──────────────────────────────────────────────────────────────────────── */

  /** Generate a structured RSS feed from published posts. */
  async generateRssFeed(maxItems?: number): Promise<RssFeed> {
    const cacheKey = CACHE_KEYS.rssFeed();
    const cached = await this.cache.get<RssFeed>(cacheKey);
    if (cached) return cached;

    const config = await this.getConfig();
    const limit = Math.min(maxItems ?? BLOG_LIMITS.RSS_MAX_ITEMS, BLOG_LIMITS.RSS_MAX_ITEMS);

    const posts = await this.prisma.post.findMany({
      where: { status: 'PUBLISHED' as PostStatus, deletedAt: null },
      orderBy: { publishedAt: 'desc' },
      take: limit,
      include: { categories: true },
    }) as PostWithRelations[];

    const items: RssFeedItem[] = posts.map(p => ({
      title: escapeHtml(p.title),
      link: `${config.blogBaseUrl}/${p.slug}`,
      description: escapeHtml(p.excerpt ?? generateExcerpt(p.content, config.excerptLength)),
      pubDate: toRfc822(p.publishedAt ?? p.createdAt),
      guid: p.id,
      author: p.isGuestPost && p.guestAuthorName ? p.guestAuthorName : p.authorId,
      categories: p.categories?.map(c => c.name) ?? [],
    }));

    const feed: RssFeed = {
      title: config.blogFeedTitle,
      link: config.blogBaseUrl,
      description: config.blogFeedDescription,
      language: config.blogFeedLanguage,
      lastBuildDate: toRfc822(new Date()),
      items,
    };

    await this.cache.set(cacheKey, feed, CACHE_TTL.rssFeed);
    return feed;
  }

  /* ──────────────────────────────────────────────────────────────────────── */
  /*  SITEMAP                                                                */
  /* ──────────────────────────────────────────────────────────────────────── */

  /** Get all published post URLs for sitemap generation. */
  async getSitemapEntries(): Promise<SitemapEntry[]> {
    const cacheKey = CACHE_KEYS.sitemapUrls();
    const cached = await this.cache.get<SitemapEntry[]>(cacheKey);
    if (cached) return cached;

    const config = await this.getConfig();
    const posts = await this.prisma.post.findMany({
      where: { status: 'PUBLISHED' as PostStatus, deletedAt: null },
      orderBy: { publishedAt: 'desc' },
      take: BLOG_LIMITS.SITEMAP_MAX_ITEMS,
      select: { slug: true, updatedAt: true, publishedAt: true, isFeatured: true },
    } as Record<string, unknown>) as Array<{ slug: string; updatedAt: Date; publishedAt: Date | null; isFeatured: boolean }>;

    const entries: SitemapEntry[] = posts.map(p => ({
      loc: `${config.blogBaseUrl}/${p.slug}`,
      lastmod: toW3CDate(p.updatedAt),
      changefreq: 'weekly' as const,
      priority: p.isFeatured ? 0.9 : 0.7,
    }));

    await this.cache.set(cacheKey, entries, CACHE_TTL.sitemap);
    return entries;
  }

  /* ──────────────────────────────────────────────────────────────────────── */
  /*  GUEST POST QUERIES                                                     */
  /* ──────────────────────────────────────────────────────────────────────── */

  /** List all guest posts. */
  async getGuestPosts(options: PostListOptions = {}): Promise<PaginatedResult<PostWithRelations>> {
    return this.findAll({ ...options, isGuestPost: true } as PostListOptions & { isGuestPost: boolean });
  }

  /* ──────────────────────────────────────────────────────────────────────── */
  /*  STATISTICS                                                             */
  /* ──────────────────────────────────────────────────────────────────────── */

  /** Get aggregate post statistics. */
  async getPostStats(): Promise<PostStats> {
    const cached = await this.cache.get<PostStats>(CACHE_KEYS.postStats());
    if (cached) return cached;

    const [total, draft, published, scheduled, archived] = await Promise.all([
      this.prisma.post.count({ where: { deletedAt: null } }),
      this.prisma.post.count({ where: { status: 'DRAFT' as PostStatus, deletedAt: null } }),
      this.prisma.post.count({ where: { status: 'PUBLISHED' as PostStatus, deletedAt: null } }),
      this.prisma.post.count({ where: { status: 'SCHEDULED' as PostStatus, deletedAt: null } }),
      this.prisma.post.count({ where: { status: 'ARCHIVED' as PostStatus, deletedAt: null } }),
    ]);

    // Aggregate views & averages from published posts
    const publishedPosts = await this.prisma.post.findMany({
      where: { status: 'PUBLISHED' as PostStatus, deletedAt: null },
    });

    let totalViews = 0;
    let totalReadingTime = 0;
    let totalWordCount = 0;
    for (const p of publishedPosts) {
      totalViews += p.viewCount;
      totalReadingTime += p.readingTime;
      totalWordCount += p.wordCount;
    }
    const publishedCount = publishedPosts.length || 1; // avoid division by 0

    const stats: PostStats = {
      total,
      draft,
      published,
      scheduled,
      archived,
      totalViews,
      averageReadingTime: Math.round(totalReadingTime / publishedCount),
      averageWordCount: Math.round(totalWordCount / publishedCount),
    };

    await this.cache.set(CACHE_KEYS.postStats(), stats, CACHE_TTL.stats);
    return stats;
  }

  /* ──────────────────────────────────────────────────────────────────────── */
  /*  SLUG GENERATION                                                        */
  /* ──────────────────────────────────────────────────────────────────────── */

  /** Generate a unique slug, appending counter if collision detected. */
  async generateUniqueSlug(title: string): Promise<string> {
    const base = generateSlug(title);
    if (!base) throw new BlogError('Cannot generate slug from empty title', 'VALIDATION', 400);

    let slug = base;
    let counter = 1;

    while (counter <= BLOG_LIMITS.SLUG_COUNTER_MAX) {
      const existing = await this.prisma.post.findFirst({ where: { slug } });
      if (!existing) return slug;
      counter++;
      slug = `${base}-${counter}`;
    }

    return `${base}-${Date.now()}`;
  }

  /* ──────────────────────────────────────────────────────────────────────── */
  /*  PRIVATE HELPERS                                                        */
  /* ──────────────────────────────────────────────────────────────────────── */

  /** Create an immutable revision snapshot. Trims excess revisions. */
  private async createRevisionSnapshot(
    postId: string,
    title: string,
    content: string,
    excerpt: string | null,
    revisionNumber: number,
    createdBy: string,
    changeNote: string | null,
  ): Promise<void> {
    await this.prisma.postRevision.create({
      data: { postId, title, content, excerpt, revisionNumber, createdBy, changeNote },
    });

    // Trim old revisions
    const config = await this.getConfig();
    if (config.maxRevisionsPerPost > 0) {
      const revisions = await this.prisma.postRevision.findMany({
        where: { postId },
        orderBy: { revisionNumber: 'desc' },
      });
      if (revisions.length > config.maxRevisionsPerPost) {
        const toDelete = revisions.slice(config.maxRevisionsPerPost);
        for (const rev of toDelete) {
          await this.prisma.postRevision.delete({ where: { id: rev.id } });
        }
      }
    }
  }

  /** Generate a unique slug for a series. */
  private async generateUniqueSeriesSlug(title: string): Promise<string> {
    const base = generateSlug(title);
    let slug = base;
    let counter = 1;

    while (counter <= BLOG_LIMITS.SLUG_COUNTER_MAX) {
      const existing = await this.prisma.series.findFirst({ where: { slug } });
      if (!existing) return slug;
      counter++;
      slug = `${base}-${counter}`;
    }
    return `${base}-${Date.now()}`;
  }

  /** Recalculate and update postCount on a series. */
  private async recalculateSeriesPostCount(seriesId: string): Promise<void> {
    const count = await this.prisma.post.count({
      where: { seriesId, deletedAt: null },
    });
    await this.prisma.series.update({
      where: { id: seriesId },
      data: { postCount: count },
    });
  }

  /** Recalculate and update postCount on a category. */
  private async recalculateCategoryPostCount(categoryId: string): Promise<void> {
    const count = await this.prisma.post.count({
      where: {
        deletedAt: null,
        categories: { some: { id: categoryId } },
      },
    });
    await this.prisma.category.update({
      where: { id: categoryId },
      data: { postCount: count },
    });
  }

  /** Assert that a category chain won't exceed max depth. */
  private async assertCategoryDepth(parentId: string, depth = 0): Promise<void> {
    if (depth >= BLOG_LIMITS.MAX_DEPTH_CATEGORY) {
      throw new BlogError(
        `Category nesting cannot exceed ${BLOG_LIMITS.MAX_DEPTH_CATEGORY} levels`,
        'VALIDATION', 400,
      );
    }
    const parent = await this.prisma.category.findUnique({ where: { id: parentId } });
    if (!parent) throw new BlogError('Parent category not found', 'NOT_FOUND', 404);
    if (parent.parentId) {
      await this.assertCategoryDepth(parent.parentId, depth + 1);
    }
  }

  /** Check if targetId is a descendant of ancestorId (circular ref prevention). */
  private async isCategoryDescendant(targetId: string, ancestorId: string, depth = 0): Promise<boolean> {
    if (depth > BLOG_LIMITS.MAX_DEPTH_CATEGORY) return false;
    const children = await this.prisma.category.findMany({ where: { parentId: ancestorId } });
    for (const child of children) {
      if (child.id === targetId) return true;
      if (await this.isCategoryDescendant(targetId, child.id, depth + 1)) return true;
    }
    return false;
  }

  /** Assert bulk operation size limit. */
  private assertBulkLimit(ids: string[]): void {
    if (ids.length > BLOG_LIMITS.MAX_BULK_SIZE) {
      throw new BlogError(`Maximum ${BLOG_LIMITS.MAX_BULK_SIZE} items per bulk operation`, 'BULK_LIMIT', 400);
    }
    if (ids.length === 0) {
      throw new BlogError('At least one item required', 'VALIDATION', 400);
    }
  }

  /** Invalidate all post-related caches. */
  private async invalidatePostCaches(): Promise<void> {
    await Promise.all([
      this.cache.flush(`${CACHE_KEYS.postList('')}*`),
      this.cache.del(CACHE_KEYS.postStats()),
      this.cache.del(CACHE_KEYS.featuredPosts()),
      this.cache.del(CACHE_KEYS.pinnedPosts()),
      this.cache.del(CACHE_KEYS.rssFeed()),
      this.cache.del(CACHE_KEYS.sitemapUrls()),
    ]);
  }

  /** Invalidate category caches. */
  private async invalidateCategoryCaches(): Promise<void> {
    await Promise.all([
      this.cache.del(CACHE_KEYS.categories(true)),
      this.cache.del(CACHE_KEYS.categories(false)),
      this.cache.del(CACHE_KEYS.categoryTree()),
    ]);
  }

  /** Trigger ISR/CDN revalidation. */
  private async triggerRevalidation(paths: string[]): Promise<void> {
    if (!this.revalidate) return;
    try {
      await this.revalidate(paths);
    } catch {
      this.logger.warn(`Revalidation failed for: ${paths.join(', ')}`);
    }
  }
}
