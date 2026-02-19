"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { Eye, ExternalLink, Pencil, Clock } from "lucide-react";
import { useAdminBar } from "./AdminBarProvider";
import { SeoDropdown } from "./SeoDropdown";
import { LAST_SAVED_INTERVAL_MS } from "./constants";
import type { RouteIntelligence } from "./useRouteIntelligence";
import type { EditorStatus } from "../EditorContext";
import { toast } from "@/components/ui/Toast";

/* ── Status toggle pill (extracted to avoid hooks-in-render) ── */

function StatusPill({
  editor,
  visible,
}: {
  editor: EditorStatus | null;
  visible: boolean;
}) {
  if (!visible || !editor) return null;

  const status = editor.status;
  const isPublished = status === "PUBLISHED";
  const isDraft = status === "DRAFT";

  async function toggleStatus() {
    const newStatus = isPublished ? "DRAFT" : "PUBLISHED";
    try {
      await editor?.handleSave?.(newStatus);
      toast(
        isPublished ? "Moved to Draft" : "Published successfully!",
        "success",
      );
    } catch {
      toast("Status change failed", "error");
    }
  }

  return (
    <button
      onClick={toggleStatus}
      className={clsx(
        "flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide transition-colors",
        isPublished && "bg-green-900/40 text-green-400 hover:bg-green-900/60",
        isDraft && "bg-amber-900/40 text-amber-400 hover:bg-amber-900/60",
        !isPublished && !isDraft && "bg-blue-900/40 text-blue-400",
      )}
      title={`Click to ${isPublished ? "unpublish" : "publish"}`}
      aria-label={`Status: ${status}. Click to ${isPublished ? "revert to draft" : "publish"}`}
    >
      <span
        className={clsx(
          "h-1.5 w-1.5 rounded-full",
          isPublished && "bg-green-400",
          isDraft && "bg-amber-400",
          !isPublished && !isDraft && "bg-blue-400",
        )}
      />
      {status}
    </button>
  );
}

/* ── Word count display ── */

function WordCount({
  wordCount,
  visible,
}: {
  wordCount: number | undefined;
  visible: boolean;
}) {
  if (!visible || !wordCount) return null;
  return (
    <span className="font-mono text-xs text-gray-400">
      {wordCount.toLocaleString()} words
    </span>
  );
}

/* ── Last saved indicator (stable component with its own timer) ── */

function LastSaved({
  lastSavedAt,
  visible,
}: {
  lastSavedAt: string | null | undefined;
  visible: boolean;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), LAST_SAVED_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  if (!visible || !lastSavedAt) return null;

  const savedDate = new Date(lastSavedAt);
  const diffMs = now - savedDate.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  let label: string;
  if (diffMin < 1) label = "just now";
  else if (diffMin < 60) label = `${diffMin}m ago`;
  else label = `${Math.floor(diffMin / 60)}h ago`;

  return (
    <span
      className="flex items-center gap-1 text-xs text-gray-500"
      title={`Last saved ${savedDate.toLocaleTimeString()}`}
    >
      <Clock className="h-3 w-3" />
      {label}
    </span>
  );
}

/**
 * Context zone (middle) of the AdminBar:
 *  - Status toggle pill (PUBLISHED / DRAFT)
 *  - Word count
 *  - Last saved indicator
 *  - SEO score dropdown
 *  - Edit / View link
 */
export function ContextZone({
  route,
  editor,
}: {
  route: RouteIntelligence;
  editor: EditorStatus | null;
}) {
  const { settings, closeDropdown } = useAdminBar();

  // ── Build context link (Edit / View) ──
  const contextLink = useContextLink(route, editor);

  // Only show context zone on editor pages or frontend post/page views
  const showContextZone =
    route.isEditor || route.isViewingPost || route.isViewingPage;

  if (!showContextZone) return null;

  return (
    <div className="hidden items-center gap-2 md:flex">
      <StatusPill editor={editor} visible={settings.adminBarShowStatusToggle} />
      <WordCount
        wordCount={editor?.wordCount}
        visible={settings.adminBarShowWordCount}
      />
      <LastSaved
        lastSavedAt={editor?.lastSavedAt}
        visible={settings.adminBarShowLastSaved}
      />

      {/* SEO score — on editor pages only */}
      {route.isEditor && <SeoDropdown route={route} editor={editor} />}

      {/* Context navigation link */}
      {contextLink && (
        <Link
          href={contextLink.href}
          target={contextLink.external ? "_blank" : undefined}
          rel={contextLink.external ? "noopener noreferrer" : undefined}
          onClick={closeDropdown}
          className="flex items-center gap-1 rounded px-2 py-1 text-xs text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
        >
          <contextLink.icon className="h-3.5 w-3.5" />
          <span>{contextLink.label}</span>
          {contextLink.external && <ExternalLink className="h-2.5 w-2.5" />}
        </Link>
      )}
    </div>
  );
}

/* ── Context link builder hook ── */

function useContextLink(route: RouteIntelligence, editor: EditorStatus | null) {
  return useMemo(() => {
    // On a public post → Edit Post
    if (route.isViewingPost && route.publicSlug) {
      return {
        label: "Edit Post",
        href: route.adminEditUrl ?? "/admin/posts",
        icon: Pencil,
        external: false,
      };
    }
    // On a public page → Edit Page
    if (route.isViewingPage && route.publicSlug) {
      return {
        label: "Edit Page",
        href: route.adminEditUrl ?? "/admin/pages",
        icon: Pencil,
        external: false,
      };
    }
    // In editor → View live page
    if (route.isEditor && editor?.slug) {
      const publicPath =
        route.resourceType === "post"
          ? `/blog/${editor.slug}`
          : `/${editor.slug}`;
      return {
        label: "View",
        href: publicPath,
        icon: Eye,
        external: true,
      };
    }
    return null;
  }, [route, editor]);
}
