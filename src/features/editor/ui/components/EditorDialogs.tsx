/**
 * ============================================================================
 * COMPONENT: EditorDialogs
 * PURPOSE:   All modal dialogs for the editor — Link, Image, Video,
 *            Color Picker, and Table. Each dialog manages its own
 *            form state internally and calls parameterised actions
 *            on submit.
 * ============================================================================
 */

'use client';

import { useState, type CSSProperties } from 'react';
import type { UseEditorReturn } from '../hooks/useEditor';
import {
  FormatAlignLeftIcon,
  FormatAlignCenterIcon,
  FormatAlignRightIcon,
  FormatAlignJustifyIcon,
} from '../editor.icons';

interface EditorDialogsProps {
  editor: UseEditorReturn;
}

// ═══════════════════════════════════════════════════════════════════════
// ── Link Dialog ─────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════

function LinkDialog({ onInsert, onClose }: {
  onInsert: (url: string, text?: string) => void;
  onClose: () => void;
}) {
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');

  return (
    <div className="editor-dialog-overlay" onClick={onClose} role="presentation">
      <div className="editor-dialog" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }} role="dialog" aria-modal="true" aria-label="Insert link">
        <h3 className="dialog-title">Insert Link</h3>
        <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com" className="dialog-input" autoFocus />
        <input type="text" value={text} onChange={(e) => setText(e.target.value)} placeholder="Link text (optional, uses selection if empty)" className="dialog-input" />
        <div className="dialog-actions">
          <button type="button" onClick={onClose} className="dialog-btn dialog-btn-cancel">Cancel</button>
          <button type="button" onClick={() => { onInsert(url, text || undefined); onClose(); }} className="dialog-btn dialog-btn-primary" disabled={!url}>Insert</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// ── Image Dialog ────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════

