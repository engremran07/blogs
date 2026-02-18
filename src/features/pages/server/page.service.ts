// pages/page.service.ts
// Core service — single source of truth for all page management.
// Covers: CRUD, system page bootstrap, hierarchy, locking, revisions,
//         scheduling, bulk operations, stats, slug generation, cache.
// Framework-agnostic with constructor DI.

import type {
  PagesPrismaClient, PagesCacheProvider, PagesLogger,
  PagesRevalidationCallback, PagesConfig, PagesConfigConsumer,
  Page, PageWithRelations, PageTreeNode,
  PageRevision, PageListOptions, PaginatedResult,
  CreatePageInput, UpdatePageInput,
  PageLockInfo, ScheduledPage, ScheduleProcessResult,
  PageStats, SystemPageRegistration, SystemPageKey,
} from '../types';
import { PageError } from '../types';
import {
  CACHE_KEYS, CACHE_TTL, PAGE_LIMITS, PAGES_DEFAULTS,
  SYSTEM_PAGES_REGISTRY, RESERVED_SLUGS,
  generateSlug, countWords, calculateReadingTime,
  generateExcerpt, buildPagePath, hashListOptions, isPast,
  normalizeIds,
} from './constants';
import {
  sanitizeContent, sanitizeText, sanitizeSlug,
  sanitizeCss, sanitizeHeadHtml,
} from './sanitization.util';

/* ========================================================================== */
/*  DEPENDENCY INTERFACE                                                      */
/* ========================================================================== */

export interface PageServiceDeps {
  prisma: PagesPrismaClient;
  cache?: PagesCacheProvider;
  logger?: PagesLogger;
  revalidate?: PagesRevalidationCallback;
  getConfig?: () => PagesConfig | Promise<PagesConfig>;
}

/* ========================================================================== */
/*  SERVICE                                                                   */
/* ========================================================================== */

export class PageService implements PagesConfigConsumer {
  private readonly prisma: PagesPrismaClient;
  private readonly cache?: PagesCacheProvider;
  private readonly logger?: PagesLogger;
  private readonly revalidate?: PagesRevalidationCallback;
  private readonly getConfigFn?: () => PagesConfig | Promise<PagesConfig>;

  /** Runtime-merged config. */
  private cfg: Required<PagesConfig>;

  constructor(deps: PageServiceDeps) {
    this.prisma = deps.prisma;
    this.cache = deps.cache;
    this.logger = deps.logger;
    this.revalidate = deps.revalidate;
    this.getConfigFn = deps.getConfig;
    this.cfg = { ...PAGES_DEFAULTS } as Required<PagesConfig>;
  }

  /** Called by AdminSettingsService when admin changes settings. */
  updateConfig(cfg: Required<PagesConfig>): void {
    this.cfg = { ...cfg };
  }

  /** Resolve runtime config (from getConfig callback if provided, else cached). */
  private async resolveConfig(): Promise<Required<PagesConfig>> {
    if (this.getConfigFn) {
      const external = await this.getConfigFn();
      this.cfg = { ...PAGES_DEFAULTS, ...external } as Required<PagesConfig>;
    }
    return this.cfg;
  }

  /* ======================================================================== */
  /*  CRUD — CREATE                                                           */
  /* ======================================================================== */

  async createPage(input: CreatePageInput): Promise<Page> {
    const cfg = await this.resolveConfig();

    const title = sanitizeText(input.title.trim());
    if (title.length < PAGE_LIMITS.TITLE_MIN_LENGTH) {
      throw new PageError('Title is too short', 'TITLE_TOO_SHORT', 400);
    }

    // Generate unique slug
    const baseSlug = generateSlug(title);
    const slug = await this.generateUniqueSlug(baseSlug);

    // Content enrichment
    const content = input.content ? sanitizeContent(input.content) : '';
    const wordCount = countWords(content);
    const readingTime = calculateReadingTime(wordCount, cfg.readingSpeedWpm);
    const excerpt = input.excerpt ?? generateExcerpt(content, cfg.excerptLength);

    // Hierarchy
    let parentPath: string | null = null;
    let level = 0;
    if (input.parentId && cfg.enableHierarchy) {
      const parent = await this.prisma.page.findUnique({ where: { id: input.parentId } });
      if (!parent) throw new PageError('Parent page not found', 'PARENT_NOT_FOUND', 404);
      level = (parent as Page).level + 1;
      if (level > cfg.maxDepth) {
        throw new PageError(`Maximum nesting depth of ${cfg.maxDepth} exceeded`, 'MAX_DEPTH_EXCEEDED', 400);
      }
      parentPath = (parent as Page).path;
    }
    const path = buildPagePath(slug, parentPath, cfg.pagesBaseUrl);

    // Code injection guard
    const customCss = cfg.allowCodeInjection ? sanitizeCss(input.customCss ?? '') || null : null;
    const customJs = cfg.allowCodeInjection ? (input.customJs ?? null) : null;
    const customHead = cfg.allowCodeInjection ? sanitizeHeadHtml(input.customHead ?? '') || null : null;

    // Scheduled publishing
    let status = input.status ?? (cfg.defaultStatus as CreatePageInput['status']) ?? 'DRAFT';
    let scheduledFor: Date | null = null;
    if (input.scheduledFor && cfg.enableScheduling) {
      scheduledFor = new Date(input.scheduledFor);
      if (isPast(scheduledFor)) {
        throw new PageError('Scheduled date must be in the future', 'SCHEDULE_PAST', 400);
      }
      status = 'SCHEDULED';
    }

    // Password guard
    const password = cfg.enablePasswordProtection ? (input.password ?? null) : null;

    const page = await this.prisma.page.create({
      data: {
        title,
        slug,
        content,
        excerpt,
        status,
        template: input.template ?? (cfg.defaultTemplate as CreatePageInput['template']) ?? 'DEFAULT',
        visibility: input.visibility ?? (cfg.defaultVisibility as CreatePageInput['visibility']) ?? 'PUBLIC',
        isSystem: false,
        systemKey: null,
        isHomePage: false,
        metaTitle: input.metaTitle ?? null,
        metaDescription: input.metaDescription ?? null,
        ogTitle: input.ogTitle ?? null,
        ogDescription: input.ogDescription ?? null,
        ogImage: input.ogImage ?? null,
        canonicalUrl: input.canonicalUrl ?? null,
        noIndex: input.noIndex ?? false,
        noFollow: input.noFollow ?? false,
        structuredData: input.structuredData ?? null,
        parentId: cfg.enableHierarchy ? (input.parentId ?? null) : null,
        sortOrder: input.sortOrder ?? 0,
        path,
        level,
        wordCount,
        readingTime,
        featuredImage: input.featuredImage ?? null,
        featuredImageAlt: input.featuredImageAlt ?? null,
        password,
        customCss,
        customJs,
        customHead,
        isLocked: false,
        lockedBy: null,
        lockedAt: null,
        revision: 1,
        authorId: input.authorId,
        publishedAt: status === 'PUBLISHED' ? new Date() : null,
        scheduledFor,
        deletedAt: null,
      },
    });

    this.logger?.log(`Page created: ${(page as Page).id} — "${title}"`);
    await this.invalidateCache();
    await this.triggerRevalidation([(page as Page).path]);
    return page as Page;
  }

