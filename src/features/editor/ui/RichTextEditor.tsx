'use client';

/**
 * ============================================================================
 * MODULE:   editor/ui/RichTextEditor.tsx
 * PURPOSE:  Enterprise-grade contentEditable WYSIWYG editor
 *
 * PHASES:
 *   Phase 1 — Core formatting, admin-dynamic settings, image/video/table
 *   Phase 2 — Enhanced toolbar, content blocks, image context toolbar
 *   Phase 3 — Competitive features (slash commands, templates, format painter,
 *             focus mode, footnotes, math blocks, CTA buttons, galleries,
 *             bookmark cards, anchor links, SEO score, ad blocks, etc.)
 *
 * SELF-CONTAINED: This module can be extracted to its own repo.
 *                 Zero dependencies on parent app beyond props.
 * ============================================================================
 */

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  type CSSProperties,
} from 'react';
import type { RichTextEditorProps, EditorAdminProps } from '../types';
import { sanitizeHtml, escapeAttr, escapeHtml, logger } from '../utils';
import {
  MARKDOWN_SHORTCUTS,
  DEFAULT_EDITOR_CONFIG,
  FONT_SIZE_PRESETS,
  LINE_HEIGHT_PRESETS,
  SPECIAL_CHARS,
  BLOCK_TYPE_OPTIONS,
  CONTENT_TEMPLATES,
  SLASH_COMMANDS,
  KEYBOARD_SHORTCUTS_LIST,
} from '../server/constants';
import {
  // Core / Undo-Redo
  Undo2 as UndoIcon,
  Redo2 as RedoIcon,
  // Inline Formatting
  Bold as FormatBoldIcon,
  Italic as FormatItalicIcon,
  Underline as FormatUnderlinedIcon,
  Strikethrough as StrikethroughSIcon,
  Superscript as SuperscriptIcon,
  Subscript as SubscriptIcon,
  Braces as InlineCodeIcon,
  // Headings
  Heading1 as LooksOneIcon,
  Heading2 as LooksTwoIcon,
  Heading3 as Looks3Icon,
  // Lists & Blockquotes
  List as FormatListBulletedIcon,
  ListOrdered as FormatListNumberedIcon,
  ListChecks as ChecklistRtlIcon,
  Quote as FormatQuoteIcon,
  // Alignment
  AlignLeft as FormatAlignLeftIcon,
  AlignCenter as FormatAlignCenterIcon,
  AlignRight as FormatAlignRightIcon,
  AlignJustify as FormatAlignJustifyIcon,
  // Indentation
  Indent as IndentIcon,
  Outdent as OutdentIcon,
  // Insert: Link, Image, Video, Table
  Link as LinkIcon,
  Unlink as UnlinkIcon,
  Image as ImageOutlinedIcon,
  Video as VideocamOutlinedIcon,
  Table as TableChartIcon,
  // Code, Color, Separator
  Code as CodeIcon,
  Palette as PaletteOutlinedIcon,
  Minus as RemoveIcon,
  // Fullscreen
  Maximize as FullscreenIcon,
  Minimize as FullscreenExitIcon,
  // Utilities
  RemoveFormatting as ClearFormattingIcon,
  Search as FindReplaceIcon,
  FileCode as SourceCodeIcon,
  Smile as EmojiIcon,
  Type as SpecialCharIcon,
  Printer as PrintIcon,
  ListTree as TocIcon,
  Highlighter as HighlighterIcon,
  // UI Chrome
  ChevronDown as DropdownIcon,
  X as CloseIcon,
  ArrowDownFromLine as ReplaceIcon,
  // Content Block Inserter
  Plus as PlusIcon,
  Info as InfoIcon,
  AlertTriangle as WarningIcon,
  CheckCircle as SuccessIcon,
  XCircle as ErrorIcon,
  ChevronsUpDown as CollapsibleIcon,
  Columns2 as ColumnsIcon,
  MessageSquareQuote as PullQuoteIcon,
  Trash2 as TrashIcon,
  // Phase 3: Competitive Feature Icons
  MousePointerClick as ButtonBlockIcon,
  MoveVertical as SpacerIcon,
  Images as GalleryIcon,
  ExternalLink as BookmarkCardIcon,
  Music as AudioIcon,
  Paperclip as FileAttachIcon,
  Pilcrow as DropCapIcon,
  Footprints as FootnoteIcon,
  Sigma as MathIcon,
  Hash as AnchorIcon,
  CaseSensitive as CaseChangeIcon,
  Paintbrush as FormatPainterIcon,
  Keyboard as ShortcutsIcon,
  Focus as FocusModeIcon,
  LayoutTemplate as TemplateIcon,
  Save as SaveIcon,
  Megaphone as AdBlockIcon,
  BarChart3 as SeoScoreIcon,
} from 'lucide-react';
import './editor.css';

// ─── Merge admin settings with defaults ─────────────────────────────────────

