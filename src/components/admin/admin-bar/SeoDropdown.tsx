"use client";

import {
  BarChart3,
  Loader2,
  Check,
  X,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import { clsx } from "clsx";
import { useAdminBar } from "./AdminBarProvider";
import { useSeoScore } from "../useSeoScore";
import type { RouteIntelligence } from "./useRouteIntelligence";
import type { EditorStatus } from "../EditorContext";

const DROPDOWN_ID = "seo-panel";

function scoreColor(score: number | null): string {
  if (score === null) return "text-gray-400";
  if (score >= 80) return "text-green-400";
  if (score >= 50) return "text-amber-400";
  return "text-red-400";
}

function scoreLabel(score: number | null): string {
  if (score === null) return "";
  if (score >= 80) return "Good";
  if (score >= 50) return "Needs Work";
  return "Poor";
}

function scoreBg(score: number | null): string {
  if (score === null) return "bg-gray-800/50";
  if (score >= 80) return "bg-green-900/30";
  if (score >= 50) return "bg-amber-900/30";
  return "bg-red-900/30";
}

export function SeoDropdown({
  route,
  editor,
}: {
  route: RouteIntelligence;
  editor: EditorStatus | null;
}) {
  const { activeDropdown, toggleDropdown, closeDropdown, settings } = useAdminBar();
  const isOpen = activeDropdown === DROPDOWN_ID;

  const seo = useSeoScore({
    resourceType: route.resourceType,
    resourceId: editor?.postId ?? editor?.pageId ?? route.resourceId,
  });

  if (!settings.adminBarShowSeoScore) return null;

  function handleToggle() {
    toggleDropdown(DROPDOWN_ID);
    if (!isOpen) seo.refresh();
  }

  return (
    <div className="relative" data-admin-bar-dropdown>
      <button
        onClick={handleToggle}
        className={clsx(
          "flex items-center gap-1 rounded px-2 py-1 text-sm transition-colors hover:bg-white/10",
          scoreColor(seo.score),
        )}
        title="SEO Score"
      >
        <BarChart3 className="h-3.5 w-3.5" />
        {seo.loading ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : seo.score !== null ? (
          <span className="font-mono text-xs font-bold">{seo.score}</span>
        ) : (
          <span className="text-xs">SEO</span>
        )}
      </button>

      {isOpen && (
        <div className="absolute left-1/2 top-full z-50 mt-1 w-80 -translate-x-1/2 rounded-lg border border-white/10 bg-[#1a1a2e] p-4 shadow-2xl animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-300">SEO Audit</span>
            <button onClick={closeDropdown} className="text-gray-500 hover:text-gray-300">
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

          {!seo.loading && !seo.error && seo.score !== null && (
            <>
              {/* Score circle */}
              <div className={clsx("mb-3 rounded-lg py-3 text-center", scoreBg(seo.score))}>
                <span className={clsx("text-3xl font-bold", scoreColor(seo.score))}>
                  {seo.score}
                </span>
                <span className="ml-1 text-xs text-gray-400">/100</span>
                <div className={clsx("mt-0.5 text-xs font-medium", scoreColor(seo.score))}>
                  {scoreLabel(seo.score)}
                </div>
              </div>

              {/* Checklist */}
              {seo.checks.length > 0 && (
                <ul className="max-h-40 space-y-1 overflow-y-auto">
                  {seo.checks.slice(0, 8).map((c, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-[11px]">
                      {c.status === "pass" ? (
                        <Check className="mt-0.5 h-3 w-3 shrink-0 text-green-400" />
                      ) : c.status === "fail" ? (
                        <X className="mt-0.5 h-3 w-3 shrink-0 text-red-400" />
                      ) : (
                        <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-amber-400" />
                      )}
                      <span className="text-gray-300">{c.message}</span>
                    </li>
                  ))}
                </ul>
              )}

              {/* Recommendations */}
              {seo.recommendations.length > 0 && (
                <div className="mt-3 border-t border-white/5 pt-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                    Top Recommendations
                  </span>
                  <ul className="mt-1 space-y-0.5">
                    {seo.recommendations.slice(0, 3).map((r, i) => (
                      <li key={i} className="text-[11px] text-gray-400">
                        • {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Actions */}
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => seo.refresh()}
                  className="flex-1 rounded bg-white/5 px-2 py-1.5 text-xs text-gray-300 transition-colors hover:bg-white/10"
                >
                  Refresh Score
                </button>
                {editor?.postId && (
                  <a
                    href={`/admin/seo?post=${editor.postId}`}
                    className="flex items-center gap-1 rounded bg-white/5 px-2 py-1.5 text-xs text-gray-300 transition-colors hover:bg-white/10"
                    onClick={closeDropdown}
                  >
                    Full Report <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
