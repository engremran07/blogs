/**
 * ============================================================================
 * MODULE:   editor/ui/editor.config.ts
 * PURPOSE:  Merge admin settings with defaults to produce a resolved config
 * ============================================================================
 */

import type { EditorAdminProps } from '../types';
import { DEFAULT_EDITOR_CONFIG } from '../server/constants';

/**
 * Merge optional admin overrides with the built-in defaults.
 * Returns a fully-resolved, non-optional configuration object.
 */
export function mergeAdminSettings(admin?: EditorAdminProps) {
  const d = DEFAULT_EDITOR_CONFIG;
  return {
    editorEnabled: admin?.editorEnabled ?? d.editorEnabled,
    enableBold: admin?.enableBold ?? d.enableBold,
    enableItalic: admin?.enableItalic ?? d.enableItalic,
    enableUnderline: admin?.enableUnderline ?? d.enableUnderline,
    enableStrikethrough: admin?.enableStrikethrough ?? d.enableStrikethrough,
    enableHeadings: admin?.enableHeadings ?? d.enableHeadings,
    enableLists: admin?.enableLists ?? d.enableLists,
    enableTaskLists: admin?.enableTaskLists ?? d.enableTaskLists,
    enableBlockquotes: admin?.enableBlockquotes ?? d.enableBlockquotes,
    enableCodeBlocks: admin?.enableCodeBlocks ?? d.enableCodeBlocks,
    enableInlineCode: admin?.enableInlineCode ?? d.enableInlineCode,
    enableLinks: admin?.enableLinks ?? d.enableLinks,
    enableImages: admin?.enableImages ?? d.enableImages,
    enableVideoEmbeds: admin?.enableVideoEmbeds ?? d.enableVideoEmbeds,
    enableTables: admin?.enableTables ?? d.enableTables,
    enableHorizontalRule: admin?.enableHorizontalRule ?? d.enableHorizontalRule,
    enableTextColor: admin?.enableTextColor ?? d.enableTextColor,
    enableBackgroundColor: admin?.enableBackgroundColor ?? d.enableBackgroundColor,
    enableAlignment: admin?.enableAlignment ?? d.enableAlignment,
    enableFullscreen: admin?.enableFullscreen ?? d.enableFullscreen,
    enableUndoRedo: admin?.enableUndoRedo ?? d.enableUndoRedo,
    enableMarkdownShortcuts: admin?.enableMarkdownShortcuts ?? d.enableMarkdownShortcuts,
    enableDragDropUpload: admin?.enableDragDropUpload ?? d.enableDragDropUpload,
    enableInlineCodeButton: admin?.enableInlineCodeButton ?? d.enableInlineCodeButton,
    enableRemoveLink: admin?.enableRemoveLink ?? d.enableRemoveLink,
    enableClearFormatting: admin?.enableClearFormatting ?? d.enableClearFormatting,
    enableSuperscript: admin?.enableSuperscript ?? d.enableSuperscript,
    enableSubscript: admin?.enableSubscript ?? d.enableSubscript,
    enableIndentButtons: admin?.enableIndentButtons ?? d.enableIndentButtons,
    enableFontSize: admin?.enableFontSize ?? d.enableFontSize,
    enableLineHeight: admin?.enableLineHeight ?? d.enableLineHeight,
    enableBlockTypeDropdown: admin?.enableBlockTypeDropdown ?? d.enableBlockTypeDropdown,
    enableFindReplace: admin?.enableFindReplace ?? d.enableFindReplace,
    enableSourceView: admin?.enableSourceView ?? d.enableSourceView,
    enableEmoji: admin?.enableEmoji ?? d.enableEmoji,
    enableSpecialChars: admin?.enableSpecialChars ?? d.enableSpecialChars,
    enablePrint: admin?.enablePrint ?? d.enablePrint,
    enableTableOfContents: admin?.enableTableOfContents ?? d.enableTableOfContents,
    maxWordCount: admin?.maxWordCount ?? d.maxWordCount,
    maxCharCount: admin?.maxCharCount ?? d.maxCharCount,
    maxImageSizeBytes: admin?.maxImageSizeBytes ?? d.maxImageSizeBytes,
    allowedImageTypes: admin?.allowedImageTypes ?? [...d.allowedImageTypes],
    defaultImageWidth: admin?.defaultImageWidth ?? d.defaultImageWidth,
    defaultImageHeight: admin?.defaultImageHeight ?? d.defaultImageHeight,
    allowedVideoProviders: admin?.allowedVideoProviders ?? [...d.allowedVideoProviders],
    allowedHeadingLevels: admin?.allowedHeadingLevels ?? [...d.allowedHeadingLevels],
    maxTableRows: admin?.maxTableRows ?? d.maxTableRows,
    maxTableCols: admin?.maxTableCols ?? d.maxTableCols,
    colorPalette: admin?.colorPalette ?? [...d.colorPalette],
    defaultTextColor: admin?.defaultTextColor ?? d.defaultTextColor,
    fontSizePresets: admin?.fontSizePresets ?? [...d.fontSizePresets],
    lineHeightPresets: admin?.lineHeightPresets ?? [...d.lineHeightPresets],
    maxHistorySize: admin?.maxHistorySize ?? d.maxHistorySize,
    autoSaveDebounceMs: admin?.autoSaveDebounceMs ?? d.autoSaveDebounceMs,
    readingWpm: admin?.readingWpm ?? d.readingWpm,
    sanitizeOnSave: admin?.sanitizeOnSave ?? d.sanitizeOnSave,
    defaultPlaceholder: admin?.defaultPlaceholder ?? d.defaultPlaceholder,
    defaultMinHeight: admin?.defaultMinHeight ?? d.defaultMinHeight,
    defaultMaxHeight: admin?.defaultMaxHeight ?? d.defaultMaxHeight,

    // Phase 3: Competitive / Advanced features
    enableSlashCommands: admin?.enableSlashCommands ?? d.enableSlashCommands,
    enableCaseChange: admin?.enableCaseChange ?? d.enableCaseChange,
    enableFormatPainter: admin?.enableFormatPainter ?? d.enableFormatPainter,
    enableFocusMode: admin?.enableFocusMode ?? d.enableFocusMode,
    enableContentTemplates: admin?.enableContentTemplates ?? d.enableContentTemplates,
    enableAutosaveIndicator: admin?.enableAutosaveIndicator ?? d.enableAutosaveIndicator,
    enableButtonBlock: admin?.enableButtonBlock ?? d.enableButtonBlock,
    enableSpacerBlock: admin?.enableSpacerBlock ?? d.enableSpacerBlock,
    enableGallery: admin?.enableGallery ?? d.enableGallery,
    enableBookmarkCard: admin?.enableBookmarkCard ?? d.enableBookmarkCard,
    enableAudioEmbed: admin?.enableAudioEmbed ?? d.enableAudioEmbed,
    enableFileAttach: admin?.enableFileAttach ?? d.enableFileAttach,
    enableDropCap: admin?.enableDropCap ?? d.enableDropCap,
    enableFootnotes: admin?.enableFootnotes ?? d.enableFootnotes,
    enableMathBlocks: admin?.enableMathBlocks ?? d.enableMathBlocks,
    enableAnchorLinks: admin?.enableAnchorLinks ?? d.enableAnchorLinks,
    enableKeyboardShortcutsHelp: admin?.enableKeyboardShortcutsHelp ?? d.enableKeyboardShortcutsHelp,
    enableAdBlock: admin?.enableAdBlock ?? d.enableAdBlock,
    enableSeoScore: admin?.enableSeoScore ?? d.enableSeoScore,
  };
}

/** Fully-resolved editor configuration (no optional fields). */
export type MergedEditorConfig = ReturnType<typeof mergeAdminSettings>;
