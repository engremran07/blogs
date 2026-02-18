/**
 * ============================================================================
 * MODULE:   features/editor/types.ts
 * PURPOSE:  Shared TypeScript interfaces for the pluggable Rich Text Editor
 * BOUNDARY: Pure types — no framework imports. Safe to copy to any repo.
 * ============================================================================
 */

// ─── Component Props ────────────────────────────────────────────────────────

/** Props accepted by the RichTextEditor component. */
export interface RichTextEditorProps {
  /** Initial HTML content to populate the editor. */
  content?: string;
  /**
   * Called on every content change with:
   *  - html:      the serialised HTML
   *  - text:      plain-text extract
   *  - wordCount: computed word count
   */
  onChange?: (html: string, text: string, wordCount: number) => void;
  /**
   * Async handler for image uploads.
   * Given a File, should return a public URL string for the uploaded image.
   */
  onImageUpload?: (file: File) => Promise<string>;
  /** Placeholder shown when the editor is empty. */
  placeholder?: string;
  /** CSS min-height for the editable area. Default: '300px'. */
  minHeight?: string;
  /** CSS max-height for the editable area. Default: '600px'. */
  maxHeight?: string;
  /** Extra CSS class applied to the outermost wrapper. */
  className?: string;
  /** Disables editing when true. */
  readOnly?: boolean;
  /**
   * Admin-dynamic settings pushed from DB.
   * Controls feature toggles, content limits, upload restrictions, toolbar config.
   * When omitted, all features are enabled with defaults from constants.ts.
   */
  adminSettings?: EditorAdminProps;
}

/**
 * Admin settings passed as a prop to the editor component.
 * All optional — missing values inherit defaults.
 */
export interface EditorAdminProps {
  // ── Global kill switch ──────────────────────────────────────────────────
  editorEnabled?: boolean;

  // ── Feature toggles ─────────────────────────────────────────────────────
  enableBold?: boolean;
  enableItalic?: boolean;
  enableUnderline?: boolean;
  enableStrikethrough?: boolean;
  enableHeadings?: boolean;
  enableLists?: boolean;
  enableTaskLists?: boolean;
  enableBlockquotes?: boolean;
  enableCodeBlocks?: boolean;
  enableInlineCode?: boolean;
  enableLinks?: boolean;
  enableImages?: boolean;
  enableVideoEmbeds?: boolean;
  enableTables?: boolean;
  enableHorizontalRule?: boolean;
  enableTextColor?: boolean;
  enableBackgroundColor?: boolean;
  enableAlignment?: boolean;
  enableFullscreen?: boolean;
  enableUndoRedo?: boolean;
  enableMarkdownShortcuts?: boolean;
  enableDragDropUpload?: boolean;

  // ── Enhanced toolbar features ────────────────────────────────────────────
  enableInlineCodeButton?: boolean;
  enableRemoveLink?: boolean;
  enableClearFormatting?: boolean;
  enableSuperscript?: boolean;
  enableSubscript?: boolean;
  enableIndentButtons?: boolean;
  enableFontSize?: boolean;
  enableLineHeight?: boolean;
  enableBlockTypeDropdown?: boolean;
  enableFindReplace?: boolean;
  enableSourceView?: boolean;
  enableEmoji?: boolean;
  enableSpecialChars?: boolean;
  enablePrint?: boolean;
  enableTableOfContents?: boolean;

  // ── Phase 3: Competitive / Advanced features ────────────────────────────
  enableSlashCommands?: boolean;
  enableCaseChange?: boolean;
  enableFormatPainter?: boolean;
  enableFocusMode?: boolean;
  enableContentTemplates?: boolean;
  enableAutosaveIndicator?: boolean;
  enableButtonBlock?: boolean;
  enableSpacerBlock?: boolean;
  enableGallery?: boolean;
  enableBookmarkCard?: boolean;
  enableAudioEmbed?: boolean;
  enableFileAttach?: boolean;
  enableDropCap?: boolean;
  enableFootnotes?: boolean;
  enableMathBlocks?: boolean;
  enableAnchorLinks?: boolean;
  enableKeyboardShortcutsHelp?: boolean;
  /** Disabled by default — duplicates site ad management feature */
  enableAdBlock?: boolean;
  /** Disabled by default — duplicates site SEO feature */
  enableSeoScore?: boolean;