function ImageDialog({ config, onInsert, onUpload, onClose }: {
  config: UseEditorReturn['config'];
  onInsert: (url: string, alt?: string, caption?: string, alignment?: string, size?: string) => void;
  onUpload?: (file: File, caption?: string, alignment?: string, size?: string) => Promise<void>;
  onClose: () => void;
}) {
  const [url, setUrl] = useState('');
  const [alt, setAlt] = useState('');
  const [caption, setCaption] = useState('');
  const [alignment, setAlignment] = useState<'left' | 'center' | 'right' | 'full'>('center');
  const [size, setSize] = useState<'small' | 'medium' | 'large' | 'full'>('large');

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !onUpload) return;
    try {
      await onUpload(e.target.files[0], caption, alignment, size);
      onClose();
    } catch (err) {
      console.error('Image upload failed:', err);
    }
  };

  return (
    <div className="editor-dialog-overlay" onClick={onClose} role="presentation">
      <div className="editor-dialog editor-dialog-wide" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }} role="dialog" aria-modal="true" aria-label="Insert image">
        <h3 className="dialog-title">Insert Image</h3>
        <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/image.jpg" className="dialog-input" />
        <input type="text" value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="Alt text for accessibility (recommended)" className="dialog-input" />
        <input type="text" value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Caption (optional — shown below image)" className="dialog-input" />

        {/* Alignment options */}
        <div className="dialog-option-group">
          <label className="dialog-label">Alignment</label>
          <div className="dialog-option-row">
            {(['left', 'center', 'right', 'full'] as const).map(a => (
              <button key={a} type="button" onClick={() => setAlignment(a)} className={`dialog-option-btn ${alignment === a ? 'active' : ''}`}>
                {a === 'left' && <FormatAlignLeftIcon size={16} />}
                {a === 'center' && <FormatAlignCenterIcon size={16} />}
                {a === 'right' && <FormatAlignRightIcon size={16} />}
                {a === 'full' && <FormatAlignJustifyIcon size={16} />}
                <span>{a.charAt(0).toUpperCase() + a.slice(1)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Size options */}
        <div className="dialog-option-group">
          <label className="dialog-label">Size</label>
          <div className="dialog-option-row">
            {(['small', 'medium', 'large', 'full'] as const).map(s => (
              <button key={s} type="button" onClick={() => setSize(s)} className={`dialog-option-btn ${size === s ? 'active' : ''}`}>
                <span>{s === 'small' ? '25%' : s === 'medium' ? '50%' : s === 'large' ? '75%' : '100%'}</span>
              </button>
            ))}
          </div>
        </div>

        {onUpload && (
          <>
            <div className="dialog-divider">OR UPLOAD</div>
            <input type="file" accept={config.allowedImageTypes.join(',')} onChange={handleUpload} className="dialog-file-input" />
          </>
        )}
        <div className="dialog-actions">
          <button type="button" onClick={onClose} className="dialog-btn dialog-btn-cancel">Cancel</button>
          <button type="button" onClick={() => { onInsert(url, alt || undefined, caption || undefined, alignment, size); onClose(); }} className="dialog-btn dialog-btn-primary" disabled={!url}>Insert</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// ── Video Dialog ────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════

function VideoDialog({ onInsert, onClose }: {
  onInsert: (url: string) => void;
  onClose: () => void;
}) {
  const [url, setUrl] = useState('');

  return (
    <div className="editor-dialog-overlay" onClick={onClose} role="presentation">
      <div className="editor-dialog" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }} role="dialog" aria-modal="true" aria-label="Embed video">
        <h3 className="dialog-title">Embed Video</h3>
        <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=... or embed URL" className="dialog-input" autoFocus />
        <p className="dialog-hint">Supports YouTube, Vimeo, and direct embed URLs</p>
        <div className="dialog-actions">
          <button type="button" onClick={onClose} className="dialog-btn dialog-btn-cancel">Cancel</button>
          <button type="button" onClick={() => { onInsert(url); onClose(); }} className="dialog-btn dialog-btn-primary" disabled={!url}>Insert</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// ── Color Picker Dialog ─────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════

function ColorPickerDialog({ config, initialColor, onApply, onClose }: {
  config: UseEditorReturn['config'];
  initialColor: string;
  onApply: (type: 'text' | 'background', color: string) => void;
  onClose: () => void;
}) {
  const [colorType, setColorType] = useState<'text' | 'background'>(config.enableTextColor ? 'text' : 'background');
  const [color, setColor] = useState(initialColor);

  return (
    <div className="editor-dialog-overlay" onClick={onClose} role="presentation">
      <div className="editor-dialog" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }} role="dialog" aria-modal="true" aria-label="Choose color">
        <h3 className="dialog-title">Choose Color</h3>
        <div className="color-type-selector">
          {config.enableTextColor && <button type="button" onClick={() => setColorType('text')} className={`color-type-btn ${colorType === 'text' ? 'active' : ''}`}>Text Color</button>}
          {config.enableBackgroundColor && <button type="button" onClick={() => setColorType('background')} className={`color-type-btn ${colorType === 'background' ? 'active' : ''}`}>Background</button>}
        </div>
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="color-picker-input" />
        <div className="color-presets">
          {config.colorPalette.map(c => (
            <button key={c} type="button" onClick={() => setColor(c)} className={`color-preset ${color === c ? 'color-preset-selected' : ''}`} style={{ backgroundColor: c } as CSSProperties} title={c} aria-label={`Select color ${c}`} />
          ))}
        </div>
        <div className="dialog-actions">
          <button type="button" onClick={onClose} className="dialog-btn dialog-btn-cancel">Cancel</button>
          <button type="button" onClick={() => { onApply(colorType, color); onClose(); }} className="dialog-btn dialog-btn-primary">Apply</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// ── Table Dialog ────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════

function TableDialog({ config, onInsert, onClose }: {
  config: UseEditorReturn['config'];
  onInsert: (rows: number, cols: number) => void;
  onClose: () => void;
}) {
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);

  return (
    <div className="editor-dialog-overlay" onClick={onClose} role="presentation">
      <div className="editor-dialog" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }} role="dialog" aria-modal="true" aria-label="Insert table">
        <h3 className="dialog-title">Insert Table</h3>
        <div className="table-size-inputs">
          <div>
            <label className="dialog-label">Rows</label>
            <input type="number" value={rows} onChange={(e) => setRows(Math.max(1, Math.min(config.maxTableRows, parseInt(e.target.value) || 1)))} min="1" max={config.maxTableRows} className="dialog-input" />
          </div>
          <div>
            <label className="dialog-label">Columns</label>
            <input type="number" value={cols} onChange={(e) => setCols(Math.max(1, Math.min(config.maxTableCols, parseInt(e.target.value) || 1)))} min="1" max={config.maxTableCols} className="dialog-input" />
          </div>
        </div>
        <div className="dialog-actions">
          <button type="button" onClick={onClose} className="dialog-btn dialog-btn-cancel">Cancel</button>
          <button type="button" onClick={() => { onInsert(rows, cols); onClose(); }} className="dialog-btn dialog-btn-primary">Insert</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// ── Main Dialogs Container ──────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════

export default function EditorDialogs({ editor }: EditorDialogsProps) {
  const {
    config,
    showLinkDialog, setShowLinkDialog,
    showImageDialog, setShowImageDialog,
    showVideoDialog, setShowVideoDialog,
    showColorPicker, setShowColorPicker,
    showTableDialog, setShowTableDialog,
    selectedColor, setSelectedColor,
    insertLink, insertImage, uploadAndInsertImage,
    insertVideo, applyColor, insertTable,
    onImageUpload,
  } = editor;

  return (
    <>
      {showLinkDialog && (
        <LinkDialog
          onInsert={insertLink}
          onClose={() => setShowLinkDialog(false)}
        />
      )}

      {showImageDialog && (
        <ImageDialog
          config={config}
          onInsert={insertImage}
          onUpload={onImageUpload ? uploadAndInsertImage : undefined}
          onClose={() => setShowImageDialog(false)}
        />
      )}

      {showVideoDialog && (
        <VideoDialog
          onInsert={insertVideo}
          onClose={() => setShowVideoDialog(false)}
        />
      )}

      {showColorPicker && (
        <ColorPickerDialog
          config={config}
          initialColor={selectedColor}
          onApply={(type, color) => {
            applyColor(type, color);
            setSelectedColor(color);
          }}
          onClose={() => setShowColorPicker(false)}
        />
      )}

      {showTableDialog && (
        <TableDialog
          config={config}
          onInsert={insertTable}
          onClose={() => setShowTableDialog(false)}
        />
      )}
    </>
  );
}