  /* ======================================================================== */
  /*  CRUD — READ                                                            */
  /* ======================================================================== */

  async findById(id: string, includeDeleted = false): Promise<PageWithRelations | null> {
    const cached = await this.cache?.get<PageWithRelations>(CACHE_KEYS.pageById(id));
    if (cached) return cached;

    const where: Record<string, unknown> = { id };
    if (!includeDeleted) where.deletedAt = null;

    const page = await this.prisma.page.findFirst({ where });
    if (!page) return null;

    const result = page as PageWithRelations;
    await this.cache?.set(CACHE_KEYS.pageById(id), result, CACHE_TTL.pageDetail);
    return result;
  }

  async findBySlug(slug: string, includeDeleted = false): Promise<PageWithRelations | null> {
    const cached = await this.cache?.get<PageWithRelations>(CACHE_KEYS.pageBySlug(slug));
    if (cached) return cached;

    const where: Record<string, unknown> = { slug };
    if (!includeDeleted) where.deletedAt = null;

    const page = await this.prisma.page.findFirst({ where });
    if (!page) return null;

    const result = page as PageWithRelations;
    await this.cache?.set(CACHE_KEYS.pageBySlug(slug), result, CACHE_TTL.pageDetail);
    return result;
  }

  async findBySystemKey(key: SystemPageKey): Promise<Page | null> {
    const cached = await this.cache?.get<Page>(CACHE_KEYS.pageBySystemKey(key));
    if (cached) return cached;

    const page = await this.prisma.page.findFirst({
      where: { systemKey: key, deletedAt: null },
    });
    if (!page) return null;

    const result = page as Page;
    await this.cache?.set(CACHE_KEYS.pageBySystemKey(key), result, CACHE_TTL.systemPages);
    return result;
  }

