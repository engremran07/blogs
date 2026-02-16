/**
 * ============================================================================
 * MODULE:   features/editor/admin-settings.service.ts
 * PURPOSE:  DB-backed admin settings for the Rich Text Editor.
 *           Singleton service — reads / writes EditorSettings row via Prisma,
 *           propagates changes to registered EditorConfigConsumer instances,
 *           and builds the frontend-safe settings payload.
 *
 * PATTERN:  Matches captcha, comments, and tags admin-settings services.
 *
 * USAGE:
 *   import { EditorAdminSettingsService } from '@/features/editor';
 *
 *   const svc = new EditorAdminSettingsService(prisma);
 *   await svc.initialise();
 *
 *   // Admin panel: update settings
 *   await svc.updateSettings({ enableImages: false }, adminUserId);
 *
 *   // API route: build settings for frontend
 *   const frontendSettings = svc.getFrontendSettings();
 *
 *   // Register consumer for live config propagation
 *   svc.registerConsumer(myContentService);
 * ============================================================================
 */

import { DEFAULT_EDITOR_CONFIG } from './constants';
import type {
  EditorConfig,
  EditorConfigConsumer,
  EditorSystemSettings,
  EditorAdminProps,
  ApiResponse,
  EditorPrismaClient,
} from '../types';
import type { UpdateEditorSettingsInput } from './schemas';

// ─── Service ────────────────────────────────────────────────────────────────

export class EditorAdminSettingsService {
  private config: Required<EditorConfig>;
  private row: EditorSystemSettings | null = null;
  private consumers: EditorConfigConsumer[] = [];
  private readonly prisma: EditorPrismaClient;

  constructor(prisma: EditorPrismaClient) {
    this.prisma = prisma;
    this.config = { ...DEFAULT_EDITOR_CONFIG };
  }

  // ── Lifecycle ───────────────────────────────────────────────────────────

  /**
   * Load or create the singleton settings row.
   * Should be called once during application bootstrap.
   */
  async initialise(): Promise<void> {
    this.row = await this.prisma.editorSettings.findFirst();

    if (!this.row) {
      this.row = await this.prisma.editorSettings.create({
        data: this.buildCreatePayload(),
      });
    }

    this.applyRow(this.row!);
    this.propagate();
  }

  // ── Consumer Registration ───────────────────────────────────────────────

  /** Register a service that should receive live config updates. */
  registerConsumer(consumer: EditorConfigConsumer): void {
    this.consumers.push(consumer);
    consumer.updateConfig({ ...this.config });
  }

  /** Unregister a consumer. */
  unregisterConsumer(consumer: EditorConfigConsumer): void {
    this.consumers = this.consumers.filter((c) => c !== consumer);
  }

  // ── Admin Write ─────────────────────────────────────────────────────────

