/**
 * ============================================================================
 * COMPONENT: EditorToolbar
 * PURPOSE:   Renders all toolbar groups (formatting, headings, lists,
 *            alignment, insertions, utilities, status bar).
 *            Owns dropdown visibility state for font size, line height,
 *            block type, and block inserter menus.
 * ============================================================================
 */

'use client';

import { useState, useEffect } from 'react';
import type { UseEditorReturn } from '../hooks/useEditor';
import {
  FONT_SIZE_PRESETS,
  LINE_HEIGHT_PRESETS,
  SPECIAL_CHARS,
  BLOCK_TYPE_OPTIONS,
} from '../../server/constants';
import {
  UndoIcon, RedoIcon,
  FormatBoldIcon, FormatItalicIcon, FormatUnderlinedIcon, StrikethroughSIcon,
  SuperscriptIcon, SubscriptIcon, InlineCodeIcon,
  LooksOneIcon, LooksTwoIcon, Looks3Icon,
  FormatListBulletedIcon, FormatListNumberedIcon, ChecklistRtlIcon, FormatQuoteIcon,
  FormatAlignLeftIcon, FormatAlignCenterIcon, FormatAlignRightIcon, FormatAlignJustifyIcon,
  IndentIcon, OutdentIcon,
  LinkIcon, UnlinkIcon, ImageOutlinedIcon, VideocamOutlinedIcon, TableChartIcon,
  CodeIcon, PaletteOutlinedIcon, RemoveIcon,
  FullscreenIcon, FullscreenExitIcon,
  ClearFormattingIcon, HighlighterIcon,
  FindReplaceIcon, SourceCodeIcon, EmojiIcon, SpecialCharIcon, PrintIcon, TocIcon,
  DropdownIcon,
  PlusIcon, InfoIcon, WarningIcon, SuccessIcon, ErrorIcon,
  CollapsibleIcon, ColumnsIcon, PullQuoteIcon,
} from '../editor.icons';

interface EditorToolbarProps {
  editor: UseEditorReturn;
}

