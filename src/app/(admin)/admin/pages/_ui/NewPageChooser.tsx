"use client";

import { useState, useRef, useCallback } from "react";
import { FileText, Upload, ArrowLeft, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import PageEditor from "./PageEditor";
import { convertJsxToHtml } from "@/shared/jsx-to-html.util";
import { extractHtmlStyles } from "@/shared/html-style-extractor.util";

type Mode = "choose" | "editor" | "upload";

export default function NewPageChooser() {
  const [mode, setMode] = useState<Mode>("choose");
  const [uploadedHtml, setUploadedHtml] = useState<string | null>(null);
  const [uploadedCss, setUploadedCss] = useState<string>("");
  const [uploadedTitle, setUploadedTitle] = useState<string>("");

  if (mode === "editor") {
    return <PageEditor isNew />;
  }

  if (mode === "upload" && uploadedHtml !== null) {
    return (
      <PageEditor
        isNew
        initialContent={uploadedHtml}
        initialTitle={uploadedTitle}
        initialCss={uploadedCss}
      />
    );
  }

  return (
    <ChooseMode
      onChooseEditor={() => setMode("editor")}
      onFileReady={(html, title, css) => {
        setUploadedHtml(html);
        setUploadedTitle(title);
        setUploadedCss(css);
        setMode("upload");
      }}
    />
  );
}

function ChooseMode({
  onChooseEditor,
  onFileReady,
}: {
  onChooseEditor: () => void;
  onFileReady: (html: string, title: string, css: string) => void;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processFile = useCallback(
    async (file: File) => {
      setError(null);

      const ext = file.name.split(".").pop()?.toLowerCase();
      if (!ext || !["html", "htm", "jsx", "tsx"].includes(ext)) {
        setError("Only .html, .htm, .jsx, and .tsx files are supported.");
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setError("File size must be under 5 MB.");
        return;
      }

      setParsing(true);
      try {
        const text = await file.text();
        let content: string;
        let title: string;
        let css = "";

        if (ext === "html" || ext === "htm") {
          const parser = new DOMParser();
          const doc = parser.parseFromString(text, "text/html");

          // Extract title from <title> or <h1>
          const titleEl = doc.querySelector("title") || doc.querySelector("h1");
          title =
            titleEl?.textContent?.trim() ||
            file.name.replace(/\.(html|htm)$/i, "");

          // Extract styles and cleaned body content
          const extracted = extractHtmlStyles(text);
          content = extracted.content;
          css = extracted.css;
        } else {
          // JSX / TSX — convert to HTML, derive title from filename
          content = convertJsxToHtml(text);
          title = file.name.replace(/\.(jsx|tsx)$/i, "");
        }

        if (!content) {
          setError("The uploaded file appears to be empty.");
          return;
        }

        onFileReady(content, title, css);
      } catch {
        setError("Failed to parse the uploaded file.");
      } finally {
        setParsing(false);
      }
    },
    [onFileReady],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <button
          type="button"
          aria-label="Back to pages"
          onClick={() => router.push("/admin/pages")}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          New Page
        </h1>
      </div>

      <p className="mb-8 text-sm text-gray-500 dark:text-gray-400">
        How would you like to create this page?
      </p>

      <div className="grid gap-6 sm:grid-cols-2 max-w-3xl">
        {/* Option 1: Text Editor */}
        <button
          type="button"
          onClick={onChooseEditor}
          className="group flex flex-col items-center gap-4 rounded-xl border-2 border-gray-200 bg-white p-8 text-center transition-all hover:border-primary hover:shadow-lg dark:border-gray-700 dark:bg-gray-800 dark:hover:border-primary"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
            <FileText className="h-8 w-8" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Create Text Page
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Use the rich text editor to build a page from scratch — perfect
              for policies, about pages, and custom content.
            </p>
          </div>
        </button>

        {/* Option 2: Upload HTML */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          className={`group flex flex-col items-center gap-4 rounded-xl border-2 border-dashed bg-white p-8 text-center transition-all dark:bg-gray-800 ${
            dragActive
              ? "border-primary bg-primary/5 dark:bg-primary/10"
              : "border-gray-200 hover:border-primary hover:shadow-lg dark:border-gray-700 dark:hover:border-primary"
          }`}
        >
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={parsing}
            className="flex w-full flex-col items-center gap-4"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 transition-transform group-hover:scale-110 dark:text-emerald-400">
              {parsing ? (
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
              ) : (
                <Upload className="h-8 w-8" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Upload Page File
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Upload a page file to import — great for pre-designed landing
                pages and templates.
              </p>
              <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                .html, .htm, .jsx, or .tsx — max 5 MB
              </p>
            </div>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".html,.htm,.jsx,.tsx"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) processFile(file);
              e.target.value = "";
            }}
            className="hidden"
          />
          {error && (
            <p className="flex items-center gap-1 text-xs text-red-500">
              <AlertCircle className="h-3 w-3" /> {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
