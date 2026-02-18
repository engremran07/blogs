/**
 * ============================================================================
 * HOOK:     useEditorCore
 * PURPOSE:  Core editor infrastructure — refs, metrics state, history,
 *           undo/redo, executeCommand, and content initialisation effects.
 * ============================================================================
 */

import {
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import type { MergedEditorConfig } from '../editor.config';
import { sanitizeHtml } from '../../utils';

export function useEditorCore(
  config: MergedEditorConfig,
  content: string,
  onChange?: (html: string, text: string, wordCount: number) => void,
) {
  // ── Refs ────────────────────────────────────────────────────────────
  const editorRef = useRef<HTMLDivElement>(null);
  const lastHtmlRef = useRef<string>(content);
  const initializedRef = useRef(false);
  const historyStack = useRef<string[]>([]);
  const historyIndex = useRef(-1);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftKeyRef = useRef<string | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // ── Core state ──────────────────────────────────────────────────────
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [readingTime, setReadingTime] = useState(0);
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());
  const [contentLimitExceeded, setContentLimitExceeded] = useState(false);
  const [currentFontSize, setCurrentFontSize] = useState(16);
  const [currentLineHeight, setCurrentLineHeight] = useState(1.5);
  const [currentBlockType, setCurrentBlockType] = useState('p');

  // ── Utility callbacks ───────────────────────────────────────────────

  const updateMetrics = useCallback(() => {
    if (!editorRef.current) return;
    const text = editorRef.current.innerText || '';
    const words = text.trim().split(/\s+/).filter((w) => w.length > 0);
    setWordCount(words.length);
    setCharCount(text.length);
    setReadingTime(Math.ceil(words.length / config.readingWpm));

    const exceeded =
      (config.maxWordCount > 0 && words.length > config.maxWordCount) ||
      (config.maxCharCount > 0 && text.length > config.maxCharCount);
    setContentLimitExceeded(exceeded);
  }, [config.readingWpm, config.maxWordCount, config.maxCharCount]);

  const updateActiveFormats = useCallback(() => {
    const formats = new Set<string>();
    const checks = [
      'bold', 'italic', 'underline', 'strikeThrough',
      'insertUnorderedList', 'insertOrderedList',
      'justifyLeft', 'justifyCenter', 'justifyRight', 'justifyFull',
      'superscript', 'subscript',
    ];
    for (const cmd of checks) {
      try {
        if (document.queryCommandState(cmd)) formats.add(cmd);
      } catch { /* some commands may not be supported */ }
    }
    try {
      const block = document.queryCommandValue('formatBlock').toLowerCase();
      if (/^h[1-6]$/.test(block)) { formats.add(block); setCurrentBlockType(block); }
      else if (block === 'blockquote') { formats.add('blockquote'); setCurrentBlockType('blockquote'); }
      else if (block === 'pre') { formats.add('pre'); setCurrentBlockType('pre'); }
      else { setCurrentBlockType('p'); }
    } catch { /* ignore */ }

    // Detect current font size from selection
    try {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const node = sel.anchorNode;
        const el = node?.nodeType === Node.ELEMENT_NODE ? node as HTMLElement : node?.parentElement;
        if (el) {
          const computed = window.getComputedStyle(el);
          const fs = parseInt(computed.fontSize, 10);
          setCurrentFontSize(fs || 16);
          const lh = parseFloat(computed.lineHeight);
          setCurrentLineHeight(fs > 0 && !isNaN(lh) ? lh / fs : 1.5);
        }
      }
    } catch { /* ignore */ }

    setActiveFormats(formats);
  }, []);

  const saveToHistory = useCallback(() => {
    if (!editorRef.current) return;
    const html = editorRef.current.innerHTML;
    historyStack.current = historyStack.current.slice(0, historyIndex.current + 1);
    historyStack.current.push(html);
    if (historyStack.current.length > config.maxHistorySize) {
      historyStack.current.shift();
    }
    historyIndex.current = historyStack.current.length - 1;
  }, [config.maxHistorySize]);

  // ── Commands ────────────────────────────────────────────────────────

  const undo = useCallback(() => {
    if (historyIndex.current > 0) {
      historyIndex.current--;
      if (editorRef.current) {
        editorRef.current.innerHTML = historyStack.current[historyIndex.current];
        lastHtmlRef.current = editorRef.current.innerHTML;
        updateMetrics();
        const text = editorRef.current.innerText || '';
        const words = text.trim().split(/\s+/).filter(w => w.length > 0);
        onChangeRef.current?.(editorRef.current.innerHTML, text, words.length);
      }
    }
  }, [updateMetrics]);

  const redo = useCallback(() => {
    if (historyIndex.current < historyStack.current.length - 1) {
      historyIndex.current++;
      if (editorRef.current) {
        editorRef.current.innerHTML = historyStack.current[historyIndex.current];
        lastHtmlRef.current = editorRef.current.innerHTML;
        updateMetrics();
        const text = editorRef.current.innerText || '';
        const words = text.trim().split(/\s+/).filter(w => w.length > 0);
        onChangeRef.current?.(editorRef.current.innerHTML, text, words.length);
      }
    }
  }, [updateMetrics]);

  const executeCommand = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    setTimeout(() => { updateMetrics(); updateActiveFormats(); }, 0);
  }, [updateMetrics, updateActiveFormats]);

  // ── Effects ─────────────────────────────────────────────────────────

  // Draft key for localStorage
  useEffect(() => {
    draftKeyRef.current = `rte_draft_${typeof window !== 'undefined' ? window.location.pathname : 'default'}`;
  }, []);

  // Initialize content
  useEffect(() => {
    if (!editorRef.current) return;
    if (lastHtmlRef.current === content) return;
    if (initializedRef.current && content === undefined) return;

    editorRef.current.innerHTML = sanitizeHtml(content || '');
    lastHtmlRef.current = content;

    const text = editorRef.current.innerText || '';
    const words = text.trim().split(/\s+/).filter(w => w.length > 0);
    setWordCount(words.length);
    setCharCount(text.length);
    setReadingTime(Math.ceil(words.length / config.readingWpm));

    if (!initializedRef.current) {
      saveToHistory();
      initializedRef.current = true;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

  // Cleanup auto-save timer on unmount
  useEffect(() => {
    const timer = autoSaveTimer.current;
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, []);

  return {
    // Refs (shared with other hooks)
    editorRef,
    lastHtmlRef,
    onChangeRef,
    autoSaveTimer,
    draftKeyRef,

    // State
    wordCount,
    charCount,
    readingTime,
    activeFormats,
    contentLimitExceeded,
    currentFontSize,
    currentLineHeight,
    currentBlockType,
    setCurrentFontSize,
    setCurrentLineHeight,
    setCurrentBlockType,

    // Callbacks
    updateMetrics,
    updateActiveFormats,
    saveToHistory,
    undo,
    redo,
    executeCommand,
  };
}

export type EditorCoreReturn = ReturnType<typeof useEditorCore>;
