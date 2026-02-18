/**
 * ============================================================================
 * MODULE:   features/editor/constants.ts
 * PURPOSE:  Editor-specific constants isolated from global design tokens.
 *           When this module is extracted to a separate repo, consumers
 *           provide their own palette via props or override this file.
 * ============================================================================
 */

import type { EditorConfig } from '../types';

/** Default text color for the editor. */
export const EDITOR_DEFAULT_COLOR = '#000000';

/**
 * Preset color palette available in the editor's color picker.
 * Extended palette with semantic grouping.
 */
export const EDITOR_COLOR_PALETTE = [
  /* Neutrals */
  '#000000', '#333333', '#666666', '#999999', '#cccccc', '#ffffff',
  /* Primary */
  '#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#3498db', '#9b59b6',
  /* Deeper */
  '#c0392b', '#d35400', '#f39c12', '#27ae60', '#2980b9', '#8e44ad',
  /* Pastels */
  '#fadbd8', '#fdebd0', '#fef9e7', '#d5f5e3', '#d6eaf8', '#ebdef0',
] as const;

/**
 * Editor keyboard shortcut map.
 * Key format: modifier+key (e.g. 'ctrl+k', 'ctrl+shift+e')
 */
export const EDITOR_SHORTCUTS = {
  UNDO: 'ctrl+z',
  REDO_1: 'ctrl+shift+z',
  REDO_2: 'ctrl+y',
  LINK: 'ctrl+k',
  INLINE_CODE: 'ctrl+shift+e',
  BOLD: 'ctrl+b',
  ITALIC: 'ctrl+i',
  UNDERLINE: 'ctrl+u',
} as const;

/**
 * Markdown-style shortcuts supported in the editor.
 * These trigger on space key after typing the pattern at the start of a line.
 */
