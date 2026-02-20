"use client";

import { useCallback } from "react";
import Link from "next/link";
import {
  Globe,
  Settings,
  Wrench,
  Trash2,
  RefreshCw,
  ChevronDown,
  BarChart3,
  MessageSquare,
  Image as ImageIcon,
  FileText,
} from "lucide-react";
import { useAdminBar } from "./AdminBarProvider";
import { toast } from "@/components/ui/Toast";

const DROPDOWN_ID = "site-name";

const ENV_COLORS = {
  LIVE: "bg-red-500 text-white",
  STAGING: "bg-amber-500 text-black",
  DEV: "bg-blue-500 text-white",
} as const;

export function SiteNameDropdown() {
  const {
    activeDropdown,
    toggleDropdown,
    closeDropdown,
    siteName,
    envLabel,
    settings,
  } = useAdminBar();
  const isOpen = activeDropdown === DROPDOWN_ID;

  const handleClearCache = useCallback(async () => {
    closeDropdown();
    try {
      const res = await fetch("/api/revalidate", { method: "POST" });
      if (res.ok) {
        toast("Cache cleared!", "success");
      } else {
        toast("Failed to clear cache", "error");
      }
    } catch {
      toast("Failed to clear cache", "error");
    }
  }, [closeDropdown]);

  const handleRebuild = useCallback(async () => {
    closeDropdown();
    try {
      const res = await fetch("/api/revalidate?all=true", { method: "POST" });
      if (res.ok) {
        toast("Rebuild triggered!", "success");
      } else {
        toast("Rebuild failed", "error");
      }
    } catch {
      toast("Rebuild failed", "error");
    }
  }, [closeDropdown]);

  if (!settings.adminBarShowSiteNameDropdown) return null;

  return (
    <div className="relative" data-admin-bar-dropdown>
      <button
        onClick={() => toggleDropdown(DROPDOWN_ID)}
        className="flex items-center gap-1.5 rounded px-2 py-1 text-sm font-semibold text-white transition-colors hover:bg-white/10"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={`${siteName} site menu`}
      >
        <span className="max-w-35 truncate">{siteName}</span>
        {settings.adminBarShowEnvBadge && (
          <span
            className={`rounded px-1.5 py-0.5 text-[10px] font-bold leading-none ${ENV_COLORS[envLabel]}`}
          >
            {envLabel}
          </span>
        )}
        <ChevronDown className="h-3 w-3 opacity-60" />
      </button>

      {isOpen && (
        <div
          className="absolute left-0 top-full z-50 mt-1 w-52 rounded-lg border border-white/10 bg-[#1a1a2e] py-1 shadow-2xl animate-in fade-in slide-in-from-top-1 duration-150"
          role="menu"
          aria-label="Site menu"
        >
          <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
            Navigate
          </div>
          <Link
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            onClick={closeDropdown}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-300 transition-colors hover:bg-white/5 hover:text-white"
            role="menuitem"
          >
            <Globe className="h-4 w-4" />
            Visit Site
          </Link>
          <Link
            href="/admin"
            onClick={closeDropdown}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-300 transition-colors hover:bg-white/5 hover:text-white"
            role="menuitem"
          >
            <Wrench className="h-4 w-4" />
            Admin Panel
          </Link>
          <Link
            href="/admin/settings"
            onClick={closeDropdown}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-300 transition-colors hover:bg-white/5 hover:text-white"
            role="menuitem"
          >
            <Settings className="h-4 w-4" />
            Site Settings
          </Link>

          <div className="my-1 border-t border-white/5" />

          <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
            Quick Access
          </div>
          <Link
            href="/admin/posts"
            onClick={closeDropdown}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-300 transition-colors hover:bg-white/5 hover:text-white"
            role="menuitem"
          >
            <FileText className="h-4 w-4" />
            All Posts
          </Link>
          <Link
            href="/admin/comments"
            onClick={closeDropdown}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-300 transition-colors hover:bg-white/5 hover:text-white"
            role="menuitem"
          >
            <MessageSquare className="h-4 w-4" />
            Comments
          </Link>
          <Link
            href="/admin/media"
            onClick={closeDropdown}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-300 transition-colors hover:bg-white/5 hover:text-white"
            role="menuitem"
          >
            <ImageIcon className="h-4 w-4" />
            Media Library
          </Link>
          <Link
            href="/admin/seo"
            onClick={closeDropdown}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-300 transition-colors hover:bg-white/5 hover:text-white"
            role="menuitem"
          >
            <BarChart3 className="h-4 w-4" />
            SEO Dashboard
          </Link>

          <div className="my-1 border-t border-white/5" />

          <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
            Tools
          </div>
          <button
            onClick={handleClearCache}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-gray-300 transition-colors hover:bg-white/5 hover:text-white"
            role="menuitem"
          >
            <Trash2 className="h-4 w-4" />
            Clear Cache
          </button>
          <button
            onClick={handleRebuild}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-gray-300 transition-colors hover:bg-white/5 hover:text-white"
            role="menuitem"
          >
            <RefreshCw className="h-4 w-4" />
            Rebuild Site
          </button>
        </div>
      )}
    </div>
  );
}
