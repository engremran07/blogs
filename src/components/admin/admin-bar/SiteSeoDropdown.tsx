"use client";

import { useCallback } from "react";
import { BarChart3, Loader2, X } from "lucide-react";
import { clsx } from "clsx";
import { useAdminBar } from "./AdminBarProvider";
import { useSiteSeoOverview } from "../useSiteSeoOverview";
import { SEO_SCORE_GOOD, SEO_SCORE_FAIR } from "./constants";

const DROPDOWN_ID = "site-seo-panel";

function scoreColor(score: number | null): string {
  if (score === null) return "text-gray-400";
  if (score >= SEO_SCORE_GOOD) return "text-green-400";
  if (score >= SEO_SCORE_FAIR) return "text-amber-400";
  return "text-red-400";
}

function scoreBg(score: number | null): string {
  if (score === null) return "bg-gray-800/50";
  if (score >= SEO_SCORE_GOOD) return "bg-green-900/30";
  if (score >= SEO_SCORE_FAIR) return "bg-amber-900/30";
  return "bg-red-900/30";
}

export function SiteSeoDropdown() {
  const { activeDropdown, toggleDropdown, closeDropdown, settings } = useAdminBar();
  const isOpen = activeDropdown === DROPDOWN_ID;
  const seo = useSiteSeoOverview();

  const handleToggle = useCallback(() => {
    toggleDropdown(DROPDOWN_ID);
    if (!isOpen) seo.refresh();
  }, [toggleDropdown, isOpen, seo]);

  if (!settings.adminBarShowSeoScore) return null;

  const score = seo.data?.overallScore ?? null;

  return (
    <div className="relative" data-admin-bar-dropdown>
      <button
        onClick={handleToggle}
        className={clsx(
          "flex items-center gap-1 rounded px-2 py-1 text-sm transition-colors hover:bg-white/10",
          scoreColor(score),
        )}
        aria-label={`Site SEO${score !== null ? `: ${score}/100` : ""}`}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        <BarChart3 className="h-3.5 w-3.5" />
        {seo.loading ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : score !== null ? (
          <span className="font-mono text-xs font-bold">{score}</span>
        ) : (
          <span className="text-xs">Site SEO</span>
        )}
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-full z-50 mt-1 w-80 rounded-lg border border-white/10 bg-[#1a1a2e] p-4 shadow-2xl animate-in fade-in slide-in-from-top-1 duration-150"
          role="dialog"
          aria-label="Site SEO Overview"
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-300">
              Site SEO Overview
            </span>
            <button
              onClick={closeDropdown}
              className="text-gray-500 hover:text-gray-300"
              aria-label="Close Site SEO panel"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {seo.loading && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          )}

          {seo.error && (
            <div className="rounded bg-red-900/30 px-3 py-2 text-xs text-red-400">
              {seo.error}
            </div>
          )}

          {!seo.loading && !seo.error && seo.data && (
            <>
              <div className={clsx("mb-3 rounded-lg py-3 text-center", scoreBg(score))}>
                <span className={clsx("text-3xl font-bold", scoreColor(score))}>
                  {score}
                </span>
                <span className="ml-1 text-xs text-gray-400">/100</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-300">
                <div className="rounded bg-white/5 px-2 py-1">
                  Posts: {seo.data.totalPosts}
                </div>
                <div className="rounded bg-white/5 px-2 py-1">
                  Pages: {seo.data.totalPages}
                </div>
                <div className="rounded bg-white/5 px-2 py-1">
                  Missing titles: {seo.data.missingFields.seoTitle}
                </div>
                <div className="rounded bg-white/5 px-2 py-1">
                  Missing desc: {seo.data.missingFields.seoDescription}
                </div>
              </div>

              <div className="mt-3 border-t border-white/5 pt-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                  Score Distribution
                </span>
                <div className="mt-1 grid grid-cols-2 gap-2 text-[11px] text-gray-400">
                  <span>Excellent: {seo.data.scoreDistribution.excellent}</span>
                  <span>Good: {seo.data.scoreDistribution.good}</span>
                  <span>Needs work: {seo.data.scoreDistribution.needsWork}</span>
                  <span>Poor: {seo.data.scoreDistribution.poor}</span>
                </div>
              </div>

              <div className="mt-3">
                <button
                  onClick={() => seo.refresh()}
                  className="w-full rounded bg-white/5 px-2 py-1.5 text-xs text-gray-300 transition-colors hover:bg-white/10"
                >
                  Refresh Overview
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
