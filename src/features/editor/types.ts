/**
 * TipTap Rich Text Editor — Type Definitions
 * Slim, stable contract consumed by PostEditor & PageEditor.
 */

export interface RichTextEditorProps {
  /** Initial HTML content */
  content?: string;
  /** Fires on every content change: (html, plainText, wordCount) */
  onChange?: (html: string, text: string, wordCount: number) => void;
  /** Image upload handler — receives File, returns public URL */
  onImageUpload?: (file: File) => Promise<string>;
  /** Placeholder text shown when editor is empty */
  placeholder?: string;
  /** CSS min-height value for the editing area */
  minHeight?: string;
  /** CSS max-height value for the editing area */
  maxHeight?: string;
  /** Additional CSS class names */
  className?: string;
  /** Read-only mode */
  readOnly?: boolean;
}
