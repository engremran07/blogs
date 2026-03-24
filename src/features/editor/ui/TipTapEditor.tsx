"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { Underline } from "@tiptap/extension-underline";
import { Subscript } from "@tiptap/extension-subscript";
import { Superscript } from "@tiptap/extension-superscript";
import { Highlight } from "@tiptap/extension-highlight";
import { Link } from "@tiptap/extension-link";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { FontFamily } from "@tiptap/extension-font-family";
import { TextAlign } from "@tiptap/extension-text-align";
import { Image as ImageExt } from "@tiptap/extension-image";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TaskList } from "@tiptap/extension-task-list";
import { TaskItem } from "@tiptap/extension-task-item";
import { Youtube } from "@tiptap/extension-youtube";
import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
import { Placeholder } from "@tiptap/extension-placeholder";
import { CharacterCount } from "@tiptap/extension-character-count";
import { Typography } from "@tiptap/extension-typography";
import { Code, Eye } from "lucide-react";
import dynamic from "next/dynamic";

import { common, createLowlight } from "lowlight";

import {
  Callout,
  PullQuote,
  EditorFigure,
  VideoEmbed,
  Columns,
  Column,
  StyledSeparator,
} from "../extensions";
import { EditorToolbar } from "./Toolbar";
import type { RichTextEditorProps } from "../types";
import "./editor.css";

const SourceEditor = dynamic(() => import("./SourceEditor"), {
  ssr: false,
  loading: () => (
    <div className="flex h-64 items-center justify-center text-sm text-gray-500">
      Loading source editor...
    </div>
  ),
});

const lowlight = createLowlight(common);

const READING_WPM = 200;

type EditorMode = "visual" | "source";

export default function RichTextEditor({
  content = "",
  onChange,
  onImageUpload,
  placeholder = "Start writing...",
  minHeight = "300px",
  maxHeight = "600px",
  className = "",
  readOnly = false,
}: RichTextEditorProps) {
  const [mode, setMode] = useState<EditorMode>("visual");
  const darkMode =
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("dark");

  const handleSourceChange = useCallback(
    (html: string) => {
      if (!onChange) return;
      const tmp = document.createElement("div");
      tmp.innerHTML = html;
      const text = tmp.textContent || "";
      const words = text.split(/\s+/).filter((w) => w.length > 0).length;
      onChange(html, text, words);
    },
    [onChange],
  );

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        codeBlock: false, // replaced by CodeBlockLowlight
        dropcursor: { color: "#3b82f6", width: 2 },
      }),
      Underline,
      Subscript,
      Superscript,
      Highlight.configure({ multicolor: true }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      }),
      TextStyle,
      Color,
      FontFamily,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      ImageExt.configure({ inline: false, allowBase64: false }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      TaskList,
      TaskItem.configure({ nested: true }),
      Youtube.configure({ inline: false }),
      CodeBlockLowlight.configure({ lowlight }),
      Placeholder.configure({ placeholder }),
      CharacterCount,
      Typography,
      // Custom extensions — backward compatible with old editor HTML
      Callout,
      PullQuote,
      EditorFigure,
      VideoEmbed,
      Columns,
      Column,
      StyledSeparator,
    ],
    content,
    editable: !readOnly,
    editorProps: {
      attributes: {
        class:
          "rte-content prose prose-sm sm:prose dark:prose-invert max-w-none focus:outline-none",
        style: `min-height:${minHeight};max-height:${maxHeight};overflow-y:auto`,
      },
      handleDrop: (view, event, _slice, moved) => {
        if (moved || !onImageUpload) return false;
        const files = event.dataTransfer?.files;
        if (!files?.length) return false;
        const file = files[0];
        if (!file.type.startsWith("image/")) return false;
        event.preventDefault();
        onImageUpload(file).then((url) => {
          const { schema } = view.state;
          const node = schema.nodes.image.create({ src: url });
          const pos = view.posAtCoords({
            left: event.clientX,
            top: event.clientY,
          });
          if (pos) {
            const tr = view.state.tr.insert(pos.pos, node);
            view.dispatch(tr);
          }
        });
        return true;
      },
      handlePaste: (_view, event) => {
        if (!onImageUpload) return false;
        const items = event.clipboardData?.items;
        if (!items) return false;
        for (const item of items) {
          if (item.type.startsWith("image/")) {
            event.preventDefault();
            const file = item.getAsFile();
            if (file) {
              onImageUpload(file).then((url) => {
                editor?.chain().focus().setImage({ src: url }).run();
              });
            }
            return true;
          }
        }
        return false;
      },
    },
  });

  // Track whether the last content change was from user typing (internal) vs prop update (external)
  const isInternalUpdate = useRef(false);

  // Sync external content prop changes into the editor (e.g. when async data loads)
  useEffect(() => {
    if (!editor) return;
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false;
      return;
    }
    const currentHTML = editor.getHTML();
    // Only update if the content actually differs (avoids cursor jumps while typing)
    if (content !== currentHTML) {
      editor.commands.setContent(content || "", { emitUpdate: false });
    }
  }, [content, editor]);

  // Wrap onUpdate to flag internal changes
  useEffect(() => {
    if (!editor || !onChange) return;
    const handler = () => {
      isInternalUpdate.current = true;
      const html = editor.getHTML();
      const text = editor.getText();
      const words = text.split(/\s+/).filter((w) => w.length > 0).length;
      onChange(html, text, words);
    };
    editor.on("update", handler);
    return () => {
      editor.off("update", handler);
    };
  }, [editor, onChange]);

  if (!editor) {
    return (
      <div
        className={`rte-loading animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800 ${className}`}
        style={{ minHeight }}
      />
    );
  }

  // When switching from source → visual, sync the latest HTML into Tiptap
  const handleToggleMode = () => {
    if (mode === "source" && editor) {
      // content prop already has the latest HTML from source onChange
      editor.commands.setContent(content || "", { emitUpdate: false });
    }
    setMode((m) => (m === "visual" ? "source" : "visual"));
  };

  const wordCount = editor
    .getText()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
  const charCount = editor.storage.characterCount?.characters() ?? 0;
  const readingTime = Math.max(1, Math.ceil(wordCount / READING_WPM));

  return (
    <div
      className={`tiptap-editor rte-wrapper flex flex-col rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}
    >
      {!readOnly && (
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
          {mode === "visual" ? (
            <EditorToolbar editor={editor} onImageUpload={onImageUpload} />
          ) : (
            <div className="flex-1 px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
              HTML Source
            </div>
          )}
          <button
            type="button"
            onClick={handleToggleMode}
            className="mr-2 flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
            title={
              mode === "visual"
                ? "Switch to HTML source"
                : "Switch to visual editor"
            }
          >
            {mode === "visual" ? (
              <>
                <Code className="h-3.5 w-3.5" />
                Source
              </>
            ) : (
              <>
                <Eye className="h-3.5 w-3.5" />
                Visual
              </>
            )}
          </button>
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        {mode === "visual" ? (
          <EditorContent editor={editor} />
        ) : (
          <SourceEditor
            value={content}
            onChange={handleSourceChange}
            minHeight={minHeight}
            maxHeight={maxHeight}
            darkMode={darkMode}
          />
        )}
      </div>

      {!readOnly && (
        <div className="rte-status-bar flex items-center justify-end gap-4 border-t border-gray-200 px-3 py-1.5 text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
          <span>{wordCount} words</span>
          <span>{charCount} chars</span>
          <span>{readingTime} min read</span>
        </div>
      )}
    </div>
  );
}