  // ── Content limits ──────────────────────────────────────────────────────
  maxWordCount?: number;
  maxCharCount?: number;

  // ── Image upload ────────────────────────────────────────────────────────
  maxImageSizeBytes?: number;
  allowedImageTypes?: string[];
  defaultImageWidth?: number;
  defaultImageHeight?: number;

  // ── Video embeds ────────────────────────────────────────────────────────
  allowedVideoProviders?: string[];

  // ── Headings ────────────────────────────────────────────────────────────
  allowedHeadingLevels?: number[];

  // ── Table limits ────────────────────────────────────────────────────────
  maxTableRows?: number;
  maxTableCols?: number;

  // ── Color palette ───────────────────────────────────────────────────────
  colorPalette?: string[];
  defaultTextColor?: string;

  // ── Font & spacing presets ──────────────────────────────────────────────
  fontSizePresets?: number[];
  lineHeightPresets?: number[];

  // ── Editor behaviour ────────────────────────────────────────────────────
  maxHistorySize?: number;
  autoSaveDebounceMs?: number;
  readingWpm?: number;
  sanitizeOnSave?: boolean;
  /** Default placeholder text (default: 'Start writing your content here...') */
  defaultPlaceholder?: string;
  /** Default min height CSS value (default: '300px') */
  defaultMinHeight?: string;
  /** Default max height CSS value (default: '600px') */
  defaultMaxHeight?: string;
}

// ─── Data Types ─────────────────────────────────────────────────────────────

/** Color palette used in the editor's color picker. */
export interface EditorColorConfig {
  /** Default text color hex value. */
  defaultColor: string;
  /** Array of preset hex colors available in the picker. */
  palette: readonly string[];
}

/** Data exchanged when inserting a link. */
export interface EditorLinkData {
  url: string;
  text?: string;
}

/** Data exchanged when inserting an image. */
export interface EditorImageData {
  url: string;
  alt?: string;
  width?: number;
  height?: number;
}

/** Data exchanged when inserting a video embed. */
export interface EditorVideoData {
  url: string;
}

/** Data exchanged when inserting a table. */
export interface EditorTableData {
  rows: number;
  cols: number;
}

/** Formatting state tracked by the editor toolbar. */
export interface EditorFormattingState {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
  unorderedList: boolean;
  orderedList: boolean;
  alignLeft: boolean;
  alignCenter: boolean;
  alignRight: boolean;
  alignJustify: boolean;
}

/** Editor metrics emitted on content changes. */
export interface EditorMetrics {
  wordCount: number;
  charCount: number;
  readingTimeMinutes: number;
}

// ─── Module Config (constructor / backend) ──────────────────────────────────

/**
 * Configuration object used by backend admin-settings service.
 * All fields are optional — missing values fall back to DEFAULT_EDITOR_CONFIG.
 */
export interface EditorConfig {
  // ── Global ──────────────────────────────────────────────────────────────

  /** Global kill switch — force read-only mode on all editors (default: true) */
  editorEnabled?: boolean;

  // ── Feature toggles ─────────────────────────────────────────────────────

