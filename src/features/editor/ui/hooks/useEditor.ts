/**
 * ============================================================================
 * HOOK:     useEditor
 * PURPOSE:  Composition hook — wires core, input, and actions together.
 *           Manages mode state (fullscreen, source view, find/replace),
 *           dialog visibility, keyboard shortcuts, and global effects.
 * ============================================================================
 */

'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { RichTextEditorProps } from '../../types';
import { mergeAdminSettings } from '../editor.config';
import { useEditorCore } from './useEditorCore';
import { useEditorInput } from './useEditorInput';
import { useEditorActions } from './useEditorActions';

export function useEditor(props: RichTextEditorProps) {
  const {
    content = '',
    onChange,
    onImageUpload,
    placeholder = 'Start writing your content here...',
    minHeight = '300px',
    maxHeight = '600px',
    className = '',
    readOnly = false,
    adminSettings,
  } = props;

  // ── Resolved config ─────────────────────────────────────────────────
  const config = useMemo(() => mergeAdminSettings(adminSettings), [adminSettings]);
  const effectiveReadOnly = readOnly || !config.editorEnabled;

  // ── Core hook ───────────────────────────────────────────────────────
  const core = useEditorCore(config, content, onChange);

  // ── Input hook ──────────────────────────────────────────────────────
  const input = useEditorInput({
    editorRef: core.editorRef,
    lastHtmlRef: core.lastHtmlRef,
    onChangeRef: core.onChangeRef,
    autoSaveTimer: core.autoSaveTimer,
    draftKeyRef: core.draftKeyRef,
    config,
    saveToHistory: core.saveToHistory,
    updateMetrics: core.updateMetrics,
    updateActiveFormats: core.updateActiveFormats,
    onImageUpload,
  });

  // ── Actions hook ────────────────────────────────────────────────────
  const actions = useEditorActions({
    editorRef: core.editorRef,
    config,
    executeCommand: core.executeCommand,
    updateMetrics: core.updateMetrics,
    updateActiveFormats: core.updateActiveFormats,
    saveToHistory: core.saveToHistory,
    handleInput: input.handleInput,
    onChangeRef: core.onChangeRef,
    onImageUpload,
    setCurrentFontSize: core.setCurrentFontSize,
    setCurrentLineHeight: core.setCurrentLineHeight,
    setCurrentBlockType: core.setCurrentBlockType,
  });

  // ── Mode state ──────────────────────────────────────────────────────
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSourceView, setIsSourceView] = useState(false);
  const [sourceHtml, setSourceHtml] = useState('');
  const [showFindReplace, setShowFindReplace] = useState(false);

  // ── Dialog visibility ───────────────────────────────────────────────
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [showVideoDialog, setShowVideoDialog] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showTableDialog, setShowTableDialog] = useState(false);

  // ── Emoji & special char pickers ────────────────────────────────────
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showSpecialChars, setShowSpecialChars] = useState(false);

  // ── Selected color (shared between toolbar indicator & dialog) ─────
  const [selectedColor, setSelectedColor] = useState(config.defaultTextColor);

  // ── Phase 3: Competitive feature state (TODO — implementation pending)
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
  const slashMenuRef = useRef<HTMLDivElement>(null);

  // ── Convenience wrappers ────────────────────────────────────────────

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);

  const doToggleSourceView = useCallback(() => {
    actions.toggleSourceView(isSourceView, sourceHtml, setIsSourceView, setSourceHtml);
  }, [actions, isSourceView, sourceHtml]);

  // ── Effects ─────────────────────────────────────────────────────────

  // Task list checkbox clicks
  useEffect(() => {
    const el = core.editorRef.current;
    if (!el) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' && target.getAttribute('type') === 'checkbox') {
        const checkbox = target as HTMLInputElement;
        checkbox.checked = !checkbox.checked;
        if (checkbox.checked) {
          checkbox.setAttribute('checked', '');
        } else {
          checkbox.removeAttribute('checked');
        }
        const li = checkbox.closest('li');
        if (li) {
          li.style.textDecoration = checkbox.checked ? 'line-through' : 'none';
          li.style.opacity = checkbox.checked ? '0.6' : '1';
        }
        core.saveToHistory();
        const text = el.innerText || '';
        const words = text.trim().split(/\s+/).filter(w => w.length > 0);
        core.onChangeRef.current?.(el.innerHTML, text, words.length);
        e.preventDefault();
      }
    };
    el.addEventListener('click', handleClick);
    return () => { el.removeEventListener('click', handleClick); };
  }, [core]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.emoji-picker-container') && !target.closest('.toolbar-btn')) {
        setShowEmojiPicker(false);
      }
      if (!target.closest('.special-chars-container') && !target.closest('.toolbar-btn')) {
        setShowSpecialChars(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => { document.removeEventListener('mousedown', handleClickOutside); };
  }, []);

  // Keyboard shortcuts & selection change
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showFindReplace) { setShowFindReplace(false); e.preventDefault(); return; }
        if (showLinkDialog) { setShowLinkDialog(false); e.preventDefault(); return; }
        if (showImageDialog) { setShowImageDialog(false); e.preventDefault(); return; }
        if (showVideoDialog) { setShowVideoDialog(false); e.preventDefault(); return; }
        if (showColorPicker) { setShowColorPicker(false); e.preventDefault(); return; }
        if (showTableDialog) { setShowTableDialog(false); e.preventDefault(); return; }
        if (showEmojiPicker) { setShowEmojiPicker(false); e.preventDefault(); return; }
        if (showSpecialChars) { setShowSpecialChars(false); e.preventDefault(); return; }
        if (isFullscreen) { setIsFullscreen(false); e.preventDefault(); return; }
      }

      if (e.ctrlKey || e.metaKey) {
        const key = e.key.toLowerCase();
        const shift = e.shiftKey;

        if (!shift && key === 'z') { e.preventDefault(); core.undo(); }
        else if ((shift && key === 'z') || key === 'y') { e.preventDefault(); core.redo(); }
        else if (key === 'k') { e.preventDefault(); setShowLinkDialog(true); }
        else if (key === 'p') { e.preventDefault(); actions.handlePrint(); }
        else if (shift && key === 'e') { e.preventDefault(); actions.insertInlineCode(); }
        else if (key === 'h' && shift) { e.preventDefault(); setShowFindReplace(prev => !prev); }
        else if (key === 'u' && shift) { e.preventDefault(); doToggleSourceView(); }
      }

      if (e.key === 'Tab' && core.editorRef.current?.contains(document.activeElement)) {
        e.preventDefault();
        document.execCommand(e.shiftKey ? 'outdent' : 'indent');
      }
    };

    const handleSelectionChange = () => {
      if (core.editorRef.current?.contains(document.activeElement)) {
        core.updateActiveFormats();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [
    core, actions, doToggleSourceView,
    showLinkDialog, showImageDialog, showVideoDialog,
    showColorPicker, showTableDialog, showEmojiPicker,
    showSpecialChars, showFindReplace, isFullscreen,
  ]);

  // ── Return everything the UI needs ──────────────────────────────────

  return {
    // Config
    config,
    effectiveReadOnly,

    // Props pass-through
    placeholder,
    minHeight,
    maxHeight,
    className,

    // Core state
    editorRef: core.editorRef,
    wordCount: core.wordCount,
    charCount: core.charCount,
    readingTime: core.readingTime,
    activeFormats: core.activeFormats,
    contentLimitExceeded: core.contentLimitExceeded,
    currentFontSize: core.currentFontSize,
    currentLineHeight: core.currentLineHeight,
    currentBlockType: core.currentBlockType,

    // Core commands
    undo: core.undo,
    redo: core.redo,
    executeCommand: core.executeCommand,

    // Input
    isDragging: input.isDragging,
    handleInput: input.handleInput,
    handlePaste: input.handlePaste,
    handleDragOver: input.handleDragOver,
    handleDragLeave: input.handleDragLeave,
    handleDrop: input.handleDrop,

    // All actions
    ...actions,

    // Mode state
    isFullscreen,
    setIsFullscreen,
    toggleFullscreen,
    isSourceView,
    sourceHtml,
    setSourceHtml,
    doToggleSourceView,
    showFindReplace,
    setShowFindReplace,

    // Dialog visibility
    showLinkDialog, setShowLinkDialog,
    showImageDialog, setShowImageDialog,
    showVideoDialog, setShowVideoDialog,
    showColorPicker, setShowColorPicker,
    showTableDialog, setShowTableDialog,

    // Pickers
    showEmojiPicker, setShowEmojiPicker,
    showSpecialChars, setShowSpecialChars,
    selectedColor, setSelectedColor,

    // Image upload handler
    onImageUpload,

    // Phase 3 state (exposed for future use)
    phase3: {
      showSlashMenu, setShowSlashMenu,
      slashMenuPos, setSlashMenuPos,
      slashFilter, setSlashFilter,
      showCaseMenu, setShowCaseMenu,
      isFormatPainting, setIsFormatPainting,
      savedFormat, setSavedFormat,
      showShortcutsHelp, setShowShortcutsHelp,
      isFocusMode, setIsFocusMode,
      showTemplateMenu, setShowTemplateMenu,
      autoSaveStatus, setAutoSaveStatus,
      showEmbedDialog, setShowEmbedDialog,
      embedUrl, setEmbedUrl,
      showAdDialog, setShowAdDialog,
      adSlotType, setAdSlotType,
      adSlotId, setAdSlotId,
      seoReadability, setSeoReadability,
      showBookmarkDialog, setShowBookmarkDialog,
      bookmarkUrl, setBookmarkUrl,
      showAnchorDialog, setShowAnchorDialog,
      anchorId, setAnchorId,
      slashMenuRef,
    },
  };
}

/** Type of the full editor handle returned by useEditor. */
export type UseEditorReturn = ReturnType<typeof useEditor>;
