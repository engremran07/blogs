// tags/tag.service.ts
// Core CRUD, hierarchy, merging, analytics, duplicate detection, trending, following
// Pure TS + Prisma — zero framework dependency

import type {
  TagsPrismaClient,
  TagsConfig,
  TagData,
  TagWithRelations,
  TagSummary,
  TagAnalytics,
  DuplicateCandidate,
  DuplicateGroup,
  BulkMergeResult,
  PaginatedResult,
  CreateTagInput,
  UpdateTagInput,
  QueryTagsInput,
  TagFollowData,
} from '../types';
import { TagSortField } from '../types';
import { DEFAULT_CONFIG } from './constants';

/** Recursive tree node for getNestedTree */
interface TagTreeNode {
  tag: TagData;
  children: TagTreeNode[];
}

export class TagService {
  private cfg: Required<TagsConfig>;

  constructor(
    private readonly prisma: TagsPrismaClient,
    config: Partial<TagsConfig> = {},
  ) {
    this.cfg = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Update runtime config (called by AdminSettingsService on admin changes).
   */
  updateConfig(newConfig: Partial<TagsConfig>): void {
    Object.assign(this.cfg, newConfig);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PUBLIC QUERIES
  // ═══════════════════════════════════════════════════════════════════════════

  /** Lightweight public tag list */
  async getPublicTags(): Promise<TagData[]> {
    const tags = await this.prisma.tag.findMany({
      select: {
        id: true, name: true, slug: true, description: true,
        color: true, icon: true, metaTitle: true, metaDescription: true, ogImage: true,
        parentId: true, path: true, label: true, level: true,
        usageCount: true, featured: true, trending: true,
        locked: true, protected: true,
        synonyms: true, synonymHits: true, linkedTagIds: true,
        mergeCount: true, createdAt: true, updatedAt: true,
      },
      orderBy: { name: 'asc' },
    });
    return tags as TagData[];
  }

  /** Trending tags (public) */
  async getTrendingTags(): Promise<TagData[]> {
    const tags = await this.prisma.tag.findMany({
      where: { trending: true },
      orderBy: { usageCount: 'desc' },
      take: this.cfg.trendingLimit,
    });
    return tags as TagData[];
  }

  /** Admin: paginated, filtered, sorted tag list */
  async findAll(query: QueryTagsInput): Promise<PaginatedResult<TagWithRelations>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (query.featured !== undefined) where.featured = query.featured;
    if (query.trending !== undefined) where.trending = query.trending;
    if (query.parentId !== undefined) where.parentId = query.parentId;
    if (query.hideEmpty) where.usageCount = { gt: 0 };
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { slug: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { synonyms: { has: query.search.toLowerCase() } },
      ];
    }

    const sortField = query.sortBy ?? TagSortField.NAME;
    const sortOrder = query.sortOrder ?? 'asc';
    const orderBy = { [sortField]: sortOrder };

    const [data, total] = await Promise.all([
      this.prisma.tag.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          parent: true,
          children: true,
          _count: { select: { posts: true, children: true, followers: true } },
        },
      }),
      this.prisma.tag.count({ where }),
    ]);

    return {
      data: data as TagWithRelations[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /** Single tag by ID */
  async findById(id: string): Promise<TagWithRelations | null> {
    const tag = await this.prisma.tag.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
        _count: { select: { posts: true, children: true, followers: true } },
      },
    });
    return (tag as TagWithRelations) ?? null;
  }

  /** Single tag by slug */
  async findBySlug(slug: string): Promise<TagWithRelations | null> {
    const tag = await this.prisma.tag.findFirst({
      where: { slug },
      include: {
        parent: true,
        children: true,
        _count: { select: { posts: true, children: true, followers: true } },
      },
    });
    return (tag as TagWithRelations) ?? null;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CRUD
  // ═══════════════════════════════════════════════════════════════════════════

  async create(input: CreateTagInput): Promise<TagWithRelations> {
    let name = input.name.trim();
    if (this.cfg.forceLowercase) name = name.toLowerCase();
    const slug = this.slugify(input.slug || name);

    // Case-insensitive duplicate check by slug or name
    const caseMode = this.cfg.caseSensitive ? 'default' : 'insensitive';
    const existing = await this.prisma.tag.findFirst({
      where: {
        OR: [
          { slug },
          { name: { equals: name, mode: caseMode } },
        ],
      },
    });
    if (existing) throw new Error('Tag with the same name or slug already exists');

    // Compute tree path + level if hierarchy enabled
    const { path, label, level } = await this.computeTreeFields(name, input.parentId ?? null);

    const tag = await this.prisma.tag.create({
      data: {
        name,
        slug,
        description: input.description ?? null,
        color: input.color || this.cfg.defaultColor,
        icon: input.icon ?? null,
        featured: input.featured ?? false,
        protected: input.protected ?? false,
        synonyms: (input.synonyms || []).map((s) => s.trim().toLowerCase()).filter(Boolean),
        linkedTagIds: [...new Set((input.linkedTagIds || []).filter(Boolean))],
        locked: input.locked ?? false,
        metaTitle: input.metaTitle ?? null,
        metaDescription: input.metaDescription ?? null,
        ogImage: input.ogImage ?? null,
        path,
        label,
        level,
        parent: input.parentId ? { connect: { id: input.parentId } } : undefined,
      },
      include: {
        parent: true,
        children: true,
        _count: { select: { posts: true, children: true, followers: true } },
      },
    });

    return tag as TagWithRelations;
  }

  async update(id: string, input: UpdateTagInput): Promise<TagWithRelations> {
    const existing = await this.prisma.tag.findUnique({ where: { id } });
    if (!existing) throw new Error('Tag not found');
    if (existing.locked && !input.forceUnlock) throw new Error('Tag is locked and cannot be modified');

    const data: Record<string, unknown> = {};

    let nameVal = typeof input.name === 'string' ? input.name.trim() : undefined;
    if (nameVal && this.cfg.forceLowercase) nameVal = nameVal.toLowerCase();
    if (nameVal) data.name = nameVal;

    if (Array.isArray(input.synonyms)) {
      data.synonyms = input.synonyms.map((s) => s.trim().toLowerCase()).filter(Boolean);
    }
    if (Array.isArray(input.linkedTagIds)) {
      data.linkedTagIds = [...new Set(input.linkedTagIds.filter(Boolean))];
    }
    if (input.description !== undefined) data.description = input.description;
    if (input.color !== undefined) data.color = input.color;
    if (input.icon !== undefined) data.icon = input.icon;
    if (typeof input.featured === 'boolean') data.featured = input.featured;
    if (typeof input.locked === 'boolean') data.locked = input.locked;
    if (typeof input.protected === 'boolean') data.protected = input.protected;
    if (input.metaTitle !== undefined) data.metaTitle = input.metaTitle;
    if (input.metaDescription !== undefined) data.metaDescription = input.metaDescription;
    if (input.ogImage !== undefined) data.ogImage = input.ogImage;

    const slugVal = input.slug || nameVal ? this.slugify(input.slug || nameVal || '') : undefined;
    if (slugVal) data.slug = slugVal;

    // Hierarchy: prevent self-parenting & cycles
    if (input.parentId !== undefined) {
      if (input.parentId === id) throw new Error('A tag cannot be its own parent');
      if (input.parentId && await this.wouldCycle(id, input.parentId)) {
        throw new Error('Tag hierarchy cycle detected');
      }
      data.parent = input.parentId
        ? { connect: { id: input.parentId } }
        : { disconnect: true };
    }

    // Recompute tree path if name or parent changed
    if (nameVal || input.parentId !== undefined) {
      const finalName = nameVal || existing.name;
      const finalParentId = input.parentId !== undefined ? input.parentId : existing.parentId;
      const tree = await this.computeTreeFields(finalName, finalParentId);
      data.path = tree.path;
      data.label = tree.label;
      data.level = tree.level;
    }

    // Duplicate guard on name/slug change
    if (slugVal || nameVal) {
      const caseMode = this.cfg.caseSensitive ? 'default' : 'insensitive';
      const orConds: Record<string, unknown>[] = [];
      if (slugVal) orConds.push({ slug: slugVal });
      if (nameVal) orConds.push({ name: { equals: nameVal, mode: caseMode } });
      const dup = await this.prisma.tag.findFirst({
        where: { id: { not: id }, OR: orConds },
      });
      if (dup) throw new Error('Another tag with the same name or slug already exists');
    }

    const tag = await this.prisma.tag.update({
      where: { id },
      data,
      include: {
        parent: true,
        children: true,
        _count: { select: { posts: true, children: true, followers: true } },
      },
    });

    return tag as TagWithRelations;
  }

  async delete(id: string): Promise<void> {
    const existing = await this.prisma.tag.findUnique({ where: { id } });
    if (!existing) throw new Error('Tag not found');
    if (existing.locked) throw new Error('Tag is locked and cannot be deleted');
    if (existing.protected && !this.cfg.protectAll) {
      throw new Error('Tag is protected and cannot be deleted');
    }

    // Disconnect many-to-many with posts
    await this.prisma.tag.update({
      where: { id },
      data: { posts: { set: [] } },
    });
    // Remove follower records
    await this.prisma.tagFollow.deleteMany({ where: { tagId: id } });
    await this.prisma.tag.delete({ where: { id } });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MERGING
  // ═══════════════════════════════════════════════════════════════════════════

  async mergeTags(sourceIds: string[], targetId: string): Promise<TagWithRelations> {
    const sourceTags = await this.prisma.tag.findMany({
      where: { id: { in: sourceIds } },
      include: { posts: true },
    });
    const target = await this.prisma.tag.findUnique({
      where: { id: targetId },
      include: { posts: true },
    });
    if (!target) throw new Error('Target tag not found');

    // Collect all unique post IDs
    const allPostIds = new Set<string>();
    sourceTags.forEach((t) => t.posts.forEach((p: { id: string }) => allPostIds.add(p.id)));
    target.posts.forEach((p: { id: string }) => allPostIds.add(p.id));

    // Merge synonyms
    const mergedSynonyms = new Set<string>(target.synonyms);
    for (const src of sourceTags) {
      mergedSynonyms.add(src.name.toLowerCase());
      src.synonyms.forEach((s: string) => mergedSynonyms.add(s));
    }

    // Move followers
    await this.prisma.tagFollow.updateMany({
      where: { tagId: { in: sourceIds } },
      data: { tagId: targetId },
    });

    // Update target with merged data
    await this.prisma.tag.update({
      where: { id: targetId },
      data: {
        posts: { set: [...allPostIds].map((pid) => ({ id: pid })) },
        usageCount: allPostIds.size,
        mergeCount: { increment: sourceIds.length },
        synonyms: [...mergedSynonyms],
      },
    });

    // Delete source tags (disconnect their posts first)
    for (const src of sourceTags) {
      await this.prisma.tag.update({
        where: { id: src.id },
        data: { posts: { set: [] } },
      });
    }
    await this.prisma.tag.deleteMany({ where: { id: { in: sourceIds } } });

    return (await this.findById(targetId))!;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BULK OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  async bulkSetParent(tagIds: string[], parentId: string | null): Promise<{ updated: number }> {
    const tags = await this.prisma.tag.findMany({ where: { id: { in: tagIds } } });
    const allowed: string[] = [];
    for (const tag of tags) {
      if (tag.locked || tag.id === parentId) continue;
      if (parentId && await this.wouldCycle(tag.id, parentId)) continue;
      allowed.push(tag.id);
    }
    if (allowed.length === 0) return { updated: 0 };
    const result = await this.prisma.tag.updateMany({
      where: { id: { in: allowed } },
      data: { parentId: parentId || null },
    });
    return { updated: result.count };
  }

  async bulkUpdateStyle(
    tagIds: string[],
    data: { color?: string; icon?: string; featured?: boolean },
  ): Promise<{ updated: number }> {
    const tags = await this.prisma.tag.findMany({ where: { id: { in: tagIds } } });
    const allowed = tags.filter((t) => !t.locked).map((t) => t.id);
    if (allowed.length === 0) return { updated: 0 };
    const result = await this.prisma.tag.updateMany({
      where: { id: { in: allowed } },
      data,
    });
    return { updated: result.count };
  }

  async bulkLock(tagIds: string[], locked: boolean): Promise<{ updated: number }> {
    const result = await this.prisma.tag.updateMany({
      where: { id: { in: tagIds } },
      data: { locked },
    });
    return { updated: result.count };
  }

  async bulkDelete(tagIds: string[]): Promise<{ deleted: number }> {
    if (!tagIds.length) return { deleted: 0 };
    if (tagIds.length > this.cfg.maxBulkIds) {
      throw new Error(`Maximum ${this.cfg.maxBulkIds} tags per bulk operation`);
    }
    const tags = await this.prisma.tag.findMany({ where: { id: { in: tagIds } } });
    const allowed = tags
      .filter((t) => !t.locked && !t.protected)
      .map((t) => t.id);
    if (allowed.length === 0) return { deleted: 0 };

    // Disconnect posts, remove followers, then delete
    for (const id of allowed) {
      await this.prisma.tag.update({ where: { id }, data: { posts: { set: [] } } });
    }
    await this.prisma.tagFollow.deleteMany({ where: { tagId: { in: allowed } } });
    const result = await this.prisma.tag.deleteMany({ where: { id: { in: allowed } } });
    return { deleted: result.count };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LINKED / COMPANION TAGS
  // ═══════════════════════════════════════════════════════════════════════════

  async expandLinkedTags(tagIds: string[]): Promise<string[]> {
    if (!tagIds.length) return [];
    const tags = await this.prisma.tag.findMany({
      where: { id: { in: tagIds } },
      select: { id: true, linkedTagIds: true },
    });
    const expanded = new Set<string>(tagIds);
    tags.forEach((t) => {
      (t.linkedTagIds || []).forEach((lid: string) => expanded.add(lid));
    });
    return [...expanded];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FOLLOWING (DEV.to-inspired)
  // ═══════════════════════════════════════════════════════════════════════════

  async followTag(tagId: string, userId: string, weight = 1): Promise<TagFollowData> {
    if (!this.cfg.enableFollowing) throw new Error('Tag following is disabled');
    const existing = await this.prisma.tagFollow.findUnique({
      where: { tagId_userId: { tagId, userId } },
    });
    if (existing) throw new Error('Already following this tag');
    return await this.prisma.tagFollow.create({
      data: { tagId, userId, weight },
    }) as TagFollowData;
  }

  async unfollowTag(tagId: string, userId: string): Promise<void> {
    if (!this.cfg.enableFollowing) throw new Error('Tag following is disabled');
    await this.prisma.tagFollow.delete({
      where: { tagId_userId: { tagId, userId } },
    }).catch(() => { throw new Error('Not following this tag'); });
  }

  async getFollowedTags(userId: string): Promise<Array<TagData & { weight: number }>> {
    const follows = await this.prisma.tagFollow.findMany({
      where: { userId },
      include: { tag: true },
      orderBy: { weight: 'desc' },
    });
    return follows.map((f: { tag: TagData; weight: number }) => ({ ...f.tag, weight: f.weight }));
  }

  async isFollowing(tagId: string, userId: string): Promise<boolean> {
    const follow = await this.prisma.tagFollow.findUnique({
      where: { tagId_userId: { tagId, userId } },
    });
    return !!follow;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TRENDING
  // ═══════════════════════════════════════════════════════════════════════════

  async updateTrendingTags(): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - this.cfg.trendingWindowDays);

    // Count tag usage in recently-published posts
    const recentPosts = await this.prisma.post.findMany({
      where: {
        status: 'PUBLISHED',
        publishedAt: { gte: cutoff },
      },
      include: { tags: { select: { id: true } } },
    });

    const tagUsage: Record<string, number> = {};
    recentPosts.forEach((post: { tags: { id: string }[] }) => {
      post.tags.forEach((tag: { id: string }) => {
        tagUsage[tag.id] = (tagUsage[tag.id] || 0) + 1;
      });
    });

    const trendingIds = Object.entries(tagUsage)
      .sort(([, a], [, b]) => b - a)
      .slice(0, this.cfg.trendingLimit)
      .map(([id]) => id);

    // Reset all, then set trending
    await this.prisma.tag.updateMany({ where: {}, data: { trending: false } });
    if (trendingIds.length > 0) {
      await this.prisma.tag.updateMany({
        where: { id: { in: trendingIds } },
        data: { trending: true },
      });
    }

    return trendingIds.length;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ANALYTICS
  // ═══════════════════════════════════════════════════════════════════════════

  async getAnalytics(): Promise<TagAnalytics> {
    const [totalTags, tags, topTags, recentlyCreated, unusedTags] = await Promise.all([
      this.prisma.tag.count(),
      this.prisma.tag.findMany({
        select: {
          id: true, name: true, usageCount: true, trending: true, featured: true,
          parentId: true, synonyms: true, synonymHits: true, linkedTagIds: true,
          createdAt: true, locked: true, mergeCount: true,
          parent: { select: { name: true } },
          _count: { select: { posts: true, children: true } },
        },
      }),
      this.prisma.tag.findMany({
        orderBy: { usageCount: 'desc' },
        take: 20,
        select: { id: true, name: true, slug: true, usageCount: true },
      }),
      this.prisma.tag.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, name: true, createdAt: true },
      }),
      this.prisma.tag.findMany({
        where: { usageCount: 0 },
        orderBy: { createdAt: 'asc' },
        take: 20,
        select: { id: true, name: true, createdAt: true },
      }),
    ]);

    const orphanedTags = tags.filter((t) => t._count.posts === 0 && t._count.children === 0).length;
    const avgUsageCount = tags.length > 0
      ? tags.reduce((sum: number, t) => sum + t.usageCount, 0) / tags.length
      : 0;

    // Tags grouped by parent
    const parentMap = new Map<string | null, number>();
    for (const tag of tags) {
      const pName = tag.parent?.name ?? null;
      parentMap.set(pName, (parentMap.get(pName) ?? 0) + 1);
    }
    const tagsByParent = [...parentMap.entries()]
      .map(([parentName, count]) => ({ parentName, count }))
      .sort((a, b) => b.count - a.count);

    // Synonym utilization
    const totalSynonyms = tags.reduce((s: number, t) => s + t.synonyms.length, 0);
    const totalHits = tags.reduce((s: number, t) => s + t.synonymHits, 0);

    // Duplicate candidates (quick check)
    const duplicates = await this.findDuplicateTags(0.35);
    const duplicateCandidates = duplicates.length;

    // Health score (0-100)
    const recommendations: string[] = [];
    let healthScore = 100;

    if (orphanedTags > totalTags * 0.3) {
      healthScore -= 15;
      recommendations.push(`${orphanedTags} orphaned tags (${Math.round(orphanedTags / totalTags * 100)}%) — consider cleanup`);
    }
    if (duplicateCandidates > 5) {
      healthScore -= 10;
      recommendations.push(`${duplicateCandidates} potential duplicate pairs — merge them`);
    }
    const unparented = tags.filter((t) => !t.parentId).length;
    if (unparented > 20) {
      healthScore -= 10;
      recommendations.push(`${unparented} root-level tags — organize into hierarchy`);
    }
    const noSynonyms = tags.filter((t) => t.synonyms.length === 0).length;
    if (noSynonyms > totalTags * 0.5) {
      healthScore -= 5;
      recommendations.push(`${noSynonyms} tags lack synonyms — add for better auto-tag matching`);
    }
    if (avgUsageCount < 2) {
      healthScore -= 10;
      recommendations.push('Low average usage — run batch auto-tag to improve coverage');
    }
    if (recommendations.length === 0) {
      recommendations.push('Tag taxonomy is healthy! All metrics look good.');
    }

    return {
      totalTags,
      orphanedTags,
      duplicateCandidates,
      avgUsageCount: Math.round(avgUsageCount * 10) / 10,
      topTags: topTags as TagSummary[],
      recentlyCreated,
      unusedTags,
      tagsByParent,
      synonymUtilization: {
        totalSynonyms,
        totalHits,
        avgHitsPerTag: totalTags > 0 ? Math.round(totalHits / totalTags * 10) / 10 : 0,
      },
      healthScore: Math.max(0, healthScore),
      recommendations,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DUPLICATE DETECTION (Levenshtein)
  // ═══════════════════════════════════════════════════════════════════════════

  async findDuplicateTags(threshold?: number): Promise<DuplicateCandidate[]> {
    const cutoff = threshold ?? this.cfg.duplicateThreshold;
    const tags: TagSummary[] = await this.prisma.tag.findMany({
      select: { id: true, name: true, slug: true, usageCount: true },
    });

    const duplicates: DuplicateCandidate[] = [];
    for (let i = 0; i < tags.length; i++) {
      for (let j = i + 1; j < tags.length; j++) {
        const score = this.similarity(tags[i].name, tags[j].name);
        if (score >= cutoff) {
          duplicates.push({ a: tags[i], b: tags[j], score: Number(score.toFixed(2)) });
        }
      }
    }
    return duplicates.sort((x, y) => y.score - x.score).slice(0, 50);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BULK DUPLICATE MERGE
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Group duplicate candidates into merge clusters using Union-Find.
   * Each group keeps the highest-usageCount tag as the survivor.
   */
  async groupDuplicates(
    threshold?: number,
    excludeIds?: string[],
  ): Promise<DuplicateGroup[]> {
    const candidates = await this.findDuplicateTags(threshold);
    const excluded = new Set(excludeIds ?? []);

    // Union-Find to cluster transitive duplicates
    const parent = new Map<string, string>();
    const find = (id: string): string => {
      if (!parent.has(id)) parent.set(id, id);
      let root = id;
      while (parent.get(root) !== root) root = parent.get(root)!;
      // Path compression
      let curr = id;
      while (curr !== root) {
        const next = parent.get(curr)!;
        parent.set(curr, root);
        curr = next;
      }
      return root;
    };
    const union = (a: string, b: string): void => {
      parent.set(find(a), find(b));
    };

    // Build clusters from candidate pairs
    const tagMap = new Map<string, TagSummary>();
    const maxScores = new Map<string, number>();

    for (const c of candidates) {
      if (excluded.has(c.a.id) || excluded.has(c.b.id)) continue;
      tagMap.set(c.a.id, c.a);
      tagMap.set(c.b.id, c.b);
      union(c.a.id, c.b.id);

      // Track max similarity per root
      const root = find(c.a.id);
      maxScores.set(root, Math.max(maxScores.get(root) ?? 0, c.score));
    }

    // Collect groups by root
    const groups = new Map<string, TagSummary[]>();
    for (const [id] of tagMap) {
      const root = find(id);
      if (!groups.has(root)) groups.set(root, []);
      groups.get(root)!.push(tagMap.get(id)!);
    }

    // Build result — survivor = highest usageCount (ties: alphabetical name)
    const result: DuplicateGroup[] = [];
    for (const [root, members] of groups) {
      if (members.length < 2) continue;
      members.sort((a, b) => b.usageCount - a.usageCount || a.name.localeCompare(b.name));
      const [survivor, ...dupes] = members;
      result.push({
        survivor,
        duplicates: dupes,
        maxScore: maxScores.get(root) ?? 0,
      });
    }

    return result.sort((a, b) => b.maxScore - a.maxScore);
  }

  /**
   * Auto-detect and merge all duplicate tag groups.
   *
   * For each group, the tag with the highest usageCount survives.
   * ALL posts from every duplicate tag get reconnected to the survivor.
   * Synonyms and followers are also transferred.
   *
   * @param threshold  Similarity threshold (0.0–1.0, default: cfg.duplicateThreshold)
   * @param dryRun     If true, returns what would be merged without doing it
   * @param excludeIds Tag IDs to exclude from merging (e.g. protected tags)
   */
  async bulkMergeDuplicates(
    threshold?: number,
    dryRun = false,
    excludeIds?: string[],
  ): Promise<BulkMergeResult> {
    const groups = await this.groupDuplicates(threshold, excludeIds);

    if (dryRun || groups.length === 0) {
      return {
        groupsMerged: groups.length,
        tagsDeleted: groups.reduce((sum, g) => sum + g.duplicates.length, 0),
        merges: groups.map((g) => ({
          survivorId: g.survivor.id,
          survivorName: g.survivor.name,
          mergedIds: g.duplicates.map((d) => d.id),
          postsRelinked: 0, // unknown in dry-run
        })),
      };
    }

    const merges: BulkMergeResult['merges'] = [];

    for (const group of groups) {
      const sourceIds = group.duplicates.map((d) => d.id);
      const targetId = group.survivor.id;

      // Fetch full data with posts
      const sourceTags = await this.prisma.tag.findMany({
        where: { id: { in: sourceIds } },
        include: { posts: true },
      });
      const target = await this.prisma.tag.findUnique({
        where: { id: targetId },
        include: { posts: true },
      });
      if (!target) continue;

      // Union all post IDs
      const allPostIds = new Set<string>();
      target.posts.forEach((p: { id: string }) => allPostIds.add(p.id));
      sourceTags.forEach((t) =>
        t.posts.forEach((p: { id: string }) => allPostIds.add(p.id)),
      );

      // Merge synonyms — source names become synonyms of the survivor
      const mergedSynonyms = new Set<string>(target.synonyms);
      for (const src of sourceTags) {
        mergedSynonyms.add(src.name.toLowerCase());
        (src.synonyms ?? []).forEach((s: string) => mergedSynonyms.add(s));
      }
      mergedSynonyms.delete(target.name.toLowerCase()); // don't add self

      // Transfer followers
      await this.prisma.tagFollow.updateMany({
        where: { tagId: { in: sourceIds } },
        data: { tagId: targetId },
      });

      // Update survivor: reconnect all posts, bump synonyms & usage
      await this.prisma.tag.update({
        where: { id: targetId },
        data: {
          posts: { set: [...allPostIds].map((pid) => ({ id: pid })) },
          usageCount: allPostIds.size,
          mergeCount: { increment: sourceIds.length },
          synonyms: [...mergedSynonyms],
        },
      });

      // Disconnect posts from sources, then delete
      for (const src of sourceTags) {
        await this.prisma.tag.update({
          where: { id: src.id },
          data: { posts: { set: [] } },
        });
      }
      await this.prisma.tag.deleteMany({ where: { id: { in: sourceIds } } });

      merges.push({
        survivorId: targetId,
        survivorName: target.name,
        mergedIds: sourceIds,
        postsRelinked: allPostIds.size,
      });
    }

    return {
      groupsMerged: merges.length,
      tagsDeleted: merges.reduce((sum, m) => sum + m.mergedIds.length, 0),
      merges,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CLEANUP
  // ═══════════════════════════════════════════════════════════════════════════

  async cleanupOrphanedTags(): Promise<{ deleted: number; skipped: number }> {
    // Respect protected and protectAll settings
    const where: Record<string, unknown> = {
      usageCount: 0,
      locked: false,
      featured: false,
    };
    if (!this.cfg.protectAll) {
      where.protected = false;
    } else {
      // protectAll=true means don't auto-delete ANY zero-count tags
      return { deleted: 0, skipped: 0 };
    }

    // Respect autoCleanupDays: only clean tags older than N days
    if (this.cfg.autoCleanupDays > 0) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - this.cfg.autoCleanupDays);
      where.createdAt = { lt: cutoff };
    }

    const orphans = await this.prisma.tag.findMany({
      where,
      select: { id: true, _count: { select: { posts: true, children: true } } },
    });

    let deleted = 0;
    let skipped = 0;
    for (const tag of orphans) {
      if (tag._count.posts === 0 && tag._count.children === 0) {
        await this.prisma.tagFollow.deleteMany({ where: { tagId: tag.id } });
        await this.prisma.tag.delete({ where: { id: tag.id } });
        deleted++;
      } else {
        skipped++;
      }
    }
    return { deleted, skipped };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INTERNAL UTILITIES
  // ═══════════════════════════════════════════════════════════════════════════

  slugify(text: string): string {
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, this.cfg.maxSlugLength);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TREE PATH COMPUTATION (Tagulous-inspired)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Compute path, label, and level for a tag based on its name and parent.
   * Path = parent.path + '/' + slug, or just slug if root.
   * Label = last segment of the name.
   * Level = depth (1 = root).
   */
  private async computeTreeFields(
    name: string,
    parentId: string | null,
  ): Promise<{ path: string | null; label: string | null; level: number }> {
    if (!this.cfg.enableTree) {
      return { path: null, label: null, level: 1 };
    }

    const slug = this.slugify(name);
    const sep = this.cfg.treeSeparator;

    // Parse name for tree segments if it contains the separator
    const segments = name.split(sep).map((s) => s.trim()).filter(Boolean);
    const label = segments[segments.length - 1] || name;

    if (!parentId) {
      return { path: slug, label, level: 1 };
    }

    // Walk up the parent chain to build full path
    const pathParts: string[] = [slug];
    let currentParentId: string | null = parentId;
    let level = 1;

    while (currentParentId) {
      const parent = await this.prisma.tag.findUnique({
        where: { id: currentParentId },
        select: { slug: true, parentId: true },
      });
      if (!parent) break;
      pathParts.unshift(parent.slug);
      currentParentId = parent.parentId;
      level++;
    }

    return {
      path: pathParts.join('/'),
      label,
      level: level + 1 - 1, // +1 for self, -1 because loop already counts parent chain
    };
  }

  /**
   * Rebuild tree paths for all tags.
   * Call after bulk hierarchy changes or migration.
   */
  async rebuildTreePaths(): Promise<{ updated: number }> {
    if (!this.cfg.enableTree) return { updated: 0 };

    const allTags = await this.prisma.tag.findMany({
      select: { id: true, name: true, slug: true, parentId: true },
      orderBy: { name: 'asc' },
    });

    // Build lookup
    let updated = 0;

    for (const tag of allTags) {
      const { path, label, level } = await this.computeTreeFields(
        tag.name,
        tag.parentId,
      );
      await this.prisma.tag.update({
        where: { id: tag.id },
        data: { path, label, level },
      });
      updated++;
    }

    return { updated };
  }

  /**
   * Get ancestors of a tag (Tagulous get_ancestors).
   */
  async getAncestors(tagId: string): Promise<TagData[]> {
    const ancestors: TagData[] = [];
    let current = await this.prisma.tag.findUnique({
      where: { id: tagId },
      select: { parentId: true },
    });

    while (current?.parentId) {
      const parent = await this.prisma.tag.findUnique({ where: { id: current.parentId } });
      if (!parent) break;
      ancestors.unshift(parent as TagData);
      current = parent;
    }
    return ancestors;
  }

  /**
   * Get descendants of a tag (Tagulous get_descendants).
   */
  async getDescendants(tagId: string): Promise<TagData[]> {
    const result: TagData[] = [];
    const queue = [tagId];

    while (queue.length > 0) {
      const parentId = queue.shift()!;
      const children = await this.prisma.tag.findMany({
        where: { parentId },
      });
      for (const child of children) {
        result.push(child as TagData);
        queue.push(child.id);
      }
    }
    return result;
  }

  /**
   * Get siblings of a tag (same parent).
   */
  async getSiblings(tagId: string): Promise<TagData[]> {
    const tag = await this.prisma.tag.findUnique({
      where: { id: tagId },
      select: { parentId: true },
    });
    if (!tag) return [];

    return this.prisma.tag.findMany({
      where: { parentId: tag.parentId, id: { not: tagId } },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Get the full tag tree as a nested structure (Tagulous as_nested_list).
   */
  async getNestedTree(parentId: string | null = null): Promise<TagTreeNode[]> {
    const tags = await this.prisma.tag.findMany({
      where: { parentId },
      orderBy: { name: 'asc' },
    });

    const tree: TagTreeNode[] = [];
    for (const tag of tags) {
      const children = await this.getNestedTree(tag.id);
      tree.push({ tag: tag as TagData, children });
    }
    return tree;
  }

  /**
   * Enforce maxTagsPerPost — validates tag count before assignment.
   */
  async validateTagCount(postId: string, additionalTagIds: string[]): Promise<void> {
    if (this.cfg.maxTagsPerPost <= 0) return; // unlimited

    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { _count: { select: { tags: true } } },
    });
    const current = post?._count?.tags ?? 0;
    const total = current + additionalTagIds.length;

    if (total > this.cfg.maxTagsPerPost) {
      throw new Error(
        `Cannot add ${additionalTagIds.length} tags: would exceed max of ${this.cfg.maxTagsPerPost} tags per post (current: ${current})`,
      );
    }
  }

  private async wouldCycle(tagId: string, parentId: string): Promise<boolean> {
    let current: string | null = parentId;
    const visited = new Set<string>();
    while (current) {
      if (current === tagId) return true;
      if (visited.has(current)) return true;
      visited.add(current);
      const parent = await this.prisma.tag.findUnique({
        where: { id: current },
        select: { parentId: true },
      });
      current = parent?.parentId ?? null;
    }
    return false;
  }

  private similarity(a: string, b: string): number {
    const s = a.toLowerCase();
    const t = b.toLowerCase();
    if (s === t) return 1;
    const len = Math.max(s.length, t.length);
    return 1 - this.levenshtein(s, t) / len;
  }

  private levenshtein(a: string, b: string): number {
    const m: number[][] = [];
    for (let i = 0; i <= b.length; i++) m[i] = [i];
    for (let j = 0; j <= a.length; j++) m[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        m[i][j] = b[i - 1] === a[j - 1]
          ? m[i - 1][j - 1]
          : Math.min(m[i - 1][j - 1] + 1, m[i][j - 1] + 1, m[i - 1][j] + 1);
      }
    }
    return m[b.length][a.length];
  }
}