function mergeAdminSettings(admin?: EditorAdminProps) {
  const d = DEFAULT_EDITOR_CONFIG;
  const s = admin ?? {};
  return {
    editorEnabled: s.editorEnabled ?? d.editorEnabled,
    enableBold: s.enableBold ?? d.enableBold,
    enableItalic: s.enableItalic ?? d.enableItalic,
    enableUnderline: s.enableUnderline ?? d.enableUnderline,
    enableStrikethrough: s.enableStrikethrough ?? d.enableStrikethrough,
    enableHeadings: s.enableHeadings ?? d.enableHeadings,
    enableLists: s.enableLists ?? d.enableLists,
    enableTaskLists: s.enableTaskLists ?? d.enableTaskLists,
    enableBlockquotes: s.enableBlockquotes ?? d.enableBlockquotes,
    enableCodeBlocks: s.enableCodeBlocks ?? d.enableCodeBlocks,
    enableInlineCode: s.enableInlineCode ?? d.enableInlineCode,
    enableLinks: s.enableLinks ?? d.enableLinks,
    enableImages: s.enableImages ?? d.enableImages,
    enableVideoEmbeds: s.enableVideoEmbeds ?? d.enableVideoEmbeds,
    enableTables: s.enableTables ?? d.enableTables,
    enableHorizontalRule: s.enableHorizontalRule ?? d.enableHorizontalRule,
    enableTextColor: s.enableTextColor ?? d.enableTextColor,
    enableBackgroundColor: s.enableBackgroundColor ?? d.enableBackgroundColor,
    enableAlignment: s.enableAlignment ?? d.enableAlignment,
    enableFullscreen: s.enableFullscreen ?? d.enableFullscreen,
    enableUndoRedo: s.enableUndoRedo ?? d.enableUndoRedo,
    enableMarkdownShortcuts: s.enableMarkdownShortcuts ?? d.enableMarkdownShortcuts,
    enableDragDropUpload: s.enableDragDropUpload ?? d.enableDragDropUpload,
    // Enhanced toolbar
    enableInlineCodeButton: s.enableInlineCodeButton ?? d.enableInlineCodeButton,
    enableRemoveLink: s.enableRemoveLink ?? d.enableRemoveLink,
    enableClearFormatting: s.enableClearFormatting ?? d.enableClearFormatting,
    enableSuperscript: s.enableSuperscript ?? d.enableSuperscript,
    enableSubscript: s.enableSubscript ?? d.enableSubscript,
    enableIndentButtons: s.enableIndentButtons ?? d.enableIndentButtons,
    enableFontSize: s.enableFontSize ?? d.enableFontSize,
    enableLineHeight: s.enableLineHeight ?? d.enableLineHeight,
    enableBlockTypeDropdown: s.enableBlockTypeDropdown ?? d.enableBlockTypeDropdown,
    enableFindReplace: s.enableFindReplace ?? d.enableFindReplace,
    enableSourceView: s.enableSourceView ?? d.enableSourceView,
    enableEmoji: s.enableEmoji ?? d.enableEmoji,
    enableSpecialChars: s.enableSpecialChars ?? d.enableSpecialChars,
    enablePrint: s.enablePrint ?? d.enablePrint,
    enableTableOfContents: s.enableTableOfContents ?? d.enableTableOfContents,
    // Phase 3
    enableSlashCommands: s.enableSlashCommands ?? d.enableSlashCommands,
    enableCaseChange: s.enableCaseChange ?? d.enableCaseChange,
    enableFormatPainter: s.enableFormatPainter ?? d.enableFormatPainter,
    enableFocusMode: s.enableFocusMode ?? d.enableFocusMode,
    enableContentTemplates: s.enableContentTemplates ?? d.enableContentTemplates,
    enableAutosaveIndicator: s.enableAutosaveIndicator ?? d.enableAutosaveIndicator,
    enableButtonBlock: s.enableButtonBlock ?? d.enableButtonBlock,
    enableSpacerBlock: s.enableSpacerBlock ?? d.enableSpacerBlock,
    enableGallery: s.enableGallery ?? d.enableGallery,
    enableBookmarkCard: s.enableBookmarkCard ?? d.enableBookmarkCard,
    enableAudioEmbed: s.enableAudioEmbed ?? d.enableAudioEmbed,
    enableFileAttach: s.enableFileAttach ?? d.enableFileAttach,
    enableDropCap: s.enableDropCap ?? d.enableDropCap,
    enableFootnotes: s.enableFootnotes ?? d.enableFootnotes,
    enableMathBlocks: s.enableMathBlocks ?? d.enableMathBlocks,
    enableAnchorLinks: s.enableAnchorLinks ?? d.enableAnchorLinks,
    enableKeyboardShortcutsHelp: s.enableKeyboardShortcutsHelp ?? d.enableKeyboardShortcutsHelp,
    enableAdBlock: s.enableAdBlock ?? d.enableAdBlock,
    enableSeoScore: s.enableSeoScore ?? d.enableSeoScore,
    // Limits & config
    maxWordCount: s.maxWordCount ?? d.maxWordCount,
    maxCharCount: s.maxCharCount ?? d.maxCharCount,
    maxImageSizeBytes: s.maxImageSizeBytes ?? d.maxImageSizeBytes,
    allowedImageTypes: s.allowedImageTypes ?? [...d.allowedImageTypes],
    defaultImageWidth: s.defaultImageWidth ?? d.defaultImageWidth,
    defaultImageHeight: s.defaultImageHeight ?? d.defaultImageHeight,
    allowedVideoProviders: s.allowedVideoProviders ?? [...d.allowedVideoProviders],
    allowedHeadingLevels: s.allowedHeadingLevels ?? [...d.allowedHeadingLevels],
    maxTableRows: s.maxTableRows ?? d.maxTableRows,
    maxTableCols: s.maxTableCols ?? d.maxTableCols,
    colorPalette: s.colorPalette ?? [...d.colorPalette],
    defaultTextColor: s.defaultTextColor ?? d.defaultTextColor,
    fontSizePresets: s.fontSizePresets ?? [...d.fontSizePresets],
    lineHeightPresets: s.lineHeightPresets ?? [...d.lineHeightPresets],
    maxHistorySize: s.maxHistorySize ?? d.maxHistorySize,
    autoSaveDebounceMs: s.autoSaveDebounceMs ?? d.autoSaveDebounceMs,
    readingWpm: s.readingWpm ?? d.readingWpm,
    sanitizeOnSave: s.sanitizeOnSave ?? d.sanitizeOnSave,
  };
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function RichTextEditor({
  content = '',
  onChange,
  onImageUpload,
  placeholder = 'Start writing your content here...',
  minHeight = '300px',
  maxHeight = '600px',
  className = '',
  readOnly = false,
  adminSettings,
}: RichTextEditorProps) {
  const a = useMemo(() => mergeAdminSettings(adminSettings), [adminSettings]);
  const effectiveReadOnly = readOnly || !a.editorEnabled;

  // ── Refs ──────────────────────────────────────────────────────────────
  const editorRef = useRef<HTMLDivElement>(null);
  const lastHtmlRef = useRef<string>(content);
  const initializedRef = useRef(false);
  const historyStack = useRef<string[]>([]);
  const historyIndex = useRef(-1);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftKeyRef = useRef<string | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const footnoteCounter = useRef(0);
  const slashMenuRef = useRef<HTMLDivElement>(null);

  // ── State ─────────────────────────────────────────────────────────────
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [readingTime, setReadingTime] = useState(0);
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [contentLimitExceeded, setContentLimitExceeded] = useState(false);

  // Dialog state
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [imageAlt, setImageAlt] = useState('');
  const [imageCaption, setImageCaption] = useState('');
  const [imageAlignment, setImageAlignment] = useState<string>('center');
  const [imageSize, setImageSize] = useState<string>('large');
  const [showVideoDialog, setShowVideoDialog] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [colorType, setColorType] = useState<'text' | 'background'>('text');
  const [selectedColor, setSelectedColor] = useState(a.defaultTextColor);
  const [showTableDialog, setShowTableDialog] = useState(false);
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);

  // Content block inserter
  const [showBlockMenu, setShowBlockMenu] = useState(false);

  // Image context toolbar
  const [selectedImage, setSelectedImage] = useState<HTMLElement | null>(null);
  const [imageToolbarPos, setImageToolbarPos] = useState<{ top: number; left: number } | null>(null);

  // Enhanced feature state
  const [isSourceView, setIsSourceView] = useState(false);
  const [sourceHtml, setSourceHtml] = useState('');
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [findCount, setFindCount] = useState(0);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showSpecialChars, setShowSpecialChars] = useState(false);
  const [showFontSizeDropdown, setShowFontSizeDropdown] = useState(false);
  const [showLineHeightDropdown, setShowLineHeightDropdown] = useState(false);
  const [showBlockTypeDropdown, setShowBlockTypeDropdown] = useState(false);
  const [currentFontSize, setCurrentFontSize] = useState(16);
  const [currentLineHeight, setCurrentLineHeight] = useState(1.5);
  const [currentBlockType, setCurrentBlockType] = useState('p');

  // Phase 3 state
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashMenuPos, setSlashMenuPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [slashFilter, setSlashFilter] = useState('');
  const [showCaseMenu, setShowCaseMenu] = useState(false);
  const [isFormatPainting, setIsFormatPainting] = useState(false);
  const [savedFormat, setSavedFormat] = useState<Record<string, string> | null>(null);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [showEmbedDialog, setShowEmbedDialog] = useState(false);
  const [embedUrl, setEmbedUrl] = useState('');
  const [showAdDialog, setShowAdDialog] = useState(false);
  const [adSlotType, setAdSlotType] = useState<'banner' | 'in-article' | 'sidebar'>('in-article');
  const [adSlotId, setAdSlotId] = useState('');
  const [seoReadability, setSeoReadability] = useState<{ score: number; grade: string; issues: string[] }>({ score: 0, grade: '-', issues: [] });
  const [showBookmarkDialog, setShowBookmarkDialog] = useState(false);
  const [bookmarkUrl, setBookmarkUrl] = useState('');
  const [showAnchorDialog, setShowAnchorDialog] = useState(false);
  const [anchorId, setAnchorId] = useState('');
  const [showButtonDialog, setShowButtonDialog] = useState(false);
  const [buttonUrl, setButtonUrl] = useState('');
  const [buttonText, setButtonText] = useState('Click Here');
  const [buttonStyle, setButtonStyle] = useState<'primary' | 'secondary' | 'outline'>('primary');
  const [showMathDialog, setShowMathDialog] = useState(false);
  const [mathExpression, setMathExpression] = useState('');

  // Draft key init
  useEffect(() => {
    draftKeyRef.current = `rte_draft_${typeof window !== 'undefined' ? window.location.pathname : 'default'}`;
  }, []);

  // ── Utility callbacks ─────────────────────────────────────────────────

  const updateMetrics = useCallback(() => {
    if (!editorRef.current) return;
    const text = editorRef.current.innerText || '';
    const words = text.trim().split(/\s+/).filter((w) => w.length > 0);
    setWordCount(words.length);
    setCharCount(text.length);
    setReadingTime(Math.ceil(words.length / a.readingWpm));
    const exceeded = (a.maxWordCount > 0 && words.length > a.maxWordCount) || (a.maxCharCount > 0 && text.length > a.maxCharCount);
    setContentLimitExceeded(exceeded);
  }, [a.readingWpm, a.maxWordCount, a.maxCharCount]);

  const updateActiveFormats = useCallback(() => {
    const formats = new Set<string>();
    const checks = ['bold', 'italic', 'underline', 'strikeThrough', 'superscript', 'subscript', 'insertUnorderedList', 'insertOrderedList', 'justifyLeft', 'justifyCenter', 'justifyRight', 'justifyFull'];
    for (const cmd of checks) { try { if (document.queryCommandState(cmd)) formats.add(cmd); } catch { /* */ } }
    try { const block = document.queryCommandValue('formatBlock').toLowerCase(); if (/^h[1-6]$/.test(block)) formats.add(block); if (block === 'blockquote') formats.add('blockquote'); } catch { /* */ }
    setActiveFormats(formats);
  }, []);

  const saveToHistory = useCallback(() => {
    if (!editorRef.current) return;
    const html = editorRef.current.innerHTML;
    historyStack.current = historyStack.current.slice(0, historyIndex.current + 1);
    historyStack.current.push(html);
    if (historyStack.current.length > a.maxHistorySize) historyStack.current.shift();
    historyIndex.current = historyStack.current.length - 1;
  }, [a.maxHistorySize]);

  // ── Input handler ─────────────────────────────────────────────────────

  const handleInput = useCallback(() => {
    if (!editorRef.current) return;
    const html = editorRef.current.innerHTML;
    const text = editorRef.current.innerText || '';
    const words = text.trim().split(/\s+/).filter((w) => w.length > 0);
    lastHtmlRef.current = html;
    onChangeRef.current?.(html, text, words.length);
    saveToHistory();
    updateMetrics();
    updateActiveFormats();

    // Debounced auto-save
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    setAutoSaveStatus('unsaved');
    autoSaveTimer.current = setTimeout(() => {
      if (!editorRef.current || !draftKeyRef.current) return;
      try {
        setAutoSaveStatus('saving');
        const cur = editorRef.current.innerHTML;
        if (cur && cur !== '<br>') localStorage.setItem(draftKeyRef.current, cur);
        setAutoSaveStatus('saved');
      } catch { /* */ }
    }, a.autoSaveDebounceMs);

    // Markdown shortcuts
    if (!a.enableMarkdownShortcuts) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const node = sel.anchorNode;
    if (!node || node.nodeType !== Node.TEXT_NODE) return;
    const nodeText = node.textContent ?? '';
    const offset = sel.anchorOffset;
    const before = nodeText.substring(0, offset);

    const hm = before.match(MARKDOWN_SHORTCUTS.HEADING);
    if (hm) { node.textContent = nodeText.substring(offset); document.execCommand('formatBlock', false, `h${hm[1].length}`); return; }
    if (MARKDOWN_SHORTCUTS.BULLET_LIST.test(before)) { node.textContent = nodeText.substring(offset); document.execCommand('insertUnorderedList'); return; }
    if (MARKDOWN_SHORTCUTS.ORDERED_LIST.test(before)) { node.textContent = nodeText.substring(offset); document.execCommand('insertOrderedList'); return; }
    if (MARKDOWN_SHORTCUTS.BLOCKQUOTE.test(before)) { node.textContent = nodeText.substring(offset); document.execCommand('formatBlock', false, 'blockquote'); return; }
    if (MARKDOWN_SHORTCUTS.HORIZONTAL_RULE.test(before.trim()) && offset === nodeText.length) { node.textContent = ''; document.execCommand('insertHorizontalRule'); return; }
    if (MARKDOWN_SHORTCUTS.CODE_BLOCK.test(before.trim())) { node.textContent = ''; document.execCommand('insertHTML', false, '<pre><code>// code\n</code></pre>'); return; }
  }, [saveToHistory, updateMetrics, updateActiveFormats, a.autoSaveDebounceMs, a.enableMarkdownShortcuts]);

  // Init content
  useEffect(() => {
    if (!editorRef.current) return;
    if (lastHtmlRef.current === content) return;
    if (initializedRef.current && !content) return;
    editorRef.current.innerHTML = sanitizeHtml(content || '');
    lastHtmlRef.current = content;
    const text = editorRef.current.innerText || '';
    const words = text.trim().split(/\s+/).filter(w => w.length > 0);
    setWordCount(words.length); setCharCount(text.length); setReadingTime(Math.ceil(words.length / a.readingWpm));
    if (!initializedRef.current) { saveToHistory(); initializedRef.current = true; }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

  useEffect(() => { return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); }; }, []);

  const undo = useCallback(() => { if (historyIndex.current > 0) { historyIndex.current--; if (editorRef.current) { editorRef.current.innerHTML = historyStack.current[historyIndex.current]; updateMetrics(); } } }, [updateMetrics]);
  const redo = useCallback(() => { if (historyIndex.current < historyStack.current.length - 1) { historyIndex.current++; if (editorRef.current) { editorRef.current.innerHTML = historyStack.current[historyIndex.current]; updateMetrics(); } } }, [updateMetrics]);

  const executeCommand = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    setTimeout(() => { updateMetrics(); updateActiveFormats(); }, 0);
  }, [updateMetrics, updateActiveFormats]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const html = e.clipboardData.getData('text/html');
    const text = e.clipboardData.getData('text/plain');
    if (html) { e.preventDefault(); document.execCommand('insertHTML', false, sanitizeHtml(html)); }
    else if (text) {
      const escaped = escapeHtml(text);
      const linked = escaped.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
      if (linked !== escaped) { e.preventDefault(); document.execCommand('insertHTML', false, linked); }
    }
    setTimeout(updateMetrics, 0);
  }, [updateMetrics]);

  // ── Drag & drop ───────────────────────────────────────────────────────

  const handleDragOver = useCallback((e: React.DragEvent) => { if (!a.enableDragDropUpload || !a.enableImages) return; e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; setIsDragging(true); }, [a.enableDragDropUpload, a.enableImages]);
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
    if (!a.enableDragDropUpload || !a.enableImages) return;
    const files = Array.from(e.dataTransfer.files).filter(f => a.allowedImageTypes.includes(f.type));
    if (files.length === 0 || !onImageUpload) return;
    for (const file of files) {
      if (file.size > a.maxImageSizeBytes) continue;
      try {
        const url = await onImageUpload(file);
        const img = `<figure class="editor-figure img-large img-align-center"><img src="${escapeAttr(url)}" alt="${escapeAttr(file.name)}" loading="lazy" decoding="async" /></figure>`;
        editorRef.current?.focus(); document.execCommand('insertHTML', false, img);
      } catch (err) { logger.error('Image drop failed:', err); }
    }
    setTimeout(updateMetrics, 0);
  }, [onImageUpload, updateMetrics, a.enableDragDropUpload, a.enableImages, a.allowedImageTypes, a.maxImageSizeBytes]);

  useEffect(() => {
    const el = editorRef.current; if (!el) return;
    const blockDrop = (e: Event) => { e.preventDefault(); e.stopPropagation(); };
    el.addEventListener('drop', blockDrop, true);
    el.addEventListener('dragover', (e: Event) => { e.preventDefault(); }, true);
    return () => { el.removeEventListener('drop', blockDrop, true); };
  }, []);

  // ── Formatting callbacks ──────────────────────────────────────────────

  const toggleFormat = useCallback((f: string) => { executeCommand(f); }, [executeCommand]);
  const setHeading = useCallback((l: number) => { executeCommand('formatBlock', `h${l}`); }, [executeCommand]);
  const setAlignment = useCallback((a: string) => { const m: Record<string, string> = { left: 'justifyLeft', center: 'justifyCenter', right: 'justifyRight', justify: 'justifyFull' }; executeCommand(m[a]); }, [executeCommand]);

  const insertLink = useCallback(() => {
    if (!linkUrl) return;
    const u = linkUrl.trim();
    if (/^\s*(?:javascript|data|vbscript)\s*:/i.test(u)) return;
    if (linkText) { executeCommand('insertHTML', `<a href="${escapeAttr(u)}" target="_blank" rel="noopener noreferrer">${escapeHtml(linkText)}</a>`); }
    else { executeCommand('createLink', u); const sel = window.getSelection(); if (sel?.anchorNode?.parentElement?.tagName === 'A') { sel.anchorNode.parentElement.setAttribute('rel', 'noopener noreferrer'); sel.anchorNode.parentElement.setAttribute('target', '_blank'); } }
    setShowLinkDialog(false); setLinkUrl(''); setLinkText('');
  }, [linkUrl, linkText, executeCommand]);

  const insertImage = useCallback((url: string) => {
    if (!url || /^\s*(?:javascript|data|vbscript)\s*:/i.test(url.trim())) return;
    const sizeClass: Record<string, string> = { auto: 'img-auto', small: 'img-small', medium: 'img-medium', large: 'img-large', full: 'img-full' };
    const alignClass: Record<string, string> = { none: '', left: 'img-align-left', center: 'img-align-center', right: 'img-align-right', full: 'img-align-full' };
    const cls = [sizeClass[imageSize] || 'img-large', alignClass[imageAlignment] || 'img-align-center'].filter(Boolean).join(' ');
    const cap = imageCaption ? `<figcaption>${escapeHtml(imageCaption)}</figcaption>` : '';
    const html = `<figure class="editor-figure ${cls}"><img src="${escapeAttr(url.trim())}" alt="${escapeAttr(imageAlt || 'Image')}" loading="lazy" decoding="async" />${cap}</figure>`;
    executeCommand('insertHTML', html);
    setShowImageDialog(false); setImageUrl(''); setImageAlt(''); setImageCaption(''); setImageAlignment('center'); setImageSize('large');
  }, [executeCommand, imageAlt, imageCaption, imageAlignment, imageSize]);

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !onImageUpload) return;
    const file = e.target.files[0];
    if (!a.allowedImageTypes.includes(file.type) || file.size > a.maxImageSizeBytes) return;
    try { const url = await onImageUpload(file); insertImage(url); } catch (err) { logger.error('Upload failed:', err); }
  }, [onImageUpload, insertImage, a.allowedImageTypes, a.maxImageSizeBytes]);

  const insertVideo = useCallback(() => {
    if (!videoUrl || /^\s*(?:javascript|data|vbscript)\s*:/i.test(videoUrl.trim())) return;
    const pp: Record<string, RegExp> = { youtube: /(?:youtube\.com|youtu\.be)/, vimeo: /vimeo\.com/ };
    if (!a.allowedVideoProviders.some(p => pp[p]?.test(videoUrl.trim().toLowerCase()))) return;
    let eu = videoUrl.trim();
    const ym = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s]+)/);
    if (ym) eu = `https://www.youtube.com/embed/${encodeURIComponent(ym[1])}`;
    executeCommand('insertHTML', `<div class="video-wrapper"><iframe src="${escapeAttr(eu)}" allowfullscreen sandbox="allow-scripts allow-same-origin allow-presentation" loading="lazy" referrerpolicy="no-referrer"></iframe></div>`);
    setShowVideoDialog(false); setVideoUrl('');
  }, [videoUrl, executeCommand, a.allowedVideoProviders]);

  const insertBlockquote = useCallback(() => { executeCommand('formatBlock', 'blockquote'); }, [executeCommand]);
  const insertCodeBlock = useCallback(() => { executeCommand('insertHTML', '<pre><code>// code\n</code></pre>'); }, [executeCommand]);
  const insertHorizontalRule = useCallback(() => { executeCommand('insertHorizontalRule'); }, [executeCommand]);
  const applyColor = useCallback(() => { executeCommand(colorType === 'text' ? 'foreColor' : 'backColor', selectedColor); setShowColorPicker(false); }, [colorType, selectedColor, executeCommand]);
  const insertTaskList = useCallback(() => { executeCommand('insertHTML', '<ul style="list-style:none;padding-left:1.5em"><li><input type="checkbox" style="margin-right:0.5em"/>Task item</li></ul>'); }, [executeCommand]);

  const insertTable = useCallback(() => {
    let h = '<table><tbody>';
    for (let i = 0; i < tableRows; i++) { h += '<tr>'; for (let j = 0; j < tableCols; j++) { const t = i === 0 ? 'th' : 'td'; h += `<${t}>${i === 0 ? `Header ${j + 1}` : `Cell ${i}-${j + 1}`}</${t}>`; } h += '</tr>'; }
    h += '</tbody></table>';
    executeCommand('insertHTML', h); setShowTableDialog(false);
  }, [tableRows, tableCols, executeCommand]);

  const toggleFullscreen = useCallback(() => { setIsFullscreen(p => !p); }, []);

  // ── Enhanced feature callbacks ────────────────────────────────────────

  const insertInlineCode = useCallback(() => {
    const sel = window.getSelection();
    const txt = sel?.toString() ? escapeHtml(sel.toString()) : 'code';
    document.execCommand('insertHTML', false, `<code>${txt}</code>`);
    editorRef.current?.focus(); setTimeout(() => { updateMetrics(); updateActiveFormats(); }, 0);
  }, [updateMetrics, updateActiveFormats]);

  const removeLink = useCallback(() => { executeCommand('unlink'); }, [executeCommand]);

  const clearFormatting = useCallback(() => { executeCommand('removeFormat'); executeCommand('formatBlock', 'p'); }, [executeCommand]);

  const setFontSize = useCallback((size: number) => {
    const sel = window.getSelection(); if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    const span = document.createElement('span'); span.style.fontSize = `${size}px`;
    if (range.collapsed) { span.textContent = '\u200B'; range.insertNode(span); range.setStartAfter(span); range.collapse(true); sel.removeAllRanges(); sel.addRange(range); }
    else { span.appendChild(range.extractContents()); range.insertNode(span); range.selectNodeContents(span); sel.removeAllRanges(); sel.addRange(range); }
    setCurrentFontSize(size); setShowFontSizeDropdown(false); editorRef.current?.focus(); setTimeout(updateMetrics, 0);
  }, [updateMetrics]);

  const setLineHeight = useCallback((lh: number) => {
    const sel = window.getSelection(); if (!sel || sel.rangeCount === 0) return;
    const node = sel.anchorNode; const el = node?.nodeType === Node.ELEMENT_NODE ? node as HTMLElement : node?.parentElement;
    const block = el?.closest('p, h1, h2, h3, h4, h5, h6, li, blockquote, pre, div');
    if (block && block instanceof HTMLElement) block.style.lineHeight = String(lh);
    setCurrentLineHeight(lh); setShowLineHeightDropdown(false); editorRef.current?.focus(); setTimeout(updateMetrics, 0);
  }, [updateMetrics]);

  const setBlockType = useCallback((type: string) => { executeCommand('formatBlock', type); setCurrentBlockType(type); setShowBlockTypeDropdown(false); }, [executeCommand]);

  const handleFindReplace = useCallback((action: 'find' | 'replace' | 'replaceAll') => {
    if (!editorRef.current || !findText) return;
    const wf = (window as unknown as { find?: (s: string, c: boolean, b: boolean, w: boolean) => boolean }).find;
    if (action === 'find') {
      const ct = editorRef.current.innerText || '';
      const rx = new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      setFindCount(ct.match(rx)?.length ?? 0);
      if (typeof wf === 'function') wf(findText, false, false, true);
    } else if (action === 'replace') {
      const sel = window.getSelection();
      if (sel && sel.toString().toLowerCase() === findText.toLowerCase()) document.execCommand('insertText', false, replaceText);
      if (typeof wf === 'function') wf(findText, false, false, true);
    } else {
      const html = editorRef.current.innerHTML;
      const rx = new RegExp(escapeHtml(findText).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      editorRef.current.innerHTML = html.replace(rx, escapeHtml(replaceText));
      setFindCount(0); saveToHistory(); updateMetrics();
      const t = editorRef.current.innerText || ''; const w = t.trim().split(/\s+/).filter(x => x.length > 0);
      onChangeRef.current?.(editorRef.current.innerHTML, t, w.length);
    }
  }, [findText, replaceText, saveToHistory, updateMetrics]);

  const toggleSourceView = useCallback(() => {
    if (!editorRef.current) return;
    if (!isSourceView) { setSourceHtml(editorRef.current.innerHTML); setIsSourceView(true); }
    else {
      const s = sanitizeHtml(sourceHtml); editorRef.current.innerHTML = s; lastHtmlRef.current = s; saveToHistory();
      const t = editorRef.current.innerText || ''; const w = t.trim().split(/\s+/).filter(x => x.length > 0);
      onChangeRef.current?.(s, t, w.length); setIsSourceView(false); updateMetrics();
    }
  }, [isSourceView, sourceHtml, saveToHistory, updateMetrics]);

  const insertSpecialChar = useCallback((ch: string) => { executeCommand('insertText', ch); setShowSpecialChars(false); }, [executeCommand]);
  const insertEmoji = useCallback((em: string) => { executeCommand('insertText', em); setShowEmojiPicker(false); }, [executeCommand]);

  const handlePrint = useCallback(() => {
    if (!editorRef.current) return;
    const pw = window.open('', '_blank'); if (!pw) return;
    pw.document.write(`<!DOCTYPE html><html><head><title>Print</title><style>body{font-family:Georgia,serif;max-width:800px;margin:2em auto;padding:1em;line-height:1.6}img{max-width:100%;height:auto}table{border-collapse:collapse;width:100%;margin:1em 0}th,td{border:1px solid #ccc;padding:.5em}pre{background:#f5f5f5;padding:1em;border-radius:4px}code{background:#f0f0f0;padding:.15em .3em;border-radius:3px}blockquote{border-left:4px solid #3498db;margin-left:0;padding-left:1em;color:#555}</style></head><body>${editorRef.current.innerHTML}</body></html>`);
    pw.document.close(); pw.print(); pw.close();
  }, []);

  const generateToc = useCallback(() => {
    if (!editorRef.current) return;
    const headings = editorRef.current.querySelectorAll('h1,h2,h3,h4,h5,h6');
    if (headings.length === 0) return;
    let toc = '<nav class="toc"><strong>Table of Contents</strong><ul>';
    headings.forEach((h, i) => { const lv = parseInt(h.tagName.charAt(1), 10); h.id = `heading-${i}`; toc += `<li style="margin-left:${(lv - 1) * 1.5}em"><a href="#heading-${i}">${escapeHtml(h.textContent || '')}</a></li>`; });
    toc += '</ul></nav><hr/>';
    const sel = window.getSelection();
    if (sel && editorRef.current) { const r = document.createRange(); r.setStart(editorRef.current, 0); r.collapse(true); sel.removeAllRanges(); sel.addRange(r); }
    document.execCommand('insertHTML', false, toc); saveToHistory(); updateMetrics();
  }, [saveToHistory, updateMetrics]);

  // ── Content Block Callbacks ───────────────────────────────────────────

  const insertCallout = useCallback((type: 'info' | 'warning' | 'success' | 'error') => {
    const labels: Record<string, string> = { info: '💡 Info', warning: '⚠️ Warning', success: '✅ Success', error: '❌ Error' };
    executeCommand('insertHTML', `<div class="callout callout-${type}" contenteditable="true"><strong>${labels[type]}</strong><p>Type your content here...</p></div><p><br/></p>`);
    setShowBlockMenu(false);
  }, [executeCommand]);

  const insertCollapsible = useCallback(() => { executeCommand('insertHTML', '<details class="editor-details"><summary>Click to expand</summary><p>Hidden content goes here...</p></details><p><br/></p>'); setShowBlockMenu(false); }, [executeCommand]);
  const insertPullQuote = useCallback(() => { executeCommand('insertHTML', '<blockquote class="pull-quote"><p>Your pull quote text here...</p><cite>— Attribution</cite></blockquote><p><br/></p>'); setShowBlockMenu(false); }, [executeCommand]);
  const insertColumns = useCallback(() => { executeCommand('insertHTML', '<div class="editor-columns"><div class="editor-column"><p>Left column...</p></div><div class="editor-column"><p>Right column...</p></div></div><p><br/></p>'); setShowBlockMenu(false); }, [executeCommand]);
  const applyHighlight = useCallback(() => { const sel = window.getSelection(); const t = sel?.toString() ? escapeHtml(sel.toString()) : 'highlighted text'; document.execCommand('insertHTML', false, `<mark>${t}</mark>`); editorRef.current?.focus(); setTimeout(() => { updateMetrics(); updateActiveFormats(); }, 0); }, [updateMetrics, updateActiveFormats]);
  const insertStyledSeparator = useCallback(() => { executeCommand('insertHTML', '<div class="styled-separator"><span>✦</span></div><p><br/></p>'); setShowBlockMenu(false); }, [executeCommand]);
  const insertCodeBlockWithLang = useCallback((lang: string = 'javascript') => { executeCommand('insertHTML', `<pre class="code-block" data-language="${escapeAttr(lang)}"><code>// ${escapeHtml(lang)} code\n</code></pre><p><br/></p>`); setShowBlockMenu(false); }, [executeCommand]);

  // ── Phase 3 Callbacks ─────────────────────────────────────────────────

  const changeCase = useCallback((ct: 'upper' | 'lower' | 'title' | 'sentence') => {
    const sel = window.getSelection(); if (!sel || sel.isCollapsed) return;
    const t = sel.toString(); let r = t;
    if (ct === 'upper') r = t.toUpperCase(); else if (ct === 'lower') r = t.toLowerCase();
    else if (ct === 'title') r = t.replace(/\b\w/g, c => c.toUpperCase());
    else r = t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
    document.execCommand('insertText', false, r); setShowCaseMenu(false);
  }, []);

  const copyFormat = useCallback(() => {
    const sel = window.getSelection(); if (!sel || sel.rangeCount === 0) return;
    const node = sel.anchorNode?.parentElement; if (!node) return;
    const cs = window.getComputedStyle(node);
    setSavedFormat({ fontWeight: cs.fontWeight, fontStyle: cs.fontStyle, textDecoration: cs.textDecoration, color: cs.color, backgroundColor: cs.backgroundColor, fontSize: cs.fontSize });
    setIsFormatPainting(true);
  }, []);

  const applyFormat = useCallback(() => {
    if (!isFormatPainting || !savedFormat) return;
    const sel = window.getSelection(); if (!sel || sel.isCollapsed || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0); const span = document.createElement('span');
    if (savedFormat.fontWeight && savedFormat.fontWeight !== 'normal' && savedFormat.fontWeight !== '400') span.style.fontWeight = savedFormat.fontWeight;
    if (savedFormat.fontStyle && savedFormat.fontStyle !== 'normal') span.style.fontStyle = savedFormat.fontStyle;
    if (savedFormat.textDecoration && savedFormat.textDecoration !== 'none') span.style.textDecoration = savedFormat.textDecoration;
    if (savedFormat.color) span.style.color = savedFormat.color;
    if (savedFormat.backgroundColor && savedFormat.backgroundColor !== 'rgba(0, 0, 0, 0)') span.style.backgroundColor = savedFormat.backgroundColor;
    if (savedFormat.fontSize) span.style.fontSize = savedFormat.fontSize;
    span.appendChild(range.extractContents()); range.insertNode(span);
    setIsFormatPainting(false); setSavedFormat(null); saveToHistory(); handleInput();
  }, [isFormatPainting, savedFormat, saveToHistory, handleInput]);

  const insertTemplate = useCallback((id: string) => { const t = CONTENT_TEMPLATES.find(x => x.id === id); if (t) { executeCommand('insertHTML', t.html); saveToHistory(); } setShowTemplateMenu(false); }, [executeCommand, saveToHistory]);

  const insertButtonBlock = useCallback(() => {
    if (!buttonUrl) return;
    executeCommand('insertHTML', `<div class="editor-button-block"><a href="${escapeAttr(buttonUrl.trim())}" class="editor-cta-btn editor-cta-${buttonStyle}" target="_blank" rel="noopener noreferrer">${escapeHtml(buttonText || 'Click Here')}</a></div><p><br/></p>`);
    setShowButtonDialog(false); setButtonUrl(''); setButtonText('Click Here'); setButtonStyle('primary');
  }, [buttonUrl, buttonText, buttonStyle, executeCommand]);

  const insertSpacer = useCallback((h: number = 40) => { executeCommand('insertHTML', `<div class="editor-spacer" style="height:${h}px" contenteditable="false" data-type="spacer"></div><p><br/></p>`); setShowBlockMenu(false); }, [executeCommand]);
  const insertGallery = useCallback(() => { executeCommand('insertHTML', '<div class="editor-gallery" contenteditable="false" data-type="gallery"><div class="gallery-placeholder"><span>📷 Click to add images</span></div></div><p><br/></p>'); setShowBlockMenu(false); }, [executeCommand]);

  const insertBookmarkCard = useCallback(() => {
    if (!bookmarkUrl) return;
    const d = (() => { try { return new URL(bookmarkUrl.trim()).hostname; } catch { return bookmarkUrl.trim(); } })();
    executeCommand('insertHTML', `<div class="editor-bookmark-card" contenteditable="false" data-type="bookmark"><a href="${escapeAttr(bookmarkUrl.trim())}" target="_blank" rel="noopener noreferrer" class="bookmark-link"><div class="bookmark-content"><div class="bookmark-title">${escapeHtml(d)}</div><div class="bookmark-url">${escapeHtml(bookmarkUrl.trim())}</div></div><div class="bookmark-icon">🔗</div></a></div><p><br/></p>`);
    setShowBookmarkDialog(false); setBookmarkUrl('');
  }, [bookmarkUrl, executeCommand]);

  const insertAudioEmbed = useCallback(() => {
    if (!embedUrl) return;
    executeCommand('insertHTML', `<div class="editor-audio-block" contenteditable="false" data-type="audio"><audio controls preload="metadata"><source src="${escapeAttr(embedUrl.trim())}" /></audio><p class="audio-caption">${escapeHtml(embedUrl.trim())}</p></div><p><br/></p>`);
    setShowEmbedDialog(false); setEmbedUrl('');
  }, [embedUrl, executeCommand]);

  const insertFileAttach = useCallback((name: string = 'document.pdf', url: string = '#') => {
    const ext = name.split('.').pop()?.toUpperCase() || 'FILE';
    executeCommand('insertHTML', `<div class="editor-file-block" contenteditable="false" data-type="file"><a href="${escapeAttr(url)}" class="file-link" download><span class="file-icon">📎</span><span class="file-info"><span class="file-name">${escapeHtml(name)}</span><span class="file-ext">${escapeHtml(ext)}</span></span></a></div><p><br/></p>`);
    setShowBlockMenu(false);
  }, [executeCommand]);

  const toggleDropCap = useCallback(() => {
    if (!editorRef.current) return;
    const p = editorRef.current.querySelector('p');
    if (p) { p.classList.toggle('drop-cap'); saveToHistory(); handleInput(); }
  }, [saveToHistory, handleInput]);

  const insertFootnote = useCallback(() => {
    if (!editorRef.current) return;
    footnoteCounter.current++;
    const n = footnoteCounter.current;
    document.execCommand('insertHTML', false, `<sup class="footnote-ref" data-footnote="${n}"><a href="#fn-${n}" id="fnref-${n}">[${n}]</a></sup>`);
    let sec = editorRef.current.querySelector('.footnotes-section');
    if (!sec) { sec = document.createElement('section'); sec.className = 'footnotes-section'; sec.innerHTML = '<hr class="footnotes-divider"/><ol class="footnotes-list"></ol>'; editorRef.current.appendChild(sec); }
    const ol = sec.querySelector('.footnotes-list');
    if (ol) { const li = document.createElement('li'); li.id = `fn-${n}`; li.innerHTML = `Footnote ${n}. <a href="#fnref-${n}" class="footnote-back">↩</a>`; li.setAttribute('contenteditable', 'true'); ol.appendChild(li); }
    editorRef.current.focus(); saveToHistory(); handleInput();
  }, [saveToHistory, handleInput]);

  const insertMathBlock = useCallback(() => {
    if (!mathExpression) return;
    executeCommand('insertHTML', `<div class="editor-math-block" contenteditable="false" data-type="math" data-expression="${escapeAttr(mathExpression)}"><code class="math-display">${escapeHtml(mathExpression)}</code></div><p><br/></p>`);
    setShowMathDialog(false); setMathExpression('');
  }, [mathExpression, executeCommand]);

  const insertAnchor = useCallback(() => {
    if (!anchorId) return;
    const sid = escapeAttr(anchorId.trim().replace(/\s+/g, '-').toLowerCase());
    executeCommand('insertHTML', `<span class="editor-anchor" id="${sid}" contenteditable="false" data-type="anchor">⚓ ${escapeHtml(anchorId.trim())}</span>`);
    setShowAnchorDialog(false); setAnchorId('');
  }, [anchorId, executeCommand]);

  const insertAdBlock = useCallback(() => {
    executeCommand('insertHTML', `<div class="editor-ad-block" contenteditable="false" data-type="ad" data-slot-type="${escapeAttr(adSlotType)}" data-slot-id="${escapeAttr(adSlotId.trim() || `ad-${Date.now()}`)}"><div class="ad-placeholder"><span class="ad-label">📢 Ad: ${escapeHtml(adSlotType)}</span></div></div><p><br/></p>`);
    setShowAdDialog(false); setAdSlotId('');
  }, [adSlotType, adSlotId, executeCommand]);

  const calculateSeoScore = useCallback(() => {
    if (!editorRef.current) return;
    const text = editorRef.current.innerText || '';
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = text.trim().split(/\s+/).filter(w => w.length > 0);
    const headings = editorRef.current.querySelectorAll('h1,h2,h3,h4,h5,h6');
    const issues: string[] = [];
    let score = 100;
    const avgSL = sentences.length > 0 ? words.length / sentences.length : 0;
    if (avgSL > 25) { issues.push(`Avg sentence ${Math.round(avgSL)} words — aim under 25`); score -= 15; }
    else if (avgSL > 20) { issues.push(`Avg sentence ${Math.round(avgSL)} words — aim under 20`); score -= 5; }
    const lp = Array.from(editorRef.current.querySelectorAll('p')).filter(p => (p.textContent || '').split(/\s+/).length > 150);
    if (lp.length > 0) { issues.push(`${lp.length} paragraph(s) over 150 words`); score -= 10; }
    if (words.length > 300 && headings.length === 0) { issues.push('No headings — add structure'); score -= 15; }
    const pm = text.match(/\b(is|are|was|were|been|being|be)\s+\w+(ed|en)\b/gi);
    if (pm && pm.length > sentences.length * 0.3) { issues.push(`${pm.length} passive voice instances`); score -= 10; }
    if (words.length < 300) { issues.push(`Only ${words.length} words — aim for 300+`); score -= 10; }
    score = Math.max(0, Math.min(100, score));
    const grade = score >= 80 ? 'A' : score >= 60 ? 'B' : score >= 40 ? 'C' : score >= 20 ? 'D' : 'F';
    setSeoReadability({ score, grade, issues });
  }, []);

  const executeSlashCommand = useCallback((action: string) => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const node = sel.anchorNode;
      if (node && node.nodeType === Node.TEXT_NODE) {
        const t = node.textContent || ''; const idx = t.lastIndexOf('/');
        if (idx >= 0) { node.textContent = t.substring(0, idx); const r = sel.getRangeAt(0); r.setStart(node, idx); r.collapse(true); }
      }
    }
    setShowSlashMenu(false); setSlashFilter('');
    switch (action) {
      case 'heading1': executeCommand('formatBlock', 'h1'); break;
      case 'heading2': executeCommand('formatBlock', 'h2'); break;
      case 'heading3': executeCommand('formatBlock', 'h3'); break;
      case 'paragraph': executeCommand('formatBlock', 'p'); break;
      case 'bulletList': executeCommand('insertUnorderedList'); break;
      case 'numberedList': executeCommand('insertOrderedList'); break;
      case 'taskList': insertTaskList(); break;
      case 'blockquote': insertBlockquote(); break;
      case 'codeBlock': insertCodeBlock(); break;
      case 'image': setShowImageDialog(true); break;
      case 'table': setShowTableDialog(true); break;
      case 'divider': executeCommand('insertHorizontalRule'); break;
      case 'calloutInfo': insertCallout('info'); break;
      case 'calloutWarning': insertCallout('warning'); break;
      case 'collapsible': insertCollapsible(); break;
      case 'pullQuote': insertPullQuote(); break;
      case 'columns': insertColumns(); break;
      case 'button': setShowButtonDialog(true); break;
      case 'spacer': insertSpacer(); break;
      case 'toc': generateToc(); break;
      case 'bookmark': setShowBookmarkDialog(true); break;
      case 'footnote': insertFootnote(); break;
    }
  }, [executeCommand, insertTaskList, insertBlockquote, insertCodeBlock, insertCallout, insertCollapsible, insertPullQuote, insertColumns, insertSpacer, generateToc, insertFootnote]);

  // ── Image Context Toolbar ─────────────────────────────────────────────

  const handleImageClick = useCallback((e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'IMG' && editorRef.current?.contains(target)) {
      e.preventDefault(); e.stopPropagation(); setSelectedImage(target);
      const rect = target.getBoundingClientRect(); const er = editorRef.current!.getBoundingClientRect();
      setImageToolbarPos({ top: rect.top - er.top - 44, left: rect.left - er.left + rect.width / 2 });
    } else if (!target.closest('.image-context-toolbar')) { setSelectedImage(null); setImageToolbarPos(null); }
  }, []);

  const changeImageAlignment = useCallback((align: string) => {
    if (!selectedImage) return;
    const fig = selectedImage.closest('figure.editor-figure') || selectedImage.parentElement;
    if (fig instanceof HTMLElement) fig.className = fig.className.replace(/img-align-\w+/g, '').trim() + ` img-align-${align}`;
    saveToHistory(); handleInput();
  }, [selectedImage, saveToHistory, handleInput]);

  const changeImageSize = useCallback((size: string) => {
    if (!selectedImage) return;
    const fig = selectedImage.closest('figure.editor-figure') || selectedImage.parentElement;
    if (fig instanceof HTMLElement) fig.className = fig.className.replace(/img-(auto|small|medium|large|full)/g, '').trim() + ` img-${size}`;
    saveToHistory(); handleInput();
  }, [selectedImage, saveToHistory, handleInput]);

  const toggleImageCaption = useCallback(() => {
    if (!selectedImage) return;
    const fig = selectedImage.closest('figure.editor-figure'); if (!fig) return;
    let fc = fig.querySelector('figcaption');
    if (fc) { fc.remove(); } else { fc = document.createElement('figcaption'); fc.textContent = 'Add caption...'; fc.setAttribute('contenteditable', 'true'); fig.appendChild(fc); }
    saveToHistory(); handleInput();
  }, [selectedImage, saveToHistory, handleInput]);

  const deleteSelectedImage = useCallback(() => {
    if (!selectedImage) return;
    const fig = selectedImage.closest('figure.editor-figure');
    (fig || selectedImage).remove();
    setSelectedImage(null); setImageToolbarPos(null); saveToHistory(); handleInput();
  }, [selectedImage, saveToHistory, handleInput]);

  // ── Effects ───────────────────────────────────────────────────────────

  useEffect(() => { const el = editorRef.current; if (!el) return; el.addEventListener('click', handleImageClick); return () => { el.removeEventListener('click', handleImageClick); }; }, [handleImageClick]);

  useEffect(() => {
    const el = editorRef.current; if (!el) return;
    const h = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === 'INPUT' && t.getAttribute('type') === 'checkbox') {
        const cb = t as HTMLInputElement; cb.checked = !cb.checked;
        if (cb.checked) cb.setAttribute('checked', ''); else cb.removeAttribute('checked');
        const li = cb.closest('li'); if (li) { li.style.textDecoration = cb.checked ? 'line-through' : 'none'; li.style.opacity = cb.checked ? '0.6' : '1'; }
        saveToHistory(); onChangeRef.current?.(el.innerHTML, el.innerText || '', (el.innerText || '').trim().split(/\s+/).filter(w => w.length > 0).length); e.preventDefault();
      }
    };
    el.addEventListener('click', h); return () => { el.removeEventListener('click', h); };
  }, [saveToHistory]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest('.dropdown-container')) { setShowFontSizeDropdown(false); setShowLineHeightDropdown(false); setShowBlockTypeDropdown(false); setShowBlockMenu(false); setShowCaseMenu(false); setShowTemplateMenu(false); }
      if (!t.closest('.emoji-picker-container') && !t.closest('.toolbar-btn')) setShowEmojiPicker(false);
      if (!t.closest('.special-chars-container') && !t.closest('.toolbar-btn')) setShowSpecialChars(false);
      if (!t.closest('.slash-menu') && !t.closest('.prose-editor')) { setShowSlashMenu(false); setSlashFilter(''); }
      if (isFormatPainting && t.closest('.prose-editor')) applyFormat();
    };
    document.addEventListener('mousedown', h); return () => { document.removeEventListener('mousedown', h); };
  }, [isFormatPainting, applyFormat]);

  // Keyboard shortcuts + Slash command detection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showSlashMenu) { setShowSlashMenu(false); setSlashFilter(''); e.preventDefault(); return; }
        if (showFindReplace) { setShowFindReplace(false); e.preventDefault(); return; }
        if (showShortcutsHelp) { setShowShortcutsHelp(false); e.preventDefault(); return; }
        if (showLinkDialog) { setShowLinkDialog(false); e.preventDefault(); return; }
        if (showImageDialog) { setShowImageDialog(false); e.preventDefault(); return; }
        if (showVideoDialog) { setShowVideoDialog(false); e.preventDefault(); return; }
        if (showColorPicker) { setShowColorPicker(false); e.preventDefault(); return; }
        if (showTableDialog) { setShowTableDialog(false); e.preventDefault(); return; }
        if (showEmojiPicker) { setShowEmojiPicker(false); e.preventDefault(); return; }
        if (showSpecialChars) { setShowSpecialChars(false); e.preventDefault(); return; }
        if (showBookmarkDialog) { setShowBookmarkDialog(false); e.preventDefault(); return; }
        if (showAnchorDialog) { setShowAnchorDialog(false); e.preventDefault(); return; }
        if (showAdDialog) { setShowAdDialog(false); e.preventDefault(); return; }
        if (showMathDialog) { setShowMathDialog(false); e.preventDefault(); return; }
        if (showButtonDialog) { setShowButtonDialog(false); e.preventDefault(); return; }
        if (showEmbedDialog) { setShowEmbedDialog(false); e.preventDefault(); return; }
        if (isFocusMode) { setIsFocusMode(false); e.preventDefault(); return; }
        if (isFullscreen) { setIsFullscreen(false); e.preventDefault(); return; }
      }
      // Slash command
      if (a.enableSlashCommands && e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey && editorRef.current?.contains(document.activeElement)) {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          const rect = sel.getRangeAt(0).getBoundingClientRect(); const er = editorRef.current!.getBoundingClientRect();
          setSlashMenuPos({ top: rect.bottom - er.top + 4, left: rect.left - er.left }); setSlashFilter(''); setShowSlashMenu(true);
        }
      }
      if (showSlashMenu && e.key.length === 1 && !e.ctrlKey && !e.metaKey) setSlashFilter(p => p + e.key);
      if (showSlashMenu && e.key === 'Backspace') setSlashFilter(p => { if (p.length <= 0) { setShowSlashMenu(false); return ''; } return p.slice(0, -1); });

      if (e.ctrlKey || e.metaKey) {
        const key = e.key.toLowerCase(); const shift = e.shiftKey;
        if (!shift && key === 'z') { e.preventDefault(); undo(); }
        else if ((shift && key === 'z') || key === 'y') { e.preventDefault(); redo(); }
        else if (key === 'k') { e.preventDefault(); setShowLinkDialog(true); }
        else if (key === 'p') { e.preventDefault(); handlePrint(); }
        else if (shift && key === 'e') { e.preventDefault(); insertInlineCode(); }
        else if (key === 'h' && shift) { e.preventDefault(); setShowFindReplace(p => !p); }
        else if (key === 'u' && shift) { e.preventDefault(); toggleSourceView(); }
        else if (key === '/' && shift) { e.preventDefault(); setShowShortcutsHelp(p => !p); }
      }
      if (e.key === 'Tab' && editorRef.current?.contains(document.activeElement)) { e.preventDefault(); document.execCommand(e.shiftKey ? 'outdent' : 'indent'); }
    };
    const handleSelectionChange = () => { if (editorRef.current?.contains(document.activeElement)) updateActiveFormats(); };
    document.addEventListener('keydown', handleKeyDown); document.addEventListener('selectionchange', handleSelectionChange);
    return () => { document.removeEventListener('keydown', handleKeyDown); document.removeEventListener('selectionchange', handleSelectionChange); };
  }, [undo, redo, updateActiveFormats, insertInlineCode, toggleSourceView, handlePrint, showLinkDialog, showImageDialog, showVideoDialog, showColorPicker, showTableDialog, showEmojiPicker, showSpecialChars, showFindReplace, isFullscreen, showSlashMenu, showShortcutsHelp, showBookmarkDialog, showAnchorDialog, showAdDialog, showMathDialog, showButtonDialog, showEmbedDialog, isFocusMode, a.enableSlashCommands]);

  // Filtered slash commands
  const filteredSlashCommands = useMemo(() => {
    if (!slashFilter) return SLASH_COMMANDS;
    const f = slashFilter.toLowerCase();
    return SLASH_COMMANDS.filter(c => c.label.toLowerCase().includes(f) || c.keywords.some(k => k.includes(f)));
  }, [slashFilter]);

  // ══════════════════════════════════════════════════════════════════════
  // ═══ RENDER ═══
  // ══════════════════════════════════════════════════════════════════════

  return (
    <div className={`rich-text-editor-container ${isFullscreen ? 'fullscreen' : ''} ${isFocusMode ? 'focus-mode' : ''} ${isFormatPainting ? 'format-painting' : ''} ${className}`}>

      {/* ═══ Toolbar ═══ */}
      <div className="editor-toolbar" role="toolbar" aria-label="Text formatting">

        {/* Undo / Redo */}
        {a.enableUndoRedo && (<div className="toolbar-group">
          <button type="button" onClick={undo} className="toolbar-btn" title="Undo (Ctrl+Z)" disabled={effectiveReadOnly}><UndoIcon size={18} /></button>
          <button type="button" onClick={redo} className="toolbar-btn" title="Redo (Ctrl+Y)" disabled={effectiveReadOnly}><RedoIcon size={18} /></button>
        </div>)}
        {a.enableUndoRedo && <div className="toolbar-divider" />}

        {/* Block Type Dropdown */}
        {a.enableBlockTypeDropdown && (<div className="toolbar-group dropdown-container" style={{ position: 'relative' }}>
          <button type="button" onClick={() => setShowBlockTypeDropdown(p => !p)} className="toolbar-btn toolbar-dropdown-btn" title="Block Type" disabled={effectiveReadOnly}>
            <span className="dropdown-label">{BLOCK_TYPE_OPTIONS.find(o => o.value === currentBlockType)?.label ?? 'Paragraph'}</span><DropdownIcon size={14} />
          </button>
          {showBlockTypeDropdown && (<div className="toolbar-dropdown">{BLOCK_TYPE_OPTIONS.map(o => (<button key={o.value} type="button" onClick={() => setBlockType(o.value)} className={`toolbar-dropdown-item ${currentBlockType === o.value ? 'active' : ''}`}>{o.label}</button>))}</div>)}
        </div>)}
        {a.enableBlockTypeDropdown && <div className="toolbar-divider" />}

        {/* Font Size */}
        {a.enableFontSize && (<div className="toolbar-group dropdown-container" style={{ position: 'relative' }}>
          <button type="button" onClick={() => setShowFontSizeDropdown(p => !p)} className="toolbar-btn toolbar-dropdown-btn" title="Font Size" disabled={effectiveReadOnly}>
            <span className="dropdown-label">{currentFontSize}px</span><DropdownIcon size={14} />
          </button>
          {showFontSizeDropdown && (<div className="toolbar-dropdown">{(a.fontSizePresets ?? [...FONT_SIZE_PRESETS]).map(s => (<button key={s} type="button" onClick={() => setFontSize(s)} className={`toolbar-dropdown-item ${currentFontSize === s ? 'active' : ''}`}>{s}px</button>))}</div>)}
        </div>)}

        {/* Line Height */}
        {a.enableLineHeight && (<div className="toolbar-group dropdown-container" style={{ position: 'relative' }}>
          <button type="button" onClick={() => setShowLineHeightDropdown(p => !p)} className="toolbar-btn toolbar-dropdown-btn" title="Line Height" disabled={effectiveReadOnly}>
            <span className="dropdown-label">{currentLineHeight}x</span><DropdownIcon size={14} />
          </button>
          {showLineHeightDropdown && (<div className="toolbar-dropdown">{(a.lineHeightPresets ?? [...LINE_HEIGHT_PRESETS]).map(l => (<button key={l} type="button" onClick={() => setLineHeight(l)} className={`toolbar-dropdown-item ${currentLineHeight === l ? 'active' : ''}`}>{l}x</button>))}</div>)}
        </div>)}
        {(a.enableFontSize || a.enableLineHeight) && <div className="toolbar-divider" />}

        {/* Inline Formatting */}
        {(a.enableBold || a.enableItalic || a.enableUnderline || a.enableStrikethrough) && (<div className="toolbar-group">
          {a.enableBold && <button type="button" onClick={() => toggleFormat('bold')} className={`toolbar-btn ${activeFormats.has('bold') ? 'active' : ''}`} title="Bold (Ctrl+B)" disabled={effectiveReadOnly}><FormatBoldIcon size={18} /></button>}
          {a.enableItalic && <button type="button" onClick={() => toggleFormat('italic')} className={`toolbar-btn ${activeFormats.has('italic') ? 'active' : ''}`} title="Italic (Ctrl+I)" disabled={effectiveReadOnly}><FormatItalicIcon size={18} /></button>}
          {a.enableUnderline && <button type="button" onClick={() => toggleFormat('underline')} className={`toolbar-btn ${activeFormats.has('underline') ? 'active' : ''}`} title="Underline (Ctrl+U)" disabled={effectiveReadOnly}><FormatUnderlinedIcon size={18} /></button>}
          {a.enableStrikethrough && <button type="button" onClick={() => toggleFormat('strikeThrough')} className={`toolbar-btn ${activeFormats.has('strikeThrough') ? 'active' : ''}`} title="Strikethrough" disabled={effectiveReadOnly}><StrikethroughSIcon size={18} /></button>}
          {a.enableSuperscript && <button type="button" onClick={() => toggleFormat('superscript')} className={`toolbar-btn ${activeFormats.has('superscript') ? 'active' : ''}`} title="Superscript" disabled={effectiveReadOnly}><SuperscriptIcon size={18} /></button>}
          {a.enableSubscript && <button type="button" onClick={() => toggleFormat('subscript')} className={`toolbar-btn ${activeFormats.has('subscript') ? 'active' : ''}`} title="Subscript" disabled={effectiveReadOnly}><SubscriptIcon size={18} /></button>}
          {a.enableInlineCodeButton && <button type="button" onClick={insertInlineCode} className="toolbar-btn" title="Inline Code (Ctrl+Shift+E)" disabled={effectiveReadOnly}><InlineCodeIcon size={18} /></button>}
        </div>)}
        {(a.enableBold || a.enableItalic) && <div className="toolbar-divider" />}

        {/* Headings */}
        {a.enableHeadings && (<div className="toolbar-group">
          {a.allowedHeadingLevels.includes(1) && <button type="button" onClick={() => setHeading(1)} className={`toolbar-btn ${activeFormats.has('h1') ? 'active' : ''}`} title="Heading 1" disabled={effectiveReadOnly}><LooksOneIcon size={18} /></button>}
          {a.allowedHeadingLevels.includes(2) && <button type="button" onClick={() => setHeading(2)} className={`toolbar-btn ${activeFormats.has('h2') ? 'active' : ''}`} title="Heading 2" disabled={effectiveReadOnly}><LooksTwoIcon size={18} /></button>}
          {a.allowedHeadingLevels.includes(3) && <button type="button" onClick={() => setHeading(3)} className={`toolbar-btn ${activeFormats.has('h3') ? 'active' : ''}`} title="Heading 3" disabled={effectiveReadOnly}><Looks3Icon size={18} /></button>}
        </div>)}
        {a.enableHeadings && <div className="toolbar-divider" />}

        {/* Lists & Blockquotes */}
        {(a.enableLists || a.enableTaskLists || a.enableBlockquotes) && (<div className="toolbar-group">
          {a.enableLists && <><button type="button" onClick={() => toggleFormat('insertUnorderedList')} className={`toolbar-btn ${activeFormats.has('insertUnorderedList') ? 'active' : ''}`} title="Bullet List" disabled={effectiveReadOnly}><FormatListBulletedIcon size={18} /></button><button type="button" onClick={() => toggleFormat('insertOrderedList')} className={`toolbar-btn ${activeFormats.has('insertOrderedList') ? 'active' : ''}`} title="Numbered List" disabled={effectiveReadOnly}><FormatListNumberedIcon size={18} /></button></>}
          {a.enableTaskLists && <button type="button" onClick={insertTaskList} className="toolbar-btn" title="Task List" disabled={effectiveReadOnly}><ChecklistRtlIcon size={18} /></button>}
          {a.enableBlockquotes && <button type="button" onClick={insertBlockquote} className={`toolbar-btn ${activeFormats.has('blockquote') ? 'active' : ''}`} title="Blockquote" disabled={effectiveReadOnly}><FormatQuoteIcon size={18} /></button>}
        </div>)}
        {(a.enableLists || a.enableBlockquotes) && <div className="toolbar-divider" />}

        {/* Indent */}
        {a.enableIndentButtons && (<div className="toolbar-group">
          <button type="button" onClick={() => executeCommand('outdent')} className="toolbar-btn" title="Outdent" disabled={effectiveReadOnly}><OutdentIcon size={18} /></button>
          <button type="button" onClick={() => executeCommand('indent')} className="toolbar-btn" title="Indent" disabled={effectiveReadOnly}><IndentIcon size={18} /></button>
        </div>)}
        {a.enableIndentButtons && <div className="toolbar-divider" />}

        {/* Alignment */}
        {a.enableAlignment && (<div className="toolbar-group">
          <button type="button" onClick={() => setAlignment('left')} className={`toolbar-btn ${activeFormats.has('justifyLeft') ? 'active' : ''}`} title="Align Left" disabled={effectiveReadOnly}><FormatAlignLeftIcon size={18} /></button>
          <button type="button" onClick={() => setAlignment('center')} className={`toolbar-btn ${activeFormats.has('justifyCenter') ? 'active' : ''}`} title="Center" disabled={effectiveReadOnly}><FormatAlignCenterIcon size={18} /></button>
          <button type="button" onClick={() => setAlignment('right')} className={`toolbar-btn ${activeFormats.has('justifyRight') ? 'active' : ''}`} title="Right" disabled={effectiveReadOnly}><FormatAlignRightIcon size={18} /></button>
          <button type="button" onClick={() => setAlignment('justify')} className={`toolbar-btn ${activeFormats.has('justifyFull') ? 'active' : ''}`} title="Justify" disabled={effectiveReadOnly}><FormatAlignJustifyIcon size={18} /></button>
        </div>)}
        {a.enableAlignment && <div className="toolbar-divider" />}

        {/* Insert: Link, Image, Video, Table */}
        {(a.enableLinks || a.enableImages || a.enableVideoEmbeds || a.enableTables) && (<div className="toolbar-group">
          {a.enableLinks && <button type="button" onClick={() => setShowLinkDialog(true)} className="toolbar-btn" title="Insert Link (Ctrl+K)" disabled={effectiveReadOnly}><LinkIcon size={18} /></button>}
          {a.enableRemoveLink && <button type="button" onClick={removeLink} className="toolbar-btn" title="Remove Link" disabled={effectiveReadOnly}><UnlinkIcon size={18} /></button>}
          {a.enableImages && <button type="button" onClick={() => setShowImageDialog(true)} className="toolbar-btn" title="Insert Image" disabled={effectiveReadOnly}><ImageOutlinedIcon size={18} /></button>}
          {a.enableVideoEmbeds && <button type="button" onClick={() => setShowVideoDialog(true)} className="toolbar-btn" title="Embed Video" disabled={effectiveReadOnly}><VideocamOutlinedIcon size={18} /></button>}
          {a.enableTables && <button type="button" onClick={() => setShowTableDialog(true)} className="toolbar-btn" title="Insert Table" disabled={effectiveReadOnly}><TableChartIcon size={18} /></button>}
        </div>)}
        {(a.enableLinks || a.enableImages) && <div className="toolbar-divider" />}

        {/* Code, Color, HR */}
        {(a.enableCodeBlocks || a.enableTextColor || a.enableHorizontalRule) && (<div className="toolbar-group">
          {a.enableCodeBlocks && <button type="button" onClick={insertCodeBlock} className="toolbar-btn" title="Code Block" disabled={effectiveReadOnly}><CodeIcon size={18} /></button>}
          {(a.enableTextColor || a.enableBackgroundColor) && <button type="button" onClick={() => setShowColorPicker(true)} className="toolbar-btn" title="Text Color" disabled={effectiveReadOnly} style={{ borderBottom: `3px solid ${selectedColor}` }}><PaletteOutlinedIcon size={18} /></button>}
          {a.enableHorizontalRule && <button type="button" onClick={insertHorizontalRule} className="toolbar-btn" title="Horizontal Rule" disabled={effectiveReadOnly}><RemoveIcon size={18} /></button>}
        </div>)}
        {(a.enableCodeBlocks || a.enableTextColor) && <div className="toolbar-divider" />}

        {/* Clear Formatting & Highlight */}
        {a.enableClearFormatting && (<div className="toolbar-group">
          <button type="button" onClick={clearFormatting} className="toolbar-btn" title="Clear Formatting" disabled={effectiveReadOnly}><ClearFormattingIcon size={18} /></button>
          <button type="button" onClick={applyHighlight} className="toolbar-btn" title="Highlight" disabled={effectiveReadOnly}><HighlighterIcon size={18} /></button>
        </div>)}

        {/* Phase 3: Case Change */}
        {a.enableCaseChange && (<div className="toolbar-group dropdown-container" style={{ position: 'relative' }}>
          <button type="button" onClick={() => setShowCaseMenu(p => !p)} className="toolbar-btn" title="Change Case" disabled={effectiveReadOnly}><CaseChangeIcon size={18} /><DropdownIcon size={14} /></button>
          {showCaseMenu && (<div className="toolbar-dropdown">
            <button type="button" onClick={() => changeCase('upper')} className="toolbar-dropdown-item">UPPERCASE</button>
            <button type="button" onClick={() => changeCase('lower')} className="toolbar-dropdown-item">lowercase</button>
            <button type="button" onClick={() => changeCase('title')} className="toolbar-dropdown-item">Title Case</button>
            <button type="button" onClick={() => changeCase('sentence')} className="toolbar-dropdown-item">Sentence case</button>
          </div>)}
        </div>)}

        {/* Phase 3: Format Painter */}
        {a.enableFormatPainter && (<div className="toolbar-group">
          <button type="button" onClick={copyFormat} className={`toolbar-btn ${isFormatPainting ? 'active' : ''}`} title="Format Painter" disabled={effectiveReadOnly}><FormatPainterIcon size={18} /></button>
        </div>)}

        {/* Phase 3: Drop Cap */}
        {a.enableDropCap && (<div className="toolbar-group">
          <button type="button" onClick={toggleDropCap} className="toolbar-btn" title="Drop Cap" disabled={effectiveReadOnly}><DropCapIcon size={18} /></button>
        </div>)}

        {/* Emoji & Special Chars */}
        {(a.enableEmoji || a.enableSpecialChars) && (<div className="toolbar-group">
          {a.enableEmoji && (<div className="emoji-picker-container" style={{ position: 'relative' }}>
            <button type="button" onClick={() => { setShowEmojiPicker(p => !p); setShowSpecialChars(false); }} className="toolbar-btn" title="Emoji" disabled={effectiveReadOnly}><EmojiIcon size={18} /></button>
            {showEmojiPicker && (<div className="toolbar-picker">{Object.entries(SPECIAL_CHARS).filter(([c]) => c === 'Emoji').map(([c, chars]) => (<div key={c}><div className="picker-grid emoji-grid">{chars.map(ch => (<button key={ch} type="button" onClick={() => insertEmoji(ch)} className="picker-item emoji-item" title={ch}>{ch}</button>))}</div></div>))}</div>)}
          </div>)}
          {a.enableSpecialChars && (<div className="special-chars-container" style={{ position: 'relative' }}>
            <button type="button" onClick={() => { setShowSpecialChars(p => !p); setShowEmojiPicker(false); }} className="toolbar-btn" title="Special Characters" disabled={effectiveReadOnly}><SpecialCharIcon size={18} /></button>
            {showSpecialChars && (<div className="toolbar-picker">{Object.entries(SPECIAL_CHARS).filter(([c]) => c !== 'Emoji').map(([c, chars]) => (<div key={c} className="picker-section"><div className="picker-section-title">{c}</div><div className="picker-grid">{chars.map(ch => (<button key={ch} type="button" onClick={() => insertSpecialChar(ch)} className="picker-item" title={ch}>{ch}</button>))}</div></div>))}</div>)}
          </div>)}
        </div>)}

        {/* Content Block Inserter (+) */}
        <div className="toolbar-group dropdown-container" style={{ position: 'relative' }}>
          <button type="button" onClick={() => setShowBlockMenu(p => !p)} className={`toolbar-btn ${showBlockMenu ? 'active' : ''}`} title="Insert Block" disabled={effectiveReadOnly}><PlusIcon size={18} /><DropdownIcon size={14} /></button>
          {showBlockMenu && (<div className="toolbar-dropdown block-inserter-dropdown">
            <div className="block-inserter-section-title">Content Blocks</div>
            <button type="button" onClick={() => insertCallout('info')} className="toolbar-dropdown-item block-item"><InfoIcon size={16} className="block-item-icon info" /> Info Callout</button>
            <button type="button" onClick={() => insertCallout('warning')} className="toolbar-dropdown-item block-item"><WarningIcon size={16} className="block-item-icon warning" /> Warning</button>
            <button type="button" onClick={() => insertCallout('success')} className="toolbar-dropdown-item block-item"><SuccessIcon size={16} className="block-item-icon success" /> Success</button>
            <button type="button" onClick={() => insertCallout('error')} className="toolbar-dropdown-item block-item"><ErrorIcon size={16} className="block-item-icon error" /> Error</button>
            <div className="block-inserter-divider" />
            <button type="button" onClick={insertCollapsible} className="toolbar-dropdown-item block-item"><CollapsibleIcon size={16} className="block-item-icon" /> Collapsible</button>
            <button type="button" onClick={insertPullQuote} className="toolbar-dropdown-item block-item"><PullQuoteIcon size={16} className="block-item-icon" /> Pull Quote</button>
            <button type="button" onClick={insertColumns} className="toolbar-dropdown-item block-item"><ColumnsIcon size={16} className="block-item-icon" /> Two Columns</button>
            <button type="button" onClick={insertStyledSeparator} className="toolbar-dropdown-item block-item"><RemoveIcon size={16} className="block-item-icon" /> Styled Separator</button>
            {a.enableButtonBlock && <button type="button" onClick={() => { setShowBlockMenu(false); setShowButtonDialog(true); }} className="toolbar-dropdown-item block-item"><ButtonBlockIcon size={16} className="block-item-icon" /> Button / CTA</button>}
            {a.enableSpacerBlock && <button type="button" onClick={() => insertSpacer(40)} className="toolbar-dropdown-item block-item"><SpacerIcon size={16} className="block-item-icon" /> Spacer</button>}
            {a.enableGallery && <button type="button" onClick={insertGallery} className="toolbar-dropdown-item block-item"><GalleryIcon size={16} className="block-item-icon" /> Gallery</button>}
            {a.enableBookmarkCard && <button type="button" onClick={() => { setShowBlockMenu(false); setShowBookmarkDialog(true); }} className="toolbar-dropdown-item block-item"><BookmarkCardIcon size={16} className="block-item-icon" /> Bookmark Card</button>}
            {a.enableAudioEmbed && <button type="button" onClick={() => { setShowBlockMenu(false); setShowEmbedDialog(true); }} className="toolbar-dropdown-item block-item"><AudioIcon size={16} className="block-item-icon" /> Audio Embed</button>}
            {a.enableFileAttach && <button type="button" onClick={() => insertFileAttach()} className="toolbar-dropdown-item block-item"><FileAttachIcon size={16} className="block-item-icon" /> File Attachment</button>}
            {a.enableFootnotes && <button type="button" onClick={() => { setShowBlockMenu(false); insertFootnote(); }} className="toolbar-dropdown-item block-item"><FootnoteIcon size={16} className="block-item-icon" /> Footnote</button>}
            {a.enableMathBlocks && <button type="button" onClick={() => { setShowBlockMenu(false); setShowMathDialog(true); }} className="toolbar-dropdown-item block-item"><MathIcon size={16} className="block-item-icon" /> Math Block</button>}
            {a.enableAnchorLinks && <button type="button" onClick={() => { setShowBlockMenu(false); setShowAnchorDialog(true); }} className="toolbar-dropdown-item block-item"><AnchorIcon size={16} className="block-item-icon" /> Anchor Link</button>}
            {a.enableAdBlock && <><div className="block-inserter-divider" /><button type="button" onClick={() => { setShowBlockMenu(false); setShowAdDialog(true); }} className="toolbar-dropdown-item block-item"><AdBlockIcon size={16} className="block-item-icon" /> Ad Placement</button></>}
            <div className="block-inserter-divider" />
            <div className="block-inserter-section-title">Code Blocks</div>
            {['javascript', 'typescript', 'python', 'html', 'css', 'bash', 'sql'].map(l => (
              <button key={l} type="button" onClick={() => insertCodeBlockWithLang(l)} className="toolbar-dropdown-item block-item"><CodeIcon size={16} className="block-item-icon" /> {l.charAt(0).toUpperCase() + l.slice(1)}</button>
            ))}
          </div>)}
        </div>
        <div className="toolbar-divider" />

        {/* Phase 3: Templates */}
        {a.enableContentTemplates && (<div className="toolbar-group dropdown-container" style={{ position: 'relative' }}>
          <button type="button" onClick={() => setShowTemplateMenu(p => !p)} className="toolbar-btn" title="Content Templates" disabled={effectiveReadOnly}><TemplateIcon size={18} /><DropdownIcon size={14} /></button>
          {showTemplateMenu && (<div className="toolbar-dropdown block-inserter-dropdown">
            <div className="block-inserter-section-title">Templates</div>
            {CONTENT_TEMPLATES.map(t => (<button key={t.id} type="button" onClick={() => insertTemplate(t.id)} className="toolbar-dropdown-item block-item"><span>{t.icon}</span> {t.label}</button>))}
          </div>)}
        </div>)}

        {/* Utilities */}
        <div className="toolbar-group">
          {a.enableFindReplace && <button type="button" onClick={() => setShowFindReplace(p => !p)} className={`toolbar-btn ${showFindReplace ? 'active' : ''}`} title="Find & Replace (Ctrl+Shift+H)" disabled={effectiveReadOnly}><FindReplaceIcon size={18} /></button>}
          {a.enableSourceView && <button type="button" onClick={toggleSourceView} className={`toolbar-btn ${isSourceView ? 'active' : ''}`} title="Source View (Ctrl+Shift+U)"><SourceCodeIcon size={18} /></button>}
          {a.enableTableOfContents && <button type="button" onClick={generateToc} className="toolbar-btn" title="Table of Contents" disabled={effectiveReadOnly}><TocIcon size={18} /></button>}
          {a.enablePrint && <button type="button" onClick={handlePrint} className="toolbar-btn" title="Print (Ctrl+P)"><PrintIcon size={18} /></button>}
          {a.enableFocusMode && <button type="button" onClick={() => setIsFocusMode(p => !p)} className={`toolbar-btn ${isFocusMode ? 'active' : ''}`} title="Focus Mode"><FocusModeIcon size={18} /></button>}
          {a.enableKeyboardShortcutsHelp && <button type="button" onClick={() => setShowShortcutsHelp(p => !p)} className="toolbar-btn" title="Keyboard Shortcuts (Ctrl+Shift+/)"><ShortcutsIcon size={18} /></button>}
          {a.enableSeoScore && <button type="button" onClick={calculateSeoScore} className="toolbar-btn" title="SEO Score"><SeoScoreIcon size={18} /></button>}
        </div>
        <div className="toolbar-divider" />

        {/* Fullscreen */}
        {a.enableFullscreen && (<div className="toolbar-group">
          <button type="button" onClick={toggleFullscreen} className="toolbar-btn" title="Fullscreen">{isFullscreen ? <FullscreenExitIcon size={18} /> : <FullscreenIcon size={18} />}</button>
        </div>)}

        {/* Status */}
        <div className="toolbar-status">
          {wordCount} words &middot; {charCount.toLocaleString()} chars &middot; {readingTime} min read
          {a.enableAutosaveIndicator && <span className={`autosave-indicator autosave-${autoSaveStatus}`}>{autoSaveStatus === 'saved' ? <><SaveIcon size={12} /> Saved</> : autoSaveStatus === 'saving' ? 'Saving...' : '● Unsaved'}</span>}
          {contentLimitExceeded && <span className="toolbar-limit-warning" style={{ color: 'var(--rte-error, #e74c3c)', marginLeft: '0.5em', fontWeight: 600 }}>
            {a.maxWordCount > 0 && wordCount > a.maxWordCount && `(max ${a.maxWordCount} words)`}
            {a.maxCharCount > 0 && charCount > a.maxCharCount && `(max ${a.maxCharCount.toLocaleString()} chars)`}
          </span>}
        </div>

        {/* SEO Score Indicator */}
        {a.enableSeoScore && seoReadability.grade !== '-' && (
          <div className={`seo-score-badge seo-grade-${seoReadability.grade.toLowerCase()}`} title={seoReadability.issues.join('\n')}>
            SEO: {seoReadability.grade} ({seoReadability.score})
          </div>
        )}
      </div>

      {/* ═══ Find & Replace Bar ═══ */}
      {showFindReplace && (<div className="find-replace-bar">
        <div className="find-replace-inputs">
          <div className="find-replace-row">
            <FindReplaceIcon size={14} className="find-replace-icon" />
            <input type="text" value={findText} onChange={e => setFindText(e.target.value)} placeholder="Find..." className="find-replace-input" autoFocus onKeyDown={e => { if (e.key === 'Enter') handleFindReplace('find'); }} />
            {findCount > 0 && <span className="find-count">{findCount} found</span>}
            <button type="button" onClick={() => handleFindReplace('find')} className="find-replace-btn">Find</button>
          </div>
          <div className="find-replace-row">
            <ReplaceIcon size={14} className="find-replace-icon" />
            <input type="text" value={replaceText} onChange={e => setReplaceText(e.target.value)} placeholder="Replace..." className="find-replace-input" />
            <button type="button" onClick={() => handleFindReplace('replace')} className="find-replace-btn">Replace</button>
            <button type="button" onClick={() => handleFindReplace('replaceAll')} className="find-replace-btn">All</button>
          </div>
        </div>
        <button type="button" onClick={() => setShowFindReplace(false)} className="find-replace-close"><CloseIcon size={16} /></button>
      </div>)}

      {/* ═══ Editor Content / Source View ═══ */}
      {isSourceView ? (
        <div className="source-view-wrapper" style={{ minHeight, maxHeight: isFullscreen ? '100vh' : maxHeight }}>
          <textarea value={sourceHtml} onChange={e => setSourceHtml(e.target.value)} className="source-view-textarea" spellCheck={false} placeholder="Edit HTML source..." />
        </div>
      ) : (
        <div className={`editor-content-wrapper ${isDragging ? 'drag-active' : ''}`} style={{ minHeight, maxHeight: isFullscreen ? '100vh' : maxHeight, position: 'relative' }} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
          {isDragging && <div className="drag-overlay"><p>Drop image here</p></div>}

          {/* Image Context Toolbar */}
          {selectedImage && imageToolbarPos && (<div className="image-context-toolbar" style={{ top: `${imageToolbarPos.top}px`, left: `${imageToolbarPos.left}px` }}>
            <div className="ict-group">
              <button type="button" onClick={() => changeImageAlignment('left')} className="ict-btn" title="Left"><FormatAlignLeftIcon size={14} /></button>
              <button type="button" onClick={() => changeImageAlignment('center')} className="ict-btn" title="Center"><FormatAlignCenterIcon size={14} /></button>
              <button type="button" onClick={() => changeImageAlignment('right')} className="ict-btn" title="Right"><FormatAlignRightIcon size={14} /></button>
              <button type="button" onClick={() => changeImageAlignment('full')} className="ict-btn" title="Full"><FormatAlignJustifyIcon size={14} /></button>
            </div>
            <div className="ict-divider" />
            <div className="ict-group">
              <button type="button" onClick={() => changeImageSize('small')} className="ict-btn ict-text-btn">S</button>
              <button type="button" onClick={() => changeImageSize('medium')} className="ict-btn ict-text-btn">M</button>
              <button type="button" onClick={() => changeImageSize('large')} className="ict-btn ict-text-btn">L</button>
              <button type="button" onClick={() => changeImageSize('full')} className="ict-btn ict-text-btn">F</button>
            </div>
            <div className="ict-divider" />
            <button type="button" onClick={toggleImageCaption} className="ict-btn" title="Caption"><SpecialCharIcon size={14} /></button>
            <button type="button" onClick={deleteSelectedImage} className="ict-btn ict-delete" title="Delete"><TrashIcon size={14} /></button>
          </div>)}

          {/* Slash Menu */}
          {showSlashMenu && (<div ref={slashMenuRef} className="slash-menu" style={{ top: `${slashMenuPos.top}px`, left: `${slashMenuPos.left}px` }}>
            {filteredSlashCommands.length === 0 ? <div className="slash-menu-empty">No matching commands</div> : filteredSlashCommands.map(c => (
              <button key={c.id} type="button" onClick={() => executeSlashCommand(c.action)} className="slash-menu-item"><span className="slash-menu-icon">{c.icon}</span><span className="slash-menu-label">{c.label}</span></button>
            ))}
          </div>)}

          <div ref={editorRef} className="prose-editor" contentEditable={!effectiveReadOnly} onInput={handleInput} onPaste={handlePaste} suppressContentEditableWarning spellCheck data-placeholder={placeholder} />
        </div>
      )}

      {/* ═══ Dialogs ═══ */}

      {/* Link Dialog */}
      {showLinkDialog && (<div className="editor-dialog-overlay" onClick={() => setShowLinkDialog(false)} role="presentation"><div className="editor-dialog" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <h3 className="dialog-title">Insert Link</h3>
        <input type="url" value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://example.com" className="dialog-input" autoFocus />
        <input type="text" value={linkText} onChange={e => setLinkText(e.target.value)} placeholder="Link text (optional)" className="dialog-input" />
        <div className="dialog-actions"><button type="button" onClick={() => setShowLinkDialog(false)} className="dialog-btn dialog-btn-cancel">Cancel</button><button type="button" onClick={insertLink} className="dialog-btn dialog-btn-primary" disabled={!linkUrl}>Insert</button></div>
      </div></div>)}

      {/* Image Dialog */}
      {showImageDialog && (<div className="editor-dialog-overlay" onClick={() => setShowImageDialog(false)} role="presentation"><div className="editor-dialog editor-dialog-wide" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <h3 className="dialog-title">Insert Image</h3>
        <input type="url" value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://example.com/image.jpg" className="dialog-input" />
        <input type="text" value={imageAlt} onChange={e => setImageAlt(e.target.value)} placeholder="Alt text (recommended)" className="dialog-input" />
        <input type="text" value={imageCaption} onChange={e => setImageCaption(e.target.value)} placeholder="Caption (optional)" className="dialog-input" />
        <div className="dialog-option-group"><label className="dialog-label">Alignment</label><div className="dialog-option-row">
          {(['left', 'center', 'right', 'full'] as const).map(al => (<button key={al} type="button" onClick={() => setImageAlignment(al)} className={`dialog-option-btn ${imageAlignment === al ? 'active' : ''}`}><span>{al.charAt(0).toUpperCase() + al.slice(1)}</span></button>))}
        </div></div>
        <div className="dialog-option-group"><label className="dialog-label">Size</label><div className="dialog-option-row">
          {(['small', 'medium', 'large', 'full'] as const).map(sz => (<button key={sz} type="button" onClick={() => setImageSize(sz)} className={`dialog-option-btn ${imageSize === sz ? 'active' : ''}`}><span>{sz === 'small' ? '25%' : sz === 'medium' ? '50%' : sz === 'large' ? '75%' : '100%'}</span></button>))}
        </div></div>
        {onImageUpload && <><div className="dialog-divider">OR UPLOAD</div><input type="file" accept={a.allowedImageTypes.join(',')} onChange={handleImageUpload} className="dialog-file-input" /></>}
        <div className="dialog-actions"><button type="button" onClick={() => { setShowImageDialog(false); setImageAlt(''); setImageCaption(''); }} className="dialog-btn dialog-btn-cancel">Cancel</button><button type="button" onClick={() => insertImage(imageUrl)} className="dialog-btn dialog-btn-primary" disabled={!imageUrl}>Insert</button></div>
      </div></div>)}

      {/* Video Dialog */}
      {showVideoDialog && (<div className="editor-dialog-overlay" onClick={() => setShowVideoDialog(false)} role="presentation"><div className="editor-dialog" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <h3 className="dialog-title">Embed Video</h3>
        <input type="url" value={videoUrl} onChange={e => setVideoUrl(e.target.value)} placeholder="YouTube or Vimeo URL" className="dialog-input" autoFocus />
        <p className="dialog-hint">Supports YouTube, Vimeo, and direct embed URLs</p>
        <div className="dialog-actions"><button type="button" onClick={() => setShowVideoDialog(false)} className="dialog-btn dialog-btn-cancel">Cancel</button><button type="button" onClick={insertVideo} className="dialog-btn dialog-btn-primary" disabled={!videoUrl}>Insert</button></div>
      </div></div>)}

      {/* Color Picker */}
      {showColorPicker && (<div className="editor-dialog-overlay" onClick={() => setShowColorPicker(false)} role="presentation"><div className="editor-dialog" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <h3 className="dialog-title">Choose Color</h3>
        <div className="color-type-selector">
          {a.enableTextColor && <button type="button" onClick={() => setColorType('text')} className={`color-type-btn ${colorType === 'text' ? 'active' : ''}`}>Text</button>}
          {a.enableBackgroundColor && <button type="button" onClick={() => setColorType('background')} className={`color-type-btn ${colorType === 'background' ? 'active' : ''}`}>Background</button>}
        </div>
        <input type="color" value={selectedColor} onChange={e => setSelectedColor(e.target.value)} className="color-picker-input" />
        <div className="color-presets">{a.colorPalette.map(c => (<button key={c} type="button" onClick={() => setSelectedColor(c)} className={`color-preset ${selectedColor === c ? 'color-preset-selected' : ''}`} style={{ backgroundColor: c } as CSSProperties} title={c} />))}</div>
        <div className="dialog-actions"><button type="button" onClick={() => setShowColorPicker(false)} className="dialog-btn dialog-btn-cancel">Cancel</button><button type="button" onClick={applyColor} className="dialog-btn dialog-btn-primary">Apply</button></div>
      </div></div>)}

      {/* Table Dialog */}
      {showTableDialog && (<div className="editor-dialog-overlay" onClick={() => setShowTableDialog(false)} role="presentation"><div className="editor-dialog" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <h3 className="dialog-title">Insert Table</h3>
        <div className="table-size-inputs">
          <div><label className="dialog-label">Rows</label><input type="number" value={tableRows} onChange={e => setTableRows(Math.max(1, Math.min(a.maxTableRows, parseInt(e.target.value) || 1)))} min="1" max={a.maxTableRows} className="dialog-input" /></div>
          <div><label className="dialog-label">Columns</label><input type="number" value={tableCols} onChange={e => setTableCols(Math.max(1, Math.min(a.maxTableCols, parseInt(e.target.value) || 1)))} min="1" max={a.maxTableCols} className="dialog-input" /></div>
        </div>
        <div className="dialog-actions"><button type="button" onClick={() => setShowTableDialog(false)} className="dialog-btn dialog-btn-cancel">Cancel</button><button type="button" onClick={insertTable} className="dialog-btn dialog-btn-primary">Insert</button></div>
      </div></div>)}

      {/* Button / CTA Dialog */}
      {showButtonDialog && (<div className="editor-dialog-overlay" onClick={() => setShowButtonDialog(false)} role="presentation"><div className="editor-dialog" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <h3 className="dialog-title">Insert Button / CTA</h3>
        <input type="url" value={buttonUrl} onChange={e => setButtonUrl(e.target.value)} placeholder="https://example.com" className="dialog-input" autoFocus />
        <input type="text" value={buttonText} onChange={e => setButtonText(e.target.value)} placeholder="Button text" className="dialog-input" />
        <div className="dialog-option-group"><label className="dialog-label">Style</label><div className="dialog-option-row">
          {(['primary', 'secondary', 'outline'] as const).map(s => (<button key={s} type="button" onClick={() => setButtonStyle(s)} className={`dialog-option-btn ${buttonStyle === s ? 'active' : ''}`}>{s.charAt(0).toUpperCase() + s.slice(1)}</button>))}
        </div></div>
        <div className="dialog-actions"><button type="button" onClick={() => setShowButtonDialog(false)} className="dialog-btn dialog-btn-cancel">Cancel</button><button type="button" onClick={insertButtonBlock} className="dialog-btn dialog-btn-primary" disabled={!buttonUrl}>Insert</button></div>
      </div></div>)}

      {/* Bookmark Card Dialog */}
      {showBookmarkDialog && (<div className="editor-dialog-overlay" onClick={() => setShowBookmarkDialog(false)} role="presentation"><div className="editor-dialog" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <h3 className="dialog-title">Insert Bookmark Card</h3>
        <input type="url" value={bookmarkUrl} onChange={e => setBookmarkUrl(e.target.value)} placeholder="https://example.com" className="dialog-input" autoFocus />
        <p className="dialog-hint">Creates a styled link preview card</p>
        <div className="dialog-actions"><button type="button" onClick={() => setShowBookmarkDialog(false)} className="dialog-btn dialog-btn-cancel">Cancel</button><button type="button" onClick={insertBookmarkCard} className="dialog-btn dialog-btn-primary" disabled={!bookmarkUrl}>Insert</button></div>
      </div></div>)}

      {/* Audio Embed Dialog */}
      {showEmbedDialog && (<div className="editor-dialog-overlay" onClick={() => setShowEmbedDialog(false)} role="presentation"><div className="editor-dialog" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <h3 className="dialog-title">Embed Audio</h3>
        <input type="url" value={embedUrl} onChange={e => setEmbedUrl(e.target.value)} placeholder="https://example.com/audio.mp3" className="dialog-input" autoFocus />
        <div className="dialog-actions"><button type="button" onClick={() => setShowEmbedDialog(false)} className="dialog-btn dialog-btn-cancel">Cancel</button><button type="button" onClick={insertAudioEmbed} className="dialog-btn dialog-btn-primary" disabled={!embedUrl}>Insert</button></div>
      </div></div>)}

      {/* Anchor Dialog */}
      {showAnchorDialog && (<div className="editor-dialog-overlay" onClick={() => setShowAnchorDialog(false)} role="presentation"><div className="editor-dialog" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <h3 className="dialog-title">Insert Anchor</h3>
        <input type="text" value={anchorId} onChange={e => setAnchorId(e.target.value)} placeholder="anchor-id" className="dialog-input" autoFocus />
        <p className="dialog-hint">Creates a named anchor point for linking</p>
        <div className="dialog-actions"><button type="button" onClick={() => setShowAnchorDialog(false)} className="dialog-btn dialog-btn-cancel">Cancel</button><button type="button" onClick={insertAnchor} className="dialog-btn dialog-btn-primary" disabled={!anchorId}>Insert</button></div>
      </div></div>)}

      {/* Math Block Dialog */}
      {showMathDialog && (<div className="editor-dialog-overlay" onClick={() => setShowMathDialog(false)} role="presentation"><div className="editor-dialog" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <h3 className="dialog-title">Insert Math Block</h3>
        <textarea value={mathExpression} onChange={e => setMathExpression(e.target.value)} placeholder="E = mc² or LaTeX expression" className="dialog-input" style={{ minHeight: '80px', fontFamily: 'monospace' }} autoFocus />
        <p className="dialog-hint">Enter a mathematical expression</p>
        <div className="dialog-actions"><button type="button" onClick={() => setShowMathDialog(false)} className="dialog-btn dialog-btn-cancel">Cancel</button><button type="button" onClick={insertMathBlock} className="dialog-btn dialog-btn-primary" disabled={!mathExpression}>Insert</button></div>
      </div></div>)}

      {/* Ad Placement Dialog */}
      {showAdDialog && (<div className="editor-dialog-overlay" onClick={() => setShowAdDialog(false)} role="presentation"><div className="editor-dialog" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <h3 className="dialog-title">Ad Placement</h3>
        <div className="dialog-option-group"><label className="dialog-label">Type</label><div className="dialog-option-row">
          {(['banner', 'in-article', 'sidebar'] as const).map(t => (<button key={t} type="button" onClick={() => setAdSlotType(t)} className={`dialog-option-btn ${adSlotType === t ? 'active' : ''}`}>{t}</button>))}
        </div></div>
        <input type="text" value={adSlotId} onChange={e => setAdSlotId(e.target.value)} placeholder="Slot ID (optional)" className="dialog-input" />
        <div className="dialog-actions"><button type="button" onClick={() => setShowAdDialog(false)} className="dialog-btn dialog-btn-cancel">Cancel</button><button type="button" onClick={insertAdBlock} className="dialog-btn dialog-btn-primary">Insert</button></div>
      </div></div>)}

      {/* Keyboard Shortcuts Help */}
      {showShortcutsHelp && (<div className="editor-dialog-overlay" onClick={() => setShowShortcutsHelp(false)} role="presentation"><div className="editor-dialog editor-dialog-wide" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <h3 className="dialog-title">Keyboard Shortcuts</h3>
        <div className="shortcuts-list">
          {KEYBOARD_SHORTCUTS_LIST.map(s => (<div key={s.keys} className="shortcut-row"><kbd className="shortcut-keys">{s.keys}</kbd><span className="shortcut-action">{s.action}</span></div>))}
        </div>
        <div className="dialog-actions"><button type="button" onClick={() => setShowShortcutsHelp(false)} className="dialog-btn dialog-btn-primary">Close</button></div>
      </div></div>)}
    </div>
  );
}

RichTextEditor.displayName = 'RichTextEditor';