export default function EditorToolbar({ editor }: EditorToolbarProps) {
  const {
    config: a, effectiveReadOnly,
    activeFormats,
    currentFontSize, currentLineHeight, currentBlockType,
    undo, redo, executeCommand,
    toggleFormat, setHeading, setAlignment,
    insertInlineCode, removeLink, clearFormatting, applyHighlight,
    setFontSize, setLineHeight, setBlockType,
    insertBlockquote, insertCodeBlock, insertHorizontalRule, insertTaskList,
    insertCallout, insertCollapsible, insertPullQuote, insertColumns,
    insertStyledSeparator, insertCodeBlockWithLang,
    insertSpecialChar, insertEmoji,
    doToggleSourceView, generateToc, handlePrint, toggleFullscreen,
    // Dialog openers
    setShowLinkDialog, setShowImageDialog, setShowVideoDialog,
    setShowColorPicker, setShowTableDialog,
    // Pickers
    showEmojiPicker, setShowEmojiPicker,
    showSpecialChars, setShowSpecialChars,
    selectedColor,
    // Mode state
    isFullscreen, isSourceView,
    showFindReplace, setShowFindReplace,
    // Metrics
    wordCount, charCount, readingTime, contentLimitExceeded,
  } = editor;

  // ── Toolbar-local dropdown state ────────────────────────────────────
  const [showFontSizeDropdown, setShowFontSizeDropdown] = useState(false);
  const [showLineHeightDropdown, setShowLineHeightDropdown] = useState(false);
  const [showBlockTypeDropdown, setShowBlockTypeDropdown] = useState(false);
  const [showBlockMenu, setShowBlockMenu] = useState(false);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.dropdown-container')) {
        setShowFontSizeDropdown(false);
        setShowLineHeightDropdown(false);
        setShowBlockTypeDropdown(false);
        setShowBlockMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => { document.removeEventListener('mousedown', handleClickOutside); };
  }, []);

  return (
    <div className="editor-toolbar" role="toolbar" aria-label="Text formatting options" aria-orientation="horizontal">

      {/* ── Undo / Redo ── */}
      {a.enableUndoRedo && (
      <div className="toolbar-group">
        <button type="button" onClick={undo} className="toolbar-btn" title="Undo (Ctrl+Z)" disabled={effectiveReadOnly}><UndoIcon size={18} /></button>
        <button type="button" onClick={redo} className="toolbar-btn" title="Redo (Ctrl+Y)" disabled={effectiveReadOnly}><RedoIcon size={18} /></button>
      </div>
      )}
      {a.enableUndoRedo && <div className="toolbar-divider" />}

      {/* ── Block Type Dropdown ── */}
      {a.enableBlockTypeDropdown && (
      <div className="toolbar-group dropdown-container" style={{ position: 'relative' }}>
        <button type="button" onClick={() => setShowBlockTypeDropdown(p => !p)} className="toolbar-btn toolbar-dropdown-btn" title="Block Type" disabled={effectiveReadOnly}>
          <span className="dropdown-label">{BLOCK_TYPE_OPTIONS.find(o => o.value === currentBlockType)?.label ?? 'Paragraph'}</span>
          <DropdownIcon size={14} />
        </button>
        {showBlockTypeDropdown && (
          <div className="toolbar-dropdown">
            {BLOCK_TYPE_OPTIONS.map(opt => (
              <button key={opt.value} type="button" onClick={() => { setBlockType(opt.value); setShowBlockTypeDropdown(false); }} className={`toolbar-dropdown-item ${currentBlockType === opt.value ? 'active' : ''}`}>{opt.label}</button>
            ))}
          </div>
        )}
      </div>
      )}
      {a.enableBlockTypeDropdown && <div className="toolbar-divider" />}

      {/* ── Font Size Dropdown ── */}
      {a.enableFontSize && (
      <div className="toolbar-group dropdown-container" style={{ position: 'relative' }}>
        <button type="button" onClick={() => setShowFontSizeDropdown(p => !p)} className="toolbar-btn toolbar-dropdown-btn" title="Font Size" disabled={effectiveReadOnly}>
          <span className="dropdown-label">{currentFontSize}px</span>
          <DropdownIcon size={14} />
        </button>
        {showFontSizeDropdown && (
          <div className="toolbar-dropdown">
            {(a.fontSizePresets ?? [...FONT_SIZE_PRESETS]).map(size => (
              <button key={size} type="button" onClick={() => { setFontSize(size); setShowFontSizeDropdown(false); }} className={`toolbar-dropdown-item ${currentFontSize === size ? 'active' : ''}`}>{size}px</button>
            ))}
          </div>
        )}
      </div>
      )}

      {/* ── Line Height Dropdown ── */}
      {a.enableLineHeight && (
      <div className="toolbar-group dropdown-container" style={{ position: 'relative' }}>
        <button type="button" onClick={() => setShowLineHeightDropdown(p => !p)} className="toolbar-btn toolbar-dropdown-btn" title="Line Height" disabled={effectiveReadOnly}>
          <span className="dropdown-label">{currentLineHeight}x</span>
          <DropdownIcon size={14} />
        </button>
        {showLineHeightDropdown && (
          <div className="toolbar-dropdown">
            {(a.lineHeightPresets ?? [...LINE_HEIGHT_PRESETS]).map(lh => (
              <button key={lh} type="button" onClick={() => { setLineHeight(lh); setShowLineHeightDropdown(false); }} className={`toolbar-dropdown-item ${currentLineHeight === lh ? 'active' : ''}`}>{lh}x</button>
            ))}
          </div>
        )}
      </div>
      )}
      {(a.enableFontSize || a.enableLineHeight) && <div className="toolbar-divider" />}

      {/* ── Inline Formatting ── */}
      {(a.enableBold || a.enableItalic || a.enableUnderline || a.enableStrikethrough) && (
      <div className="toolbar-group">
        {a.enableBold && <button type="button" onClick={() => toggleFormat('bold')} className={`toolbar-btn ${activeFormats.has('bold') ? 'active' : ''}`} title="Bold (Ctrl+B)" disabled={effectiveReadOnly}><FormatBoldIcon size={18} /></button>}
        {a.enableItalic && <button type="button" onClick={() => toggleFormat('italic')} className={`toolbar-btn ${activeFormats.has('italic') ? 'active' : ''}`} title="Italic (Ctrl+I)" disabled={effectiveReadOnly}><FormatItalicIcon size={18} /></button>}
        {a.enableUnderline && <button type="button" onClick={() => toggleFormat('underline')} className={`toolbar-btn ${activeFormats.has('underline') ? 'active' : ''}`} title="Underline (Ctrl+U)" disabled={effectiveReadOnly}><FormatUnderlinedIcon size={18} /></button>}
        {a.enableStrikethrough && <button type="button" onClick={() => toggleFormat('strikeThrough')} className={`toolbar-btn ${activeFormats.has('strikeThrough') ? 'active' : ''}`} title="Strikethrough" disabled={effectiveReadOnly}><StrikethroughSIcon size={18} /></button>}
        {a.enableSuperscript && <button type="button" onClick={() => toggleFormat('superscript')} className={`toolbar-btn ${activeFormats.has('superscript') ? 'active' : ''}`} title="Superscript" disabled={effectiveReadOnly}><SuperscriptIcon size={18} /></button>}
        {a.enableSubscript && <button type="button" onClick={() => toggleFormat('subscript')} className={`toolbar-btn ${activeFormats.has('subscript') ? 'active' : ''}`} title="Subscript" disabled={effectiveReadOnly}><SubscriptIcon size={18} /></button>}
        {a.enableInlineCodeButton && <button type="button" onClick={insertInlineCode} className="toolbar-btn" title="Inline Code (Ctrl+Shift+E)" disabled={effectiveReadOnly}><InlineCodeIcon size={18} /></button>}
      </div>
      )}
      {(a.enableBold || a.enableItalic || a.enableUnderline || a.enableStrikethrough) && <div className="toolbar-divider" />}

      {/* ── Headings ── */}
      {a.enableHeadings && (
      <div className="toolbar-group">
        {a.allowedHeadingLevels.includes(1) && <button type="button" onClick={() => setHeading(1)} className={`toolbar-btn ${activeFormats.has('h1') ? 'active' : ''}`} title="Heading 1" disabled={effectiveReadOnly}><LooksOneIcon size={18} /></button>}
        {a.allowedHeadingLevels.includes(2) && <button type="button" onClick={() => setHeading(2)} className={`toolbar-btn ${activeFormats.has('h2') ? 'active' : ''}`} title="Heading 2" disabled={effectiveReadOnly}><LooksTwoIcon size={18} /></button>}
        {a.allowedHeadingLevels.includes(3) && <button type="button" onClick={() => setHeading(3)} className={`toolbar-btn ${activeFormats.has('h3') ? 'active' : ''}`} title="Heading 3" disabled={effectiveReadOnly}><Looks3Icon size={18} /></button>}
      </div>
      )}
      {a.enableHeadings && <div className="toolbar-divider" />}

      {/* ── Lists & Blockquotes ── */}
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

      {/* ── Indent / Outdent ── */}
      {a.enableIndentButtons && (
      <div className="toolbar-group">
        <button type="button" onClick={() => executeCommand('outdent')} className="toolbar-btn" title="Decrease Indent (Shift+Tab)" disabled={effectiveReadOnly}><OutdentIcon size={18} /></button>
        <button type="button" onClick={() => executeCommand('indent')} className="toolbar-btn" title="Increase Indent (Tab)" disabled={effectiveReadOnly}><IndentIcon size={18} /></button>
      </div>
      )}
      {a.enableIndentButtons && <div className="toolbar-divider" />}

      {/* ── Alignment ── */}
      {a.enableAlignment && (
      <div className="toolbar-group">
        <button type="button" onClick={() => setAlignment('left')} className={`toolbar-btn ${activeFormats.has('justifyLeft') ? 'active' : ''}`} title="Align Left" disabled={effectiveReadOnly}><FormatAlignLeftIcon size={18} /></button>
        <button type="button" onClick={() => setAlignment('center')} className={`toolbar-btn ${activeFormats.has('justifyCenter') ? 'active' : ''}`} title="Align Center" disabled={effectiveReadOnly}><FormatAlignCenterIcon size={18} /></button>
        <button type="button" onClick={() => setAlignment('right')} className={`toolbar-btn ${activeFormats.has('justifyRight') ? 'active' : ''}`} title="Align Right" disabled={effectiveReadOnly}><FormatAlignRightIcon size={18} /></button>
        <button type="button" onClick={() => setAlignment('justify')} className={`toolbar-btn ${activeFormats.has('justifyFull') ? 'active' : ''}`} title="Justify" disabled={effectiveReadOnly}><FormatAlignJustifyIcon size={18} /></button>
      </div>
      )}
      {a.enableAlignment && <div className="toolbar-divider" />}

      {/* ── Insert: Link, Unlink, Image, Video, Table ── */}
      {(a.enableLinks || a.enableImages || a.enableVideoEmbeds || a.enableTables) && (
      <div className="toolbar-group">
        {a.enableLinks && <button type="button" onClick={() => setShowLinkDialog(true)} className="toolbar-btn" title="Insert Link (Ctrl+K)" disabled={effectiveReadOnly}><LinkIcon size={18} /></button>}
        {a.enableRemoveLink && <button type="button" onClick={removeLink} className="toolbar-btn" title="Remove Link" disabled={effectiveReadOnly}><UnlinkIcon size={18} /></button>}
        {a.enableImages && <button type="button" onClick={() => setShowImageDialog(true)} className="toolbar-btn" title="Insert Image" disabled={effectiveReadOnly}><ImageOutlinedIcon size={18} /></button>}
        {a.enableVideoEmbeds && <button type="button" onClick={() => setShowVideoDialog(true)} className="toolbar-btn" title="Embed Video" disabled={effectiveReadOnly}><VideocamOutlinedIcon size={18} /></button>}
        {a.enableTables && <button type="button" onClick={() => setShowTableDialog(true)} className="toolbar-btn" title="Insert Table" disabled={effectiveReadOnly}><TableChartIcon size={18} /></button>}
      </div>
      )}
      {(a.enableLinks || a.enableImages || a.enableVideoEmbeds || a.enableTables) && <div className="toolbar-divider" />}

      {/* ── Code, Color, HR ── */}
      {(a.enableCodeBlocks || a.enableTextColor || a.enableHorizontalRule) && (
      <div className="toolbar-group">
        {a.enableCodeBlocks && <button type="button" onClick={insertCodeBlock} className="toolbar-btn" title="Code Block" disabled={effectiveReadOnly}><CodeIcon size={18} /></button>}
        {(a.enableTextColor || a.enableBackgroundColor) && (
          <button type="button" onClick={() => setShowColorPicker(true)} className="toolbar-btn" title="Text Color" disabled={effectiveReadOnly} style={{ borderBottom: `3px solid ${selectedColor}` }}>
            <PaletteOutlinedIcon size={18} />
          </button>
        )}
        {a.enableHorizontalRule && <button type="button" onClick={insertHorizontalRule} className="toolbar-btn" title="Horizontal Rule" disabled={effectiveReadOnly}><RemoveIcon size={18} /></button>}
      </div>
      )}
      {(a.enableCodeBlocks || a.enableTextColor || a.enableHorizontalRule) && <div className="toolbar-divider" />}

      {/* ── Clear Formatting ── */}
      {a.enableClearFormatting && (
      <div className="toolbar-group">
        <button type="button" onClick={clearFormatting} className="toolbar-btn" title="Clear Formatting" disabled={effectiveReadOnly}><ClearFormattingIcon size={18} /></button>
        <button type="button" onClick={applyHighlight} className="toolbar-btn" title="Highlight Text" disabled={effectiveReadOnly}><HighlighterIcon size={18} /></button>
      </div>
      )}

      {/* ── Emoji & Special Chars ── */}
      {(a.enableEmoji || a.enableSpecialChars) && (
      <div className="toolbar-group">
        {a.enableEmoji && (
          <div className="emoji-picker-container" style={{ position: 'relative' }}>
            <button type="button" onClick={() => { setShowEmojiPicker(p => !p); setShowSpecialChars(false); }} className="toolbar-btn" title="Insert Emoji" disabled={effectiveReadOnly}><EmojiIcon size={18} /></button>
            {showEmojiPicker && (
              <div className="toolbar-picker">
                {Object.entries(SPECIAL_CHARS).filter(([cat]) => cat === 'Emoji').map(([cat, chars]) => (
                  <div key={cat}>
                    <div className="picker-grid emoji-grid">
                      {chars.map(ch => (
                        <button key={ch} type="button" onClick={() => { insertEmoji(ch); setShowEmojiPicker(false); }} className="picker-item emoji-item" title={ch}>{ch}</button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {a.enableSpecialChars && (
          <div className="special-chars-container" style={{ position: 'relative' }}>
            <button type="button" onClick={() => { setShowSpecialChars(p => !p); setShowEmojiPicker(false); }} className="toolbar-btn" title="Special Characters" disabled={effectiveReadOnly}><SpecialCharIcon size={18} /></button>
            {showSpecialChars && (
              <div className="toolbar-picker">
                {Object.entries(SPECIAL_CHARS).filter(([cat]) => cat !== 'Emoji').map(([cat, chars]) => (
                  <div key={cat} className="picker-section">
                    <div className="picker-section-title">{cat}</div>
                    <div className="picker-grid">
                      {chars.map(ch => (
                        <button key={ch} type="button" onClick={() => { insertSpecialChar(ch); setShowSpecialChars(false); }} className="picker-item" title={ch}>{ch}</button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      )}

      {/* ── Content Block Inserter ── */}
      <div className="toolbar-group dropdown-container" style={{ position: 'relative' }}>
        <button type="button" onClick={() => setShowBlockMenu(p => !p)} className={`toolbar-btn ${showBlockMenu ? 'active' : ''}`} title="Insert Content Block" disabled={effectiveReadOnly}>
          <PlusIcon size={18} />
          <DropdownIcon size={14} />
        </button>
        {showBlockMenu && (
          <div className="toolbar-dropdown block-inserter-dropdown">
            <div className="block-inserter-section-title">Content Blocks</div>
            <button type="button" onClick={() => { insertCallout('info'); setShowBlockMenu(false); }} className="toolbar-dropdown-item block-item">
              <InfoIcon size={16} className="block-item-icon info" /> Info Callout
            </button>
            <button type="button" onClick={() => { insertCallout('warning'); setShowBlockMenu(false); }} className="toolbar-dropdown-item block-item">
              <WarningIcon size={16} className="block-item-icon warning" /> Warning Callout
            </button>
            <button type="button" onClick={() => { insertCallout('success'); setShowBlockMenu(false); }} className="toolbar-dropdown-item block-item">
              <SuccessIcon size={16} className="block-item-icon success" /> Success Callout
            </button>
            <button type="button" onClick={() => { insertCallout('error'); setShowBlockMenu(false); }} className="toolbar-dropdown-item block-item">
              <ErrorIcon size={16} className="block-item-icon error" /> Error Callout
            </button>
            <div className="block-inserter-divider" />
            <button type="button" onClick={() => { insertCollapsible(); setShowBlockMenu(false); }} className="toolbar-dropdown-item block-item">
              <CollapsibleIcon size={16} className="block-item-icon" /> Collapsible Section
            </button>
            <button type="button" onClick={() => { insertPullQuote(); setShowBlockMenu(false); }} className="toolbar-dropdown-item block-item">
              <PullQuoteIcon size={16} className="block-item-icon" /> Pull Quote
            </button>
            <button type="button" onClick={() => { insertColumns(); setShowBlockMenu(false); }} className="toolbar-dropdown-item block-item">
              <ColumnsIcon size={16} className="block-item-icon" /> Two Columns
            </button>
            <button type="button" onClick={() => { insertStyledSeparator(); setShowBlockMenu(false); }} className="toolbar-dropdown-item block-item">
              <RemoveIcon size={16} className="block-item-icon" /> Styled Separator
            </button>
            <div className="block-inserter-divider" />
            <div className="block-inserter-section-title">Code Blocks</div>
            {['javascript', 'typescript', 'python', 'html', 'css', 'bash', 'sql'].map(lang => (
              <button key={lang} type="button" onClick={() => { insertCodeBlockWithLang(lang); setShowBlockMenu(false); }} className="toolbar-dropdown-item block-item">
                <CodeIcon size={16} className="block-item-icon" /> {lang.charAt(0).toUpperCase() + lang.slice(1)}
                {lang === 'bash' && '/Shell'}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="toolbar-divider" />

      {/* ── Utilities: Find/Replace, Source, TOC, Print ── */}
      <div className="toolbar-group">
        {a.enableFindReplace && <button type="button" onClick={() => setShowFindReplace(p => !p)} className={`toolbar-btn ${showFindReplace ? 'active' : ''}`} title="Find & Replace (Ctrl+Shift+H)" disabled={effectiveReadOnly}><FindReplaceIcon size={18} /></button>}
        {a.enableSourceView && <button type="button" onClick={doToggleSourceView} className={`toolbar-btn ${isSourceView ? 'active' : ''}`} title="Source View (Ctrl+Shift+U)"><SourceCodeIcon size={18} /></button>}
        {a.enableTableOfContents && <button type="button" onClick={generateToc} className="toolbar-btn" title="Generate Table of Contents" disabled={effectiveReadOnly}><TocIcon size={18} /></button>}
        {a.enablePrint && <button type="button" onClick={handlePrint} className="toolbar-btn" title="Print (Ctrl+P)"><PrintIcon size={18} /></button>}
      </div>
      <div className="toolbar-divider" />

      {/* ── Fullscreen ── */}
      {a.enableFullscreen && (
      <div className="toolbar-group">
        <button type="button" onClick={toggleFullscreen} className="toolbar-btn" title="Toggle Fullscreen">
          {isFullscreen ? <FullscreenExitIcon size={18} /> : <FullscreenIcon size={18} />}
        </button>
      </div>
      )}

      {/* ── Status bar ── */}
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
  );
}