  /** Enable bold formatting (default: true) */
  enableBold?: boolean;
  /** Enable italic formatting (default: true) */
  enableItalic?: boolean;
  /** Enable underline formatting (default: true) */
  enableUnderline?: boolean;
  /** Enable strikethrough formatting (default: true) */
  enableStrikethrough?: boolean;
  /** Enable headings H1–H6 (default: true) */
  enableHeadings?: boolean;
  /** Allowed heading levels, subset of 1–6 (default: [1,2,3,4,5,6]) */
  allowedHeadingLevels?: number[];
  /** Enable bullet + ordered lists (default: true) */
  enableLists?: boolean;
  /** Enable task lists / checklists (default: true) */
  enableTaskLists?: boolean;
  /** Enable blockquotes (default: true) */
  enableBlockquotes?: boolean;
  /** Enable code blocks (default: true) */
  enableCodeBlocks?: boolean;
  /** Enable inline code (default: true) */
  enableInlineCode?: boolean;
  /** Enable link insertion (default: true) */
  enableLinks?: boolean;
  /** Enable image insertion + upload (default: true) */
  enableImages?: boolean;
  /** Enable video/YouTube embedding (default: true) */
  enableVideoEmbeds?: boolean;
  /** Enable table insertion (default: true) */
  enableTables?: boolean;
  /** Enable horizontal rule insertion (default: true) */
  enableHorizontalRule?: boolean;
  /** Enable text colour picker (default: true) */
  enableTextColor?: boolean;
  /** Enable background colour picker (default: true) */
  enableBackgroundColor?: boolean;
  /** Enable alignment buttons (default: true) */
  enableAlignment?: boolean;
  /** Enable fullscreen toggle (default: true) */
  enableFullscreen?: boolean;
  /** Enable undo/redo buttons (default: true) */
  enableUndoRedo?: boolean;
  /** Enable markdown shortcuts (default: true) */
  enableMarkdownShortcuts?: boolean;
  /** Enable drag-and-drop image upload (default: true) */
  enableDragDropUpload?: boolean;

  // ── Enhanced toolbar features ────────────────────────────────────────────

  /** Enable inline code toolbar button (default: true) */
  enableInlineCodeButton?: boolean;
  /** Enable remove link button (default: true) */
  enableRemoveLink?: boolean;
  /** Enable clear formatting button (default: true) */
  enableClearFormatting?: boolean;
  /** Enable superscript button (default: true) */
  enableSuperscript?: boolean;
  /** Enable subscript button (default: true) */
  enableSubscript?: boolean;
  /** Enable indent/outdent buttons (default: true) */
  enableIndentButtons?: boolean;
  /** Enable font size dropdown (default: true) */
  enableFontSize?: boolean;
  /** Enable line height dropdown (default: true) */
  enableLineHeight?: boolean;
  /** Enable block type dropdown (default: true) */
  enableBlockTypeDropdown?: boolean;
  /** Enable find & replace dialog (default: true) */
  enableFindReplace?: boolean;
  /** Enable source HTML view toggle (default: true) */
  enableSourceView?: boolean;
  /** Enable emoji picker (default: true) */
  enableEmoji?: boolean;
  /** Enable special characters insertion (default: true) */
  enableSpecialChars?: boolean;
  /** Enable print button (default: true) */
  enablePrint?: boolean;
  /** Enable table of contents generator (default: true) */
  enableTableOfContents?: boolean;

  // ── Phase 3: Competitive / Advanced features ────────────────────────────

