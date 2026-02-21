// tags/autocomplete.service.ts
// Tagulous-inspired autocomplete/typeahead service for tag input
// Supports startsWith + contains modes, pagination, tree paths, initial tags,
// case control, and real-time completion while typing
// Pure TS + Prisma — zero framework dependency

import type {
  TagsPrismaClient,
  TagsConfig,
  AutocompleteQuery,
  AutocompleteResult,
  AutocompleteResponse,
  TagCloudItem,
} from '../types';
import { AutocompleteMode } from '../types';
import { DEFAULT_CONFIG } from './constants';
import { similarity } from './string-utils';

export class AutocompleteService {
  private readonly cfg: Required<TagsConfig>;

  constructor(
    private readonly prisma: TagsPrismaClient,
    config: Partial<TagsConfig> = {},
  ) {
    this.cfg = { ...DEFAULT_CONFIG, ...config };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // AUTOCOMPLETE WHILE TYPING
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Primary autocomplete endpoint — called on every keystroke in the tag input.
   * Tagulous-style: supports startsWith (default) or contains (fulltext) modes,
   * pagination, case sensitivity, tree-path matching, and synonym matching.
   */
  async autocomplete(query: AutocompleteQuery): Promise<AutocompleteResponse> {
    const q = query.q.trim();
    const page = query.page ?? 1;
    const limit = query.limit ?? this.cfg.autocompleteLimit;
    const mode = query.mode ?? this.cfg.autocompleteMode;
    const skip = (page - 1) * limit;

    // If query is empty, return initial / popular tags
    if (!q || q.length < this.cfg.autocompleteMinChars) {
      return this.getInitialSuggestions(limit, page);
    }

    // Apply case sensitivity
    const searchQ = this.cfg.caseSensitive ? q : q;
    const caseMode = this.cfg.caseSensitive ? 'default' : 'insensitive';

    // Build Prisma where clause based on mode
    const nameCondition = mode === AutocompleteMode.CONTAINS
      ? { contains: searchQ, mode: caseMode }
      : { startsWith: searchQ, mode: caseMode };

    const where: Record<string, unknown> = {
      OR: [
        { name: nameCondition },
        { slug: mode === AutocompleteMode.CONTAINS
          ? { contains: searchQ, mode: caseMode }
          : { startsWith: searchQ, mode: caseMode }
        },
        // Match against synonyms
        { synonyms: { has: this.cfg.forceLowercase ? searchQ.toLowerCase() : searchQ.toLowerCase() } },
      ],
    };

    // If tree mode, also match against path
    if (this.cfg.enableTree) {
      (where.OR as Record<string, unknown>[]).push({
        path: mode === AutocompleteMode.CONTAINS
          ? { contains: searchQ, mode: caseMode }
          : { startsWith: searchQ, mode: caseMode },
      });
    }

    // Scope to parent if specified
    if (query.parentId !== undefined) {
      where.parentId = query.parentId;
    }

    const selectFields = {
      id: true,
      name: true,
      slug: true,
      path: true,
      color: true,
      icon: true,
      description: true,
      usageCount: true,
      trending: true,
      featured: true,
    } as const;

    const [results, total] = await Promise.all([
      this.prisma.tag.findMany({
        where,
        select: selectFields,
        orderBy: [
          { trending: 'desc' },
          { featured: 'desc' },
          { usageCount: 'desc' },
          { name: 'asc' },
        ],
        skip,
        take: limit,
      }),
      this.prisma.tag.count({ where }),
    ]);

    const mapped: AutocompleteResult[] = results.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      path: t.path,
      color: t.color,
      icon: t.icon,
      description: t.description ?? null,
      usageCount: t.usageCount,
      trending: t.trending ?? false,
      featured: t.featured ?? false,
      isExisting: true as const,
    }));

    // ── Fuzzy fallback: if primary results are sparse, add Levenshtein matches ──
    if (mapped.length < limit) {
      const existingIds = new Set(mapped.map((r) => r.id));
      const candidates = await this.prisma.tag.findMany({
        where: { id: { notIn: [...existingIds] } },
        select: selectFields,
        orderBy: { usageCount: 'desc' },
        take: 50,
      });

      const fuzzyMatches = candidates
        .map((c) => ({ tag: c, score: similarity(q.toLowerCase(), c.name.toLowerCase()) }))
        .filter((m) => m.score >= 0.6)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit - mapped.length);

      for (const { tag: t } of fuzzyMatches) {
        mapped.push({
          id: t.id,
          name: t.name,
          slug: t.slug,
          path: t.path,
          color: t.color,
          icon: t.icon,
          description: t.description ?? null,
          usageCount: t.usageCount,
          trending: t.trending ?? false,
          featured: t.featured ?? false,
          isExisting: true as const,
          fuzzy: true,
        });
      }
    }

    return {
      results: mapped,
      total: total + mapped.length - results.length, // account for fuzzy additions
      page,
      hasMore: skip + limit < total,
    };
  }

  /**
   * Initial suggestions shown before user types anything (Tagulous autocomplete_initial).
   * Returns: initial/seed tags if configured, otherwise most popular tags.
   */
  async getInitialSuggestions(limit: number, page = 1): Promise<AutocompleteResponse> {
    const skip = (page - 1) * limit;

    const selectFields = {
      id: true, name: true, slug: true, path: true,
      color: true, icon: true, description: true,
      usageCount: true, trending: true, featured: true,
    } as const;

    const mapResult = (t: { id: string; name: string; slug: string; path: string | null; color: string | null; icon: string | null; description: string | null; usageCount: number; trending: boolean; featured: boolean }): AutocompleteResult => ({
      id: t.id, name: t.name, slug: t.slug, path: t.path,
      color: t.color, icon: t.icon, description: t.description ?? null,
      usageCount: t.usageCount, trending: t.trending ?? false,
      featured: t.featured ?? false, isExisting: true as const,
    });

    // If initial tags are configured, return those first
    if (this.cfg.initialTags.length > 0) {
      const initialResults = await this.prisma.tag.findMany({
        where: { name: { in: this.cfg.initialTags, mode: 'insensitive' } },
        select: selectFields,
        skip,
        take: limit,
      });
      const total = await this.prisma.tag.count({
        where: { name: { in: this.cfg.initialTags, mode: 'insensitive' } },
      });
      return {
        results: initialResults.map(mapResult),
        total,
        page,
        hasMore: skip + limit < total,
      };
    }

    // Fallback: most popular tags
    const [results, total] = await Promise.all([
      this.prisma.tag.findMany({
        orderBy: [{ trending: 'desc' }, { featured: 'desc' }, { usageCount: 'desc' }],
        select: selectFields,
        skip,
        take: limit,
      }),
      this.prisma.tag.count(),
    ]);

    return {
      results: results.map(mapResult),
      total,
      page,
      hasMore: skip + limit < total,
    };
  }

  /**
   * Tree-path autocomplete: when user types "Animal/" suggest children.
   * Splits on tree separator and resolves to children of the matched parent.
   */
  async autocompleteTreePath(pathInput: string): Promise<AutocompleteResponse> {
    if (!this.cfg.enableTree) {
      return { results: [], total: 0, page: 1, hasMore: false };
    }

    const sep = this.cfg.treeSeparator;
    const parts = pathInput.split(sep).filter(Boolean);

    if (parts.length === 0) {
      // Top-level tags (no parent)
      return this.autocomplete({ q: '', parentId: null });
    }

    // Find parent by walking the tree
    let parentId: string | null = null;
    for (let i = 0; i < parts.length - 1; i++) {
      const segment = parts[i].trim();
      const parent = await this.prisma.tag.findFirst({
        where: {
          parentId,
          OR: [
            { name: { equals: segment, mode: 'insensitive' } },
            { slug: { equals: segment, mode: 'insensitive' } },
          ],
        },
        select: { id: true },
      });
      if (!parent) return { results: [], total: 0, page: 1, hasMore: false };
      parentId = parent.id;
    }

    // Last segment is the partial query for children
    const lastSegment = parts[parts.length - 1].trim();
    return this.autocomplete({ q: lastSegment, parentId });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TAG CLOUD (Tagulous weight() method)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Generate weighted tag cloud data.
   * Tagulous style: annotates a weight between min and max based on usage count.
   */
  async getTagCloud(opts: {
    minWeight?: number;
    maxWeight?: number;
    limit?: number;
    parentId?: string | null;
  } = {}): Promise<TagCloudItem[]> {
    const minW = opts.minWeight ?? this.cfg.tagCloudMin;
    const maxW = opts.maxWeight ?? this.cfg.tagCloudMax;
    const limit = opts.limit ?? 100;

    const where: Record<string, unknown> = { usageCount: { gt: 0 } };
    if (opts.parentId !== undefined) where.parentId = opts.parentId;

    const tags = await this.prisma.tag.findMany({
      where,
      select: { id: true, name: true, slug: true, color: true, usageCount: true },
      orderBy: { usageCount: 'desc' },
      take: limit,
    });

    if (tags.length === 0) return [];

    const counts = tags.map((t) => t.usageCount);
    const minCount = Math.min(...counts);
    const maxCount = Math.max(...counts);
    const range = maxCount - minCount || 1;

    return tags.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      color: t.color,
      usageCount: t.usageCount,
      weight: Math.round(
        minW + ((t.usageCount - minCount) / range) * (maxW - minW),
      ),
    }));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // REAL-TIME COMPLETION HELPERS (for editor UI integration)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Multi-tag input completion: parse a tag string being typed and autocomplete
   * only the last (in-progress) tag. Tagulous-style live parsing.
   *
   * Example: user types "javascript, rea" → completes "rea" → "react"
   */
  async completeLastTag(
    rawInput: string,
    opts: { spaceDelimiter?: boolean; limit?: number } = {},
  ): Promise<{ parsed: string[]; completing: string; suggestions: AutocompleteResponse }> {
    const useSpaces = opts.spaceDelimiter ?? this.cfg.spaceDelimiter;
    const delimiter = useSpaces ? /[,\s]+/ : /,\s*/;

    // Split the input
    const parts = rawInput.split(delimiter).map((s) => s.trim()).filter(Boolean);
    const completing = parts.pop() || '';
    const parsed = parts; // tags already finalized

    // Autocomplete only the last part
    const suggestions = completing.length >= this.cfg.autocompleteMinChars
      ? await this.autocomplete({ q: completing, limit: opts.limit })
      : await this.getInitialSuggestions(opts.limit ?? this.cfg.autocompleteLimit);

    // Filter out already-selected tags
    const selectedSlugs = new Set(parsed.map((p) => p.toLowerCase()));
    suggestions.results = suggestions.results.filter(
      (r) => !selectedSlugs.has(r.name.toLowerCase()) && !selectedSlugs.has(r.slug),
    );

    return { parsed, completing, suggestions };
  }

  /**
   * Debounce-friendly quick search: returns minimal data for fastest response.
   * Use this in 100-200ms debounced input handlers.
   */
  async quickSearch(q: string, limit = 8): Promise<Array<{ id: string; name: string; slug: string }>> {
    if (!q || q.length < this.cfg.autocompleteMinChars) return [];

    const caseMode = this.cfg.caseSensitive ? 'default' : 'insensitive';

    return this.prisma.tag.findMany({
      where: {
        OR: [
          { name: { startsWith: q, mode: caseMode } },
          { slug: { startsWith: q, mode: caseMode } },
        ],
      },
      select: { id: true, name: true, slug: true },
      orderBy: { usageCount: 'desc' },
      take: limit,
    });
  }

  /**
   * Resolve a tag string to existing tag records.
   * Input: "javascript, react, vue"
   * Output: array of matching tag records + array of unmatched names
   */
  async resolveTagString(
    tagString: string,
    opts: { createMissing?: boolean; spaceDelimiter?: boolean } = {},
  ): Promise<{ resolved: AutocompleteResult[]; unmatched: string[] }> {
    const useSpaces = opts.spaceDelimiter ?? this.cfg.spaceDelimiter;
    const delimiter = useSpaces ? /[,\s]+/ : /,\s*/;
    const names = tagString.split(delimiter).map((s) => s.trim()).filter(Boolean);

    const resolved: AutocompleteResult[] = [];
    const unmatched: string[] = [];

    for (const name of names) {
      const tag = await this.prisma.tag.findFirst({
        where: {
          OR: [
            { name: { equals: name, mode: 'insensitive' } },
            { slug: { equals: name.toLowerCase().replace(/\s+/g, '-'), mode: 'insensitive' } },
            { synonyms: { has: name.toLowerCase() } },
          ],
        },
        select: { id: true, name: true, slug: true, path: true, color: true, icon: true, description: true, usageCount: true, trending: true, featured: true },
      });

      if (tag) {
        resolved.push({ ...tag, description: tag.description ?? null, trending: tag.trending ?? false, featured: tag.featured ?? false, isExisting: true });
      } else if (opts.createMissing) {
        const slug = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
        const appliedName = this.cfg.forceLowercase ? name.toLowerCase() : name;
        const created = await this.prisma.tag.create({
          data: {
            name: appliedName,
            slug,
            usageCount: 0,
            protected: this.cfg.protectInitial,
          },
          select: { id: true, name: true, slug: true, path: true, color: true, icon: true, description: true, usageCount: true, trending: true, featured: true },
        });
        resolved.push({ ...created, description: created.description ?? null, trending: created.trending ?? false, featured: created.featured ?? false, isExisting: true });
      } else {
        unmatched.push(name);
      }
    }

    return { resolved, unmatched };
  }

  /**
   * Update the runtime config (e.g. after admin changes settings in DB).
   */
  updateConfig(newConfig: Partial<TagsConfig>): void {
    Object.assign(this.cfg, newConfig);
  }
}
