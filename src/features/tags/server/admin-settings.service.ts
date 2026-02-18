// tags/admin-settings.service.ts
// DB-backed dynamic tag system settings — fully configurable from admin panel
// All tag behavior (autocomplete, case, tree, protection, limits) is controlled
// at runtime through this service. Changes persist in PostgreSQL via TagSettings model.
// Pure TS + Prisma — zero framework dependency

import type {
  TagsPrismaClient,
  TagSystemSettings,
  TagsConfig,
} from '../types';
import { AutocompleteMode } from '../types';
import { DEFAULT_CONFIG } from './constants';

// Services to propagate config updates to
interface ConfigConsumer {
  updateConfig(cfg: Partial<TagsConfig>): void;
}

export class AdminSettingsService {
  /** Cached settings — loaded once, updated on write */
  private cached: TagSystemSettings | null = null;

  /** Registered services that need config propagation */
  private consumers: ConfigConsumer[] = [];

  constructor(
    private readonly prisma: TagsPrismaClient,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // SERVICE REGISTRATION — services register to receive config updates
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Register a service that should receive config updates when admin changes settings.
   * Typically called during app bootstrap:
   *   adminSettings.registerConsumer(tagService);
   *   adminSettings.registerConsumer(autocompleteService);
   *   adminSettings.registerConsumer(autoTaggingService);
   */
  registerConsumer(consumer: ConfigConsumer): void {
    if (!this.consumers.includes(consumer)) {
      this.consumers.push(consumer);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // READ SETTINGS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get current tag system settings.
   * Uses cache if available; loads from DB on first call.
   * Admin panel calls this to populate the settings form.
   */
  async getSettings(): Promise<TagSystemSettings> {
    if (this.cached) return this.cached;
    return this.loadFromDb();
  }

  /**
   * Force reload settings from DB (bypasses cache).
   * Useful after direct DB edits or multi-instance sync.
   */
  async reloadSettings(): Promise<TagSystemSettings> {
    this.cached = null;
    return this.loadFromDb();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UPDATE SETTINGS (Admin panel writes)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Update tag system settings from admin panel.
   * Partial updates — only changed fields need to be sent.
   * Automatically propagates to all registered services.
   */
  async updateSettings(
    changes: Partial<Omit<TagSystemSettings, 'id' | 'updatedAt'>>,
    updatedBy?: string,
  ): Promise<TagSystemSettings> {
    const current = await this.getSettings();

    const data: Record<string, unknown> = {};

    // Core behavior
    if (changes.caseSensitive !== undefined) data.caseSensitive = changes.caseSensitive;
    if (changes.forceLowercase !== undefined) data.forceLowercase = changes.forceLowercase;
    if (changes.spaceDelimiter !== undefined) data.spaceDelimiter = changes.spaceDelimiter;
    if (changes.maxTagsPerPost !== undefined) data.maxTagsPerPost = changes.maxTagsPerPost;

    // Autocomplete
    if (changes.autocompleteLimit !== undefined) data.autocompleteLimit = changes.autocompleteLimit;
    if (changes.autocompleteMode !== undefined) data.autocompleteMode = changes.autocompleteMode;
    if (changes.autocompleteMinChars !== undefined) data.autocompleteMinChars = changes.autocompleteMinChars;

    // Protection
    if (changes.protectAll !== undefined) data.protectAll = changes.protectAll;
    if (changes.protectInitial !== undefined) data.protectInitial = changes.protectInitial;

    // Initial tags
    if (changes.initialTags !== undefined) data.initialTags = changes.initialTags;

    // Tag cloud
    if (changes.tagCloudMin !== undefined) data.tagCloudMin = changes.tagCloudMin;
    if (changes.tagCloudMax !== undefined) data.tagCloudMax = changes.tagCloudMax;

    // Tree
    if (changes.enableTree !== undefined) data.enableTree = changes.enableTree;
    if (changes.treeSeparator !== undefined) data.treeSeparator = changes.treeSeparator;

    // Following
    if (changes.enableFollowing !== undefined) data.enableFollowing = changes.enableFollowing;

    // Auto-tagging
    if (changes.autoTagMaxTags !== undefined) data.autoTagMaxTags = changes.autoTagMaxTags;
    if (changes.autoTagMinConfidence !== undefined) data.autoTagMinConfidence = changes.autoTagMinConfidence;
    if (changes.enableLlmAutoTag !== undefined) data.enableLlmAutoTag = changes.enableLlmAutoTag;

    // Cleanup
    if (changes.autoCleanupDays !== undefined) data.autoCleanupDays = changes.autoCleanupDays;

    // Limits
    if (changes.maxNameLength !== undefined) data.maxNameLength = changes.maxNameLength;
    if (changes.maxDescriptionLength !== undefined) data.maxDescriptionLength = changes.maxDescriptionLength;
    if (changes.maxSynonyms !== undefined) data.maxSynonyms = changes.maxSynonyms;
    if (changes.maxLinkedTags !== undefined) data.maxLinkedTags = changes.maxLinkedTags;
    if (changes.maxBulkIds !== undefined) data.maxBulkIds = changes.maxBulkIds;

    // Metadata
    data.updatedBy = updatedBy ?? null;

    const updated = await this.prisma.tagSettings.update({
      where: { id: current.id },
      data,
    });

    this.cached = updated as TagSystemSettings;

    // Propagate to all registered services
    this.propagateConfig();

    return this.cached;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INITIAL TAGS MANAGEMENT (Tagulous-style)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Load initial/seed tags: create any that are missing.
   * Tagulous equivalent of `python manage.py initial_tags`.
   * Call this during app startup or when admin updates initialTags list.
   */
  async loadInitialTags(
    tags?: Array<{
      name: string;
      slug?: string;
      description?: string;
      color?: string;
      parentName?: string;
      protected?: boolean;
    }>,
  ): Promise<{ created: number; existing: number; restored: number }> {
    const settings = await this.getSettings();
    const tagList: Array<{
      name: string;
      slug?: string;
      description?: string;
      color?: string;
      parentName?: string;
      protected?: boolean;
    }> = tags ?? settings.initialTags.map((name) => ({ name }));

    let created = 0;
    let existing = 0;
    let restored = 0;

    for (const entry of tagList) {
      const name = settings.forceLowercase ? entry.name.toLowerCase() : entry.name;
      const slug = entry.slug ?? this.slugify(name);

      const found = await this.prisma.tag.findFirst({
        where: {
          OR: [
            { slug },
            { name: { equals: name, mode: 'insensitive' } },
          ],
        },
      });

      if (found) {
        existing++;
        // Ensure protected status
        if (settings.protectInitial && !found.protected) {
          await this.prisma.tag.update({
            where: { id: found.id },
            data: { protected: true },
          });
        }
      } else {
        // Create missing initial tag
        let parentId: string | null = null;
        if (entry.parentName) {
          const parent = await this.prisma.tag.findFirst({
            where: { name: { equals: entry.parentName, mode: 'insensitive' } },
          });
          parentId = parent?.id ?? null;
        }

        await this.prisma.tag.create({
          data: {
            name,
            slug,
            description: entry.description ?? null,
            color: entry.color ?? DEFAULT_CONFIG.defaultColor,
            protected: entry.protected ?? settings.protectInitial,
            parentId,
          },
        });
        created++;
        restored++; // Was missing, now restored
      }
    }

    return { created, existing, restored };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ADMIN DASHBOARD DATA
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Returns a full admin overview for the tag settings page.
   * Includes current settings + live stats for the admin panel.
   */
  async getAdminOverview(): Promise<{
    settings: TagSystemSettings;
    stats: {
      totalTags: number;
      protectedTags: number;
      lockedTags: number;
      featuredTags: number;
      trendingTags: number;
      orphanedTags: number;
      totalFollowers: number;
      avgUsageCount: number;
      treeDepthMax: number;
    };
  }> {
    const settings = await this.getSettings();

    const [
      totalTags,
      protectedTags,
      lockedTags,
      featuredTags,
      trendingTags,
      orphanedTags,
      totalFollowers,
      allTags,
    ] = await Promise.all([
      this.prisma.tag.count(),
      this.prisma.tag.count({ where: { protected: true } }),
      this.prisma.tag.count({ where: { locked: true } }),
      this.prisma.tag.count({ where: { featured: true } }),
      this.prisma.tag.count({ where: { trending: true } }),
      this.prisma.tag.count({ where: { usageCount: 0 } }),
      this.prisma.tagFollow.count(),
      this.prisma.tag.findMany({
        select: { usageCount: true, level: true },
      }),
    ]);

    const avgUsage = allTags.length > 0
      ? allTags.reduce((s: number, t) => s + t.usageCount, 0) / allTags.length
      : 0;
    const treeDepthMax = allTags.length > 0
      ? Math.max(...allTags.map((t) => t.level ?? 1))
      : 0;

    return {
      settings,
      stats: {
        totalTags,
        protectedTags,
        lockedTags,
        featuredTags,
        trendingTags,
        orphanedTags,
        totalFollowers,
        avgUsageCount: Math.round(avgUsage * 10) / 10,
        treeDepthMax,
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INTERNAL
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Load settings from DB, creating default row if none exists.
   */
  private async loadFromDb(): Promise<TagSystemSettings> {
    let settings = await this.prisma.tagSettings.findFirst();

    if (!settings) {
      // Auto-create singleton settings row with defaults
      settings = await this.prisma.tagSettings.create({
        data: {
          caseSensitive: DEFAULT_CONFIG.caseSensitive,
          forceLowercase: DEFAULT_CONFIG.forceLowercase,
          spaceDelimiter: DEFAULT_CONFIG.spaceDelimiter,
          maxTagsPerPost: DEFAULT_CONFIG.maxTagsPerPost!,
          autocompleteLimit: DEFAULT_CONFIG.autocompleteLimit,
          autocompleteMode: DEFAULT_CONFIG.autocompleteMode,
          autocompleteMinChars: DEFAULT_CONFIG.autocompleteMinChars,
          protectAll: DEFAULT_CONFIG.protectAll,
          protectInitial: DEFAULT_CONFIG.protectInitial,
          initialTags: DEFAULT_CONFIG.initialTags,
          tagCloudMin: DEFAULT_CONFIG.tagCloudMin,
          tagCloudMax: DEFAULT_CONFIG.tagCloudMax,
          enableTree: DEFAULT_CONFIG.enableTree,
          treeSeparator: DEFAULT_CONFIG.treeSeparator,
          enableFollowing: DEFAULT_CONFIG.enableFollowing,
          autoTagMaxTags: DEFAULT_CONFIG.autoTagMaxTags,
          autoTagMinConfidence: DEFAULT_CONFIG.autoTagMinConfidence,
          enableLlmAutoTag: DEFAULT_CONFIG.enableLlmAutoTag,
          autoCleanupDays: DEFAULT_CONFIG.autoCleanupDays,
          maxNameLength: DEFAULT_CONFIG.maxNameLength,
          maxDescriptionLength: DEFAULT_CONFIG.maxDescriptionLength,
          maxSynonyms: DEFAULT_CONFIG.maxSynonyms,
          maxLinkedTags: DEFAULT_CONFIG.maxLinkedTags,
          maxBulkIds: DEFAULT_CONFIG.maxBulkIds,
        },
      });
    }

    this.cached = settings as TagSystemSettings;
    return this.cached;
  }

  /**
   * Convert DB settings to TagsConfig and propagate to all services.
   */
  private propagateConfig(): void {
    if (!this.cached) return;
    const s = this.cached;

    const config: Partial<TagsConfig> = {
      caseSensitive: s.caseSensitive,
      forceLowercase: s.forceLowercase,
      spaceDelimiter: s.spaceDelimiter,
      maxTagsPerPost: s.maxTagsPerPost,
      autocompleteLimit: s.autocompleteLimit,
      autocompleteMode: s.autocompleteMode as AutocompleteMode,
      autocompleteMinChars: s.autocompleteMinChars,
      protectAll: s.protectAll,
      protectInitial: s.protectInitial,
      initialTags: s.initialTags,
      tagCloudMin: s.tagCloudMin,
      tagCloudMax: s.tagCloudMax,
      enableTree: s.enableTree,
      treeSeparator: s.treeSeparator,
      enableFollowing: s.enableFollowing,
      autoTagMaxTags: s.autoTagMaxTags,
      autoTagMinConfidence: s.autoTagMinConfidence,
      enableLlmAutoTag: s.enableLlmAutoTag,
      autoCleanupDays: s.autoCleanupDays,
      maxNameLength: s.maxNameLength,
      maxDescriptionLength: s.maxDescriptionLength,
      maxSynonyms: s.maxSynonyms,
      maxLinkedTags: s.maxLinkedTags,
      maxBulkIds: s.maxBulkIds,
    };

    for (const consumer of this.consumers) {
      consumer.updateConfig(config);
    }
  }

  private slugify(text: string): string {
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 200);
  }
}
