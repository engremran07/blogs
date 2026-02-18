/**
 * ============================================================================
 * COMPONENT: EditorContent
 * PURPOSE:   Renders the contentEditable area (or source view textarea),
 *            drag-drop overlay, and the floating image context toolbar.
 *            Owns image selection state internally.
 * ============================================================================
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import type { UseEditorReturn } from '../hooks/useEditor';
import {
  FormatAlignLeftIcon, FormatAlignCenterIcon,
  FormatAlignRightIcon, FormatAlignJustifyIcon,
  SpecialCharIcon, TrashIcon,
} from '../editor.icons';

interface EditorContentProps {
  editor: UseEditorReturn;
}

export default function EditorContent({ editor }: EditorContentProps) {
  const {
    editorRef, effectiveReadOnly,
    isDragging, handleInput, handlePaste,
    handleDragOver, handleDragLeave, handleDrop,
    isSourceView, sourceHtml, setSourceHtml,
    isFullscreen, placeholder, minHeight, maxHeight,
    changeImageAlignment, changeImageSize,
    toggleImageCaption, deleteSelectedImage,
  } = editor;

  // ── Image toolbar state (local) ─────────────────────────────────────
  const [selectedImage, setSelectedImage] = useState<HTMLElement | null>(null);
  const [imageToolbarPos, setImageToolbarPos] = useState<{ top: number; left: number } | null>(null);

  const handleImageClick = useCallback((e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'IMG' && editorRef.current?.contains(target)) {
      e.preventDefault();
      e.stopPropagation();
      setSelectedImage(target);
      const rect = target.getBoundingClientRect();
      const editorRect = editorRef.current!.getBoundingClientRect();
      setImageToolbarPos({
        top: rect.top - editorRect.top - 44,
        left: rect.left - editorRect.left + rect.width / 2,
      });
    } else if (!target.closest('.image-context-toolbar')) {
      setSelectedImage(null);
      setImageToolbarPos(null);
    }
  }, [editorRef]);

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    el.addEventListener('click', handleImageClick);
    return () => { el.removeEventListener('click', handleImageClick); };
  }, [handleImageClick, editorRef]);

  // ── Render ──────────────────────────────────────────────────────────

  if (isSourceView) {
    return (
      <div className="source-view-wrapper" style={{ minHeight, maxHeight: isFullscreen ? '100vh' : maxHeight }}>
        <textarea
          value={sourceHtml}
          onChange={(e) => setSourceHtml(e.target.value)}
          className="source-view-textarea"
          spellCheck={false}
          placeholder="Edit HTML source..."
          aria-label="HTML source code"
        />
      </div>
    );
  }

  return (
    <div
      className={`editor-content-wrapper ${isDragging ? 'drag-active' : ''}`}
      style={{ minHeight, maxHeight: isFullscreen ? '100vh' : maxHeight, position: 'relative' }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="drag-overlay"><p>Drop image here</p></div>
      )}

      {/* Image Context Toolbar */}
      {selectedImage && imageToolbarPos && (
        <div
          className="image-context-toolbar"
          role="toolbar"
          aria-label="Image options"
          style={{ top: `${Math.max(0, imageToolbarPos.top)}px`, left: `${imageToolbarPos.left}px` }}
        >
          <div className="ict-group">
            <button type="button" onClick={() => { changeImageAlignment(selectedImage, 'left'); }} className="ict-btn" title="Float Left" aria-label="Align image left"><FormatAlignLeftIcon size={14} /></button>
            <button type="button" onClick={() => { changeImageAlignment(selectedImage, 'center'); }} className="ict-btn" title="Center" aria-label="Align image center"><FormatAlignCenterIcon size={14} /></button>
            <button type="button" onClick={() => { changeImageAlignment(selectedImage, 'right'); }} className="ict-btn" title="Float Right" aria-label="Align image right"><FormatAlignRightIcon size={14} /></button>
            <button type="button" onClick={() => { changeImageAlignment(selectedImage, 'full'); }} className="ict-btn" title="Full Width" aria-label="Full width image"><FormatAlignJustifyIcon size={14} /></button>
          </div>
          <div className="ict-divider" />
          <div className="ict-group">
            <button type="button" onClick={() => { changeImageSize(selectedImage, 'small'); }} className="ict-btn ict-text-btn" title="Small (25%)" aria-label="Small image (25%)">S</button>
            <button type="button" onClick={() => { changeImageSize(selectedImage, 'medium'); }} className="ict-btn ict-text-btn" title="Medium (50%)" aria-label="Medium image (50%)">M</button>
            <button type="button" onClick={() => { changeImageSize(selectedImage, 'large'); }} className="ict-btn ict-text-btn" title="Large (75%)" aria-label="Large image (75%)">L</button>
            <button type="button" onClick={() => { changeImageSize(selectedImage, 'full'); }} className="ict-btn ict-text-btn" title="Full (100%)" aria-label="Full size image (100%)">F</button>
          </div>
          <div className="ict-divider" />
          <button type="button" onClick={() => { toggleImageCaption(selectedImage); }} className="ict-btn" title="Toggle Caption" aria-label="Toggle image caption"><SpecialCharIcon size={14} /></button>
          <button type="button" onClick={() => { deleteSelectedImage(selectedImage); setSelectedImage(null); setImageToolbarPos(null); }} className="ict-btn ict-delete" title="Delete Image" aria-label="Delete image"><TrashIcon size={14} /></button>
        </div>
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
        role="textbox"
        aria-multiline="true"
        aria-label="Rich text editor"
      />
    </div>
  );
}
