"use client";

import Link from "next/link";
import {
  Globe,
  Settings,
  Trash2,
  RefreshCw,
  ChevronDown,
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
  const { activeDropdown, toggleDropdown, closeDropdown, siteName, envLabel, settings } =
    useAdminBar();
  const isOpen = activeDropdown === DROPDOWN_ID;

  if (!settings.adminBarShowSiteNameDropdown) return null;

  async function handleClearCache() {
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
  }

  async function handleRebuild() {
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
  }

  return (
    <div className="relative" data-admin-bar-dropdown>
      <button
        onClick={() => toggleDropdown(DROPDOWN_ID)}
        className="flex items-center gap-1.5 rounded px-2 py-1 text-sm font-semibold text-white transition-colors hover:bg-white/10"
      >
        <span className="max-w-[140px] truncate">{siteName}</span>
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
        <div className="absolute left-0 top-full z-50 mt-1 w-52 rounded-lg border border-white/10 bg-[#1a1a2e] py-1 shadow-2xl animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
            Navigate
          </div>
          <Link
            href="/"
            target="_blank"
            onClick={closeDropdown}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-300 transition-colors hover:bg-white/5 hover:text-white"
          >
            <Globe className="h-4 w-4" />
            Visit Site
          </Link>
          <Link
            href="/admin"
            onClick={closeDropdown}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-300 transition-colors hover:bg-white/5 hover:text-white"
          >
            <Settings className="h-4 w-4" />
            Admin Panel
          </Link>
          <Link
            href="/admin/settings"
            onClick={closeDropdown}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-300 transition-colors hover:bg-white/5 hover:text-white"
          >
            <Settings className="h-4 w-4" />
            Site Settings
          </Link>

          <div className="my-1 border-t border-white/5" />

          <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
            Tools
          </div>
          <button
            onClick={handleClearCache}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-gray-300 transition-colors hover:bg-white/5 hover:text-white"
          >
            <Trash2 className="h-4 w-4" />
            Clear Cache
          </button>
          <button
            onClick={handleRebuild}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-gray-300 transition-colors hover:bg-white/5 hover:text-white"
          >
            <RefreshCw className="h-4 w-4" />
            Rebuild Site
          </button>
        </div>
      )}
    </div>
  );
}
