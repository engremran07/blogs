/**
 * ============================================================================
 * HOOK:     useEditorInput
 * PURPOSE:  Content-input handling — onInput (+ markdown shortcuts),
 *           paste sanitisation, and drag-and-drop image upload.
 * ============================================================================
 */

import { useState, useEffect, useCallback, type RefObject, type MutableRefObject } from 'react';
import type { MergedEditorConfig } from '../editor.config';
import { sanitizeHtml, escapeHtml, escapeAttr, logger } from '../../utils';
import { MARKDOWN_SHORTCUTS } from '../../server/constants';

export interface UseEditorInputDeps {
  editorRef: RefObject<HTMLDivElement | null>;
  lastHtmlRef: MutableRefObject<string>;
  onChangeRef: MutableRefObject<((html: string, text: string, wordCount: number) => void) | undefined>;
  autoSaveTimer: MutableRefObject<ReturnType<typeof setTimeout> | null>;
  draftKeyRef: MutableRefObject<string | null>;
  config: MergedEditorConfig;
  saveToHistory: () => void;
  updateMetrics: () => void;
  updateActiveFormats: () => void;
  onImageUpload?: (file: File) => Promise<string>;
}

export function useEditorInput(deps: UseEditorInputDeps) {
  const {
    editorRef, lastHtmlRef, onChangeRef, autoSaveTimer: autoSaveTimerRef, draftKeyRef,
    config, saveToHistory, updateMetrics, updateActiveFormats, onImageUpload,
  } = deps;

  const [isDragging, setIsDragging] = useState(false);

  // ── Input handler (content changes + Markdown shortcuts) ────────────

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
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      if (!editorRef.current || !draftKeyRef.current) return;
      try {
        const currentHtml = editorRef.current.innerHTML;
        if (currentHtml && currentHtml !== '<br>') {
          localStorage.setItem(draftKeyRef.current, currentHtml);
        }
      } catch { /* localStorage may be unavailable or full */ }
    }, config.autoSaveDebounceMs);

    // Markdown-style shortcuts
    if (!config.enableMarkdownShortcuts) return;
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
  }, [saveToHistory, updateMetrics, updateActiveFormats, config.autoSaveDebounceMs, config.enableMarkdownShortcuts, editorRef, lastHtmlRef, onChangeRef, autoSaveTimerRef, draftKeyRef]);

  // ── Paste handler ───────────────────────────────────────────────────

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

  // ── Drag-and-drop image upload ──────────────────────────────────────

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (!config.enableDragDropUpload || !config.enableImages) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragging(true);
  }, [config.enableDragDropUpload, config.enableImages]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (!config.enableDragDropUpload || !config.enableImages) return;

    const files = Array.from(e.dataTransfer.files).filter(f =>
      config.allowedImageTypes.includes(f.type),
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
      if (file.size > config.maxImageSizeBytes) {
        logger.warn(`Image "${file.name}" exceeds max size (${config.maxImageSizeBytes} bytes)`);
        continue;
      }
      try {
        const url = await onImageUpload(file);
        if (!url || /^\s*(?:javascript|data|vbscript)\s*:/i.test(url.trim())) {
          logger.warn('Image upload returned invalid URL');
          continue;
        }
        const safeUrl = escapeAttr(url);
        const safeName = escapeAttr(file.name);
        const img = `<figure class="editor-figure img-large img-align-center"><img src="${safeUrl}" alt="${safeName}" loading="lazy" decoding="async" /></figure>`;

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
  }, [onImageUpload, updateMetrics, config.enableDragDropUpload, config.enableImages, config.allowedImageTypes, config.maxImageSizeBytes, editorRef]);

  // Block native drop behaviour on contentEditable
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    const blockDrop = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    };
    const blockDragover = (e: Event) => { e.preventDefault(); };
    el.addEventListener('drop', blockDrop, true);
    el.addEventListener('dragover', blockDragover, true);
    return () => {
      el.removeEventListener('drop', blockDrop, true);
      el.removeEventListener('dragover', blockDragover, true);
    };
  }, [editorRef]);

  return {
    isDragging,
    handleInput,
    handlePaste,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  };
}
