"use client";

import { useRef, useCallback } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import type { editor } from "monaco-editor";

interface SourceEditorProps {
  value: string;
  onChange: (value: string) => void;
  minHeight: string;
  maxHeight: string;
  darkMode: boolean;
}

export default function SourceEditor({
  value,
  onChange,
  minHeight,
  maxHeight,
  darkMode,
}: SourceEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const handleMount: OnMount = useCallback((ed) => {
    editorRef.current = ed;
    // Format the HTML on first load
    setTimeout(() => {
      ed.getAction("editor.action.formatDocument")?.run();
    }, 100);
  }, []);

  const handleChange = useCallback(
    (val: string | undefined) => {
      onChange(val ?? "");
    },
    [onChange],
  );

  return (
    <div style={{ minHeight, maxHeight, overflow: "hidden" }}>
      <Editor
        height={maxHeight}
        defaultLanguage="html"
        value={value}
        onChange={handleChange}
        onMount={handleMount}
        theme={darkMode ? "vs-dark" : "light"}
        options={{
          minimap: { enabled: false },
          fontSize: 13,
          lineNumbers: "on",
          wordWrap: "on",
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          formatOnPaste: true,
          formatOnType: true,
          renderWhitespace: "selection",
          bracketPairColorization: { enabled: true },
          suggest: { showWords: false },
        }}
        loading={
          <div
            className="flex items-center justify-center text-sm text-gray-500"
            style={{ height: minHeight }}
          >
            Loading source editor...
          </div>
        }
      />
    </div>
  );
}