  /** Enable slash commands menu (default: true) */
  enableSlashCommands?: boolean;
  /** Enable case change dropdown (default: true) */
  enableCaseChange?: boolean;
  /** Enable format painter tool (default: true) */
  enableFormatPainter?: boolean;
  /** Enable focus / zen mode (default: true) */
  enableFocusMode?: boolean;
  /** Enable content templates picker (default: true) */
  enableContentTemplates?: boolean;
  /** Enable autosave status indicator (default: true) */
  enableAutosaveIndicator?: boolean;
  /** Enable button / CTA block insertion (default: true) */
  enableButtonBlock?: boolean;
  /** Enable spacer block insertion (default: true) */
  enableSpacerBlock?: boolean;
  /** Enable gallery block (default: true) */
  enableGallery?: boolean;
  /** Enable bookmark / link preview card (default: true) */
  enableBookmarkCard?: boolean;
  /** Enable audio embed (default: true) */
  enableAudioEmbed?: boolean;
  /** Enable file attachment block (default: true) */
  enableFileAttach?: boolean;
  /** Enable drop cap on first paragraph (default: true) */
  enableDropCap?: boolean;
  /** Enable footnotes with auto-numbering (default: true) */
  enableFootnotes?: boolean;
  /** Enable math / KaTeX blocks (default: true) */
  enableMathBlocks?: boolean;
  /** Enable anchor / bookmark insertion (default: true) */
  enableAnchorLinks?: boolean;
  /** Enable keyboard shortcuts help dialog (default: true) */
  enableKeyboardShortcutsHelp?: boolean;
  /** Enable ad placement block — disabled by default, duplicates site ads (default: false) */
  enableAdBlock?: boolean;
  /** Enable SEO readability score — disabled by default, duplicates site SEO (default: false) */
  enableSeoScore?: boolean;

  // ── Content limits ──────────────────────────────────────────────────────

  /** Max word count, 0 = unlimited (default: 0) */
  maxWordCount?: number;
  /** Max character count, 0 = unlimited (default: 0) */
  maxCharCount?: number;

  // ── Image upload ────────────────────────────────────────────────────────

  /** Max image file size in bytes (default: 10485760 = 10 MB) */
  maxImageSizeBytes?: number;
  /** Allowed MIME types for image upload (default: jpeg, png, gif, webp, svg+xml) */
  allowedImageTypes?: string[];
  /** Default width for inserted images (default: 1200) */
  defaultImageWidth?: number;
  /** Default height for inserted images (default: 675) */
  defaultImageHeight?: number;

  // ── Video embeds ────────────────────────────────────────────────────────

  /** Allowed video providers (default: ['youtube', 'vimeo']) */
  allowedVideoProviders?: string[];

  // ── Table limits ────────────────────────────────────────────────────────

  /** Max rows in inserted table (default: 20) */
  maxTableRows?: number;
  /** Max columns in inserted table (default: 10) */
  maxTableCols?: number;

  // ── Color palette ───────────────────────────────────────────────────────

  /** Custom color palette hex values (overrides EDITOR_COLOR_PALETTE) */
  colorPalette?: string[];
  /** Default text color (default: '#000000') */
  defaultTextColor?: string;

  // ── Font & spacing presets ──────────────────────────────────────────────

  /** Preset font sizes in px (default: [12,14,16,18,20,24,28,32,36,48]) */
  fontSizePresets?: number[];
  /** Preset line height values (default: [1,1.25,1.5,1.75,2]) */
  lineHeightPresets?: number[];

  // ── Editor behaviour ────────────────────────────────────────────────────

  /** Max undo/redo history states (default: 50) */
  maxHistorySize?: number;
  /** Auto-save debounce interval in ms (default: 2000) */
  autoSaveDebounceMs?: number;
  /** Words per minute for reading time calculation (default: 200) */
  readingWpm?: number;
  /** Sanitize HTML output on every save (default: false) */
  sanitizeOnSave?: boolean;
  /** Default placeholder text (default: 'Start writing your content here...') */
  defaultPlaceholder?: string;
  /** Default min height CSS value (default: '300px') */
  defaultMinHeight?: string;
  /** Default max height CSS value (default: '600px') */
  defaultMaxHeight?: string;
}

// ─── DB-backed Admin Settings (singleton row) ───────────────────────────────

/**
 * All fields stored in the EditorSettings Prisma model.
 * Non-optional — defaults are applied when the row is created.
 */
export interface EditorSystemSettings {
  id: string;

  // Global
  editorEnabled: boolean;

