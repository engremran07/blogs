"use client";

import { useCallback, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Highlighter,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Heading5,
  Heading6,
  List,
  ListOrdered,
  ListChecks,
  Quote,
  Minus,
  Undo2,
  Redo2,
  Link,
  Unlink,
  ImagePlus,
  Table,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Subscript,
  Superscript,
  RemoveFormatting,
  Youtube,
  Columns2,
  MessageSquareQuote,
  AlertCircle,
  SeparatorHorizontal,
  Palette,
} from "lucide-react";
import type { CalloutType } from "../extensions/Callout";

interface ToolbarProps {
  editor: Editor;
  onImageUpload?: (file: File) => Promise<string>;
}

function ToolbarButton({
  onClick,
  isActive,
  title,
  children,
  disabled,
}: {
  onClick: () => void;
  isActive?: boolean;
  title: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rte-toolbar-btn ${isActive ? "is-active" : ""}`}
      title={title}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="mx-0.5 h-6 w-px bg-gray-200 dark:bg-gray-600" />;
}

export function EditorToolbar({ editor, onImageUpload }: ToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const handleImageUpload = useCallback(
    async (file: File) => {
      if (!onImageUpload) return;
      try {
        const url = await onImageUpload(file);
        editor.chain().focus().setImage({ src: url }).run();
      } catch {
        // upload failed silently
      }
    },
    [editor, onImageUpload],
  );

  const handleLinkInsert = useCallback(() => {
    if (editor.isActive("link")) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    const url = window.prompt("Enter URL:");
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  }, [editor]);

  const handleYouTube = useCallback(() => {
    const url = window.prompt("Enter YouTube URL:");
    if (url) {
      editor.chain().focus().setYoutubeVideo({ src: url }).run();
    }
  }, [editor]);

  const insertTable = useCallback(() => {
    editor
      .chain()
      .focus()
      .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
      .run();
  }, [editor]);

  const handleCallout = useCallback(
    (type: CalloutType) => {
      editor.chain().focus().toggleCallout({ type }).run();
    },
    [editor],
  );

  const handleColorChange = useCallback(
    (color: string) => {
      editor.chain().focus().setColor(color).run();
      setShowColorPicker(false);
    },
    [editor],
  );

  const iconSize = "h-4 w-4";

  return (
    <div className="rte-toolbar flex flex-wrap items-center gap-0.5 border-b border-gray-200 px-2 py-1.5 dark:border-gray-700">
      {/* Undo / Redo */}
      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        title="Undo (Ctrl+Z)"
      >
        <Undo2 className={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        title="Redo (Ctrl+Y)"
      >
        <Redo2 className={iconSize} />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Inline Formatting */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive("bold")}
        title="Bold (Ctrl+B)"
      >
        <Bold className={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive("italic")}
        title="Italic (Ctrl+I)"
      >
        <Italic className={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        isActive={editor.isActive("underline")}
        title="Underline (Ctrl+U)"
      >
        <Underline className={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={editor.isActive("strike")}
        title="Strikethrough"
      >
        <Strikethrough className={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCode().run()}
        isActive={editor.isActive("code")}
        title="Inline Code"
      >
        <Code className={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHighlight().run()}
        isActive={editor.isActive("highlight")}
        title="Highlight"
      >
        <Highlighter className={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleSubscript().run()}
        isActive={editor.isActive("subscript")}
        title="Subscript"
      >
        <Subscript className={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleSuperscript().run()}
        isActive={editor.isActive("superscript")}
        title="Superscript"
      >
        <Superscript className={iconSize} />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Headings */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        isActive={editor.isActive("heading", { level: 1 })}
        title="Heading 1"
      >
        <Heading1 className={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive("heading", { level: 2 })}
        title="Heading 2"
      >
        <Heading2 className={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        isActive={editor.isActive("heading", { level: 3 })}
        title="Heading 3"
      >
        <Heading3 className={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
        isActive={editor.isActive("heading", { level: 4 })}
        title="Heading 4"
      >
        <Heading4 className={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 5 }).run()}
        isActive={editor.isActive("heading", { level: 5 })}
        title="Heading 5"
      >
        <Heading5 className={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 6 }).run()}
        isActive={editor.isActive("heading", { level: 6 })}
        title="Heading 6"
      >
        <Heading6 className={iconSize} />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Lists */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive("bulletList")}
        title="Bullet List"
      >
        <List className={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive("orderedList")}
        title="Ordered List"
      >
        <ListOrdered className={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleTaskList().run()}
        isActive={editor.isActive("taskList")}
        title="Task List"
      >
        <ListChecks className={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive("blockquote")}
        title="Blockquote"
      >
        <Quote className={iconSize} />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Alignment */}
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
        isActive={editor.isActive({ textAlign: "left" })}
        title="Align Left"
      >
        <AlignLeft className={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
        isActive={editor.isActive({ textAlign: "center" })}
        title="Align Center"
      >
        <AlignCenter className={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
        isActive={editor.isActive({ textAlign: "right" })}
        title="Align Right"
      >
        <AlignRight className={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("justify").run()}
        isActive={editor.isActive({ textAlign: "justify" })}
        title="Justify"
      >
        <AlignJustify className={iconSize} />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Insert */}
      <ToolbarButton
        onClick={handleLinkInsert}
        isActive={editor.isActive("link")}
        title="Insert Link (Ctrl+K)"
      >
        <Link className={iconSize} />
      </ToolbarButton>
      {editor.isActive("link") && (
        <ToolbarButton
          onClick={() => editor.chain().focus().unsetLink().run()}
          title="Remove Link"
        >
          <Unlink className={iconSize} />
        </ToolbarButton>
      )}
      <ToolbarButton
        onClick={() => fileInputRef.current?.click()}
        title="Insert Image"
        disabled={!onImageUpload}
      >
        <ImagePlus className={iconSize} />
      </ToolbarButton>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImageUpload(file);
          e.target.value = "";
        }}
      />
      <ToolbarButton onClick={handleYouTube} title="Insert YouTube Video">
        <Youtube className={iconSize} />
      </ToolbarButton>
      <ToolbarButton onClick={insertTable} title="Insert Table">
        <Table className={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title="Horizontal Rule"
      >
        <Minus className={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        isActive={editor.isActive("codeBlock")}
        title="Code Block"
      >
        <Code className={iconSize} />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Custom Blocks */}
      <ToolbarButton
        onClick={() => handleCallout("info")}
        isActive={editor.isActive("callout")}
        title="Callout Block"
      >
        <AlertCircle className={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().togglePullQuote().run()}
        isActive={editor.isActive("pullQuote")}
        title="Pull Quote"
      >
        <MessageSquareQuote className={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setColumns().run()}
        title="Two Columns"
      >
        <Columns2 className={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setStyledSeparator().run()}
        title="Styled Separator"
      >
        <SeparatorHorizontal className={iconSize} />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Color */}
      <div
        className="relative"
        style={{ zIndex: showColorPicker ? 50 : "auto" }}
      >
        <ToolbarButton
          onClick={() => setShowColorPicker(!showColorPicker)}
          title="Text Color"
        >
          <Palette className={iconSize} />
        </ToolbarButton>
        {showColorPicker && (
          <>
            {/* Backdrop to close on outside click */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowColorPicker(false)}
            />
            <div className="absolute left-0 top-full z-50 mt-1 w-45 rounded-lg border border-gray-200 bg-white p-2 shadow-lg dark:border-gray-600 dark:bg-gray-800">
              <div className="grid grid-cols-6 gap-1">
                {[
                  "#000000",
                  "#333333",
                  "#666666",
                  "#999999",
                  "#cccccc",
                  "#ffffff",
                  "#e74c3c",
                  "#e67e22",
                  "#f1c40f",
                  "#2ecc71",
                  "#3498db",
                  "#9b59b6",
                  "#c0392b",
                  "#d35400",
                  "#f39c12",
                  "#27ae60",
                  "#2980b9",
                  "#8e44ad",
                  "#1a1a2e",
                  "#16213e",
                  "#0f3460",
                  "#e94560",
                  "#533483",
                  "#2b2d42",
                ].map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => handleColorChange(color)}
                    className="h-6 w-6 rounded border border-gray-300 hover:scale-110 transition-transform dark:border-gray-600"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  editor.chain().focus().unsetColor().run();
                  setShowColorPicker(false);
                }}
                className="mt-2 w-full rounded border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
              >
                Reset Color
              </button>
            </div>
          </>
        )}
      </div>

      {/* Font Family dropdown */}
      <select
        onChange={(e) => {
          if (e.target.value === "") {
            editor.chain().focus().unsetFontFamily().run();
          } else {
            editor.chain().focus().setFontFamily(e.target.value).run();
          }
        }}
        className="rte-toolbar-select"
        title="Font Family"
        defaultValue=""
      >
        <option value="">Font</option>
        <option value="Inter">Inter</option>
        <option value="Georgia">Georgia</option>
        <option value="Arial">Arial</option>
        <option value="Times New Roman">Times New Roman</option>
        <option value="Courier New">Courier New</option>
        <option value="ui-monospace">Monospace</option>
      </select>

      <ToolbarDivider />

      {/* Clear */}
      <ToolbarButton
        onClick={() =>
          editor.chain().focus().clearNodes().unsetAllMarks().run()
        }
        title="Clear Formatting"
      >
        <RemoveFormatting className={iconSize} />
      </ToolbarButton>
    </div>
  );
}
