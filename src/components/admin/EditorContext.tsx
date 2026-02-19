"use client";

import { createContext, useContext, type ReactNode } from "react";

export interface EditorStatus {
  /** Current document status (DRAFT, PUBLISHED, SCHEDULED, ARCHIVED) */
  status: string;
  /** Whether unsaved changes exist */
  isDirty: boolean;
  /** Document slug (for building public URL) */
  slug: string | null;
  /** Document title */
  title: string;
  /** Post ID (if editing a post) */
  postId?: string | null;
  /** Page ID (if editing a page) */
  pageId?: string | null;
  /** Live word count from the editor */
  wordCount?: number;
  /** Estimated reading time in minutes */
  readingTime?: number;
  /** Timestamp of most recent save (ISO string or null if never saved) */
  lastSavedAt?: string | null;
  /** Save handler — AdminBar can call this to trigger a save */
  handleSave?: (newStatus?: string) => void;
}

const EditorStatusCtx = createContext<EditorStatus | null>(null);

export function EditorStatusProvider({
  value,
  children,
}: {
  value: EditorStatus;
  children: ReactNode;
}) {
  return (
    <EditorStatusCtx.Provider value={value}>
      {children}
    </EditorStatusCtx.Provider>
  );
}

/**
 * Read the editor status from a parent `<EditorStatusProvider>`.
 * Returns `null` when called outside an editor page.
 */
export function useEditorStatus(): EditorStatus | null {
  return useContext(EditorStatusCtx);
}
