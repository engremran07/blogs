/**
 * ============================================================================
 * HOOK:     useEditorActions
 * PURPOSE:  All editor action callbacks — formatting, insertions, content
 *           blocks, image toolbar, and utility functions.
 *           Callbacks are parameterised so they don't own dialog state.
 * ============================================================================
 */

import { useCallback, type RefObject, type MutableRefObject } from 'react';
import type { MergedEditorConfig } from '../editor.config';
import { sanitizeHtml, escapeHtml, escapeAttr, logger } from '../../utils';

export interface UseEditorActionsDeps {
  editorRef: RefObject<HTMLDivElement | null>;
  config: MergedEditorConfig;
  executeCommand: (cmd: string, val?: string) => void;
  updateMetrics: () => void;
  updateActiveFormats: () => void;
  saveToHistory: () => void;
  handleInput: () => void;
  onChangeRef: MutableRefObject<((html: string, text: string, wordCount: number) => void) | undefined>;
  onImageUpload?: (file: File) => Promise<string>;
  setCurrentFontSize: (n: number) => void;
  setCurrentLineHeight: (n: number) => void;
  setCurrentBlockType: (s: string) => void;
}

export function useEditorActions(deps: UseEditorActionsDeps) {
  const {
    editorRef, config,
    executeCommand, updateMetrics, updateActiveFormats,
    saveToHistory, handleInput, onChangeRef, onImageUpload,
    setCurrentFontSize, setCurrentLineHeight, setCurrentBlockType,
  } = deps;

  // ═══════════════════════════════════════════════════════════════════
  // ── Inline Formatting ─────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════

  const toggleFormat = useCallback((format: string) => {
    executeCommand(format);
  }, [executeCommand]);

  const setHeading = useCallback((level: number) => {
    executeCommand('formatBlock', `h${level}`);
  }, [executeCommand]);

  const setAlignment = useCallback((align: string) => {
    const commands: Record<string, string> = {
      left: 'justifyLeft', center: 'justifyCenter',
      right: 'justifyRight', justify: 'justifyFull',
    };
    executeCommand(commands[align]);
  }, [executeCommand]);

  const insertInlineCode = useCallback(() => {
    const sel = window.getSelection();
    if (sel && sel.toString()) {
      const safeCode = escapeHtml(sel.toString());
      document.execCommand('insertHTML', false, `<code>${safeCode}</code>`);
    } else {
      document.execCommand('insertHTML', false, '<code>code</code>');
    }
    editorRef.current?.focus();
    setTimeout(() => { updateMetrics(); updateActiveFormats(); }, 0);
  }, [editorRef, updateMetrics, updateActiveFormats]);

  const removeLink = useCallback(() => {
    executeCommand('unlink');
  }, [executeCommand]);

  const clearFormatting = useCallback(() => {
    executeCommand('removeFormat');
    executeCommand('formatBlock', 'p');
  }, [executeCommand]);

  const applyHighlight = useCallback(() => {
    const sel = window.getSelection();
    if (sel && sel.toString()) {
      const safeText = escapeHtml(sel.toString());
      document.execCommand('insertHTML', false, `<mark>${safeText}</mark>`);
    } else {
      document.execCommand('insertHTML', false, '<mark>highlighted text</mark>');
    }
    editorRef.current?.focus();
    setTimeout(() => { updateMetrics(); updateActiveFormats(); }, 0);
  }, [editorRef, updateMetrics, updateActiveFormats]);

  // ═══════════════════════════════════════════════════════════════════
  // ── Font Size / Line Height / Block Type ──────────────────────────
  // ═══════════════════════════════════════════════════════════════════

  const setFontSize = useCallback((size: number) => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (range.collapsed) {
      const span = document.createElement('span');
      span.style.fontSize = `${size}px`;
      span.textContent = '\u200B';
      range.insertNode(span);
      range.setStartAfter(span);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    } else {
      const span = document.createElement('span');
      span.style.fontSize = `${size}px`;
      span.appendChild(range.extractContents());
      range.insertNode(span);
      range.selectNodeContents(span);
      sel.removeAllRanges();
      sel.addRange(range);
    }
    setCurrentFontSize(size);
    editorRef.current?.focus();
    setTimeout(updateMetrics, 0);
  }, [editorRef, updateMetrics, setCurrentFontSize]);

  const setLineHeight = useCallback((lh: number) => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const node = sel.anchorNode;
    const el = node?.nodeType === Node.ELEMENT_NODE ? node as HTMLElement : node?.parentElement;
    const block = el?.closest('p, h1, h2, h3, h4, h5, h6, li, blockquote, pre, div');
    if (block && block instanceof HTMLElement) {
      block.style.lineHeight = String(lh);
    }
    setCurrentLineHeight(lh);
    editorRef.current?.focus();
    setTimeout(updateMetrics, 0);
  }, [editorRef, updateMetrics, setCurrentLineHeight]);

  const setBlockType = useCallback((type: string) => {
    executeCommand('formatBlock', type);
    setCurrentBlockType(type);
  }, [executeCommand, setCurrentBlockType]);

  // ═══════════════════════════════════════════════════════════════════
  // ── Insert Operations (parameterised) ─────────────────────────────
  // ═══════════════════════════════════════════════════════════════════

  const insertLink = useCallback((url: string, text?: string) => {
    if (!url) return;
    let trimmedUrl = url.trim();
    // Add protocol to bare domains
    if (!/^https?:\/\//i.test(trimmedUrl) && !/^mailto:/i.test(trimmedUrl) && !/^#/.test(trimmedUrl) && !/^\//.test(trimmedUrl)) {
      trimmedUrl = `https://${trimmedUrl}`;
    }
    if (/^\s*(?:javascript|data|vbscript)\s*:/i.test(trimmedUrl)) {
      logger.warn('Blocked dangerous URL protocol in link insertion');
      return;
    }
    if (text) {
      const safeUrl = escapeAttr(trimmedUrl);
      const safeText = escapeHtml(text);
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
  }, [executeCommand]);

  const insertImage = useCallback((
    url: string,
    alt?: string,
    caption?: string,
    alignment: string = 'center',
    size: string = 'large',
  ) => {
    if (!url) return;
    if (/^\s*(?:javascript|data|vbscript)\s*:/i.test(url.trim())) {
      logger.warn('Blocked dangerous URL protocol in image insertion');
      return;
    }
    const safeUrl = escapeAttr(url.trim());
    const safeAlt = escapeAttr(alt || 'Image');
    const safeCaption = caption ? escapeHtml(caption) : '';

    const sizeClass: Record<string, string> = {
      auto: 'img-auto', small: 'img-small', medium: 'img-medium',
      large: 'img-large', full: 'img-full',
    };
    const alignClass: Record<string, string> = {
      none: '', left: 'img-align-left', center: 'img-align-center',
      right: 'img-align-right', full: 'img-align-full',
    };

    const classes = [sizeClass[size] || 'img-large', alignClass[alignment] || 'img-align-center'].filter(Boolean).join(' ');
    let html: string;
    if (safeCaption) {
      html = `<figure class="editor-figure ${classes}"><img src="${safeUrl}" alt="${safeAlt}" loading="lazy" decoding="async" /><figcaption>${safeCaption}</figcaption></figure>`;
    } else {
      html = `<figure class="editor-figure ${classes}"><img src="${safeUrl}" alt="${safeAlt}" loading="lazy" decoding="async" /></figure>`;
    }
    executeCommand('insertHTML', html);
  }, [executeCommand]);

  const uploadAndInsertImage = useCallback(async (
    file: File,
    caption?: string,
    alignment: string = 'center',
    size: string = 'large',
  ) => {
    if (!onImageUpload) return;
    if (!config.allowedImageTypes.includes(file.type)) {
      logger.warn(`Image type "${file.type}" not allowed`);
      return;
    }
    if (file.size > config.maxImageSizeBytes) {
      logger.warn(`Image "${file.name}" exceeds max size (${config.maxImageSizeBytes} bytes)`);
      return;
    }

    const sel = window.getSelection();
    let savedRange: Range | null = null;
    if (sel && sel.rangeCount > 0) {
      savedRange = sel.getRangeAt(0).cloneRange();
    }

    try {
      const url = await onImageUpload(file);
      if (!url || /^\s*(?:javascript|data|vbscript)\s*:/i.test(url.trim())) {
        logger.warn('Image upload returned invalid URL');
        return;
      }
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
      const safeUrl = escapeAttr(url);
      const safeName = escapeAttr(file.name);
      const captionText = caption ? escapeHtml(caption) : '';
      const sizeClass = ({ auto: 'img-auto', small: 'img-small', medium: 'img-medium', large: 'img-large', full: 'img-full' } as Record<string, string>)[size] || 'img-large';
      const alignClass = ({ none: '', left: 'img-align-left', center: 'img-align-center', right: 'img-align-right', full: 'img-align-full' } as Record<string, string>)[alignment] || 'img-align-center';
      const classes = [sizeClass, alignClass].filter(Boolean).join(' ');
      let html: string;
      if (captionText) {
        html = `<figure class="editor-figure ${classes}"><img src="${safeUrl}" alt="${safeName}" loading="lazy" decoding="async" /><figcaption>${captionText}</figcaption></figure>`;
      } else {
        html = `<figure class="editor-figure ${classes}"><img src="${safeUrl}" alt="${safeName}" loading="lazy" decoding="async" /></figure>`;
      }
      document.execCommand('insertHTML', false, html);
    } catch (error) {
      logger.error('Image upload failed:', error);
    }
  }, [onImageUpload, config.allowedImageTypes, config.maxImageSizeBytes, editorRef]);

  const insertVideo = useCallback((url: string) => {
    if (!url) return;
    if (/^\s*(?:javascript|data|vbscript)\s*:/i.test(url.trim())) {
      logger.warn('Blocked dangerous URL protocol in video insertion');
      return;
    }
    const trimmedUrl = url.trim().toLowerCase();
    const providerPatterns: Record<string, RegExp> = {
      youtube: /(?:youtube\.com|youtu\.be)/,
      vimeo: /vimeo\.com/,
      twitter: /(?:twitter\.com|x\.com)/,
    };
    const isAllowed = config.allowedVideoProviders.some((provider) => {
      const pattern = providerPatterns[provider];
      return pattern ? pattern.test(trimmedUrl) : false;
    });
    if (!isAllowed) {
      logger.warn(`Video provider not allowed. Allowed: ${config.allowedVideoProviders.join(', ')}`);
      return;
    }

    let embedUrl = url.trim();
    const youtubeRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s]+)/;
    const ytMatch = url.match(youtubeRegex);
    if (ytMatch) {
      embedUrl = `https://www.youtube.com/embed/${encodeURIComponent(ytMatch[1])}`;
    }

    const vimeoRegex = /vimeo\.com\/(?:video\/)?(\d+)/;
    const vmMatch = url.match(vimeoRegex);
    if (vmMatch) {
      embedUrl = `https://player.vimeo.com/video/${encodeURIComponent(vmMatch[1])}`;
    }

    const safeUrl = escapeAttr(embedUrl);
    const videoHTML = `<div class="video-wrapper"><iframe src="${safeUrl}" title="Embedded video" allowfullscreen sandbox="allow-scripts allow-same-origin allow-presentation" loading="lazy" referrerpolicy="no-referrer"></iframe></div>`;
    executeCommand('insertHTML', videoHTML);
  }, [executeCommand, config.allowedVideoProviders]);

  const insertBlockquote = useCallback(() => {
    executeCommand('formatBlock', 'blockquote');
  }, [executeCommand]);

  const insertCodeBlock = useCallback(() => {
    executeCommand('insertHTML', '<pre><code>// Your code here\n</code></pre><p><br/></p>');
  }, [executeCommand]);

  const insertHorizontalRule = useCallback(() => {
    executeCommand('insertHorizontalRule');
  }, [executeCommand]);

  const applyColor = useCallback((type: 'text' | 'background', color: string) => {
    if (type === 'text') {
      executeCommand('foreColor', color);
    } else {
      executeCommand('backColor', color);
    }
  }, [executeCommand]);

  const insertTaskList = useCallback(() => {
    const html =
      '<ul style="list-style:none;padding-left:1.5em">' +
      '<li><input type="checkbox" style="margin-right:0.5em"/>Task item</li>' +
      '</ul>';
    executeCommand('insertHTML', html);
  }, [executeCommand]);

  const insertTable = useCallback((rows: number, cols: number) => {
    let tableHTML = '<table><thead><tr>';
    for (let j = 0; j < cols; j++) {
      tableHTML += `<th scope="col">Header ${j + 1}</th>`;
    }
    tableHTML += '</tr></thead><tbody>';
    for (let i = 1; i < rows; i++) {
      tableHTML += '<tr>';
      for (let j = 0; j < cols; j++) {
        tableHTML += `<td>Cell ${i}-${j + 1}</td>`;
      }
      tableHTML += '</tr>';
    }
    tableHTML += '</tbody></table>';
    executeCommand('insertHTML', tableHTML);
  }, [executeCommand]);

  // ═══════════════════════════════════════════════════════════════════
  // ── Content Block Insertions ──────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════

  const insertCallout = useCallback((type: 'info' | 'warning' | 'success' | 'error') => {
    const labels: Record<string, string> = { info: '💡 Info', warning: '⚠️ Warning', success: '✅ Success', error: '❌ Error' };
    const html = `<div class="callout callout-${type}" contenteditable="true"><strong>${labels[type]}</strong><p>Type your content here...</p></div><p><br/></p>`;
    executeCommand('insertHTML', html);
  }, [executeCommand]);

  const insertCollapsible = useCallback(() => {
    const html = `<details class="editor-details"><summary>Click to expand</summary><p>Hidden content goes here...</p></details><p><br/></p>`;
    executeCommand('insertHTML', html);
  }, [executeCommand]);

  const insertPullQuote = useCallback(() => {
    const html = `<blockquote class="pull-quote"><p>Your pull quote text here...</p><cite>— Attribution</cite></blockquote><p><br/></p>`;
    executeCommand('insertHTML', html);
  }, [executeCommand]);

  const insertColumns = useCallback(() => {
    const html = `<div class="editor-columns"><div class="editor-column"><p>Left column content...</p></div><div class="editor-column"><p>Right column content...</p></div></div><p><br/></p>`;
    executeCommand('insertHTML', html);
  }, [executeCommand]);

  const insertStyledSeparator = useCallback(() => {
    const html = `<div class="styled-separator"><span>✦</span></div><p><br/></p>`;
    executeCommand('insertHTML', html);
  }, [executeCommand]);

  const insertCodeBlockWithLang = useCallback((lang: string = 'javascript') => {
    const html = `<pre class="code-block" data-language="${escapeAttr(lang)}"><code>// ${escapeHtml(lang)} code here\n</code></pre><p><br/></p>`;
    executeCommand('insertHTML', html);
  }, [executeCommand]);

  // ═══════════════════════════════════════════════════════════════════
  // ── Image Context Toolbar Callbacks ───────────────────────────────
  // ═══════════════════════════════════════════════════════════════════

  const changeImageAlignment = useCallback((image: HTMLElement, align: string) => {
    const figure = image.closest('figure.editor-figure') || image.parentElement;
    if (figure && figure instanceof HTMLElement) {
      figure.className = figure.className
        .replace(/img-align-\w+/g, '')
        .trim() + ` img-align-${align}`;
    }
    saveToHistory();
    handleInput();
  }, [saveToHistory, handleInput]);

  const changeImageSize = useCallback((image: HTMLElement, size: string) => {
    const figure = image.closest('figure.editor-figure') || image.parentElement;
    if (figure && figure instanceof HTMLElement) {
      figure.className = figure.className
        .replace(/img-(auto|small|medium|large|full)/g, '')
        .trim() + ` img-${size}`;
    }
    saveToHistory();
    handleInput();
  }, [saveToHistory, handleInput]);

  const toggleImageCaption = useCallback((image: HTMLElement) => {
    const figure = image.closest('figure.editor-figure');
    if (!figure) return;
    let figcaption = figure.querySelector('figcaption');
    if (figcaption) {
      figcaption.remove();
    } else {
      figcaption = document.createElement('figcaption');
      figcaption.textContent = 'Add caption...';
      figcaption.setAttribute('contenteditable', 'true');
      figure.appendChild(figcaption);
      const range = document.createRange();
      range.selectNodeContents(figcaption);
      const sel = window.getSelection();
      if (sel) { sel.removeAllRanges(); sel.addRange(range); }
    }
    saveToHistory();
    handleInput();
  }, [saveToHistory, handleInput]);

  const deleteSelectedImage = useCallback((image: HTMLElement) => {
    const figure = image.closest('figure.editor-figure');
    if (figure) {
      figure.remove();
    } else {
      image.remove();
    }
    saveToHistory();
    handleInput();
  }, [saveToHistory, handleInput]);

  // ═══════════════════════════════════════════════════════════════════
  // ── Utility Functions ─────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════

  const toggleSourceView = useCallback((
    isSourceView: boolean,
    sourceHtml: string,
    setIsSourceView: (v: boolean) => void,
    setSourceHtml: (v: string) => void,
  ) => {
    if (!editorRef.current) return;
    if (!isSourceView) {
      setSourceHtml(editorRef.current.innerHTML);
      setIsSourceView(true);
    } else {
      const sanitized = sanitizeHtml(sourceHtml);
      editorRef.current.innerHTML = sanitized;
      editorRef.current.focus();
      saveToHistory();
      const text = editorRef.current.innerText || '';
      const words = text.trim().split(/\s+/).filter(w => w.length > 0);
      onChangeRef.current?.(sanitized, text, words.length);
      setIsSourceView(false);
      updateMetrics();
    }
  }, [editorRef, saveToHistory, updateMetrics, onChangeRef]);

  const handleFindReplace = useCallback((
    action: 'find' | 'replace' | 'replaceAll',
    findStr: string,
    replaceStr: string,
  ): number => {
    if (!editorRef.current || !findStr) return 0;

    const winFind = (window as unknown as { find?: (s: string, c: boolean, b: boolean, w: boolean) => boolean }).find;

    if (action === 'find') {
      const contentText = editorRef.current.innerText || '';
      const regex = new RegExp(findStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      const matches = contentText.match(regex);
      const count = matches?.length ?? 0;
      if (typeof winFind === 'function') {
        winFind(findStr, false, false, true);
      }
      return count;
    } else if (action === 'replace') {
      const sel = window.getSelection();
      if (sel && sel.toString().toLowerCase() === findStr.toLowerCase()) {
        document.execCommand('insertText', false, replaceStr);
        if (typeof winFind === 'function') {
          winFind(findStr, false, false, true);
        }
      } else {
        if (typeof winFind === 'function') {
          winFind(findStr, false, false, true);
        }
      }
      return 0;
    } else {
      // replaceAll — operates on text nodes only to avoid corrupting HTML markup
      const escaped = findStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'gi');
      const walker = document.createTreeWalker(
        editorRef.current, NodeFilter.SHOW_TEXT, null,
      );
      const textNodes: Text[] = [];
      while (walker.nextNode()) textNodes.push(walker.currentNode as Text);
      let replaced = 0;
      for (const node of textNodes) {
        if (regex.test(node.textContent || '')) {
          regex.lastIndex = 0;
          node.textContent = (node.textContent || '').replace(regex, replaceStr);
          replaced++;
        }
      }
      if (replaced > 0) {
        saveToHistory();
        const text = editorRef.current.innerText || '';
        const words = text.trim().split(/\s+/).filter(w => w.length > 0);
        onChangeRef.current?.(editorRef.current.innerHTML, text, words.length);
        updateMetrics();
      }
      return replaced;
    }
  }, [editorRef, saveToHistory, updateMetrics, onChangeRef]);

  const insertSpecialChar = useCallback((char: string) => {
    executeCommand('insertText', char);
  }, [executeCommand]);

  const insertEmoji = useCallback((emoji: string) => {
    executeCommand('insertText', emoji);
  }, [executeCommand]);

  const handlePrint = useCallback(() => {
    if (!editorRef.current) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html><head><title>Print</title>
      <style>
        body { font-family: Georgia, 'Times New Roman', serif; max-width: 800px; margin: 2em auto; padding: 1em; line-height: 1.6; color: #333; }
        img { max-width: 100%; height: auto; }
        table { border-collapse: collapse; width: 100%; margin: 1em 0; }
        th, td { border: 1px solid #ccc; padding: 0.5em; }
        pre { background: #f5f5f5; padding: 1em; overflow-x: auto; border-radius: 4px; }
        code { background: #f0f0f0; padding: 0.15em 0.3em; border-radius: 3px; font-size: 0.9em; }
        blockquote { border-left: 4px solid #3498db; margin-left: 0; padding-left: 1em; color: #555; }
        h1,h2,h3,h4,h5,h6 { color: #222; }
        hr { border: none; border-top: 1px solid #ddd; margin: 2em 0; }
      </style></head>
      <body>${editorRef.current.innerHTML}</body></html>
    `);
    printWindow.document.close();
    printWindow.print();
    printWindow.close();
  }, [editorRef]);

  const generateToc = useCallback(() => {
    if (!editorRef.current) return;
    const headings = editorRef.current.querySelectorAll('h1, h2, h3, h4, h5, h6');
    if (headings.length === 0) {
      logger.warn('No headings found to generate Table of Contents');
      return;
    }
    let tocHtml = '<nav class="toc" aria-label="Table of contents"><strong>Table of Contents</strong><ul>';
    headings.forEach((heading, i) => {
      const level = parseInt(heading.tagName.charAt(1), 10);
      const id = `heading-${i}`;
      heading.id = id;
      const indent = (level - 1) * 1.5;
      tocHtml += `<li style="margin-left:${indent}em"><a href="#${id}">${escapeHtml(heading.textContent || '')}</a></li>`;
    });
    tocHtml += '</ul></nav><hr/>';

    const sel = window.getSelection();
    if (sel && editorRef.current) {
      const range = document.createRange();
      range.setStart(editorRef.current, 0);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    }
    document.execCommand('insertHTML', false, tocHtml);
    saveToHistory();
    updateMetrics();
  }, [editorRef, saveToHistory, updateMetrics]);

  return {
    // Formatting
    toggleFormat,
    setHeading,
    setAlignment,
    insertInlineCode,
    removeLink,
    clearFormatting,
    applyHighlight,

    // Font / Line height / Block type
    setFontSize,
    setLineHeight,
    setBlockType,

    // Insert operations
    insertLink,
    insertImage,
    uploadAndInsertImage,
    insertVideo,
    insertBlockquote,
    insertCodeBlock,
    insertHorizontalRule,
    applyColor,
    insertTaskList,
    insertTable,

    // Content blocks
    insertCallout,
    insertCollapsible,
    insertPullQuote,
    insertColumns,
    insertStyledSeparator,
    insertCodeBlockWithLang,

    // Image toolbar
    changeImageAlignment,
    changeImageSize,
    toggleImageCaption,
    deleteSelectedImage,

    // Utilities
    toggleSourceView,
    handleFindReplace,
    insertSpecialChar,
    insertEmoji,
    handlePrint,
    generateToc,
  };
}

export type EditorActionsReturn = ReturnType<typeof useEditorActions>;
