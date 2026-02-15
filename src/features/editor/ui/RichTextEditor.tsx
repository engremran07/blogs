'use client';

/**
 * ============================================================================
 * MODULE:   editor/ui/RichTextEditor.tsx
 * PURPOSE:  Feature-rich contentEditable WYSIWYG editor
 *
 * FEATURES:
 *   - Full toolbar: bold, italic, underline, strikethrough, headings, lists,
 *     blockquotes, code blocks, links, images, video embeds, tables, colors,
 *     alignment, horizontal rule, fullscreen, undo/redo
 *   - Markdown shortcuts (# heading, - list, > quote, ---, ```)
 *   - Drag-and-drop image upload with saved caret position
 *   - Paste sanitisation (XSS-safe allowlist)
 *   - Admin-dynamic settings (feature toggles, limits, allowed types)
 *   - Auto-save to localStorage
 *   - Word/char count & reading time
 *   - Accessible: ARIA roles, keyboard shortcuts
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
} from '../server/constants';
import {
  Undo2 as UndoIcon,
  Redo2 as RedoIcon,
  Bold as FormatBoldIcon,
  Italic as FormatItalicIcon,
  Underline as FormatUnderlinedIcon,
  Strikethrough as StrikethroughSIcon,
  Heading1 as LooksOneIcon,
  Heading2 as LooksTwoIcon,
  Heading3 as Looks3Icon,
  List as FormatListBulletedIcon,
  ListOrdered as FormatListNumberedIcon,
  ListChecks as ChecklistRtlIcon,
  Quote as FormatQuoteIcon,
  AlignLeft as FormatAlignLeftIcon,
  AlignCenter as FormatAlignCenterIcon,
  AlignRight as FormatAlignRightIcon,
  AlignJustify as FormatAlignJustifyIcon,
  Link as LinkIcon,
  Image as ImageOutlinedIcon,
  Video as VideocamOutlinedIcon,
  Table as TableChartIcon,
  Code as CodeIcon,
  Palette as PaletteOutlinedIcon,
  Minus as RemoveIcon,
  Maximize as FullscreenIcon,
  Minimize as FullscreenExitIcon,
} from 'lucide-react';
import './editor.css';

// ─── Merge admin settings with defaults ─────────────────────────────────────

function mergeAdminSettings(admin?: EditorAdminProps) {
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
    maxHistorySize: admin?.maxHistorySize ?? d.maxHistorySize,
    autoSaveDebounceMs: admin?.autoSaveDebounceMs ?? d.autoSaveDebounceMs,
    readingWpm: admin?.readingWpm ?? d.readingWpm,
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
  const [showVideoDialog, setShowVideoDialog] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [colorType, setColorType] = useState<'text' | 'background'>('text');
  const [selectedColor, setSelectedColor] = useState(a.defaultTextColor);
  const [showTableDialog, setShowTableDialog] = useState(false);
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);

  // Generate a deterministic draft key for localStorage auto-save
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

    const exceeded =
      (a.maxWordCount > 0 && words.length > a.maxWordCount) ||
      (a.maxCharCount > 0 && text.length > a.maxCharCount);
    setContentLimitExceeded(exceeded);
  }, [a.readingWpm, a.maxWordCount, a.maxCharCount]);

  const updateActiveFormats = useCallback(() => {
    const formats = new Set<string>();
    const checks = [
      'bold', 'italic', 'underline', 'strikeThrough',
      'insertUnorderedList', 'insertOrderedList',
      'justifyLeft', 'justifyCenter', 'justifyRight', 'justifyFull',
    ];
    for (const cmd of checks) {
      try {
        if (document.queryCommandState(cmd)) formats.add(cmd);
      } catch { /* some commands may not be supported */ }
    }
    try {
      const block = document.queryCommandValue('formatBlock').toLowerCase();
      if (/^h[1-6]$/.test(block)) formats.add(block);
      if (block === 'blockquote') formats.add('blockquote');
    } catch { /* ignore */ }
    setActiveFormats(formats);
  }, []);

  const saveToHistory = useCallback(() => {
    if (!editorRef.current) return;
    const html = editorRef.current.innerHTML;
    historyStack.current = historyStack.current.slice(0, historyIndex.current + 1);
    historyStack.current.push(html);
    if (historyStack.current.length > a.maxHistorySize) {
      historyStack.current.shift();
    }
    historyIndex.current = historyStack.current.length - 1;
  }, [a.maxHistorySize]);

  // ── Input handler (content changes + Markdown shortcuts) ──────────────

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

    // Debounced auto-save to localStorage
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      if (!editorRef.current || !draftKeyRef.current) return;
      try {
        const currentHtml = editorRef.current.innerHTML;
        if (currentHtml && currentHtml !== '<br>') {
          localStorage.setItem(draftKeyRef.current, currentHtml);
        }
      } catch { /* localStorage may be unavailable or full */ }
    }, a.autoSaveDebounceMs);

    // Markdown-style shortcuts
    if (!a.enableMarkdownShortcuts) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const node = sel.anchorNode;
    if (!node || node.nodeType !== Node.TEXT_NODE) return;

    const nodeText = node.textContent ?? '';
    const offset = sel.anchorOffset;
    const beforeCursor = nodeText.substring(0, offset);

    const headingMatch = beforeCursor.match(MARKDOWN_SHORTCUTS.HEADING);
    if (headingMatch) {
      const level = headingMatch[1].length;
      node.textContent = nodeText.substring(offset);
      document.execCommand('formatBlock', false, `h${level}`);
      return;
    }

    if (MARKDOWN_SHORTCUTS.BULLET_LIST.test(beforeCursor)) {
      node.textContent = nodeText.substring(offset);
      document.execCommand('insertUnorderedList');
      return;
    }

    if (MARKDOWN_SHORTCUTS.ORDERED_LIST.test(beforeCursor)) {
      node.textContent = nodeText.substring(offset);
      document.execCommand('insertOrderedList');
      return;
    }

    if (MARKDOWN_SHORTCUTS.BLOCKQUOTE.test(beforeCursor)) {
      node.textContent = nodeText.substring(offset);
      document.execCommand('formatBlock', false, 'blockquote');
      return;
    }

    if (MARKDOWN_SHORTCUTS.HORIZONTAL_RULE.test(beforeCursor.trim()) && offset === nodeText.length) {
      node.textContent = '';
      document.execCommand('insertHorizontalRule');
      return;
    }

    if (MARKDOWN_SHORTCUTS.CODE_BLOCK.test(beforeCursor.trim())) {
      node.textContent = '';
      document.execCommand('insertHTML', false, '<pre><code>// Your code here\n</code></pre>');
      return;
    }
  }, [saveToHistory, updateMetrics, updateActiveFormats, a.autoSaveDebounceMs, a.enableMarkdownShortcuts]);

  // Initialize content
  useEffect(() => {
    if (!editorRef.current) return;
    if (lastHtmlRef.current === content) return;
    if (initializedRef.current && !content) return;

    editorRef.current.innerHTML = sanitizeHtml(content || '');
    lastHtmlRef.current = content;

    const text = editorRef.current.innerText || '';
    const words = text.trim().split(/\s+/).filter(w => w.length > 0);
    setWordCount(words.length);
    setCharCount(text.length);
    setReadingTime(Math.ceil(words.length / a.readingWpm));

    if (!initializedRef.current) {
      saveToHistory();
      initializedRef.current = true;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

  // Cleanup auto-save timer on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, []);

  const undo = useCallback(() => {
    if (historyIndex.current > 0) {
      historyIndex.current--;
      if (editorRef.current) {
        editorRef.current.innerHTML = historyStack.current[historyIndex.current];
        updateMetrics();
      }
    }
  }, [updateMetrics]);

  const redo = useCallback(() => {
    if (historyIndex.current < historyStack.current.length - 1) {
      historyIndex.current++;
      if (editorRef.current) {
        editorRef.current.innerHTML = historyStack.current[historyIndex.current];
        updateMetrics();
      }
    }
  }, [updateMetrics]);

  const executeCommand = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    setTimeout(() => { updateMetrics(); updateActiveFormats(); }, 0);
  }, [updateMetrics, updateActiveFormats]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const html = e.clipboardData.getData('text/html');
    const text = e.clipboardData.getData('text/plain');

    if (html) {
      e.preventDefault();
      const clean = sanitizeHtml(html);
      document.execCommand('insertHTML', false, clean);
    } else if (text) {
      const escaped = escapeHtml(text);
      const urlPattern = /(https?:\/\/[^\s<]+)/g;
      const linked = escaped.replace(
        urlPattern,
        '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>',
      );
      if (linked !== escaped) {
        e.preventDefault();
        document.execCommand('insertHTML', false, linked);
      }
    }
    setTimeout(updateMetrics, 0);
  }, [updateMetrics]);

  // ── Drag-and-drop image upload ────────────────────────────────────────

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (!a.enableDragDropUpload || !a.enableImages) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragging(true);
  }, [a.enableDragDropUpload, a.enableImages]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (!a.enableDragDropUpload || !a.enableImages) return;

    const files = Array.from(e.dataTransfer.files).filter(f =>
      a.allowedImageTypes.includes(f.type),
    );
    if (files.length === 0) return;

    if (!onImageUpload) {
      logger.warn('Image drop ignored: no onImageUpload handler');
      return;
    }

    const sel = window.getSelection();
    let savedRange: Range | null = null;
    if (sel && sel.rangeCount > 0) {
      savedRange = sel.getRangeAt(0).cloneRange();
    }

    for (const file of files) {
      if (file.size > a.maxImageSizeBytes) {
        logger.warn(`Image "${file.name}" exceeds max size (${a.maxImageSizeBytes} bytes)`);
        continue;
      }
      try {
        const url = await onImageUpload(file);
        const safeUrl = escapeAttr(url);
        const safeName = escapeAttr(file.name);
        const img = `<img src="${safeUrl}" alt="${safeName}" width="${a.defaultImageWidth}" height="${a.defaultImageHeight}" loading="lazy" decoding="async" />`;

        editorRef.current?.focus();
        const currentSel = window.getSelection();
        if (savedRange && currentSel) {
          currentSel.removeAllRanges();
          currentSel.addRange(savedRange);
        } else if (currentSel && editorRef.current) {
          const range = document.createRange();
          range.selectNodeContents(editorRef.current);
          range.collapse(false);
          currentSel.removeAllRanges();
          currentSel.addRange(range);
        }

        document.execCommand('insertHTML', false, img);

        const afterInsert = window.getSelection();
        if (afterInsert && afterInsert.rangeCount > 0) {
          savedRange = afterInsert.getRangeAt(0).cloneRange();
        }
      } catch (error) {
        logger.error('Image drop upload failed:', error);
      }
    }
    setTimeout(updateMetrics, 0);
  }, [onImageUpload, updateMetrics, a.enableDragDropUpload, a.enableImages, a.allowedImageTypes, a.maxImageSizeBytes, a.defaultImageWidth, a.defaultImageHeight]);

  // Prevent native drop behaviour on contentEditable
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    const blockDrop = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    };
    el.addEventListener('drop', blockDrop, true);
    el.addEventListener('dragover', (e: Event) => { e.preventDefault(); }, true);
    return () => {
      el.removeEventListener('drop', blockDrop, true);
    };
  }, []);

  const toggleFormat = useCallback((format: string) => {
    executeCommand(format);
  }, [executeCommand]);

  const setHeading = useCallback((level: number) => {
    executeCommand('formatBlock', `h${level}`);
  }, [executeCommand]);

  const setAlignment = useCallback((align: string) => {
    const commands: Record<string, string> = {
      left: 'justifyLeft',
      center: 'justifyCenter',
      right: 'justifyRight',
      justify: 'justifyFull',
    };
    executeCommand(commands[align]);
  }, [executeCommand]);

  const insertLink = useCallback(() => {
    if (!linkUrl) return;
    const trimmedUrl = linkUrl.trim();
    if (/^\s*(?:javascript|data|vbscript)\s*:/i.test(trimmedUrl)) {
      logger.warn('Blocked dangerous URL protocol in link insertion');
      return;
    }

    if (linkText) {
      const safeUrl = escapeAttr(trimmedUrl);
      const safeText = escapeHtml(linkText);
      const link = `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${safeText}</a>`;
      executeCommand('insertHTML', link);
    } else {
      executeCommand('createLink', trimmedUrl);
      const sel = window.getSelection();
      if (sel?.anchorNode?.parentElement?.tagName === 'A') {
        sel.anchorNode.parentElement.setAttribute('rel', 'noopener noreferrer');
        sel.anchorNode.parentElement.setAttribute('target', '_blank');
      }
    }

    setShowLinkDialog(false);
    setLinkUrl('');
    setLinkText('');
  }, [linkUrl, linkText, executeCommand]);

  const insertImage = useCallback((url: string) => {
    if (!url) return;
    if (/^\s*(?:javascript|data|vbscript)\s*:/i.test(url.trim())) {
      logger.warn('Blocked dangerous URL protocol in image insertion');
      return;
    }
    const safeUrl = escapeAttr(url.trim());
    const safeAlt = escapeAttr(imageAlt || 'Image');
    const img = `<img src="${safeUrl}" alt="${safeAlt}" width="${a.defaultImageWidth}" height="${a.defaultImageHeight}" loading="lazy" decoding="async" />`;
    executeCommand('insertHTML', img);
    setShowImageDialog(false);
    setImageUrl('');
    setImageAlt('');
  }, [executeCommand, imageAlt, a.defaultImageWidth, a.defaultImageHeight]);

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !onImageUpload) return;
    const file = e.target.files[0];
    if (!a.allowedImageTypes.includes(file.type)) {
      logger.warn(`Image type "${file.type}" not allowed`);
      return;
    }
    if (file.size > a.maxImageSizeBytes) {
      logger.warn(`Image "${file.name}" exceeds max size (${a.maxImageSizeBytes} bytes)`);
      return;
    }

    const sel = window.getSelection();
    let savedRange: Range | null = null;
    if (sel && sel.rangeCount > 0) {
      savedRange = sel.getRangeAt(0).cloneRange();
    }

    try {
      const url = await onImageUpload(file);
      editorRef.current?.focus();
      const currentSel = window.getSelection();
      if (savedRange && currentSel) {
        currentSel.removeAllRanges();
        currentSel.addRange(savedRange);
      } else if (currentSel && editorRef.current) {
        const range = document.createRange();
        range.selectNodeContents(editorRef.current);
        range.collapse(false);
        currentSel.removeAllRanges();
        currentSel.addRange(range);
      }
      insertImage(url);
    } catch (error) {
      logger.error('Image upload failed:', error);
    }
  }, [onImageUpload, insertImage, a.allowedImageTypes, a.maxImageSizeBytes]);

  const insertVideo = useCallback(() => {
    if (!videoUrl) return;
    if (/^\s*(?:javascript|data|vbscript)\s*:/i.test(videoUrl.trim())) {
      logger.warn('Blocked dangerous URL protocol in video insertion');
      return;
    }

    const trimmedUrl = videoUrl.trim().toLowerCase();
    const providerPatterns: Record<string, RegExp> = {
      youtube: /(?:youtube\.com|youtu\.be)/,
      vimeo: /vimeo\.com/,
    };
    const isAllowed = a.allowedVideoProviders.some((provider) => {
      const pattern = providerPatterns[provider];
      return pattern ? pattern.test(trimmedUrl) : false;
    });
    if (!isAllowed) {
      logger.warn(`Video provider not allowed. Allowed: ${a.allowedVideoProviders.join(', ')}`);
      return;
    }

    let embedUrl = videoUrl.trim();
    const youtubeRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s]+)/;
    const match = videoUrl.match(youtubeRegex);
    if (match) {
      embedUrl = `https://www.youtube.com/embed/${encodeURIComponent(match[1])}`;
    }

    const safeUrl = escapeAttr(embedUrl);
    const videoHTML = `<div class="video-wrapper"><iframe src="${safeUrl}" allowfullscreen sandbox="allow-scripts allow-same-origin allow-presentation" loading="lazy" referrerpolicy="no-referrer"></iframe></div>`;
    executeCommand('insertHTML', videoHTML);
    setShowVideoDialog(false);
    setVideoUrl('');
  }, [videoUrl, executeCommand, a.allowedVideoProviders]);

  const insertBlockquote = useCallback(() => {
    executeCommand('formatBlock', 'blockquote');
  }, [executeCommand]);

  const insertCodeBlock = useCallback(() => {
    executeCommand('insertHTML', '<pre><code>// Your code here\n</code></pre>');
  }, [executeCommand]);

  const insertHorizontalRule = useCallback(() => {
    executeCommand('insertHorizontalRule');
  }, [executeCommand]);

  const applyColor = useCallback(() => {
    if (colorType === 'text') {
      executeCommand('foreColor', selectedColor);
    } else {
      executeCommand('backColor', selectedColor);
    }
    setShowColorPicker(false);
  }, [colorType, selectedColor, executeCommand]);

  const insertTaskList = useCallback(() => {
    const html =
      '<ul style="list-style:none;padding-left:1.5em">' +
      '<li><input type="checkbox" disabled style="margin-right:0.5em"/>Task item</li>' +
      '</ul>';
    executeCommand('insertHTML', html);
  }, [executeCommand]);

  const insertTable = useCallback(() => {
    let tableHTML = '<table><tbody>';
    for (let i = 0; i < tableRows; i++) {
      tableHTML += '<tr>';
      for (let j = 0; j < tableCols; j++) {
        const tag = i === 0 ? 'th' : 'td';
        tableHTML += `<${tag}>${i === 0 ? `Header ${j + 1}` : `Cell ${i}-${j + 1}`}</${tag}>`;
      }
      tableHTML += '</tr>';
    }
    tableHTML += '</tbody></table>';
    executeCommand('insertHTML', tableHTML);
    setShowTableDialog(false);
  }, [tableRows, tableCols, executeCommand]);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showLinkDialog) { setShowLinkDialog(false); e.preventDefault(); return; }
        if (showImageDialog) { setShowImageDialog(false); e.preventDefault(); return; }
        if (showVideoDialog) { setShowVideoDialog(false); e.preventDefault(); return; }
        if (showColorPicker) { setShowColorPicker(false); e.preventDefault(); return; }
        if (showTableDialog) { setShowTableDialog(false); e.preventDefault(); return; }
        if (isFullscreen) { setIsFullscreen(false); e.preventDefault(); return; }
      }

      if (e.ctrlKey || e.metaKey) {
        const key = e.key.toLowerCase();
        const shift = e.shiftKey;

        if (!shift && key === 'z') { e.preventDefault(); undo(); }
        else if ((shift && key === 'z') || key === 'y') { e.preventDefault(); redo(); }
        else if (key === 'k') { e.preventDefault(); setShowLinkDialog(true); }
        else if (shift && key === 'e') {
          e.preventDefault();
          const sel = window.getSelection();
          if (sel && sel.toString()) {
            const safeCode = escapeHtml(sel.toString());
            document.execCommand('insertHTML', false, `<code>${safeCode}</code>`);
          }
        }
      }

      if (e.key === 'Tab' && editorRef.current?.contains(document.activeElement)) {
        e.preventDefault();
        document.execCommand(e.shiftKey ? 'outdent' : 'indent');
      }
    };

    const handleSelectionChange = () => {
      if (editorRef.current?.contains(document.activeElement)) {
        updateActiveFormats();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [undo, redo, updateActiveFormats, showLinkDialog, showImageDialog, showVideoDialog, showColorPicker, showTableDialog, isFullscreen]);

  return (
    <div className={`rich-text-editor-container ${isFullscreen ? 'fullscreen' : ''} ${className}`}>
      {/* Toolbar */}
      <div className="editor-toolbar" role="toolbar" aria-label="Text formatting options" aria-orientation="horizontal">
        {a.enableUndoRedo && (
        <div className="toolbar-group">
          <button type="button" onClick={undo} className="toolbar-btn" title="Undo (Ctrl+Z)" disabled={effectiveReadOnly}><UndoIcon size={18} /></button>
          <button type="button" onClick={redo} className="toolbar-btn" title="Redo (Ctrl+Y)" disabled={effectiveReadOnly}><RedoIcon size={18} /></button>
        </div>
        )}
        {a.enableUndoRedo && <div className="toolbar-divider" />}

        {(a.enableBold || a.enableItalic || a.enableUnderline || a.enableStrikethrough) && (
        <div className="toolbar-group">
          {a.enableBold && <button type="button" onClick={() => toggleFormat('bold')} className={`toolbar-btn ${activeFormats.has('bold') ? 'active' : ''}`} title="Bold (Ctrl+B)" disabled={effectiveReadOnly}><FormatBoldIcon size={18} /></button>}
          {a.enableItalic && <button type="button" onClick={() => toggleFormat('italic')} className={`toolbar-btn ${activeFormats.has('italic') ? 'active' : ''}`} title="Italic (Ctrl+I)" disabled={effectiveReadOnly}><FormatItalicIcon size={18} /></button>}
          {a.enableUnderline && <button type="button" onClick={() => toggleFormat('underline')} className={`toolbar-btn ${activeFormats.has('underline') ? 'active' : ''}`} title="Underline (Ctrl+U)" disabled={effectiveReadOnly}><FormatUnderlinedIcon size={18} /></button>}
          {a.enableStrikethrough && <button type="button" onClick={() => toggleFormat('strikeThrough')} className={`toolbar-btn ${activeFormats.has('strikeThrough') ? 'active' : ''}`} title="Strikethrough" disabled={effectiveReadOnly}><StrikethroughSIcon size={18} /></button>}
        </div>
        )}
        {(a.enableBold || a.enableItalic || a.enableUnderline || a.enableStrikethrough) && <div className="toolbar-divider" />}

        {a.enableHeadings && (
        <div className="toolbar-group">
          {a.allowedHeadingLevels.includes(1) && <button type="button" onClick={() => setHeading(1)} className={`toolbar-btn ${activeFormats.has('h1') ? 'active' : ''}`} title="Heading 1" disabled={effectiveReadOnly}><LooksOneIcon size={18} /></button>}
          {a.allowedHeadingLevels.includes(2) && <button type="button" onClick={() => setHeading(2)} className={`toolbar-btn ${activeFormats.has('h2') ? 'active' : ''}`} title="Heading 2" disabled={effectiveReadOnly}><LooksTwoIcon size={18} /></button>}
          {a.allowedHeadingLevels.includes(3) && <button type="button" onClick={() => setHeading(3)} className={`toolbar-btn ${activeFormats.has('h3') ? 'active' : ''}`} title="Heading 3" disabled={effectiveReadOnly}><Looks3Icon size={18} /></button>}
        </div>
        )}
        {a.enableHeadings && <div className="toolbar-divider" />}

        {(a.enableLists || a.enableTaskLists || a.enableBlockquotes) && (
        <div className="toolbar-group">
          {a.enableLists && (
          <>
            <button type="button" onClick={() => toggleFormat('insertUnorderedList')} className={`toolbar-btn ${activeFormats.has('insertUnorderedList') ? 'active' : ''}`} title="Bullet List" disabled={effectiveReadOnly}><FormatListBulletedIcon size={18} /></button>
            <button type="button" onClick={() => toggleFormat('insertOrderedList')} className={`toolbar-btn ${activeFormats.has('insertOrderedList') ? 'active' : ''}`} title="Numbered List" disabled={effectiveReadOnly}><FormatListNumberedIcon size={18} /></button>
          </>
          )}
          {a.enableTaskLists && <button type="button" onClick={insertTaskList} className="toolbar-btn" title="Task List" disabled={effectiveReadOnly}><ChecklistRtlIcon size={18} /></button>}
          {a.enableBlockquotes && <button type="button" onClick={insertBlockquote} className={`toolbar-btn ${activeFormats.has('blockquote') ? 'active' : ''}`} title="Blockquote" disabled={effectiveReadOnly}><FormatQuoteIcon size={18} /></button>}
        </div>
        )}
        {(a.enableLists || a.enableTaskLists || a.enableBlockquotes) && <div className="toolbar-divider" />}

        {a.enableAlignment && (
        <div className="toolbar-group">
          <button type="button" onClick={() => setAlignment('left')} className={`toolbar-btn ${activeFormats.has('justifyLeft') ? 'active' : ''}`} title="Align Left" disabled={effectiveReadOnly}><FormatAlignLeftIcon size={18} /></button>
          <button type="button" onClick={() => setAlignment('center')} className={`toolbar-btn ${activeFormats.has('justifyCenter') ? 'active' : ''}`} title="Align Center" disabled={effectiveReadOnly}><FormatAlignCenterIcon size={18} /></button>
          <button type="button" onClick={() => setAlignment('right')} className={`toolbar-btn ${activeFormats.has('justifyRight') ? 'active' : ''}`} title="Align Right" disabled={effectiveReadOnly}><FormatAlignRightIcon size={18} /></button>
          <button type="button" onClick={() => setAlignment('justify')} className={`toolbar-btn ${activeFormats.has('justifyFull') ? 'active' : ''}`} title="Justify" disabled={effectiveReadOnly}><FormatAlignJustifyIcon size={18} /></button>
        </div>
        )}
        {a.enableAlignment && <div className="toolbar-divider" />}

        {(a.enableLinks || a.enableImages || a.enableVideoEmbeds || a.enableTables) && (
        <div className="toolbar-group">
          {a.enableLinks && <button type="button" onClick={() => setShowLinkDialog(true)} className="toolbar-btn" title="Insert Link" disabled={effectiveReadOnly}><LinkIcon size={18} /></button>}
          {a.enableImages && <button type="button" onClick={() => setShowImageDialog(true)} className="toolbar-btn" title="Insert Image" disabled={effectiveReadOnly}><ImageOutlinedIcon size={18} /></button>}
          {a.enableVideoEmbeds && <button type="button" onClick={() => setShowVideoDialog(true)} className="toolbar-btn" title="Embed Video" disabled={effectiveReadOnly}><VideocamOutlinedIcon size={18} /></button>}
          {a.enableTables && <button type="button" onClick={() => setShowTableDialog(true)} className="toolbar-btn" title="Insert Table" disabled={effectiveReadOnly}><TableChartIcon size={18} /></button>}
        </div>
        )}
        {(a.enableLinks || a.enableImages || a.enableVideoEmbeds || a.enableTables) && <div className="toolbar-divider" />}

        {(a.enableCodeBlocks || a.enableTextColor || a.enableHorizontalRule) && (
        <div className="toolbar-group">
          {a.enableCodeBlocks && <button type="button" onClick={insertCodeBlock} className="toolbar-btn" title="Code Block" disabled={effectiveReadOnly}><CodeIcon size={18} /></button>}
          {(a.enableTextColor || a.enableBackgroundColor) && <button type="button" onClick={() => setShowColorPicker(true)} className="toolbar-btn" title="Text Color" disabled={effectiveReadOnly}><PaletteOutlinedIcon size={18} /></button>}
          {a.enableHorizontalRule && <button type="button" onClick={insertHorizontalRule} className="toolbar-btn" title="Horizontal Rule" disabled={effectiveReadOnly}><RemoveIcon size={18} /></button>}
        </div>
        )}
        {(a.enableCodeBlocks || a.enableTextColor || a.enableHorizontalRule) && <div className="toolbar-divider" />}

        {a.enableFullscreen && (
        <div className="toolbar-group">
          <button type="button" onClick={toggleFullscreen} className="toolbar-btn" title="Toggle Fullscreen">
            {isFullscreen ? <FullscreenExitIcon size={18} /> : <FullscreenIcon size={18} />}
          </button>
        </div>
        )}

        <div className="toolbar-status">
          {wordCount} words &middot; {charCount.toLocaleString()} chars &middot; {readingTime} min read
          {contentLimitExceeded && (
            <span className="toolbar-limit-warning" style={{ color: 'var(--rte-error, #e74c3c)', marginLeft: '0.5em', fontWeight: 600 }}>
              {a.maxWordCount > 0 && wordCount > a.maxWordCount && `(max ${a.maxWordCount} words)`}
              {a.maxCharCount > 0 && charCount > a.maxCharCount && `(max ${a.maxCharCount.toLocaleString()} chars)`}
            </span>
          )}
        </div>
      </div>

      {/* Editor Content */}
      <div
        className={`editor-content-wrapper ${isDragging ? 'drag-active' : ''}`}
        style={{ minHeight, maxHeight: isFullscreen ? '100vh' : maxHeight }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDragging && (
          <div className="drag-overlay"><p>Drop image here</p></div>
        )}
        <div
          ref={editorRef}
          className="prose-editor"
          contentEditable={!effectiveReadOnly}
          onInput={handleInput}
          onPaste={handlePaste}
          suppressContentEditableWarning
          spellCheck
          data-placeholder={placeholder}
        />
      </div>

      {/* Link Dialog */}
      {showLinkDialog && (
        <div className="editor-dialog-overlay" onClick={() => setShowLinkDialog(false)} role="presentation">
          <div className="editor-dialog" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Insert link">
            <h3 className="dialog-title">Insert Link</h3>
            <input type="url" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://example.com" className="dialog-input" autoFocus />
            <input type="text" value={linkText} onChange={(e) => setLinkText(e.target.value)} placeholder="Link text (optional, uses selection if empty)" className="dialog-input" />
            <div className="dialog-actions">
              <button type="button" onClick={() => setShowLinkDialog(false)} className="dialog-btn dialog-btn-cancel">Cancel</button>
              <button type="button" onClick={insertLink} className="dialog-btn dialog-btn-primary" disabled={!linkUrl}>Insert</button>
            </div>
          </div>
        </div>
      )}

      {/* Image Dialog */}
      {showImageDialog && (
        <div className="editor-dialog-overlay" onClick={() => setShowImageDialog(false)} role="presentation">
          <div className="editor-dialog" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Insert image">
            <h3 className="dialog-title">Insert Image</h3>
            <input type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://example.com/image.jpg" className="dialog-input" />
            <input type="text" value={imageAlt} onChange={(e) => setImageAlt(e.target.value)} placeholder="Alt text for accessibility (recommended)" className="dialog-input" />
            {onImageUpload && (
              <>
                <div className="dialog-divider">OR</div>
                <p className="dialog-hint">Upload or drag &amp; drop images directly into the editor</p>
                <input type="file" accept={a.allowedImageTypes.join(',')} onChange={handleImageUpload} className="dialog-file-input" />
              </>
            )}
            <div className="dialog-actions">
              <button type="button" onClick={() => { setShowImageDialog(false); setImageAlt(''); }} className="dialog-btn dialog-btn-cancel">Cancel</button>
              <button type="button" onClick={() => insertImage(imageUrl)} className="dialog-btn dialog-btn-primary" disabled={!imageUrl}>Insert</button>
            </div>
          </div>
        </div>
      )}

      {/* Video Dialog */}
      {showVideoDialog && (
        <div className="editor-dialog-overlay" onClick={() => setShowVideoDialog(false)} role="presentation">
          <div className="editor-dialog" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Embed video">
            <h3 className="dialog-title">Embed Video</h3>
            <input type="url" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=... or embed URL" className="dialog-input" autoFocus />
            <p className="dialog-hint">Supports YouTube, Vimeo, and direct embed URLs</p>
            <div className="dialog-actions">
              <button type="button" onClick={() => setShowVideoDialog(false)} className="dialog-btn dialog-btn-cancel">Cancel</button>
              <button type="button" onClick={insertVideo} className="dialog-btn dialog-btn-primary" disabled={!videoUrl}>Insert</button>
            </div>
          </div>
        </div>
      )}

      {/* Color Picker Dialog */}
      {showColorPicker && (
        <div className="editor-dialog-overlay" onClick={() => setShowColorPicker(false)} role="presentation">
          <div className="editor-dialog" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Choose color">
            <h3 className="dialog-title">Choose Color</h3>
            <div className="color-type-selector">
              {a.enableTextColor && <button type="button" onClick={() => setColorType('text')} className={`color-type-btn ${colorType === 'text' ? 'active' : ''}`}>Text Color</button>}
              {a.enableBackgroundColor && <button type="button" onClick={() => setColorType('background')} className={`color-type-btn ${colorType === 'background' ? 'active' : ''}`}>Background</button>}
            </div>
            <input type="color" value={selectedColor} onChange={(e) => setSelectedColor(e.target.value)} className="color-picker-input" />
            <div className="color-presets">
              {a.colorPalette.map(color => (
                <button key={color} type="button" onClick={() => setSelectedColor(color)} className="color-preset" style={{ backgroundColor: color } as CSSProperties} title={color} aria-label={`Select color ${color}`} />
              ))}
            </div>
            <div className="dialog-actions">
              <button type="button" onClick={() => setShowColorPicker(false)} className="dialog-btn dialog-btn-cancel">Cancel</button>
              <button type="button" onClick={applyColor} className="dialog-btn dialog-btn-primary">Apply</button>
            </div>
          </div>
        </div>
      )}

      {/* Table Dialog */}
      {showTableDialog && (
        <div className="editor-dialog-overlay" onClick={() => setShowTableDialog(false)} role="presentation">
          <div className="editor-dialog" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Insert table">
            <h3 className="dialog-title">Insert Table</h3>
            <div className="table-size-inputs">
              <div>
                <label className="dialog-label">Rows</label>
                <input type="number" value={tableRows} onChange={(e) => setTableRows(Math.max(1, Math.min(a.maxTableRows, parseInt(e.target.value) || 1)))} min="1" max={a.maxTableRows} className="dialog-input" />
              </div>
              <div>
                <label className="dialog-label">Columns</label>
                <input type="number" value={tableCols} onChange={(e) => setTableCols(Math.max(1, Math.min(a.maxTableCols, parseInt(e.target.value) || 1)))} min="1" max={a.maxTableCols} className="dialog-input" />
              </div>
            </div>
            <div className="dialog-actions">
              <button type="button" onClick={() => setShowTableDialog(false)} className="dialog-btn dialog-btn-cancel">Cancel</button>
              <button type="button" onClick={insertTable} className="dialog-btn dialog-btn-primary">Insert</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

RichTextEditor.displayName = 'RichTextEditor';
