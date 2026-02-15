"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
  TrendingUp,
  FileText,
  File,
  Search,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Eye,
  Image as ImageIcon,
  Type,
  AlignLeft,
} from "lucide-react";
import Link from "next/link";
import { clsx } from "clsx";

// ─── Types ──────────────────────────────────────────────────────────────

interface SeoOverview {
  overallScore: number;
  totalPosts: number;
  totalPages: number;
  totalContent: number;
  issueCounts: { CRITICAL: number; IMPORTANT: number; OPTIONAL: number; INFO: number };
  missingFields: {
    seoTitle: number;
    seoDescription: number;
    featuredImage: number;
    excerpt: number;
  };
  scoreDistribution: { excellent: number; good: number; needsWork: number; poor: number };
  worstContent: {
    id: string;
    title: string;
    type: string;
    score: number;
    topIssues: string[];
  }[];
}

interface AuditItem {
  targetType: string;
  targetId: string;
  overallScore: number;
  title: string;
  slug: string;
  status: string;
  failCount: number;
  warnCount: number;
  passCount: number;
  checks: {
    name: string;
    status: string;
    severity: string;
    message: string;
    recommendation?: string;
    score: number;
    maxScore: number;
  }[];
  recommendations: string[];
}

// ─── Helpers ────────────────────────────────────────────────────────────

function scoreColor(score: number) {
  if (score >= 80) return "text-green-600 dark:text-green-400";
  if (score >= 60) return "text-yellow-600 dark:text-yellow-400";
  if (score >= 40) return "text-orange-600 dark:text-orange-400";
  return "text-red-600 dark:text-red-400";
}

function scoreBg(score: number) {
  if (score >= 80) return "bg-green-100 dark:bg-green-900/30";
  if (score >= 60) return "bg-yellow-100 dark:bg-yellow-900/30";
  if (score >= 40) return "bg-orange-100 dark:bg-orange-900/30";
  return "bg-red-100 dark:bg-red-900/30";
}

function scoreLabel(score: number) {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Needs Work";
  return "Poor";
}

function ScoreCircle({ score, size = "lg" }: { score: number; size?: "sm" | "md" | "lg" }) {
  const sizeMap = { sm: "h-12 w-12 text-lg", md: "h-16 w-16 text-xl", lg: "h-24 w-24 text-3xl" };
  return (
    <div className={clsx("rounded-full flex items-center justify-center font-bold border-4", sizeMap[size], scoreBg(score), scoreColor(score),
      score >= 80 ? "border-green-300 dark:border-green-700" :
      score >= 60 ? "border-yellow-300 dark:border-yellow-700" :
      score >= 40 ? "border-orange-300 dark:border-orange-700" :
      "border-red-300 dark:border-red-700"
    )}>
      {score}
    </div>
  );
}

// ─── Main ───────────────────────────────────────────────────────────────