export const MARKDOWN_SHORTCUTS = {
  HEADING: /^(#{1,6})\s$/,
  BULLET_LIST: /^[-*]\s$/,
  ORDERED_LIST: /^1\.\s$/,
  BLOCKQUOTE: /^>\s$/,
  HORIZONTAL_RULE: /^(---|___|\*\*\*)\s*$/,
  CODE_BLOCK: /^```\s*$/,
} as const;

/** Maximum undo/redo history stack size. */
export const MAX_HISTORY_SIZE = 50;

/** Auto-save debounce interval in milliseconds. */
export const AUTOSAVE_DEBOUNCE_MS = 2_000;

/** Words per minute for reading time calculation. */
export const READING_WPM = 200;

/** Default image dimensions for SEO-optimized insertions. */
export const DEFAULT_IMAGE_DIMENSIONS = {
  width: 1200,
  height: 675,
} as const;

// ─── Admin-Dynamic Default Config ───────────────────────────────────────────

/** Default allowed MIME types for image upload. */
export const DEFAULT_ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
] as const;

/** Default allowed video embed providers. */
export const DEFAULT_ALLOWED_VIDEO_PROVIDERS = [
  'youtube',
  'vimeo',
] as const;

/** Max image upload size in bytes (10 MB). */
export const DEFAULT_MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

/** Default heading levels available. */
export const DEFAULT_ALLOWED_HEADING_LEVELS = [1, 2, 3, 4, 5, 6] as const;

/** Default table size limits. */
export const DEFAULT_MAX_TABLE_ROWS = 20;
export const DEFAULT_MAX_TABLE_COLS = 10;

/** Preset font sizes in px available in the font-size dropdown. */
export const FONT_SIZE_PRESETS = [12, 14, 16, 18, 20, 24, 28, 32, 36, 48] as const;

/** Preset line-height values available in the line-height dropdown. */
export const LINE_HEIGHT_PRESETS = [1, 1.25, 1.5, 1.75, 2] as const;

/**
 * Special characters available for insertion.
 * Grouped by category for the picker UI.
 */
export const SPECIAL_CHARS: Record<string, string[]> = {
  'Common':     ['—', '–', '…', '•', '©', '®', '™', '°', '±', '×', '÷', '≠', '≤', '≥', '≈'],
  'Currency':   ['$', '€', '£', '¥', '₹', '¢', '₿', '₩', '₪', '₫'],
  'Arrows':     ['←', '→', '↑', '↓', '↔', '↕', '⇐', '⇒', '⇑', '⇓'],
  'Math':       ['∞', '∑', '∏', '√', '∂', '∫', '∈', '∉', '∪', '∩', '⊂', '⊃', 'π', 'Ω'],
  'Greek':      ['α', 'β', 'γ', 'δ', 'ε', 'θ', 'λ', 'μ', 'σ', 'φ', 'ψ', 'ω'],
  'Emoji':      ['😀', '😂', '😍', '🤔', '👍', '👎', '❤️', '🔥', '⭐', '✅', '❌', '⚡', '🎉', '💡', '📌'],
};

/**
 * Block type options for the block-type dropdown.
 */
export const BLOCK_TYPE_OPTIONS = [
  { value: 'p',          label: 'Paragraph' },
  { value: 'h1',         label: 'Heading 1' },
  { value: 'h2',         label: 'Heading 2' },
  { value: 'h3',         label: 'Heading 3' },
  { value: 'h4',         label: 'Heading 4' },
  { value: 'h5',         label: 'Heading 5' },
  { value: 'h6',         label: 'Heading 6' },
  { value: 'pre',        label: 'Preformatted' },
  { value: 'blockquote', label: 'Blockquote' },
] as const;

/**
 * Complete default configuration for the editor module.
 * These defaults match the current hard-coded behaviour, so upgrading
 * from the non-admin version to the admin version is a no-op.
 */
export const DEFAULT_EDITOR_CONFIG: Required<EditorConfig> = {
  // Global
  editorEnabled: true,

  // Feature toggles
  enableBold: true,
  enableItalic: true,
  enableUnderline: true,
  enableStrikethrough: true,
  enableHeadings: true,
  allowedHeadingLevels: [...DEFAULT_ALLOWED_HEADING_LEVELS],
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

  // Enhanced toolbar features
  enableInlineCodeButton: true,
  enableRemoveLink: true,
  enableClearFormatting: true,
  enableSuperscript: true,
  enableSubscript: true,
  enableIndentButtons: true,
  enableFontSize: true,
  enableLineHeight: true,
  enableBlockTypeDropdown: true,
  enableFindReplace: true,
  enableSourceView: true,
  enableEmoji: true,
  enableSpecialChars: true,
  enablePrint: true,
  enableTableOfContents: true,

  // Phase 3: Competitive / Advanced features
  enableSlashCommands: true,
  enableCaseChange: true,
  enableFormatPainter: true,
  enableFocusMode: true,
  enableContentTemplates: true,
  enableAutosaveIndicator: true,
  enableButtonBlock: true,
  enableSpacerBlock: true,
  enableGallery: true,
  enableBookmarkCard: true,
  enableAudioEmbed: true,
  enableFileAttach: true,
  enableDropCap: true,
  enableFootnotes: true,
  enableMathBlocks: true,
  enableAnchorLinks: true,
  enableKeyboardShortcutsHelp: true,
  /** Disabled by default — site already has ad management */
  enableAdBlock: false,
  /** Disabled by default — site already has SEO tooling */
  enableSeoScore: false,

  // Content limits (0 = unlimited)
  maxWordCount: 0,
  maxCharCount: 0,

  // Image upload
  maxImageSizeBytes: DEFAULT_MAX_IMAGE_SIZE_BYTES,
  allowedImageTypes: [...DEFAULT_ALLOWED_IMAGE_TYPES],
  defaultImageWidth: DEFAULT_IMAGE_DIMENSIONS.width,
  defaultImageHeight: DEFAULT_IMAGE_DIMENSIONS.height,

  // Video embeds
  allowedVideoProviders: [...DEFAULT_ALLOWED_VIDEO_PROVIDERS],

  // Table limits
  maxTableRows: DEFAULT_MAX_TABLE_ROWS,
  maxTableCols: DEFAULT_MAX_TABLE_COLS,

  // Color palette
  colorPalette: [...EDITOR_COLOR_PALETTE],
  defaultTextColor: EDITOR_DEFAULT_COLOR,

  // Font & spacing presets
  fontSizePresets: [...FONT_SIZE_PRESETS],
  lineHeightPresets: [...LINE_HEIGHT_PRESETS],

  // Editor behaviour
  maxHistorySize: MAX_HISTORY_SIZE,
  autoSaveDebounceMs: AUTOSAVE_DEBOUNCE_MS,
  readingWpm: READING_WPM,
  sanitizeOnSave: true,
  defaultPlaceholder: 'Start writing your content here...',
  defaultMinHeight: '300px',
  defaultMaxHeight: '600px',
};

// ─── Phase 3: Content Templates ─────────────────────────────────────────────

/**
 * Pre-built content templates available in the template picker.
 * Each template provides starter HTML for common content patterns.
 */
export const CONTENT_TEMPLATES = [
  {
    id: 'blog-post',
    label: 'Blog Post',
    icon: '📝',
    description: 'Standard blog post with introduction, sections, and conclusion',
    html: '<h2>Blog Post Title</h2><p>Write your introduction here — hook the reader with a compelling opening.</p><h3>Section 1</h3><p>Your first main point...</p><h3>Section 2</h3><p>Your second main point...</p><h3>Conclusion</h3><p>Summarize your key takeaways...</p>',
  },
  {
    id: 'product-review',
    label: 'Product Review',
    icon: '⭐',
    description: 'Structured product review with pros, cons, and verdict',
    html: '<h2>Product Name Review</h2><p><strong>Rating:</strong> ⭐⭐⭐⭐⭐</p><h3>Overview</h3><p>Brief product description...</p><h3>Pros</h3><ul><li>Pro 1</li><li>Pro 2</li></ul><h3>Cons</h3><ul><li>Con 1</li><li>Con 2</li></ul><h3>Verdict</h3><p>Final recommendation...</p>',
  },
  {
    id: 'how-to',
    label: 'How-To Guide',
    icon: '📋',
    description: 'Step-by-step guide with prerequisites',
    html: '<h2>How to [Do Something]</h2><p>Brief description of what this guide covers.</p><h3>Prerequisites</h3><ul><li>Requirement 1</li><li>Requirement 2</li></ul><h3>Step 1: Getting Started</h3><p>Instructions...</p><h3>Step 2: Main Process</h3><p>Instructions...</p><h3>Step 3: Finishing Up</h3><p>Instructions...</p>',
  },
  {
    id: 'listicle',
    label: 'Listicle',
    icon: '📊',
    description: 'Numbered list article format',
    html: '<h2>Top [N] Things About [Topic]</h2><p>Introduction...</p><h3>1. First Item</h3><p>Description...</p><h3>2. Second Item</h3><p>Description...</p><h3>3. Third Item</h3><p>Description...</p><h3>Wrap Up</h3><p>Summary...</p>',
  },
  {
    id: 'comparison',
    label: 'Comparison',
    icon: '⚖️',
    description: 'Side-by-side comparison with table',
    html: '<h2>[Option A] vs [Option B]</h2><p>Overview...</p><table><thead><tr><th>Feature</th><th>Option A</th><th>Option B</th></tr></thead><tbody><tr><td>Feature 1</td><td>Value</td><td>Value</td></tr><tr><td>Feature 2</td><td>Value</td><td>Value</td></tr></tbody></table><h3>Our Pick</h3><p>Recommendation...</p>',
  },
  {
    id: 'faq',
    label: 'FAQ Page',
    icon: '❓',
    description: 'Expandable frequently asked questions',
    html: '<h2>Frequently Asked Questions</h2><details class="editor-details"><summary>Question 1?</summary><p>Answer 1...</p></details><details class="editor-details"><summary>Question 2?</summary><p>Answer 2...</p></details><details class="editor-details"><summary>Question 3?</summary><p>Answer 3...</p></details>',
  },
  {
    id: 'newsletter',
    label: 'Newsletter',
    icon: '📧',
    description: 'Newsletter-style email content',
    html: '<h2>📬 Newsletter — Issue #X</h2><p>Welcome message...</p><hr /><h3>🔥 Featured Story</h3><p>Main story...</p><h3>📌 Quick Updates</h3><ul><li>Update 1</li><li>Update 2</li></ul><h3>💡 Tip of the Week</h3><p>Useful tip...</p><hr /><p><em>Thanks for reading!</em></p>',
  },
] as const;

// ─── Phase 3: Slash Commands ────────────────────────────────────────────────

export const SLASH_COMMANDS = [
  { id: 'heading1', label: 'Heading 1', icon: 'H1', keywords: ['h1', 'heading', 'title'], action: 'heading1' },
  { id: 'heading2', label: 'Heading 2', icon: 'H2', keywords: ['h2', 'heading'], action: 'heading2' },
  { id: 'heading3', label: 'Heading 3', icon: 'H3', keywords: ['h3', 'heading'], action: 'heading3' },
  { id: 'paragraph', label: 'Paragraph', icon: '¶', keywords: ['p', 'text', 'paragraph'], action: 'paragraph' },
  { id: 'bullet-list', label: 'Bullet List', icon: '•', keywords: ['ul', 'bullet', 'list'], action: 'bulletList' },
  { id: 'numbered-list', label: 'Numbered List', icon: '1.', keywords: ['ol', 'numbered', 'list'], action: 'numberedList' },
  { id: 'task-list', label: 'Task List', icon: '☑', keywords: ['task', 'check', 'todo'], action: 'taskList' },
  { id: 'blockquote', label: 'Blockquote', icon: '❝', keywords: ['quote', 'blockquote'], action: 'blockquote' },
  { id: 'code-block', label: 'Code Block', icon: '<>', keywords: ['code', 'pre', 'snippet'], action: 'codeBlock' },
  { id: 'image', label: 'Image', icon: '🖼', keywords: ['image', 'picture', 'photo'], action: 'image' },
  { id: 'table', label: 'Table', icon: '▦', keywords: ['table', 'grid'], action: 'table' },
  { id: 'divider', label: 'Divider', icon: '—', keywords: ['hr', 'divider', 'separator'], action: 'divider' },
  { id: 'callout-info', label: 'Info Callout', icon: '💡', keywords: ['callout', 'info', 'note'], action: 'calloutInfo' },
  { id: 'callout-warning', label: 'Warning', icon: '⚠️', keywords: ['callout', 'warning', 'alert'], action: 'calloutWarning' },
  { id: 'collapsible', label: 'Collapsible', icon: '▶', keywords: ['collapse', 'toggle', 'accordion'], action: 'collapsible' },
  { id: 'pull-quote', label: 'Pull Quote', icon: '❝', keywords: ['pull', 'quote', 'highlight'], action: 'pullQuote' },
  { id: 'columns', label: 'Two Columns', icon: '▥', keywords: ['column', 'layout', 'split'], action: 'columns' },
  { id: 'button', label: 'Button / CTA', icon: '🔘', keywords: ['button', 'cta', 'action'], action: 'button' },
  { id: 'spacer', label: 'Spacer', icon: '↕', keywords: ['spacer', 'space', 'gap'], action: 'spacer' },
  { id: 'toc', label: 'Table of Contents', icon: '📑', keywords: ['toc', 'contents', 'index'], action: 'toc' },
  { id: 'bookmark', label: 'Bookmark Card', icon: '🔗', keywords: ['bookmark', 'link', 'preview'], action: 'bookmark' },
  { id: 'footnote', label: 'Footnote', icon: '¹', keywords: ['footnote', 'note', 'reference'], action: 'footnote' },
] as const;

// ─── Phase 3: Keyboard Shortcuts Reference ──────────────────────────────────

export const KEYBOARD_SHORTCUTS_LIST = [
  { keys: 'Ctrl+B', action: 'Bold' },
  { keys: 'Ctrl+I', action: 'Italic' },
  { keys: 'Ctrl+U', action: 'Underline' },
  { keys: 'Ctrl+K', action: 'Insert Link' },
  { keys: 'Ctrl+Z', action: 'Undo' },
  { keys: 'Ctrl+Y', action: 'Redo' },
  { keys: 'Ctrl+Shift+Z', action: 'Redo (alt)' },
  { keys: 'Ctrl+Shift+E', action: 'Inline Code' },
  { keys: 'Ctrl+Shift+H', action: 'Find & Replace' },
  { keys: 'Ctrl+Shift+U', action: 'Source View' },
  { keys: 'Ctrl+P', action: 'Print' },
  { keys: 'Tab', action: 'Indent' },
  { keys: 'Shift+Tab', action: 'Outdent' },
  { keys: 'Escape', action: 'Close Dialog / Exit Fullscreen' },
  { keys: '/', action: 'Slash Commands' },
  { keys: '# + Space', action: 'Heading (Markdown)' },
  { keys: '- + Space', action: 'Bullet List (Markdown)' },
  { keys: '1. + Space', action: 'Numbered List (Markdown)' },
  { keys: '> + Space', action: 'Blockquote (Markdown)' },
  { keys: '``` + Space', action: 'Code Block (Markdown)' },
  { keys: '--- + Space', action: 'Horizontal Rule (Markdown)' },
] as const;
