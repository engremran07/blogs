"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import {
  Eye,
  ExternalLink,
  Pencil,
  Clock,
  BookOpen,
  BarChart3,
} from "lucide-react";
import { useAdminBar } from "./AdminBarProvider";
import { SeoDropdown } from "./SeoDropdown";
import { usePageMeta } from "./usePageMeta";
import { LAST_SAVED_INTERVAL_MS } from "./constants";
import type { RouteIntelligence } from "./useRouteIntelligence";
import type { EditorStatus } from "../EditorContext";
import { toast } from "@/components/ui/Toast";

/* ── Status toggle pill — for editor context (can toggle) ── */

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

/* ── Read-only status badge — for public view context (no toggle) ── */

function StatusBadge({
  status,
  visible,
}: {
  status: string;
  visible: boolean;
}) {
  if (!visible || !status) return null;

  const isPublished = status === "PUBLISHED";
  const isDraft = status === "DRAFT";

  return (
    <span
      className={clsx(
        "flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide",
        isPublished && "bg-green-900/40 text-green-400",
        isDraft && "bg-amber-900/40 text-amber-400",
        !isPublished && !isDraft && "bg-blue-900/40 text-blue-400",
      )}
      title={`Status: ${status}`}
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
    </span>
  );
}

/* ── Word count + reading time display ── */

function WordCount({
  wordCount,
  readingTime,
  visible,
}: {
  wordCount: number | undefined;
  readingTime: number | undefined;
  visible: boolean;
}) {
  if (!visible || !wordCount) return null;
  const rt = readingTime ?? Math.ceil(wordCount / 200);
  return (
    <span
      className="flex items-center gap-1 font-mono text-xs text-gray-400"
      title={`${wordCount.toLocaleString()} words • ~${rt} min read`}
    >
      <BookOpen className="h-3 w-3 text-gray-500" />
      {wordCount.toLocaleString()}
      <span className="text-gray-600">·</span>
      <span>{rt}m</span>
    </span>
  );
}

/* ── Quick stats (public view only) ── */

function QuickStats({
  publishedAt,
  updatedAt,
  visible,
}: {
  publishedAt: string | null;
  updatedAt: string | null;
  visible: boolean;
}) {
  // Use state + effect to avoid calling impure Date.now() during render
  const [now] = useState(() => Date.now());

  if (!visible || !publishedAt) return null;

  const pubDate = new Date(publishedAt);
  const updDate = updatedAt ? new Date(updatedAt) : null;
  const daysSincePublished = Math.floor((now - pubDate.getTime()) / 86400000);

  let ageLabel: string;
  if (daysSincePublished === 0) ageLabel = "Today";
  else if (daysSincePublished === 1) ageLabel = "Yesterday";
  else if (daysSincePublished < 30) ageLabel = `${daysSincePublished}d ago`;
  else if (daysSincePublished < 365)
    ageLabel = `${Math.floor(daysSincePublished / 30)}mo ago`;
  else ageLabel = `${Math.floor(daysSincePublished / 365)}y ago`;

  const isStale = updDate && updDate < pubDate;

  return (
    <span
      className="flex items-center gap-1 text-xs text-gray-500"
      title={`Published ${pubDate.toLocaleDateString()}${updDate ? ` • Updated ${updDate.toLocaleDateString()}` : ""}${isStale ? " • Content may be outdated" : ""}`}
    >
      <BarChart3 className="h-3 w-3" />
      {ageLabel}
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
 *  - Status toggle pill / read-only badge
 *  - Word count + reading time
 *  - Last saved indicator (editor) / Quick stats (public)
 *  - SEO score dropdown
 *  - Edit / View link (pointing to specific post/page, not list)
 */
export function ContextZone({
  route,
  editor,
}: {
  route: RouteIntelligence;
  editor: EditorStatus | null;
}) {
  const { settings, closeDropdown } = useAdminBar();

  // ── Fetch metadata for public post/page views ──
  const publicType = route.isViewingPost
    ? ("post" as const)
    : route.isViewingPage
      ? ("page" as const)
      : null;
  const { meta } = usePageMeta(publicType, route.publicSlug);

  // ── Merge: prefer editor context, fallback to fetched meta ──
  const effectiveStatus = editor?.status ?? meta?.status ?? null;
  const effectiveWordCount = editor?.wordCount ?? meta?.wordCount;
  const effectiveReadingTime = editor?.readingTime ?? meta?.readingTime;

  // ── Build context link (Edit / View) with correct specific URL ──
  const contextLink = useContextLink(route, editor, meta);

  // Only show context zone on editor pages or frontend post/page views
  const showContextZone =
    route.isEditor || route.isViewingPost || route.isViewingPage;

  if (!showContextZone) return null;

  return (
    <div className="hidden items-center gap-2 md:flex">
      {/* Status — toggleable in editor, read-only on public views */}
      {route.isEditor ? (
        <StatusPill
          editor={editor}
          visible={settings.adminBarShowStatusToggle}
        />
      ) : (
        <StatusBadge
          status={effectiveStatus ?? ""}
          visible={settings.adminBarShowStatusToggle && !!effectiveStatus}
        />
      )}

      {/* Word count + reading time */}
      <WordCount
        wordCount={effectiveWordCount}
        readingTime={effectiveReadingTime}
        visible={settings.adminBarShowWordCount}
      />

      {/* Last saved (editor) or Quick stats (public) */}
      {route.isEditor ? (
        <LastSaved
          lastSavedAt={editor?.lastSavedAt}
          visible={settings.adminBarShowLastSaved}
        />
      ) : (
        <QuickStats
          publishedAt={meta?.publishedAt ?? null}
          updatedAt={meta?.updatedAt ?? null}
          visible={settings.adminBarShowLastSaved && !!meta}
        />
      )}

      {/* SEO score — on editor pages and public post/page views */}
      {(route.isEditor || route.isViewingPost || route.isViewingPage) && (
        <SeoDropdown route={route} editor={editor} />
      )}

      {/* Context navigation link — points to SPECIFIC post/page editor */}
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

function useContextLink(
  route: RouteIntelligence,
  editor: EditorStatus | null,
  meta: { editId?: string | number } | null,
) {
  return useMemo(() => {
    // On a public post → Edit this specific Post
    if (route.isViewingPost && route.publicSlug) {
      const editUrl = meta?.editId
        ? `/admin/posts/${meta.editId}/edit`
        : "/admin/posts";
      return {
        label: "Edit Post",
        href: editUrl,
        icon: Pencil,
        external: false,
      };
    }
    // On a public page → Edit this specific Page
    if (route.isViewingPage && route.publicSlug) {
      const editUrl = meta?.editId
        ? `/admin/pages/${meta.editId}/edit`
        : "/admin/pages";
      return {
        label: "Edit Page",
        href: editUrl,
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
  }, [route, editor, meta]);
}