  async findAll(opts: PageListOptions = {}): Promise<PaginatedResult<Page>> {
    const cfg = await this.resolveConfig();
    const page = opts.page ?? 1;
    const limit = Math.min(opts.limit ?? cfg.pagesPerPage, PAGE_LIMITS.MAX_PAGES_PER_PAGE);
    const skip = (page - 1) * limit;

    // Cache check
    const cacheKey = CACHE_KEYS.pageList(hashListOptions(opts as Record<string, unknown>));
    const cached = await this.cache?.get<PaginatedResult<Page>>(cacheKey);
    if (cached) return cached;

    // Build where clause
    const where: Record<string, unknown> = {};
    if (!opts.includeDeleted) where.deletedAt = null;
    if (opts.status) where.status = opts.status;
    if (opts.template) where.template = opts.template;
    if (opts.visibility) where.visibility = opts.visibility;
    if (opts.authorId) where.authorId = opts.authorId;
    if (opts.isSystem !== undefined) where.isSystem = opts.isSystem;
    if (opts.systemKey) where.systemKey = opts.systemKey;

    // parentId filter — explicit null means root pages only
    if (opts.parentId !== undefined) {
      where.parentId = opts.parentId;
    }

    // Search
    if (opts.search) {
      const term = opts.search.trim();
      where.OR = [
        { title: { contains: term, mode: 'insensitive' } },
        { slug: { contains: term, mode: 'insensitive' } },
        { content: { contains: term, mode: 'insensitive' } },
        { excerpt: { contains: term, mode: 'insensitive' } },
      ];
    }

    // Sort
    const sortBy = opts.sortBy ?? 'sortOrder';
    const sortOrder = opts.sortOrder ?? 'asc';
    const orderBy = { [sortBy]: sortOrder };

    const [data, total] = await Promise.all([
      this.prisma.page.findMany({ where, orderBy, skip, take: limit }),
      this.prisma.page.count({ where }),
    ]);

    const result: PaginatedResult<Page> = {
      data: data as Page[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };

    await this.cache?.set(cacheKey, result, CACHE_TTL.pageList);
    return result;
  }

  /* ======================================================================== */
  /*  CRUD — UPDATE                                                           */
  /* ======================================================================== */

  async updatePage(id: string, input: UpdatePageInput): Promise<Page> {
    const cfg = await this.resolveConfig();
    const existing = await this.prisma.page.findUnique({ where: { id } });
    if (!existing) throw new PageError('Page not found', 'PAGE_NOT_FOUND', 404);

    const ex = existing as Page;

    // Cannot change system page slug
    if (ex.isSystem && input.title) {
      // Skip slug regeneration for system pages — slug is immutable
    }

    // Check lock
    if (cfg.enableLocking && ex.isLocked) {
      // Still locked by someone else? lock timeout check
      if (ex.lockedAt) {
        const lockExpiry = new Date(ex.lockedAt.getTime() + cfg.lockTimeoutMinutes * 60_000);
        if (!isPast(lockExpiry)) {
          throw new PageError(
            `Page is locked by another user until ${lockExpiry.toISOString()}`,
            'PAGE_LOCKED', 423,
          );
        }
      }
    }

    // Create revision snapshot before updating
    if (cfg.enableRevisions) {
      await this.createRevision(id, ex, input.changeNote);
    }

    // Prepare update data
    const data: Record<string, unknown> = {};

    // Title / slug
    if (input.title !== undefined) {
      data.title = sanitizeText(input.title.trim());
      // Only regenerate slug for non-system pages
      if (!ex.isSystem) {
        const newSlug = generateSlug(input.title);
        if (newSlug !== ex.slug) {
          data.slug = await this.generateUniqueSlug(newSlug, id);
        }
      }
    }

    // Content
    if (input.content !== undefined) {
      data.content = sanitizeContent(input.content);
      data.wordCount = countWords(data.content as string);
      data.readingTime = calculateReadingTime(data.wordCount as number, cfg.readingSpeedWpm);
    }

    // Excerpt
    if (input.excerpt !== undefined) {
      data.excerpt = input.excerpt;
    } else if (data.content !== undefined) {
      data.excerpt = generateExcerpt(data.content as string, cfg.excerptLength);
    }

    // Simple fields
    if (input.template !== undefined) data.template = input.template;
    if (input.visibility !== undefined) data.visibility = input.visibility;
    if (input.metaTitle !== undefined) data.metaTitle = input.metaTitle;
    if (input.metaDescription !== undefined) data.metaDescription = input.metaDescription;
    if (input.ogTitle !== undefined) data.ogTitle = input.ogTitle;
    if (input.ogDescription !== undefined) data.ogDescription = input.ogDescription;
    if (input.ogImage !== undefined) data.ogImage = input.ogImage;
    if (input.canonicalUrl !== undefined) data.canonicalUrl = input.canonicalUrl;
    if (input.noIndex !== undefined) data.noIndex = input.noIndex;
    if (input.noFollow !== undefined) data.noFollow = input.noFollow;
    if (input.structuredData !== undefined) data.structuredData = input.structuredData;
    if (input.featuredImage !== undefined) data.featuredImage = input.featuredImage;
    if (input.featuredImageAlt !== undefined) data.featuredImageAlt = input.featuredImageAlt;
    if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder;

    // Password
    if (input.password !== undefined && cfg.enablePasswordProtection) {
      data.password = input.password;
    }

    // Code injection
    if (cfg.allowCodeInjection) {
      if (input.customCss !== undefined) data.customCss = sanitizeCss(input.customCss ?? '') || null;
      if (input.customJs !== undefined) data.customJs = input.customJs;
      if (input.customHead !== undefined) data.customHead = sanitizeHeadHtml(input.customHead ?? '') || null;
    }

    // Hierarchy / reparenting
    if (input.parentId !== undefined && cfg.enableHierarchy) {
      if (input.parentId === id) {
        throw new PageError('A page cannot be its own parent', 'SELF_PARENT', 400);
      }
      if (input.parentId) {
        const parent = await this.prisma.page.findUnique({ where: { id: input.parentId } });
        if (!parent) throw new PageError('Parent page not found', 'PARENT_NOT_FOUND', 404);

        // Circular-reference guard
        const ancestors = await this.getAncestors(input.parentId);
        if (ancestors.some(a => a.id === id)) {
          throw new PageError('Circular parent reference detected', 'CIRCULAR_PARENT', 400);
        }

        const parentPage = parent as Page;
        const newLevel = parentPage.level + 1;
        if (newLevel > cfg.maxDepth) {
          throw new PageError(`Maximum nesting depth of ${cfg.maxDepth} exceeded`, 'MAX_DEPTH_EXCEEDED', 400);
        }
        data.parentId = input.parentId;
        data.level = newLevel;
        data.path = buildPagePath(
          (data.slug as string) ?? ex.slug,
          parentPage.path,
          cfg.pagesBaseUrl,
        );
      } else {
        data.parentId = null;
        data.level = 0;
        data.path = buildPagePath(
          (data.slug as string) ?? ex.slug,
          null,
          cfg.pagesBaseUrl,
        );
      }
    } else if (data.slug) {
      // Slug changed but parent didn't — rebuild path
      if (ex.parentId) {
        const parent = await this.prisma.page.findUnique({ where: { id: ex.parentId } });
        data.path = buildPagePath(data.slug as string, (parent as Page)?.path, cfg.pagesBaseUrl);
      } else {
        data.path = buildPagePath(data.slug as string, null, cfg.pagesBaseUrl);
      }
    }

    // Status transitions
    if (input.status !== undefined) {
      data.status = input.status;
      if (input.status === 'PUBLISHED' && !ex.publishedAt) {
        data.publishedAt = new Date();
      }
    }

    // Scheduling
    if (input.scheduledFor !== undefined && cfg.enableScheduling) {
      if (input.scheduledFor) {
        const schedDate = new Date(input.scheduledFor);
        if (isPast(schedDate)) {
          throw new PageError('Scheduled date must be in the future', 'SCHEDULE_PAST', 400);
        }
        data.scheduledFor = schedDate;
        data.status = 'SCHEDULED';
      } else {
        data.scheduledFor = null;
        if (data.status === 'SCHEDULED' || ex.status === 'SCHEDULED') {
          data.status = 'DRAFT';
        }
      }
    }

    // Bump revision
    data.revision = ex.revision + 1;
    data.updatedAt = new Date();

    const updated = await this.prisma.page.update({
      where: { id },
      data,
    });

    const page = updated as Page;
    this.logger?.log(`Page updated: ${id} — rev ${page.revision}`);

    // Rebuild descendant paths if slug or parent changed
    if (data.slug || data.parentId !== undefined) {
      await this.rebuildDescendantPaths(id);
    }

    await this.invalidateCache();
    await this.triggerRevalidation([ex.path, page.path]);
    return page;
  }

  /* ======================================================================== */
  /*  CRUD — DELETE  &  RESTORE                                               */
  /* ======================================================================== */

  /** Soft-delete (move to trash). System pages cannot be deleted. */
  async softDelete(id: string): Promise<Page> {
    const page = await this.prisma.page.findUnique({ where: { id } });
    if (!page) throw new PageError('Page not found', 'PAGE_NOT_FOUND', 404);

    if ((page as Page).isSystem) {
      throw new PageError('System pages cannot be deleted', 'SYSTEM_PAGE_PROTECTED', 403);
    }

    const deleted = await this.prisma.page.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'ARCHIVED' },
    });

    this.logger?.log(`Page soft-deleted: ${id}`);
    await this.invalidateCache();
    await this.triggerRevalidation([(deleted as Page).path]);
    return deleted as Page;
  }

  /** Hard-delete (permanent). System pages cannot be deleted. */
  async hardDelete(id: string): Promise<void> {
    const page = await this.prisma.page.findUnique({ where: { id } });
    if (!page) throw new PageError('Page not found', 'PAGE_NOT_FOUND', 404);

    if ((page as Page).isSystem) {
      throw new PageError('System pages cannot be permanently deleted', 'SYSTEM_PAGE_PROTECTED', 403);
    }

    // Delete revisions first
    await this.prisma.pageRevision.deleteMany({ where: { pageId: id } });
    await this.prisma.page.delete({ where: { id } });

    this.logger?.log(`Page hard-deleted: ${id}`);
    await this.invalidateCache();
    await this.triggerRevalidation([(page as Page).path]);
  }

  /** Restore a soft-deleted page. */
  async restorePage(id: string): Promise<Page> {
    const page = await this.prisma.page.findFirst({
      where: { id, deletedAt: { not: null } },
    });
    if (!page) throw new PageError('Deleted page not found', 'PAGE_NOT_FOUND', 404);

    const restored = await this.prisma.page.update({
      where: { id },
      data: { deletedAt: null, status: 'DRAFT' },
    });

    this.logger?.log(`Page restored: ${id}`);
    await this.invalidateCache();
    return restored as Page;
  }

  /* ======================================================================== */
  /*  SYSTEM PAGES — single source of truth management                        */
  /* ======================================================================== */

  /**
   * Bootstrap all system pages — auto-registers each entry from SYSTEM_PAGES_REGISTRY.
   * If a system page already exists in the database it is skipped.
   * Call this once during app initialisation.
   */
  async bootstrapSystemPages(authorId: string): Promise<SystemPageRegistration[]> {
    const cfg = await this.resolveConfig();
    if (!cfg.autoRegisterSystemPages) return [];

    const results: SystemPageRegistration[] = [];

    for (const def of SYSTEM_PAGES_REGISTRY) {
      const existing = await this.prisma.page.findFirst({
        where: { systemKey: def.key },
      });

      if (existing) {
        results.push({
          key: def.key,
          slug: def.slug,
          title: def.title,
          template: def.template,
          isRegistered: true,
        });
        continue;
      }

      await this.prisma.page.create({
        data: {
          title: def.title,
          slug: def.slug,
          content: `<p>${def.description}</p>`,
          excerpt: def.description,
          status: 'PUBLISHED',
          template: def.template,
          visibility: 'PUBLIC',
          isSystem: true,
          systemKey: def.key,
          isHomePage: def.key === 'HOME',
          metaTitle: def.title,
          metaDescription: def.description,
          ogTitle: null,
          ogDescription: null,
          ogImage: null,
          canonicalUrl: null,
          noIndex: false,
          noFollow: false,
          structuredData: null,
          parentId: null,
          sortOrder: 0,
          path: def.slug ? `/${def.slug}` : '/',
          level: 0,
          wordCount: countWords(def.description),
          readingTime: 1,
          featuredImage: null,
          featuredImageAlt: null,
          password: null,
          customCss: null,
          customJs: null,
          customHead: null,
          isLocked: false,
          lockedBy: null,
          lockedAt: null,
          revision: 1,
          authorId,
          publishedAt: new Date(),
          scheduledFor: null,
          deletedAt: null,
        },
      });

      results.push({
        key: def.key,
        slug: def.slug,
        title: def.title,
        template: def.template,
        isRegistered: false,
      });

      this.logger?.log(`System page registered: ${def.key} → /${def.slug}`);
    }

    await this.invalidateCache();
    return results;
  }

  /** Get all registered system pages. */
  async getSystemPages(): Promise<Page[]> {
    const cached = await this.cache?.get<Page[]>(CACHE_KEYS.systemPages());
    if (cached) return cached;

    const pages = await this.prisma.page.findMany({
      where: { isSystem: true, deletedAt: null },
      orderBy: { sortOrder: 'asc' },
    });

    const result = pages as Page[];
    await this.cache?.set(CACHE_KEYS.systemPages(), result, CACHE_TTL.systemPages);
    return result;
  }

  /** Check if a page is a protected system page. */
  isSystemPage(page: Page): boolean {
    return page.isSystem === true && page.systemKey !== null;
  }

  /* ======================================================================== */
  /*  HOME PAGE DESIGNATION                                                   */
  /* ======================================================================== */

  /**
   * Set any page as the home page from the admin panel.
   * Clears the previous home page designation first.
   * Does not affect the page’s slug, status, system flag, or any other field.
   */
  async setAsHomePage(pageId: string): Promise<Page> {
    const page = await this.prisma.page.findUnique({ where: { id: pageId } });
    if (!page) throw new PageError('Page not found', 'PAGE_NOT_FOUND', 404);

    const p = page as Page;
    if (p.deletedAt) {
      throw new PageError('Cannot set a deleted page as home', 'PAGE_DELETED', 400);
    }

    // Clear current home page (if any)
    await this.prisma.page.updateMany({
      where: { isHomePage: true },
      data: { isHomePage: false },
    });

    // Designate the new home page
    const updated = await this.prisma.page.update({
      where: { id: pageId },
      data: { isHomePage: true },
    });

    this.logger?.log(`Home page set to: ${pageId} — "${p.title}”`);
    await this.invalidateCache();
    await this.triggerRevalidation(['/', p.path]);
    return updated as Page;
  }

  /** Get the current home page (the page marked isHomePage). */
  async getHomePage(): Promise<Page | null> {
    const cached = await this.cache?.get<Page>(CACHE_KEYS.homePage());
    if (cached) return cached;

    const page = await this.prisma.page.findFirst({
      where: { isHomePage: true, deletedAt: null },
    });
    if (!page) return null;

    const result = page as Page;
    await this.cache?.set(CACHE_KEYS.homePage(), result, CACHE_TTL.pageDetail);
    return result;
  }

  /* ======================================================================== */
  /*  PAGE HIERARCHY                                                          */
  /* ======================================================================== */

  /** Build a full tree of all pages (roots with nested children). */
  async getPageTree(includeDeleted = false): Promise<PageTreeNode[]> {
    const cached = await this.cache?.get<PageTreeNode[]>(CACHE_KEYS.pageTree());
    if (cached && !includeDeleted) return cached;

    const where: Record<string, unknown> = {};
    if (!includeDeleted) where.deletedAt = null;

    const allPages = await this.prisma.page.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
    });

    const pages = allPages as Page[];
    const tree = this.buildTree(pages);

    if (!includeDeleted) {
      await this.cache?.set(CACHE_KEYS.pageTree(), tree, CACHE_TTL.pageTree);
    }
    return tree;
  }

  /** Get ancestors of a page (breadcrumb trail, root → page). */
  async getAncestors(pageId: string): Promise<Page[]> {
    const cachedKey = CACHE_KEYS.breadcrumbs(pageId);
    const cached = await this.cache?.get<Page[]>(cachedKey);
    if (cached) return cached;

    const ancestors: Page[] = [];
    let currentId: string | null = pageId;

    while (currentId) {
      const page = await this.prisma.page.findUnique({ where: { id: currentId } });
      if (!page) break;
      const p = page as Page;
      if (p.id !== pageId) ancestors.unshift(p);
      currentId = p.parentId;
    }

    await this.cache?.set(cachedKey, ancestors, CACHE_TTL.breadcrumbs);
    return ancestors;
  }

  /** Get direct children of a page. */
  async getChildren(parentId: string): Promise<Page[]> {
    const cachedKey = CACHE_KEYS.children(parentId);
    const cached = await this.cache?.get<Page[]>(cachedKey);
    if (cached) return cached;

    const children = await this.prisma.page.findMany({
      where: { parentId, deletedAt: null },
      orderBy: { sortOrder: 'asc' },
    });

    const result = children as Page[];
    await this.cache?.set(cachedKey, result, CACHE_TTL.children);
    return result;
  }

  /** Get all descendants of a page (flat list). */
  async getDescendants(pageId: string): Promise<Page[]> {
    const descendants: Page[] = [];
    const queue: string[] = [pageId];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const children = await this.prisma.page.findMany({
        where: { parentId: currentId, deletedAt: null },
      });
      for (const child of children) {
        const c = child as Page;
        descendants.push(c);
        queue.push(c.id);
      }
    }

    return descendants;
  }

  /** Get siblings of a page (same parent, excluding self). */
  async getSiblings(pageId: string): Promise<Page[]> {
    const page = await this.prisma.page.findUnique({ where: { id: pageId } });
    if (!page) return [];

    const siblings = await this.prisma.page.findMany({
      where: {
        parentId: (page as Page).parentId,
        id: { not: pageId },
        deletedAt: null,
      },
      orderBy: { sortOrder: 'asc' },
    });

    return siblings as Page[];
  }

  /** Move a page to a new parent (or root). */
  async movePage(pageId: string, newParentId: string | null): Promise<Page> {
    const cfg = await this.resolveConfig();
    if (!cfg.enableHierarchy) {
      throw new PageError('Hierarchy is disabled', 'HIERARCHY_DISABLED', 400);
    }

    const page = await this.prisma.page.findUnique({ where: { id: pageId } });
    if (!page) throw new PageError('Page not found', 'PAGE_NOT_FOUND', 404);

    if (newParentId === pageId) {
      throw new PageError('A page cannot be its own parent', 'SELF_PARENT', 400);
    }

    let newLevel = 0;
    let parentPath: string | null = null;

    if (newParentId) {
      const parent = await this.prisma.page.findUnique({ where: { id: newParentId } });
      if (!parent) throw new PageError('Target parent not found', 'PARENT_NOT_FOUND', 404);

      // Circular reference guard
      const ancestors = await this.getAncestors(newParentId);
      if (ancestors.some(a => a.id === pageId)) {
        throw new PageError('Circular parent reference detected', 'CIRCULAR_PARENT', 400);
      }

      const p = parent as Page;
      newLevel = p.level + 1;
      if (newLevel > cfg.maxDepth) {
        throw new PageError(`Maximum nesting depth of ${cfg.maxDepth} exceeded`, 'MAX_DEPTH_EXCEEDED', 400);
      }
      parentPath = p.path;
    }

    const newPath = buildPagePath((page as Page).slug, parentPath, cfg.pagesBaseUrl);

    const updated = await this.prisma.page.update({
      where: { id: pageId },
      data: {
        parentId: newParentId,
        level: newLevel,
        path: newPath,
      },
    });

    await this.rebuildDescendantPaths(pageId);
    await this.invalidateCache();
    return updated as Page;
  }

  /* ======================================================================== */
  /*  PAGE LOCKING                                                            */
  /* ======================================================================== */

  /** Lock a page for editing. */
  async lockPage(pageId: string, userId: string): Promise<PageLockInfo> {
    const cfg = await this.resolveConfig();
    if (!cfg.enableLocking) {
      throw new PageError('Locking is disabled', 'LOCKING_DISABLED', 400);
    }

    const page = await this.prisma.page.findUnique({ where: { id: pageId } });
    if (!page) throw new PageError('Page not found', 'PAGE_NOT_FOUND', 404);

    const p = page as Page;

    // Check existing lock
    if (p.isLocked && p.lockedBy !== userId) {
      if (p.lockedAt) {
        const lockExpiry = new Date(p.lockedAt.getTime() + cfg.lockTimeoutMinutes * 60_000);
        if (!isPast(lockExpiry)) {
          throw new PageError(
            `Page is already locked by user ${p.lockedBy}`,
            'PAGE_LOCKED', 423,
          );
        }
      }
    }

    const updated = await this.prisma.page.update({
      where: { id: pageId },
      data: { isLocked: true, lockedBy: userId, lockedAt: new Date() },
    });

    const u = updated as Page;
    return { pageId: u.id, isLocked: true, lockedBy: userId, lockedAt: u.lockedAt };
  }

  /** Unlock a page. */
  async unlockPage(pageId: string, userId?: string): Promise<PageLockInfo> {
    const page = await this.prisma.page.findUnique({ where: { id: pageId } });
    if (!page) throw new PageError('Page not found', 'PAGE_NOT_FOUND', 404);

    const p = page as Page;

    // Only the locking user (or admin bypassing with no userId) can unlock
    if (userId && p.lockedBy !== userId) {
      throw new PageError('You do not hold the lock on this page', 'NOT_LOCK_OWNER', 403);
    }

    const updated = await this.prisma.page.update({
      where: { id: pageId },
      data: { isLocked: false, lockedBy: null, lockedAt: null },
    });

    return {
      pageId: (updated as Page).id,
      isLocked: false,
      lockedBy: null,
      lockedAt: null,
    };
  }

  /** Get lock info for a page. */
  async getLockInfo(pageId: string): Promise<PageLockInfo> {
    const page = await this.prisma.page.findUnique({ where: { id: pageId } });
    if (!page) throw new PageError('Page not found', 'PAGE_NOT_FOUND', 404);

    const p = page as Page;
    return {
      pageId: p.id,
      isLocked: p.isLocked,
      lockedBy: p.lockedBy,
      lockedAt: p.lockedAt,
    };
  }

  /** Release all stale locks past the timeout. */
  async releaseAllStaleLocks(): Promise<number> {
    const cfg = await this.resolveConfig();
    const cutoff = new Date(Date.now() - cfg.lockTimeoutMinutes * 60_000);

    const result = await this.prisma.page.updateMany({
      where: {
        isLocked: true,
        lockedAt: { lt: cutoff },
      },
      data: { isLocked: false, lockedBy: null, lockedAt: null },
    });

    if (result.count > 0) {
      this.logger?.log(`Released ${result.count} stale lock(s)`);
      await this.invalidateCache();
    }
    return result.count;
  }

  /* ======================================================================== */
  /*  REVISIONS                                                               */
  /* ======================================================================== */

  /** Create a revision snapshot of the current page state (before an update). */
  private async createRevision(
    pageId: string,
    page: Page,
    changeNote?: string | null,
  ): Promise<PageRevision> {
    const cfg = await this.resolveConfig();

    // Enforce max revisions per page
    if (cfg.maxRevisionsPerPage > 0) {
      const count = await this.prisma.pageRevision.count({ where: { pageId } });
      if (count >= cfg.maxRevisionsPerPage) {
        // Delete oldest revisions to make room
        const oldest = await this.prisma.pageRevision.findMany({
          where: { pageId },
          orderBy: { createdAt: 'asc' },
          take: count - cfg.maxRevisionsPerPage + 1,
        });
        if (oldest.length > 0) {
          const oldestIds = oldest.map((r: { id: string }) => r.id);
          await this.prisma.pageRevision.deleteMany({
            where: { id: { in: oldestIds } },
          });
        }
      }
    }

    const revision = await this.prisma.pageRevision.create({
      data: {
        pageId,
        title: page.title,
        content: page.content,
        excerpt: page.excerpt,
        template: page.template,
        revisionNumber: page.revision,
        changeNote: changeNote ?? null,
        createdBy: page.authorId,
      },
    });

    return revision as PageRevision;
  }

  /** Get all revisions for a page (newest first). */
  async getRevisions(pageId: string): Promise<PageRevision[]> {
    const revisions = await this.prisma.pageRevision.findMany({
      where: { pageId },
      orderBy: { createdAt: 'desc' },
    });
    return revisions as PageRevision[];
  }

  /** Restore a page to a specific revision. */
  async restoreRevision(pageId: string, revisionId: string, userId: string): Promise<Page> {
    const cfg = await this.resolveConfig();
    if (!cfg.enableRevisions) {
      throw new PageError('Revisions are disabled', 'REVISIONS_DISABLED', 400);
    }

    const revision = await this.prisma.pageRevision.findFirst({
      where: { id: revisionId, pageId },
    });
    if (!revision) throw new PageError('Revision not found', 'REVISION_NOT_FOUND', 404);

    const rev = revision as PageRevision;

    // Create a snapshot of current state before restoring
    const currentPage = await this.prisma.page.findUnique({ where: { id: pageId } });
    if (currentPage) {
      await this.createRevision(pageId, currentPage as Page, `Before restoring to revision #${rev.revisionNumber}`);
    }

    const wordCount = countWords(rev.content);
    const readingTime = calculateReadingTime(wordCount, cfg.readingSpeedWpm);

    const updated = await this.prisma.page.update({
      where: { id: pageId },
      data: {
        title: rev.title,
        content: rev.content,
        excerpt: rev.excerpt,
        template: rev.template,
        wordCount,
        readingTime,
        revision: (currentPage as Page).revision + 1,
        updatedAt: new Date(),
      },
    });

    this.logger?.log(`Page ${pageId} restored to revision #${rev.revisionNumber} by ${userId}`);
    await this.invalidateCache();
    await this.triggerRevalidation([(updated as Page).path]);
    return updated as Page;
  }

  /* ======================================================================== */
  /*  SCHEDULING                                                              */
  /* ======================================================================== */

  /** Get all pages scheduled for future publication. */
  async getScheduledPages(): Promise<ScheduledPage[]> {
    const pages = await this.prisma.page.findMany({
      where: { status: 'SCHEDULED', scheduledFor: { not: null }, deletedAt: null },
      orderBy: { scheduledFor: 'asc' },
    });

    return (pages as Page[]).map(p => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      scheduledFor: p.scheduledFor!,
    }));
  }

  /**
   * Process scheduled pages — publish any whose scheduledFor date has passed.
   * Call this from a cron job or background worker.
   */
  async processScheduledPages(): Promise<ScheduleProcessResult> {
    const cfg = await this.resolveConfig();
    if (!cfg.enableScheduling) {
      return { processed: 0, published: [], errors: [] };
    }

    const now = new Date();
    const due = await this.prisma.page.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledFor: { lte: now },
        deletedAt: null,
      },
    });

    const result: ScheduleProcessResult = { processed: 0, published: [], errors: [] };
    const paths: string[] = [];

    for (const page of due) {
      try {
        await this.prisma.page.update({
          where: { id: (page as Page).id },
          data: {
            status: 'PUBLISHED',
            publishedAt: new Date(),
            scheduledFor: null,
          },
        });
        result.published.push((page as Page).id);
        paths.push((page as Page).path);
        result.processed++;
      } catch (err) {
        result.errors.push({
          id: (page as Page).id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    if (result.processed > 0) {
      this.logger?.log(`Published ${result.processed} scheduled page(s)`);
      await this.invalidateCache();
      await this.triggerRevalidation(paths);
    }

    return result;
  }

  /* ======================================================================== */
  /*  BULK OPERATIONS                                                         */
  /* ======================================================================== */

  /**
   * Bulk update page statuses.
   * System pages are excluded from DRAFT / ARCHIVED / SCHEDULED transitions
   * to prevent accidentally hiding essential system routes.
   */
  async bulkUpdateStatus(ids: string[], status: Page['status']): Promise<{ count: number }> {
    const normalized = normalizeIds(ids);
    if (normalized.length === 0) throw new PageError('No valid IDs provided', 'EMPTY_IDS', 400);

    // Protect system pages from destructive status changes
    const protectedStatuses: string[] = ['ARCHIVED', 'DRAFT', 'SCHEDULED'];
    const excludeSystem = protectedStatuses.includes(status);

    const result = await this.prisma.page.updateMany({
      where: {
        id: { in: normalized },
        deletedAt: null,
        ...(excludeSystem ? { isSystem: false } : {}),
      },
      data: {
        status,
        ...(status === 'PUBLISHED' ? { publishedAt: new Date() } : {}),
      },
    });

    this.logger?.log(`Bulk status update: ${result.count} page(s) → ${status}`);
    await this.invalidateCache();
    await this.revalidateByIds(normalized);
    return result;
  }

  /**
   * Bulk soft-delete or hard-delete pages. System pages are always excluded.
   * Hard-delete also removes revisions. Home page designation is cleared.
   */
  async bulkDelete(ids: string[], permanent = false): Promise<{ count: number }> {
    const normalized = normalizeIds(ids);
    if (normalized.length === 0) throw new PageError('No valid IDs provided', 'EMPTY_IDS', 400);

    if (permanent) {
      // Only delete revisions for non-system pages that will actually be removed
      const eligible = await this.prisma.page.findMany({
        where: { id: { in: normalized }, isSystem: false },
      });
      const eligibleIds = (eligible as Page[]).map(p => p.id);
      const paths = (eligible as Page[]).map(p => p.path);

      if (eligibleIds.length > 0) {
        await this.prisma.pageRevision.deleteMany({
          where: { pageId: { in: eligibleIds } },
        });
        const result = await this.prisma.page.deleteMany({
          where: { id: { in: eligibleIds } },
        });
        this.logger?.log(`Bulk hard-delete: ${result.count} page(s)`);
        await this.invalidateCache();
        await this.triggerRevalidation(paths);
        return result;
      }
      return { count: 0 };
    }

    const result = await this.prisma.page.updateMany({
      where: { id: { in: normalized }, isSystem: false, deletedAt: null },
      data: { deletedAt: new Date(), status: 'ARCHIVED' },
    });

    this.logger?.log(`Bulk soft-delete: ${result.count} page(s)`);
    await this.invalidateCache();
    await this.revalidateByIds(normalized);
    return result;
  }

  /**
   * Bulk schedule pages for future publication.
   * System pages are excluded — they should remain published.
   */
  async bulkSchedule(ids: string[], scheduledFor: Date): Promise<{ count: number }> {
    const cfg = await this.resolveConfig();
    if (!cfg.enableScheduling) {
      throw new PageError('Scheduling is disabled', 'SCHEDULING_DISABLED', 400);
    }

    if (isPast(scheduledFor)) {
      throw new PageError('Scheduled date must be in the future', 'SCHEDULE_PAST', 400);
    }

    const normalized = normalizeIds(ids);
    if (normalized.length === 0) throw new PageError('No valid IDs provided', 'EMPTY_IDS', 400);

    const result = await this.prisma.page.updateMany({
      where: { id: { in: normalized }, deletedAt: null, isSystem: false },
      data: { status: 'SCHEDULED', scheduledFor },
    });

    this.logger?.log(`Bulk schedule: ${result.count} page(s) → ${scheduledFor.toISOString()}`);
    await this.invalidateCache();
    await this.revalidateByIds(normalized);
    return result;
  }

  /** Bulk reorder pages (set sortOrder for each). Validates size and handles missing pages. */
  async bulkReorder(items: Array<{ id: string; sortOrder: number }>): Promise<{ count: number; errors: Array<{ id: string; error: string }> }> {
    if (items.length === 0) throw new PageError('No items provided', 'EMPTY_IDS', 400);
    if (items.length > PAGE_LIMITS.MAX_BULK_SIZE) {
      throw new PageError(`Maximum ${PAGE_LIMITS.MAX_BULK_SIZE} items per batch`, 'BULK_LIMIT_EXCEEDED', 400);
    }

    let count = 0;
    const errors: Array<{ id: string; error: string }> = [];

    for (const item of items) {
      try {
        const existing = await this.prisma.page.findUnique({ where: { id: item.id } });
        if (!existing) {
          errors.push({ id: item.id, error: 'Page not found' });
          continue;
        }
        await this.prisma.page.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder },
        });
        count++;
      } catch (err) {
        errors.push({ id: item.id, error: err instanceof Error ? err.message : String(err) });
      }
    }

    this.logger?.log(`Bulk reorder: ${count} page(s), ${errors.length} error(s)`);
    await this.invalidateCache();
    return { count, errors };
  }

  /**
   * Bulk move pages to a new parent (or root).
   * System pages are skipped — their hierarchy position should be
   * managed explicitly if needed.
   */
  async bulkMove(ids: string[], parentId: string | null): Promise<{ count: number; errors: Array<{ id: string; error: string }> }> {
    const cfg = await this.resolveConfig();
    if (!cfg.enableHierarchy) {
      throw new PageError('Hierarchy is disabled', 'HIERARCHY_DISABLED', 400);
    }

    const normalized = normalizeIds(ids);
    if (normalized.length === 0) throw new PageError('No valid IDs provided', 'EMPTY_IDS', 400);

    let count = 0;
    const errors: Array<{ id: string; error: string }> = [];

    for (const id of normalized) {
      try {
        // Skip system pages in bulk move
        const page = await this.prisma.page.findUnique({ where: { id } });
        if (!page) {
          errors.push({ id, error: 'Page not found' });
          continue;
        }
        if ((page as Page).isSystem) {
          errors.push({ id, error: 'System pages cannot be bulk-moved' });
          continue;
        }
        await this.movePage(id, parentId);
        count++;
      } catch (err) {
        errors.push({ id, error: err instanceof Error ? err.message : String(err) });
      }
    }

    await this.revalidateByIds(normalized);
    return { count, errors };
  }

  /** Bulk set template for pages. */
  async bulkSetTemplate(ids: string[], template: Page['template']): Promise<{ count: number }> {
    const normalized = normalizeIds(ids);
    if (normalized.length === 0) throw new PageError('No valid IDs provided', 'EMPTY_IDS', 400);

    const result = await this.prisma.page.updateMany({
      where: { id: { in: normalized }, deletedAt: null },
      data: { template },
    });

    this.logger?.log(`Bulk template: ${result.count} page(s) → ${template}`);
    await this.invalidateCache();
    await this.revalidateByIds(normalized);
    return result;
  }

  /** Bulk set visibility for pages. */
  async bulkSetVisibility(ids: string[], visibility: Page['visibility']): Promise<{ count: number }> {
    const normalized = normalizeIds(ids);
    if (normalized.length === 0) throw new PageError('No valid IDs provided', 'EMPTY_IDS', 400);

    const result = await this.prisma.page.updateMany({
      where: { id: { in: normalized }, deletedAt: null },
      data: { visibility },
    });

    this.logger?.log(`Bulk visibility: ${result.count} page(s) → ${visibility}`);
    await this.invalidateCache();
    await this.revalidateByIds(normalized);
    return result;
  }

  /** Bulk restore soft-deleted pages. System pages excluded (cannot be deleted in the first place). */
  async bulkRestore(ids: string[]): Promise<{ count: number }> {
    const normalized = normalizeIds(ids);
    if (normalized.length === 0) throw new PageError('No valid IDs provided', 'EMPTY_IDS', 400);

    const result = await this.prisma.page.updateMany({
      where: {
        id: { in: normalized },
        deletedAt: { not: null },
      },
      data: { deletedAt: null, status: 'DRAFT' },
    });

    this.logger?.log(`Bulk restore: ${result.count} page(s)`);
    await this.invalidateCache();
    await this.revalidateByIds(normalized);
    return result;
  }

  /* ======================================================================== */
  /*  STATS                                                                   */
  /* ======================================================================== */

  async getPageStats(): Promise<PageStats> {
    const cached = await this.cache?.get<PageStats>(CACHE_KEYS.pageStats());
    if (cached) return cached;

    const [total, draft, published, scheduled, archived, system, deleted] = await Promise.all([
      this.prisma.page.count({ where: { deletedAt: null } }),
      this.prisma.page.count({ where: { status: 'DRAFT', deletedAt: null } }),
      this.prisma.page.count({ where: { status: 'PUBLISHED', deletedAt: null } }),
      this.prisma.page.count({ where: { status: 'SCHEDULED', deletedAt: null } }),
      this.prisma.page.count({ where: { status: 'ARCHIVED', deletedAt: null } }),
      this.prisma.page.count({ where: { isSystem: true, deletedAt: null } }),
      this.prisma.page.count({ where: { deletedAt: { not: null } } }),
    ]);

    const stats: PageStats = {
      total,
      draft,
      published,
      scheduled,
      archived,
      system,
      custom: total - system,
      deleted,
    };

    await this.cache?.set(CACHE_KEYS.pageStats(), stats, CACHE_TTL.stats);
    return stats;
  }

  /* ======================================================================== */
  /*  SLUG GENERATION                                                         */
  /* ======================================================================== */

  /**
   * Generate a unique slug, appending a counter if needed.
   * Reserved slugs (system pages) are always blocked for custom pages.
   */
  async generateUniqueSlug(base: string, excludeId?: string): Promise<string> {
    let slug = sanitizeSlug(base);
    if (!slug) slug = 'page';

    // Block reserved system slugs for custom pages
    if (RESERVED_SLUGS.has(slug) && !excludeId) {
      // If this is called during custom page creation, append counter
      slug = `${slug}-custom`;
    }

    let candidate = slug;
    let counter = 1;

    while (counter <= PAGE_LIMITS.SLUG_COUNTER_MAX) {
      const where: Record<string, unknown> = { slug: candidate };
      if (excludeId) where.id = { not: excludeId };

      const existing = await this.prisma.page.findFirst({ where });
      if (!existing) return candidate;

      counter++;
      candidate = `${slug}-${counter}`;
    }

    // Fallback: append timestamp
    return `${slug}-${Date.now().toString(36)}`;
  }

  /* ======================================================================== */
  /*  PRIVATE HELPERS                                                         */
  /* ======================================================================== */

  /** Build a nested tree from a flat list of pages. */
  private buildTree(pages: Page[]): PageTreeNode[] {
    const map = new Map<string, PageTreeNode>();
    const roots: PageTreeNode[] = [];

    for (const page of pages) {
      map.set(page.id, { ...page, children: [] });
    }

    for (const page of pages) {
      const node = map.get(page.id)!;
      if (page.parentId && map.has(page.parentId)) {
        map.get(page.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  /** Rebuild paths of all descendants after a parent slug/path change. */
  private async rebuildDescendantPaths(parentId: string): Promise<void> {
    const cfg = await this.resolveConfig();
    const parent = await this.prisma.page.findUnique({ where: { id: parentId } });
    if (!parent) return;

    const parentPage = parent as Page;
    const children = await this.prisma.page.findMany({
      where: { parentId, deletedAt: null },
    });

    for (const child of children) {
      const c = child as Page;
      const newPath = buildPagePath(c.slug, parentPage.path, cfg.pagesBaseUrl);
      const newLevel = parentPage.level + 1;

      await this.prisma.page.update({
        where: { id: c.id },
        data: { path: newPath, level: newLevel },
      });

      // Recurse into descendants
      await this.rebuildDescendantPaths(c.id);
    }
  }

  /** Invalidate all page-related caches. */
  private async invalidateCache(): Promise<void> {
    try {
      await this.cache?.flush(`${CACHE_KEYS.pageById('').split(':').slice(0, 2).join(':')}:*`);
    } catch {
      // Fallback: flush entire pages namespace
      try {
        await this.cache?.flush('pages:*');
      } catch {
        // Cache flush failed — non-fatal
      }
    }
  }

  /** Trigger ISR/CDN revalidation for updated paths. */
  private async triggerRevalidation(paths: string[]): Promise<void> {
    if (!this.revalidate) return;
    try {
      await this.revalidate(paths.filter(Boolean));
    } catch (err) {
      this.logger?.warn(`Revalidation failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /** Revalidate pages by their IDs (lookup paths first). */
  private async revalidateByIds(ids: string[]): Promise<void> {
    if (!this.revalidate || ids.length === 0) return;
    try {
      const pages = await this.prisma.page.findMany({
        where: { id: { in: ids } },
      });
      const paths = (pages as Page[]).map(p => p.path).filter(Boolean);
      if (paths.length > 0) {
        await this.revalidate(paths);
      }
    } catch (err) {
      this.logger?.warn(`Revalidation by IDs failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}