  /**
   * Update editor settings from the admin panel.
   * Validates and persists to DB, then propagates to consumers.
   */
  async updateSettings(
    input: UpdateEditorSettingsInput,
    adminUserId: string,
  ): Promise<ApiResponse<EditorSystemSettings>> {
    if (!this.row) {
      return {
        success: false,
        error: {
          code: 'EDITOR_NOT_INITIALISED',
          message: 'Editor settings service not initialised. Call initialise() first.',
          statusCode: 500,
        },
        timestamp: new Date().toISOString(),
      };
    }

    try {
      this.row = await this.prisma.editorSettings.update({
        where: { id: this.row.id },
        data: {
          ...input,
          updatedBy: adminUserId,
          updatedAt: new Date(),
        },
      });

      this.applyRow(this.row!);
      this.propagate();

      return {
        success: true,
        data: this.row!,
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      return {
        success: false,
        error: {
          code: 'EDITOR_SETTINGS_UPDATE_FAILED',
          message: err instanceof Error ? err.message : 'Unknown error',
          statusCode: 500,
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  // ── Admin Read ──────────────────────────────────────────────────────────

  /** Get the raw DB row (for admin panel display). */
  getSettings(): EditorSystemSettings | null {
    return this.row ? { ...this.row } : null;
  }

  /** Get the resolved config object (all defaults applied). */
  getConfig(): Required<EditorConfig> {
    return { ...this.config };
  }

  // ── Kill Switch ─────────────────────────────────────────────────────────

  /** Check if the editor is globally disabled. */
  isEditorDisabled(): boolean {
    return !this.config.editorEnabled;
  }

  /**
   * Emergency kill switch — immediately disable all editors.
   * Sets editorEnabled = false in DB and propagates.
   */
  async disableEditor(adminUserId: string): Promise<ApiResponse<{ editorEnabled: false }>> {
    const result = await this.updateSettings({ editorEnabled: false }, adminUserId);
    if (!result.success) return result as ApiResponse<{ editorEnabled: false }>;
    return {
      success: true,
      data: { editorEnabled: false },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Re-enable the editor after kill switch.
   */
  async enableEditor(adminUserId: string): Promise<ApiResponse<{ editorEnabled: true }>> {
    const result = await this.updateSettings({ editorEnabled: true }, adminUserId);
    if (!result.success) return result as ApiResponse<{ editorEnabled: true }>;
    return {
      success: true,
      data: { editorEnabled: true },
      timestamp: new Date().toISOString(),
    };
  }

  // ── Feature Toggle Helpers ──────────────────────────────────────────────

  /** Check if a specific toolbar feature is enabled. */
  isFeatureEnabled(feature: keyof Required<EditorConfig>): boolean {
    const val = this.config[feature];
    return typeof val === 'boolean' ? val : true;
  }

  /**
   * Bulk-toggle formatting features (useful for "simple mode" preset).
   * Disables: headings, tables, code blocks, video, color picker, alignment.
   */
  async applySimpleMode(adminUserId: string): Promise<ApiResponse<EditorSystemSettings>> {
    return this.updateSettings(
      {
        enableHeadings: false,
        enableTables: false,
        enableCodeBlocks: false,
        enableInlineCode: false,
        enableVideoEmbeds: false,
        enableTextColor: false,
        enableBackgroundColor: false,
        enableAlignment: false,
        enableHorizontalRule: false,
        enableTaskLists: false,
        enableFullscreen: false,
      },
      adminUserId,
    );
  }

  /**
   * Restore all features — undo simple mode or custom restrictions.
   */
  async applyFullMode(adminUserId: string): Promise<ApiResponse<EditorSystemSettings>> {
    return this.updateSettings(
      {
        enableBold: true,
        enableItalic: true,
        enableUnderline: true,
        enableStrikethrough: true,
        enableHeadings: true,
        enableLists: true,
        enableTaskLists: true,
        enableBlockquotes: true,
        enableCodeBlocks: true,
        enableInlineCode: true,
        enableLinks: true,
        enableImages: true,
        enableVideoEmbeds: true,
        enableTables: true,
        enableHorizontalRule: true,
        enableTextColor: true,
        enableBackgroundColor: true,
        enableAlignment: true,
        enableFullscreen: true,
        enableUndoRedo: true,
        enableMarkdownShortcuts: true,
        enableDragDropUpload: true,
      },
      adminUserId,
    );
  }

  // ── Frontend Settings Builder ─────────────────────────────────────────

  /**
   * Build the settings payload for the frontend.
   * Strips internal DB fields (id, updatedBy, updatedAt).
   * This is what the editor component receives via its `adminSettings` prop.
   */
  getFrontendSettings(): EditorAdminProps {
    return {
      // Feature toggles
      enableBold: this.config.enableBold,
      enableItalic: this.config.enableItalic,
      enableUnderline: this.config.enableUnderline,
      enableStrikethrough: this.config.enableStrikethrough,
      enableHeadings: this.config.enableHeadings,
      enableLists: this.config.enableLists,
      enableTaskLists: this.config.enableTaskLists,
      enableBlockquotes: this.config.enableBlockquotes,
      enableCodeBlocks: this.config.enableCodeBlocks,
      enableInlineCode: this.config.enableInlineCode,
      enableLinks: this.config.enableLinks,
      enableImages: this.config.enableImages,
      enableVideoEmbeds: this.config.enableVideoEmbeds,
      enableTables: this.config.enableTables,
      enableHorizontalRule: this.config.enableHorizontalRule,
      enableTextColor: this.config.enableTextColor,
      enableBackgroundColor: this.config.enableBackgroundColor,
      enableAlignment: this.config.enableAlignment,
      enableFullscreen: this.config.enableFullscreen,
      enableUndoRedo: this.config.enableUndoRedo,
      enableMarkdownShortcuts: this.config.enableMarkdownShortcuts,
      enableDragDropUpload: this.config.enableDragDropUpload,

      // Content limits
      maxWordCount: this.config.maxWordCount,
      maxCharCount: this.config.maxCharCount,

      // Image upload
      maxImageSizeBytes: this.config.maxImageSizeBytes,
      allowedImageTypes: [...this.config.allowedImageTypes],
      defaultImageWidth: this.config.defaultImageWidth,
      defaultImageHeight: this.config.defaultImageHeight,

      // Video embeds
      allowedVideoProviders: [...this.config.allowedVideoProviders],

      // Headings
      allowedHeadingLevels: [...this.config.allowedHeadingLevels],

      // Table limits
      maxTableRows: this.config.maxTableRows,
      maxTableCols: this.config.maxTableCols,

      // Color palette
      colorPalette: [...this.config.colorPalette],
      defaultTextColor: this.config.defaultTextColor,

      // Behaviour
      maxHistorySize: this.config.maxHistorySize,
      autoSaveDebounceMs: this.config.autoSaveDebounceMs,
      readingWpm: this.config.readingWpm,
    };
  }

  // ── Admin Overview ────────────────────────────────────────────────────

  /**
   * Returns a summary object for the admin dashboard.
   */
  getAdminOverview(): {
    editorEnabled: boolean;
    enabledFeatureCount: number;
    totalFeatureCount: number;
    contentLimits: { maxWordCount: number; maxCharCount: number };
    imageUpload: {
      maxSizeBytes: number;
      allowedTypes: string[];
      defaultDimensions: { width: number; height: number };
    };
    videoProviders: string[];
    tableLimit: { rows: number; cols: number };
    paletteColorCount: number;
    behaviour: {
      maxHistorySize: number;
      autoSaveDebounceMs: number;
      readingWpm: number;
    };
    lastUpdatedBy: string | null;
    lastUpdatedAt: Date | null;
  } {
    const featureFlags: (keyof Required<EditorConfig>)[] = [
      'enableBold', 'enableItalic', 'enableUnderline', 'enableStrikethrough',
      'enableHeadings', 'enableLists', 'enableTaskLists', 'enableBlockquotes',
      'enableCodeBlocks', 'enableInlineCode', 'enableLinks', 'enableImages',
      'enableVideoEmbeds', 'enableTables', 'enableHorizontalRule',
      'enableTextColor', 'enableBackgroundColor', 'enableAlignment',
      'enableFullscreen', 'enableUndoRedo', 'enableMarkdownShortcuts',
      'enableDragDropUpload',
    ];

    const enabledCount = featureFlags.filter(
      (f) => this.config[f] === true,
    ).length;

    return {
      editorEnabled: this.config.editorEnabled,
      enabledFeatureCount: enabledCount,
      totalFeatureCount: featureFlags.length,
      contentLimits: {
        maxWordCount: this.config.maxWordCount,
        maxCharCount: this.config.maxCharCount,
      },
      imageUpload: {
        maxSizeBytes: this.config.maxImageSizeBytes,
        allowedTypes: [...this.config.allowedImageTypes],
        defaultDimensions: {
          width: this.config.defaultImageWidth,
          height: this.config.defaultImageHeight,
        },
      },
      videoProviders: [...this.config.allowedVideoProviders],
      tableLimit: {
        rows: this.config.maxTableRows,
        cols: this.config.maxTableCols,
      },
      paletteColorCount: this.config.colorPalette.length,
      behaviour: {
        maxHistorySize: this.config.maxHistorySize,
        autoSaveDebounceMs: this.config.autoSaveDebounceMs,
        readingWpm: this.config.readingWpm,
      },
      lastUpdatedBy: this.row?.updatedBy ?? null,
      lastUpdatedAt: this.row?.updatedAt ?? null,
    };
  }

  // ── Internals ─────────────────────────────────────────────────────────

  /** Apply DB row values onto the in-memory config. */
  private applyRow(row: EditorSystemSettings): void {
    this.config = {
      editorEnabled: row.editorEnabled,
      enableBold: row.enableBold,
      enableItalic: row.enableItalic,
      enableUnderline: row.enableUnderline,
      enableStrikethrough: row.enableStrikethrough,
      enableHeadings: row.enableHeadings,
      allowedHeadingLevels: [...row.allowedHeadingLevels],
      enableLists: row.enableLists,
      enableTaskLists: row.enableTaskLists,
      enableBlockquotes: row.enableBlockquotes,
      enableCodeBlocks: row.enableCodeBlocks,
      enableInlineCode: row.enableInlineCode,
      enableLinks: row.enableLinks,
      enableImages: row.enableImages,
      enableVideoEmbeds: row.enableVideoEmbeds,
      enableTables: row.enableTables,
      enableHorizontalRule: row.enableHorizontalRule,
      enableTextColor: row.enableTextColor,
      enableBackgroundColor: row.enableBackgroundColor,
      enableAlignment: row.enableAlignment,
      enableFullscreen: row.enableFullscreen,
      enableUndoRedo: row.enableUndoRedo,
      enableMarkdownShortcuts: row.enableMarkdownShortcuts,
      enableDragDropUpload: row.enableDragDropUpload,
      maxWordCount: row.maxWordCount,
      maxCharCount: row.maxCharCount,
      maxImageSizeBytes: row.maxImageSizeBytes,
      allowedImageTypes: [...row.allowedImageTypes],
      defaultImageWidth: row.defaultImageWidth,
      defaultImageHeight: row.defaultImageHeight,
      allowedVideoProviders: [...row.allowedVideoProviders],
      maxTableRows: row.maxTableRows,
      maxTableCols: row.maxTableCols,
      colorPalette: [...row.colorPalette],
      defaultTextColor: row.defaultTextColor,
      maxHistorySize: row.maxHistorySize,
      autoSaveDebounceMs: row.autoSaveDebounceMs,
      readingWpm: row.readingWpm,
      defaultPlaceholder: row.defaultPlaceholder,
      defaultMinHeight: row.defaultMinHeight,
      defaultMaxHeight: row.defaultMaxHeight,
    };
  }

  /** Build the data object for creating a new settings row. */
  private buildCreatePayload(): Record<string, unknown> {
    return {
      editorEnabled: DEFAULT_EDITOR_CONFIG.editorEnabled,
      enableBold: DEFAULT_EDITOR_CONFIG.enableBold,
      enableItalic: DEFAULT_EDITOR_CONFIG.enableItalic,
      enableUnderline: DEFAULT_EDITOR_CONFIG.enableUnderline,
      enableStrikethrough: DEFAULT_EDITOR_CONFIG.enableStrikethrough,
      enableHeadings: DEFAULT_EDITOR_CONFIG.enableHeadings,
      allowedHeadingLevels: DEFAULT_EDITOR_CONFIG.allowedHeadingLevels,
      enableLists: DEFAULT_EDITOR_CONFIG.enableLists,
      enableTaskLists: DEFAULT_EDITOR_CONFIG.enableTaskLists,
      enableBlockquotes: DEFAULT_EDITOR_CONFIG.enableBlockquotes,
      enableCodeBlocks: DEFAULT_EDITOR_CONFIG.enableCodeBlocks,
      enableInlineCode: DEFAULT_EDITOR_CONFIG.enableInlineCode,
      enableLinks: DEFAULT_EDITOR_CONFIG.enableLinks,
      enableImages: DEFAULT_EDITOR_CONFIG.enableImages,
      enableVideoEmbeds: DEFAULT_EDITOR_CONFIG.enableVideoEmbeds,
      enableTables: DEFAULT_EDITOR_CONFIG.enableTables,
      enableHorizontalRule: DEFAULT_EDITOR_CONFIG.enableHorizontalRule,
      enableTextColor: DEFAULT_EDITOR_CONFIG.enableTextColor,
      enableBackgroundColor: DEFAULT_EDITOR_CONFIG.enableBackgroundColor,
      enableAlignment: DEFAULT_EDITOR_CONFIG.enableAlignment,
      enableFullscreen: DEFAULT_EDITOR_CONFIG.enableFullscreen,
      enableUndoRedo: DEFAULT_EDITOR_CONFIG.enableUndoRedo,
      enableMarkdownShortcuts: DEFAULT_EDITOR_CONFIG.enableMarkdownShortcuts,
      enableDragDropUpload: DEFAULT_EDITOR_CONFIG.enableDragDropUpload,
      maxWordCount: DEFAULT_EDITOR_CONFIG.maxWordCount,
      maxCharCount: DEFAULT_EDITOR_CONFIG.maxCharCount,
      maxImageSizeBytes: DEFAULT_EDITOR_CONFIG.maxImageSizeBytes,
      allowedImageTypes: DEFAULT_EDITOR_CONFIG.allowedImageTypes,
      defaultImageWidth: DEFAULT_EDITOR_CONFIG.defaultImageWidth,
      defaultImageHeight: DEFAULT_EDITOR_CONFIG.defaultImageHeight,
      allowedVideoProviders: DEFAULT_EDITOR_CONFIG.allowedVideoProviders,
      maxTableRows: DEFAULT_EDITOR_CONFIG.maxTableRows,
      maxTableCols: DEFAULT_EDITOR_CONFIG.maxTableCols,
      colorPalette: DEFAULT_EDITOR_CONFIG.colorPalette,
      defaultTextColor: DEFAULT_EDITOR_CONFIG.defaultTextColor,
      maxHistorySize: DEFAULT_EDITOR_CONFIG.maxHistorySize,
      autoSaveDebounceMs: DEFAULT_EDITOR_CONFIG.autoSaveDebounceMs,
      readingWpm: DEFAULT_EDITOR_CONFIG.readingWpm,
      defaultPlaceholder: DEFAULT_EDITOR_CONFIG.defaultPlaceholder,
      defaultMinHeight: DEFAULT_EDITOR_CONFIG.defaultMinHeight,
      defaultMaxHeight: DEFAULT_EDITOR_CONFIG.defaultMaxHeight,
      updatedBy: null,
      updatedAt: new Date(),
    };
  }

  /** Push current config to all registered consumers. */
  private propagate(): void {
    const snapshot = { ...this.config };
    for (const consumer of this.consumers) {
      try {
        consumer.updateConfig(snapshot);
      } catch {
        // swallow — one bad consumer should not block others
      }
    }
  }
}