  // Feature toggles
  enableBold: boolean;
  enableItalic: boolean;
  enableUnderline: boolean;
  enableStrikethrough: boolean;
  enableHeadings: boolean;
  allowedHeadingLevels: number[];
  enableLists: boolean;
  enableTaskLists: boolean;
  enableBlockquotes: boolean;
  enableCodeBlocks: boolean;
  enableInlineCode: boolean;
  enableLinks: boolean;
  enableImages: boolean;
  enableVideoEmbeds: boolean;
  enableTables: boolean;
  enableHorizontalRule: boolean;
  enableTextColor: boolean;
  enableBackgroundColor: boolean;
  enableAlignment: boolean;
  enableFullscreen: boolean;
  enableUndoRedo: boolean;
  enableMarkdownShortcuts: boolean;
  enableDragDropUpload: boolean;

  // Enhanced toolbar features
  enableInlineCodeButton: boolean;
  enableRemoveLink: boolean;
  enableClearFormatting: boolean;
  enableSuperscript: boolean;
  enableSubscript: boolean;
  enableIndentButtons: boolean;
  enableFontSize: boolean;
  enableLineHeight: boolean;
  enableBlockTypeDropdown: boolean;
  enableFindReplace: boolean;
  enableSourceView: boolean;
  enableEmoji: boolean;
  enableSpecialChars: boolean;
  enablePrint: boolean;
  enableTableOfContents: boolean;

  // Phase 3: Competitive / Advanced features
  enableSlashCommands: boolean;
  enableCaseChange: boolean;
  enableFormatPainter: boolean;
  enableFocusMode: boolean;
  enableContentTemplates: boolean;
  enableAutosaveIndicator: boolean;
  enableButtonBlock: boolean;
  enableSpacerBlock: boolean;
  enableGallery: boolean;
  enableBookmarkCard: boolean;
  enableAudioEmbed: boolean;
  enableFileAttach: boolean;
  enableDropCap: boolean;
  enableFootnotes: boolean;
  enableMathBlocks: boolean;
  enableAnchorLinks: boolean;
  enableKeyboardShortcutsHelp: boolean;
  enableAdBlock: boolean;
  enableSeoScore: boolean;

  // Content limits
  maxWordCount: number;
  maxCharCount: number;

  // Image upload
  maxImageSizeBytes: number;
  allowedImageTypes: string[];
  defaultImageWidth: number;
  defaultImageHeight: number;

  // Video embeds
  allowedVideoProviders: string[];

  // Table limits
  maxTableRows: number;
  maxTableCols: number;

  // Color palette
  colorPalette: string[];
  defaultTextColor: string;

  // Font & spacing presets
  fontSizePresets: number[];
  lineHeightPresets: number[];

  // Editor behaviour
  maxHistorySize: number;
  autoSaveDebounceMs: number;
  readingWpm: number;
  sanitizeOnSave: boolean;
  defaultPlaceholder: string;
  defaultMinHeight: string;
  defaultMaxHeight: string;

  // Audit
  updatedBy: string | null;
  updatedAt: Date;
}

// ─── Config Consumer (for dynamic propagation) ─────────────────────────────

/**
 * Implement this interface in any service that should receive config updates
 * when admin changes editor settings at runtime.
 */
export interface EditorConfigConsumer {
  updateConfig(cfg: Required<EditorConfig>): void;
}

// ─── API Response Envelope ──────────────────────────────────────────────────

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

// ─── Prisma DI Interface ────────────────────────────────────────────────────
// Matches the pattern used by all other modules (comments, captcha, tags, ads,
// blog, users). Consumers pass any object satisfying this shape — no direct
// @prisma/client dependency required.

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface EditorPrismaDelegate {
  findFirst(args?: any): Promise<any>;
  create(args: { data: Record<string, unknown> }): Promise<any>;
  update(args: { where: { id: string }; data: Record<string, unknown> }): Promise<any>;
}

export interface EditorPrismaClient {
  editorSettings: EditorPrismaDelegate;
}
/* eslint-enable @typescript-eslint/no-explicit-any */