export default function SeoAdminPage() {
  const [tab, setTab] = useState<"overview" | "audit">("overview");
  const [overview, setOverview] = useState<SeoOverview | null>(null);
  const [auditResults, setAuditResults] = useState<AuditItem[]>([]);
  const [auditFilter, setAuditFilter] = useState<"all" | "posts" | "pages">("all");
  const [auditSearch, setAuditSearch] = useState("");
  const [auditSort, setAuditSort] = useState<"score-asc" | "score-desc" | "fails">("score-asc");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [auditPage, setAuditPage] = useState(1);
  const auditPerPage = 15;
  const [loading, setLoading] = useState(false);
  const [overviewPage, setOverviewPage] = useState(1);
  const overviewPerPage = 10;

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/seo?action=overview");
      const data = await res.json();
      if (data.success) setOverview(data.data);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  const fetchAudit = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/seo?action=audit-all&type=${auditFilter}`);
      const data = await res.json();
      if (data.success) setAuditResults(data.data);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [auditFilter]);

  useEffect(() => {
    if (tab === "overview") fetchOverview();
    else fetchAudit();
  }, [tab, fetchOverview, fetchAudit]);

  const filteredAudits = auditResults
    .filter(a => !auditSearch || a.title.toLowerCase().includes(auditSearch.toLowerCase()) || a.slug.toLowerCase().includes(auditSearch.toLowerCase()))
    .sort((a, b) => {
      if (auditSort === "score-asc") return a.overallScore - b.overallScore;
      if (auditSort === "score-desc") return b.overallScore - a.overallScore;
      return b.failCount - a.failCount;
    });

  const auditTotalPages = Math.ceil(filteredAudits.length / auditPerPage);
  const paginatedAudits = filteredAudits.slice((auditPage - 1) * auditPerPage, auditPage * auditPerPage);

  useEffect(() => { setAuditPage(1); }, [auditSearch, auditFilter, auditSort]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="h-7 w-7" /> SEO Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Audit and optimize your content for search engines
          </p>
        </div>
        <button
          onClick={() => tab === "overview" ? fetchOverview() : fetchAudit()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          <RefreshCw className={clsx("h-4 w-4", loading && "animate-spin")} />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
        {(["overview", "audit"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={clsx(
              "flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors",
              tab === t ? "bg-white text-gray-900 shadow dark:bg-gray-700 dark:text-white" : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            )}
          >
            {t === "overview" ? "Overview" : "Content Audit"}
          </button>
        ))}
      </div>

      {/* Loading skeleton */}
      {loading && !overview && !auditResults.length && (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      )}

      {/* ─── OVERVIEW TAB ─── */}
      {tab === "overview" && overview && (
        <div className="space-y-6">
          {/* Score + Stats Row */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Overall Score */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800 flex items-center gap-4">
              <ScoreCircle score={overview.overallScore} />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Overall SEO Score</p>
                <p className={clsx("text-lg font-bold", scoreColor(overview.overallScore))}>
                  {scoreLabel(overview.overallScore)}
                </p>
                <p className="text-xs text-gray-400">{overview.totalContent} pages analyzed</p>
              </div>
            </div>

            {/* Critical Issues */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="h-5 w-5 text-red-500" />
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Critical Issues</span>
              </div>
              <p className="text-3xl font-bold text-red-600 dark:text-red-400">{overview.issueCounts.CRITICAL}</p>
              <p className="text-xs text-gray-400 mt-1">+ {overview.issueCounts.IMPORTANT} important</p>
            </div>

            {/* Posts */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-5 w-5 text-blue-500" />
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Posts Analyzed</span>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{overview.totalPosts}</p>
              <p className="text-xs text-gray-400 mt-1">{overview.totalPages} pages</p>
            </div>

            {/* Score Distribution */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Distribution</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-3 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex">
                  {overview.totalContent > 0 && (
                    <>
                      <div className="bg-green-500 h-full" style={{ width: `${(overview.scoreDistribution.excellent / overview.totalContent) * 100}%` }} />
                      <div className="bg-yellow-500 h-full" style={{ width: `${(overview.scoreDistribution.good / overview.totalContent) * 100}%` }} />
                      <div className="bg-orange-500 h-full" style={{ width: `${(overview.scoreDistribution.needsWork / overview.totalContent) * 100}%` }} />
                      <div className="bg-red-500 h-full" style={{ width: `${(overview.scoreDistribution.poor / overview.totalContent) * 100}%` }} />
                    </>
                  )}
                </div>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-1 text-xs text-gray-500 dark:text-gray-400">
                <span>🟢 {overview.scoreDistribution.excellent} excellent</span>
                <span>🟡 {overview.scoreDistribution.good} good</span>
                <span>🟠 {overview.scoreDistribution.needsWork} needs work</span>
                <span>🔴 {overview.scoreDistribution.poor} poor</span>
              </div>
            </div>
          </div>

          {/* Missing Fields Grid */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" /> Missing SEO Fields
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "SEO Title", count: overview.missingFields.seoTitle, icon: Type, total: overview.totalContent },
                { label: "SEO Description", count: overview.missingFields.seoDescription, icon: AlignLeft, total: overview.totalContent },
                { label: "Featured Image", count: overview.missingFields.featuredImage, icon: ImageIcon, total: overview.totalPosts, suffix: "posts" },
                { label: "Excerpt", count: overview.missingFields.excerpt, icon: FileText, total: overview.totalPosts, suffix: "posts" },
              ].map(item => (
                <div key={item.label} className="rounded-lg border border-gray-100 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-900">
                  <div className="flex items-center gap-2 mb-2">
                    <item.icon className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{item.label}</span>
                  </div>
                  <p className={clsx("text-2xl font-bold", item.count > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400")}>
                    {item.count}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">of {item.total} {item.suffix || "content items"}</p>
                  {item.total > 0 && (
                    <div className="mt-2 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                      <div
                        className={clsx("h-full rounded-full", item.count > 0 ? "bg-red-500" : "bg-green-500")}
                        style={{ width: `${((item.total - item.count) / item.total) * 100}%` }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Worst Content */}
          {overview.worstContent.length > 0 && (() => {
            const overviewTotalPages = Math.ceil(overview.worstContent.length / overviewPerPage);
            const paginatedWorst = overview.worstContent.slice((overviewPage - 1) * overviewPerPage, overviewPage * overviewPerPage);
            return (
            <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
              <div className="p-6 pb-4">
                <h2 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-500" /> Content Needing Attention
                  <span className="text-sm font-normal text-gray-400">({overview.worstContent.length})</span>
                </h2>
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {paginatedWorst.map(item => (
                    <div key={item.id} className="flex items-center gap-4 py-3">
                      <ScoreCircle score={item.score} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {item.type === "POST" ? <FileText className="h-4 w-4 text-blue-500 shrink-0" /> : <File className="h-4 w-4 text-purple-500 shrink-0" />}
                          <p className="font-medium text-gray-900 dark:text-white truncate">{item.title}</p>
                        </div>
                        {item.topIssues.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {item.topIssues.map((issue, i) => (
                              <span key={i} className="inline-flex items-center rounded px-1.5 py-0.5 text-xs bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                {issue.substring(0, 60)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <Link
                        href={`/admin/seo/fix/${item.id}?type=${item.type}`}
                        className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-blue-600 dark:hover:bg-gray-700"
                        title="Fix SEO"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
              {overviewTotalPages > 1 && (
                <div className="flex items-center justify-between border-t border-gray-200 px-6 py-3 dark:border-gray-700">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Showing {(overviewPage - 1) * overviewPerPage + 1}\u2013{Math.min(overviewPage * overviewPerPage, overview.worstContent.length)} of {overview.worstContent.length}</p>
                  <div className="flex gap-1">
                    <button disabled={overviewPage <= 1} onClick={() => setOverviewPage(overviewPage - 1)} className="rounded px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700">Prev</button>
                    <button disabled={overviewPage >= overviewTotalPages} onClick={() => setOverviewPage(overviewPage + 1)} className="rounded px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700">Next</button>
                  </div>
                </div>
              )}
            </div>
            );
          })()}
        </div>
      )}

      {/* ─── AUDIT TAB ─── */}
      {tab === "audit" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-50 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={auditSearch}
                onChange={e => setAuditSearch(e.target.value)}
                placeholder="Search content..."
                className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </div>

            <select
              value={auditFilter}
              onChange={e => { setAuditFilter(e.target.value as "all" | "posts" | "pages"); }}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            >
              <option value="all">All Content</option>
              <option value="posts">Posts Only</option>
              <option value="pages">Pages Only</option>
            </select>

            <select
              value={auditSort}
              onChange={e => setAuditSort(e.target.value as "score-asc" | "score-desc" | "fails")}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            >
              <option value="score-asc">Worst First</option>
              <option value="score-desc">Best First</option>
              <option value="fails">Most Issues</option>
            </select>
          </div>

          {/* Results Count */}
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {filteredAudits.length} items {auditSearch && `matching "${auditSearch}"`}
            {auditTotalPages > 1 && ` · Page ${auditPage} of ${auditTotalPages}`}
          </p>

          {/* Audit List */}
          <div className="space-y-2">
            {paginatedAudits.map(item => (
              <div key={item.targetId} className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 overflow-hidden">
                <button
                  onClick={() => setExpandedId(expandedId === item.targetId ? null : item.targetId)}
                  className="w-full flex items-center gap-4 p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <ScoreCircle score={item.overallScore} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {item.targetType === "POST" ? <FileText className="h-4 w-4 text-blue-500 shrink-0" /> : <File className="h-4 w-4 text-purple-500 shrink-0" />}
                      <p className="font-medium text-gray-900 dark:text-white truncate">{item.title}</p>
                      <span className={clsx("shrink-0 rounded px-1.5 py-0.5 text-xs font-medium",
                        item.status === "PUBLISHED" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                        item.status === "DRAFT" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" :
                        "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                      )}>{item.status}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                      <span className="text-red-500">{item.failCount} fails</span>
                      <span className="text-yellow-500">{item.warnCount} warnings</span>
                      <span className="text-green-500">{item.passCount} passed</span>
                    </div>
                  </div>
                  <div className="shrink-0">
                    {expandedId === item.targetId ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
                  </div>
                </button>

                {expandedId === item.targetId && (
                  <div className="border-t border-gray-100 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900">
                    {/* Per-check details */}
                    <div className="space-y-2 mb-4">
                      {item.checks.map((check, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm">
                          {check.status === "pass" && <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />}
                          {check.status === "fail" && <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />}
                          {check.status === "warn" && <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />}
                          {check.status === "info" && <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />}
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900 dark:text-white">{check.name}</span>
                              <span className={clsx("rounded px-1 py-0.5 text-xs",
                                check.severity === "CRITICAL" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                                check.severity === "IMPORTANT" ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" :
                                check.severity === "OPTIONAL" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                                "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                              )}>{check.severity}</span>
                              <span className="text-gray-400 text-xs">{check.score}/{check.maxScore}</span>
                            </div>
                            <p className="text-gray-600 dark:text-gray-400">{check.message}</p>
                            {check.recommendation && (
                              <p className="mt-0.5 text-blue-600 dark:text-blue-400 text-xs">💡 {check.recommendation}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Action links */}
                    <div className="flex gap-2">
                      <Link
                        href={`/admin/seo/fix/${item.targetId}?type=${item.targetType}`}
                        className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                      >
                        <Eye className="h-3.5 w-3.5" /> Fix SEO
                      </Link>
                      <Link
                        href={item.targetType === "POST" ? `/blog/${item.slug}` : `/${item.slug}`}
                        target="_blank"
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                      >
                        <ExternalLink className="h-3.5 w-3.5" /> View
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {filteredAudits.length === 0 && !loading && (
              <div className="py-12 text-center text-gray-500 dark:text-gray-400">
                <BarChart3 className="mx-auto h-12 w-12 mb-3 text-gray-300 dark:text-gray-600" />
                <p>No content found to audit</p>
              </div>
            )}
          </div>

          {auditTotalPages > 1 && (
            <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
              <p className="text-sm text-gray-500 dark:text-gray-400">Showing {(auditPage - 1) * auditPerPage + 1}–{Math.min(auditPage * auditPerPage, filteredAudits.length)} of {filteredAudits.length}</p>
              <div className="flex gap-1">
                <button disabled={auditPage <= 1} onClick={() => setAuditPage(auditPage - 1)} className="rounded px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700">Prev</button>
                <button disabled={auditPage >= auditTotalPages} onClick={() => setAuditPage(auditPage + 1)} className="rounded px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700">Next</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
