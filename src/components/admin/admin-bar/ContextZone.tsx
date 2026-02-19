"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import {
  Eye,
  ExternalLink,
  Pencil,
  Clock,
} from "lucide-react";
import { useAdminBar } from "./AdminBarProvider";
import { SeoDropdown } from "./SeoDropdown";
import type { RouteIntelligence } from "./useRouteIntelligence";
import type { EditorStatus } from "../EditorContext";
import { toast } from "@/components/ui/Toast";

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

  // ── Status toggle pill ──
  function StatusPill() {
    if (!settings.adminBarShowStatusToggle) return null;
    if (!editor) return null;
    const status = editor.status;
    const isPublished = status === "PUBLISHED";
    const isDraft = status === "DRAFT";

    async function toggleStatus() {
      const newStatus = isPublished ? "DRAFT" : "PUBLISHED";
      editor?.handleSave?.(newStatus);
      toast(
        isPublished ? "Moved to Draft" : "Published successfully!",
        "success",
      );
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

  // ── Word count ──
  function WordCount() {
    if (!settings.adminBarShowWordCount || !editor?.wordCount) return null;
    return (
      <span className="font-mono text-xs text-gray-400">
        {editor.wordCount.toLocaleString()} words
      </span>
    );
  }

  // ── Last saved indicator ──
  function LastSaved() {
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
      const id = setInterval(() => setNow(Date.now()), 30_000);
      return () => clearInterval(id);
    }, []);

    if (!settings.adminBarShowLastSaved || !editor?.lastSavedAt) return null;
    const savedDate = new Date(editor.lastSavedAt);
    const diffMs = now - savedDate.getTime();
    const diffMin = Math.floor(diffMs / 60000);

    let label: string;
    if (diffMin < 1) label = "just now";
    else if (diffMin < 60) label = `${diffMin}m ago`;
    else label = `${Math.floor(diffMin / 60)}h ago`;

    return (
      <span className="flex items-center gap-1 text-xs text-gray-500">
        <Clock className="h-3 w-3" />
        {label}
      </span>
    );
  }

  // ── Build context link (Edit / View) ──
  let contextLink: { label: string; href: string; icon: typeof Eye; external: boolean } | null = null;

  // On a public post → Edit Post
  if (route.isViewingPost && route.publicSlug) {
    contextLink = {
      label: "Edit Post",
      href: route.adminEditUrl ?? "/admin/posts",
      icon: Pencil,
      external: false,
    };
  }
  // On a public page → Edit Page
  else if (route.isViewingPage && route.publicSlug) {
    contextLink = {
      label: "Edit Page",
      href: route.adminEditUrl ?? "/admin/pages",
      icon: Pencil,
      external: false,
    };
  }
  // In editor → View live page
  else if (route.isEditor && editor?.slug) {
    const publicPath =
      route.resourceType === "post" ? `/blog/${editor.slug}` : `/${editor.slug}`;
    contextLink = {
      label: "View",
      href: publicPath,
      icon: Eye,
      external: true,
    };
  }

  // Only show context zone on editor pages or frontend post/page views
  const showContextZone =
    route.isEditor ||
    route.isViewingPost ||
    route.isViewingPage;

  if (!showContextZone) return null;

  return (
    <div className="hidden items-center gap-2 md:flex">
      <StatusPill />
      <WordCount />
      <LastSaved />

      {/* SEO score — on editor pages only */}
      {route.isEditor && <SeoDropdown route={route} editor={editor} />}

      {/* Context navigation link */}
      {contextLink && (
        <Link
          href={contextLink.href}
          target={contextLink.external ? "_blank" : undefined}
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
