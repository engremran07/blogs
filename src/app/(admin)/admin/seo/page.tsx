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
  Link2,
  Unlink,
  Network,
  Zap,
  ArrowRight,
  Globe,
  LinkIcon,
  ShieldCheck,
  Trash2,
  Plus,
  Ban,
  ThumbsUp,
  ThumbsDown,
  Database,
} from "lucide-react";
import Link from "next/link";
import { clsx } from "clsx";
import { toast } from "@/components/ui/Toast";
import {
  AdminPagination,
  ADMIN_PAGE_SIZE,
} from "@/components/ui/AdminPagination";

// ─── Types ──────────────────────────────────────────────────────────────

interface SeoOverview {
  overallScore: number;
  totalPosts: number;
  totalPages: number;
  totalContent: number;
  issueCounts: {
    CRITICAL: number;
    IMPORTANT: number;
    OPTIONAL: number;
    INFO: number;
  };
  missingFields: {
    seoTitle: number;
    seoDescription: number;
    featuredImage: number;
    excerpt: number;
  };
  scoreDistribution: {
    excellent: number;
    good: number;
    needsWork: number;
    poor: number;
  };
  worstContent: {
    id: string;
    title: string;
    type: string;
    score: number;
    topIssues: string[];
  }[];
}

interface InterlinkReport {
  totalContent: number;
  totalLinks: number;
  avgLinksPerContent: number;
  orphanContent: { id: string; title: string; type: string }[];
  hubContent: {
    id: string;
    title: string;
    type: string;
    outboundLinks: number;
    inboundLinks: number;
  }[];
  brokenLinks: { sourceId: string; sourceType: string; href: string }[];
  linkDistribution: { range: string; count: number }[];
  persistedLinks: {
    active: number;
    suggested: number;
    approved: number;
    rejected: number;
    broken: number;
    manual: number;
  };
  exclusionCount: number;
}

interface PersistedLink {
  id: string;
  sourceId: string;
  sourceType: string;
  targetId: string;
  targetType: string;
  anchorText: string;
  targetUrl: string;
  relevanceScore: number;
  status: string;
  origin: string;
  createdAt: string;
  updatedAt: string;
}

interface ExclusionRule {
  id: string;
  ruleType: string;
  phrase: string | null;
  contentId: string | null;
  contentType: string | null;
  pairedId: string | null;
  pairedType: string | null;
  reason: string | null;
  createdAt: string;
}

interface InterlinkScanResult {
  sourceId: string;
  sourceType: string;
  existingLinks: number;
  newCandidates: {
    sourceId: string;
    targetId: string;
    targetType: string;
    anchorText: string;
    relevanceScore: number;
    alreadyLinked: boolean;
  }[];
  brokenLinks: { href: string; anchorText: string }[];
  autoInserted: number;
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

function ScoreCircle({
  score,
  size = "lg",
}: {
  score: number;
  size?: "sm" | "md" | "lg";
}) {
  const sizeMap = {
    sm: "h-12 w-12 text-lg",
    md: "h-16 w-16 text-xl",
    lg: "h-24 w-24 text-3xl",
  };
  return (
    <div
      className={clsx(
        "rounded-full flex items-center justify-center font-bold border-4",
        sizeMap[size],
        scoreBg(score),
        scoreColor(score),
        score >= 80
          ? "border-green-300 dark:border-green-700"
          : score >= 60
            ? "border-yellow-300 dark:border-yellow-700"
            : score >= 40
              ? "border-orange-300 dark:border-orange-700"
              : "border-red-300 dark:border-red-700",
      )}
    >
      {score}
    </div>
  );
}

// ─── Main ───────────────────────────────────────────────────────────────

export default function SeoAdminPage() {
  const [tab, setTab] = useState<
    "overview" | "audit" | "interlinking" | "redirects"
  >("overview");
  const [overview, setOverview] = useState<SeoOverview | null>(null);
  const [auditResults, setAuditResults] = useState<AuditItem[]>([]);
  const [auditFilter, setAuditFilter] = useState<"all" | "posts" | "pages">(
    "all",
  );
  const [auditSearch, setAuditSearch] = useState("");
  const [auditSort, setAuditSort] = useState<
    "score-asc" | "score-desc" | "fails"
  >("score-asc");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [auditPage, setAuditPage] = useState(1);
  const auditPerPage = ADMIN_PAGE_SIZE;

  // Interlinking state
  const [interlinkReport, setInterlinkReport] =
    useState<InterlinkReport | null>(null);
  const [interlinkLoading, setInterlinkLoading] = useState(false);
  const [autoLinkRunning, setAutoLinkRunning] = useState(false);
  const [autoLinkResult, setAutoLinkResult] = useState<{
    scanned: number;
    totalInserted: number;
    totalBroken: number;
  } | null>(null);
  const [scanContentId, setScanContentId] = useState("");
  const [scanContentType, setScanContentType] = useState<"POST" | "PAGE">(
    "POST",
  );
  const [scanResult, setScanResult] = useState<InterlinkScanResult | null>(
    null,
  );
  const [scanLoading, setScanLoading] = useState(false);

  // Persisted links & exclusions state
  const [persistedLinks, setPersistedLinks] = useState<PersistedLink[]>([]);
  const [persistedTotal, setPersistedTotal] = useState(0);
  const [linksFilter, setLinksFilter] = useState<string>("");
  const [linksPage, setLinksPage] = useState(0);
  const [exclusions, setExclusions] = useState<ExclusionRule[]>([]);
  const [newExclPhrase, setNewExclPhrase] = useState("");
  const [newExclReason, setNewExclReason] = useState("");
  const [interlinkSubTab, setInterlinkSubTab] = useState<
    "overview" | "links" | "exclusions"
  >("overview");

  // Redirects state
  const [redirects, setRedirects] = useState<
    {
      id: string;
      fromPath: string;
      toPath: string;
      statusCode: number;
      isActive: boolean;
      hitCount: number;
    }[]
  >([]);
  const [redirectForm, setRedirectForm] = useState({
    fromPath: "",
    toPath: "",
    statusCode: 301,
    isActive: true,
  });
  const [redirectEditing, setRedirectEditing] = useState<string | null>(null);
  const [redirectSaving, setRedirectSaving] = useState(false);

  const [loading, setLoading] = useState(false);
  const [overviewPage, setOverviewPage] = useState(1);
  const overviewPerPage = ADMIN_PAGE_SIZE;

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/seo?action=overview");
      if (!res.ok) {
        toast("Failed to load SEO overview", "error");
        return;
      }
      const data = await res.json();
      if (data.success) setOverview(data.data);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAudit = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/seo?action=audit-all&type=${auditFilter}`);
      if (!res.ok) {
        toast("Failed to load audit", "error");
        return;
      }
      const data = await res.json();
      if (data.success) setAuditResults(data.data);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [auditFilter]);

  const fetchInterlinkReport = useCallback(async () => {
    setInterlinkLoading(true);
    try {
      const res = await fetch("/api/seo?action=interlink-report");
      if (!res.ok) {
        toast("Failed to load interlink report", "error");
        return;
      }
      const data = await res.json();
      if (data.success) setInterlinkReport(data.data);
    } catch {
      /* ignore */
    } finally {
      setInterlinkLoading(false);
    }
  }, []);

  const fetchPersistedLinks = useCallback(
    async (status?: string, offset = 0) => {
      try {
        const params = new URLSearchParams({
          action: "interlink-list-links",
          limit: "20",
          offset: String(offset),
        });
        if (status) params.set("status", status);
        const res = await fetch(`/api/seo?${params.toString()}`);
        if (!res.ok) {
          toast("Failed to load links", "error");
          return;
        }
        const data = await res.json();
        if (data.success) {
          setPersistedLinks(data.data.links);
          setPersistedTotal(data.data.total);
        }
      } catch {
        /* ignore */
      }
    },
    [],
  );

  const fetchExclusions = useCallback(async () => {
    try {
      const res = await fetch("/api/seo?action=interlink-list-exclusions");
      if (!res.ok) {
        toast("Failed to load exclusions", "error");
        return;
      }
      const data = await res.json();
      if (data.success) setExclusions(data.data);
    } catch {
      /* ignore */
    }
  }, []);

  const handleLinkAction = async (
    linkId: string,
    action: "interlink-approve" | "interlink-reject" | "interlink-remove",
  ) => {
    try {
      const res = await fetch("/api/seo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, linkId }),
      });
      if (!res.ok) {
        toast("Link action failed", "error");
        return;
      }
      const data = await res.json();
      if (data.success) {
        fetchPersistedLinks(linksFilter, linksPage);
        fetchInterlinkReport();
      }
    } catch {
      /* ignore */
    }
  };

  const handleApplyManualLink = async (linkId: string) => {
    try {
      const res = await fetch("/api/seo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "interlink-apply-manual", linkId }),
      });
      if (!res.ok) {
        toast("Failed to apply link", "error");
        return;
      }
      const data = await res.json();
      if (data.success) {
        fetchPersistedLinks(linksFilter, linksPage);
        fetchInterlinkReport();
      }
    } catch {
      /* ignore */
    }
  };

  const handleAddExclusion = async () => {
    if (!newExclPhrase.trim()) return;
    try {
      const res = await fetch("/api/seo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "interlink-add-exclusion",
          ruleType: "PHRASE",
          phrase: newExclPhrase.trim(),
          reason: newExclReason.trim() || undefined,
        }),
      });
      if (!res.ok) {
        toast("Failed to add exclusion", "error");
        return;
      }
      const data = await res.json();
      if (data.success) {
        setNewExclPhrase("");
        setNewExclReason("");
        fetchExclusions();
        fetchInterlinkReport();
      }
    } catch {
      /* ignore */
    }
  };

  const handleRemoveExclusion = async (exclusionId: string) => {
    try {
      const res = await fetch("/api/seo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "interlink-remove-exclusion",
          exclusionId,
        }),
      });
      if (!res.ok) {
        toast("Failed to remove exclusion", "error");
        return;
      }
      const data = await res.json();
      if (data.success) {
        fetchExclusions();
        fetchInterlinkReport();
      }
    } catch {
      /* ignore */
    }
  };

  // ─── Redirects API ───
  const fetchRedirects = useCallback(async () => {
    try {
      const res = await fetch("/api/seo/redirects");
      if (!res.ok) {
        toast("Failed to load redirects", "error");
        return;
      }
      const data = await res.json();
      if (data.success) setRedirects(data.data || []);
    } catch {
      /* ignore */
    }
  }, []);

  const saveRedirect = async () => {
    if (!redirectForm.fromPath || !redirectForm.toPath) return;
    setRedirectSaving(true);
    try {
      if (redirectEditing) {
        // Update — using DELETE + re-create since the API may not have PATCH
        const delRes = await fetch("/api/seo/redirects", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: redirectEditing }),
        });
        if (!delRes.ok) {
          toast("Failed to delete old redirect", "error");
          return;
        }
      }
      const res = await fetch("/api/seo/redirects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(redirectForm),
      });
      if (!res.ok) {
        toast("Failed to save redirect", "error");
        return;
      }
      const data = await res.json();
      if (data.success) {
        setRedirectForm({
          fromPath: "",
          toPath: "",
          statusCode: 301,
          isActive: true,
        });
        setRedirectEditing(null);
        fetchRedirects();
      }
    } catch {
      /* ignore */
    }
    setRedirectSaving(false);
  };

  const deleteRedirect = async (id: string) => {
    try {
      const res = await fetch("/api/seo/redirects", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        toast("Failed to delete redirect", "error");
        return;
      }
      const data = await res.json();
      if (data.success) fetchRedirects();
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    if (tab === "overview") fetchOverview();
    else if (tab === "audit") fetchAudit();
    else if (tab === "interlinking") {
      fetchInterlinkReport();
      fetchPersistedLinks();
      fetchExclusions();
    } else if (tab === "redirects") {
      fetchRedirects();
    }
  }, [
    tab,
    fetchOverview,
    fetchAudit,
    fetchInterlinkReport,
    fetchPersistedLinks,
    fetchExclusions,
    fetchRedirects,
  ]);

  const filteredAudits = auditResults
    .filter(
      (a) =>
        !auditSearch ||
        a.title.toLowerCase().includes(auditSearch.toLowerCase()) ||
        a.slug.toLowerCase().includes(auditSearch.toLowerCase()),
    )
    .sort((a, b) => {
      if (auditSort === "score-asc") return a.overallScore - b.overallScore;
      if (auditSort === "score-desc") return b.overallScore - a.overallScore;
      return b.failCount - a.failCount;
    });

  const auditTotalPages = Math.ceil(filteredAudits.length / auditPerPage);
  const paginatedAudits = filteredAudits.slice(
    (auditPage - 1) * auditPerPage,
    auditPage * auditPerPage,
  );

  useEffect(() => {
    setAuditPage(1);
  }, [auditSearch, auditFilter, auditSort]);

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
          onClick={() =>
            tab === "overview"
              ? fetchOverview()
              : tab === "audit"
                ? fetchAudit()
                : fetchInterlinkReport()
          }
          disabled={loading || interlinkLoading}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
        >
          <RefreshCw
            className={clsx(
              "h-4 w-4",
              (loading || interlinkLoading) && "animate-spin",
            )}
          />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
        {(["overview", "audit", "interlinking", "redirects"] as const).map(
          (t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={clsx(
                "flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors",
                tab === t
                  ? "bg-white text-gray-900 shadow dark:bg-gray-700 dark:text-white"
                  : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white",
              )}
            >
              {t === "overview"
                ? "Overview"
                : t === "audit"
                  ? "Content Audit"
                  : t === "interlinking"
                    ? "Interlinking"
                    : "Redirects"}
            </button>
          ),
        )}
      </div>

      {/* Loading skeleton */}
      {loading && !overview && !auditResults.length && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800"
            />
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
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Overall SEO Score
                </p>
                <p
                  className={clsx(
                    "text-lg font-bold",
                    scoreColor(overview.overallScore),
                  )}
                >
                  {scoreLabel(overview.overallScore)}
                </p>
                <p className="text-xs text-gray-400">
                  {overview.totalContent} pages analyzed
                </p>
              </div>
            </div>

            {/* Critical Issues */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="h-5 w-5 text-red-500" />
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Critical Issues
                </span>
              </div>
              <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                {overview.issueCounts.CRITICAL}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                + {overview.issueCounts.IMPORTANT} important
              </p>
            </div>

            {/* Posts */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Posts Analyzed
                </span>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {overview.totalPosts}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {overview.totalPages} pages
              </p>
            </div>

            {/* Score Distribution */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Distribution
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-3 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex">
                  {overview.totalContent > 0 && (
                    <>
                      <div
                        className="bg-green-500 h-full"
                        style={{
                          width: `${(overview.scoreDistribution.excellent / overview.totalContent) * 100}%`,
                        }}
                      />
                      <div
                        className="bg-yellow-500 h-full"
                        style={{
                          width: `${(overview.scoreDistribution.good / overview.totalContent) * 100}%`,
                        }}
                      />
                      <div
                        className="bg-orange-500 h-full"
                        style={{
                          width: `${(overview.scoreDistribution.needsWork / overview.totalContent) * 100}%`,
                        }}
                      />
                      <div
                        className="bg-red-500 h-full"
                        style={{
                          width: `${(overview.scoreDistribution.poor / overview.totalContent) * 100}%`,
                        }}
                      />
                    </>
                  )}
                </div>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-1 text-xs text-gray-500 dark:text-gray-400">
                <span>🟢 {overview.scoreDistribution.excellent} excellent</span>
                <span>🟡 {overview.scoreDistribution.good} good</span>
                <span>
                  🟠 {overview.scoreDistribution.needsWork} needs work
                </span>
                <span>🔴 {overview.scoreDistribution.poor} poor</span>
              </div>
            </div>
          </div>

          {/* Missing Fields Grid */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" /> Missing SEO
              Fields
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  label: "SEO Title",
                  count: overview.missingFields.seoTitle,
                  icon: Type,
                  total: overview.totalContent,
                },
                {
                  label: "SEO Description",
                  count: overview.missingFields.seoDescription,
                  icon: AlignLeft,
                  total: overview.totalContent,
                },
                {
                  label: "Featured Image",
                  count: overview.missingFields.featuredImage,
                  icon: ImageIcon,
                  total: overview.totalPosts,
                  suffix: "posts",
                },
                {
                  label: "Excerpt",
                  count: overview.missingFields.excerpt,
                  icon: FileText,
                  total: overview.totalPosts,
                  suffix: "posts",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-lg border border-gray-100 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-900"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <item.icon className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {item.label}
                    </span>
                  </div>
                  <p
                    className={clsx(
                      "text-2xl font-bold",
                      item.count > 0
                        ? "text-red-600 dark:text-red-400"
                        : "text-green-600 dark:text-green-400",
                    )}
                  >
                    {item.count}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    of {item.total} {item.suffix || "content items"}
                  </p>
                  {item.total > 0 && (
                    <div className="mt-2 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                      <div
                        className={clsx(
                          "h-full rounded-full",
                          item.count > 0 ? "bg-red-500" : "bg-green-500",
                        )}
                        style={{
                          width: `${((item.total - item.count) / item.total) * 100}%`,
                        }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Worst Content */}
          {overview.worstContent.length > 0 &&
            (() => {
              const overviewTotalPages = Math.ceil(
                overview.worstContent.length / overviewPerPage,
              );
              const paginatedWorst = overview.worstContent.slice(
                (overviewPage - 1) * overviewPerPage,
                overviewPage * overviewPerPage,
              );
              return (
                <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                  <div className="p-6 pb-4">
                    <h2 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <XCircle className="h-5 w-5 text-red-500" /> Content
                      Needing Attention
                      <span className="text-sm font-normal text-gray-400">
                        ({overview.worstContent.length})
                      </span>
                    </h2>
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                      {paginatedWorst.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-4 py-3"
                        >
                          <ScoreCircle score={item.score} size="sm" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              {item.type === "POST" ? (
                                <FileText className="h-4 w-4 text-primary shrink-0" />
                              ) : (
                                <File className="h-4 w-4 text-purple-500 shrink-0" />
                              )}
                              <p className="font-medium text-gray-900 dark:text-white truncate">
                                {item.title}
                              </p>
                            </div>
                            {item.topIssues.length > 0 && (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {item.topIssues.map((issue, i) => (
                                  <span
                                    key={i}
                                    className="inline-flex items-center rounded px-1.5 py-0.5 text-xs bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                  >
                                    {issue.substring(0, 60)}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <Link
                            href={`/admin/seo/fix/${item.id}?type=${item.type}`}
                            className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-primary dark:hover:bg-gray-700"
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
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Showing {(overviewPage - 1) * overviewPerPage + 1}\u2013
                        {Math.min(
                          overviewPage * overviewPerPage,
                          overview.worstContent.length,
                        )}{" "}
                        of {overview.worstContent.length}
                      </p>
                      <div className="flex gap-1">
                        <button
                          disabled={overviewPage <= 1}
                          onClick={() => setOverviewPage(overviewPage - 1)}
                          className="rounded px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          Prev
                        </button>
                        <button
                          disabled={overviewPage >= overviewTotalPages}
                          onClick={() => setOverviewPage(overviewPage + 1)}
                          className="rounded px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          Next
                        </button>
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
                onChange={(e) => setAuditSearch(e.target.value)}
                placeholder="Search content..."
                className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </div>

            <select
              value={auditFilter}
              onChange={(e) => {
                setAuditFilter(e.target.value as "all" | "posts" | "pages");
              }}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            >
              <option value="all">All Content</option>
              <option value="posts">Posts Only</option>
              <option value="pages">Pages Only</option>
            </select>

            <select
              value={auditSort}
              onChange={(e) =>
                setAuditSort(
                  e.target.value as "score-asc" | "score-desc" | "fails",
                )
              }
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            >
              <option value="score-asc">Worst First</option>
              <option value="score-desc">Best First</option>
              <option value="fails">Most Issues</option>
            </select>
          </div>

          {/* Results Count */}
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {filteredAudits.length} items{" "}
            {auditSearch && `matching "${auditSearch}"`}
            {auditTotalPages > 1 &&
              ` · Page ${auditPage} of ${auditTotalPages}`}
          </p>

          {/* Audit List */}
          <div className="space-y-2">
            {paginatedAudits.map((item) => (
              <div
                key={item.targetId}
                className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 overflow-hidden"
              >
                <button
                  onClick={() =>
                    setExpandedId(
                      expandedId === item.targetId ? null : item.targetId,
                    )
                  }
                  className="w-full flex items-center gap-4 p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <ScoreCircle score={item.overallScore} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {item.targetType === "POST" ? (
                        <FileText className="h-4 w-4 text-primary shrink-0" />
                      ) : (
                        <File className="h-4 w-4 text-purple-500 shrink-0" />
                      )}
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {item.title}
                      </p>
                      <span
                        className={clsx(
                          "shrink-0 rounded px-1.5 py-0.5 text-xs font-medium",
                          item.status === "PUBLISHED"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : item.status === "DRAFT"
                              ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                              : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400",
                        )}
                      >
                        {item.status}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                      <span className="text-red-500">
                        {item.failCount} fails
                      </span>
                      <span className="text-yellow-500">
                        {item.warnCount} warnings
                      </span>
                      <span className="text-green-500">
                        {item.passCount} passed
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0">
                    {expandedId === item.targetId ? (
                      <ChevronUp className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </button>

                {expandedId === item.targetId && (
                  <div className="border-t border-gray-100 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900">
                    {/* Per-check details */}
                    <div className="space-y-2 mb-4">
                      {item.checks.map((check, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm">
                          {check.status === "pass" && (
                            <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                          )}
                          {check.status === "fail" && (
                            <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                          )}
                          {check.status === "warn" && (
                            <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
                          )}
                          {check.status === "info" && (
                            <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900 dark:text-white">
                                {check.name}
                              </span>
                              <span
                                className={clsx(
                                  "rounded px-1 py-0.5 text-xs",
                                  check.severity === "CRITICAL"
                                    ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                    : check.severity === "IMPORTANT"
                                      ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                                      : check.severity === "OPTIONAL"
                                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                        : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400",
                                )}
                              >
                                {check.severity}
                              </span>
                              <span className="text-gray-400 text-xs">
                                {check.score}/{check.maxScore}
                              </span>
                            </div>
                            <p className="text-gray-600 dark:text-gray-400">
                              {check.message}
                            </p>
                            {check.recommendation && (
                              <p className="mt-0.5 text-blue-600 dark:text-blue-400 text-xs">
                                💡 {check.recommendation}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Action links */}
                    <div className="flex gap-2">
                      <Link
                        href={`/admin/seo/fix/${item.targetId}?type=${item.targetType}`}
                        className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90"
                      >
                        <Eye className="h-3.5 w-3.5" /> Fix SEO
                      </Link>
                      <Link
                        href={
                          item.targetType === "POST"
                            ? `/blog/${item.slug}`
                            : `/${item.slug}`
                        }
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

          <AdminPagination
            page={auditPage}
            totalPages={auditTotalPages}
            total={filteredAudits.length}
            pageSize={auditPerPage}
            onPageChange={setAuditPage}
          />
        </div>
      )}

      {/* ─── INTERLINKING TAB ─── */}
      {tab === "interlinking" && (
        <div className="space-y-6">
          {/* Loading */}
          {interlinkLoading && !interlinkReport && (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-32 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800"
                />
              ))}
            </div>
          )}

          {interlinkReport && (
            <>
              {/* Stats Row */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Globe className="h-5 w-5 text-primary" />
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Total Content
                    </span>
                  </div>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {interlinkReport.totalContent}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    published items analyzed
                  </p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                  <div className="flex items-center gap-2 mb-2">
                    <LinkIcon className="h-5 w-5 text-green-500" />
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Internal Links
                    </span>
                  </div>
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                    {interlinkReport.totalLinks}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    avg {interlinkReport.avgLinksPerContent} per page
                  </p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Unlink className="h-5 w-5 text-yellow-500" />
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Orphan Pages
                    </span>
                  </div>
                  <p
                    className={clsx(
                      "text-3xl font-bold",
                      interlinkReport.orphanContent.length > 0
                        ? "text-yellow-600 dark:text-yellow-400"
                        : "text-green-600 dark:text-green-400",
                    )}
                  >
                    {interlinkReport.orphanContent.length}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    no inbound links (invisible to crawlers)
                  </p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                  <div className="flex items-center gap-2 mb-2">
                    <XCircle className="h-5 w-5 text-red-500" />
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Broken Links
                    </span>
                  </div>
                  <p
                    className={clsx(
                      "text-3xl font-bold",
                      interlinkReport.brokenLinks.length > 0
                        ? "text-red-600 dark:text-red-400"
                        : "text-green-600 dark:text-green-400",
                    )}
                  >
                    {interlinkReport.brokenLinks.length}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    pointing to missing content
                  </p>
                </div>
              </div>

              {/* Persisted Links Summary */}
              {interlinkReport.persistedLinks && (
                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                  {[
                    {
                      label: "Active",
                      value: interlinkReport.persistedLinks.active,
                      icon: CheckCircle2,
                      color: "text-green-500",
                    },
                    {
                      label: "Suggested",
                      value: interlinkReport.persistedLinks.suggested,
                      icon: Info,
                      color: "text-primary",
                    },
                    {
                      label: "Approved",
                      value: interlinkReport.persistedLinks.approved,
                      icon: ThumbsUp,
                      color: "text-emerald-500",
                    },
                    {
                      label: "Rejected",
                      value: interlinkReport.persistedLinks.rejected,
                      icon: ThumbsDown,
                      color: "text-orange-500",
                    },
                    {
                      label: "Broken",
                      value: interlinkReport.persistedLinks.broken,
                      icon: Unlink,
                      color: "text-red-500",
                    },
                    {
                      label: "Manual",
                      value: interlinkReport.persistedLinks.manual,
                      icon: ShieldCheck,
                      color: "text-purple-500",
                    },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className="rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800"
                    >
                      <div className="flex items-center gap-1.5">
                        <s.icon className={clsx("h-4 w-4", s.color)} />
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {s.label}
                        </span>
                      </div>
                      <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                        {s.value}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Sub-tab navigation */}
              <div className="flex gap-1 rounded-lg bg-gray-100 dark:bg-gray-800 p-1">
                {(["overview", "links", "exclusions"] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => {
                      setInterlinkSubTab(st);
                      if (st === "links")
                        fetchPersistedLinks(linksFilter, linksPage);
                      if (st === "exclusions") fetchExclusions();
                    }}
                    className={clsx(
                      "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                      interlinkSubTab === st
                        ? "bg-white text-gray-900 shadow dark:bg-gray-700 dark:text-white"
                        : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200",
                    )}
                  >
                    {st === "overview"
                      ? "Dashboard"
                      : st === "links"
                        ? "Persisted Links"
                        : "Exclusion Rules"}
                  </button>
                ))}
              </div>

              {/* ─── Sub-tab: Overview ─── */}
              {interlinkSubTab === "overview" && (
                <>
                  {/* Auto-Link All Action */}
                  <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                          <Zap className="h-5 w-5 text-yellow-500" /> Auto-Link
                          All Content
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          Scan published content and automatically insert
                          internal links where matching phrases are found.
                        </p>
                      </div>
                      <button
                        onClick={async () => {
                          setAutoLinkRunning(true);
                          setAutoLinkResult(null);
                          try {
                            const res = await fetch(
                              "/api/seo?action=interlink-all&limit=100",
                            );
                            if (!res.ok) {
                              toast("Auto-link failed", "error");
                              setAutoLinkRunning(false);
                              return;
                            }
                            const data = await res.json();
                            if (data.success) {
                              setAutoLinkResult(data.data);
                              fetchInterlinkReport(); // refresh stats
                            }
                          } catch {
                            /* ignore */
                          } finally {
                            setAutoLinkRunning(false);
                          }
                        }}
                        disabled={autoLinkRunning}
                        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
                      >
                        {autoLinkRunning ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <Zap className="h-4 w-4" />
                        )}
                        {autoLinkRunning ? "Running…" : "Run Auto-Link"}
                      </button>
                    </div>
                    {autoLinkResult && (
                      <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
                        <div className="flex items-center gap-2 text-sm text-green-800 dark:text-green-300">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>
                            Scanned <strong>{autoLinkResult.scanned}</strong>{" "}
                            items — inserted{" "}
                            <strong>{autoLinkResult.totalInserted}</strong>{" "}
                            links — found{" "}
                            <strong>{autoLinkResult.totalBroken}</strong> broken
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Scan Individual Content */}
                  <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                    <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                      <Search className="h-5 w-5 text-primary" /> Scan
                      Individual Content
                    </h2>
                    <div className="flex flex-wrap items-end gap-3">
                      <div className="flex-1 min-w-48">
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                          Content ID
                        </label>
                        <input
                          type="text"
                          value={scanContentId}
                          onChange={(e) => setScanContentId(e.target.value)}
                          placeholder="Paste post or page ID…"
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                          Type
                        </label>
                        <select
                          value={scanContentType}
                          onChange={(e) =>
                            setScanContentType(
                              e.target.value as "POST" | "PAGE",
                            )
                          }
                          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                        >
                          <option value="POST">Post</option>
                          <option value="PAGE">Page</option>
                        </select>
                      </div>
                      <button
                        disabled={!scanContentId.trim() || scanLoading}
                        onClick={async () => {
                          setScanLoading(true);
                          setScanResult(null);
                          try {
                            const res = await fetch(
                              `/api/seo?action=interlink-scan&id=${scanContentId}&type=${scanContentType.toLowerCase()}`,
                            );
                            if (!res.ok) {
                              toast("Scan failed", "error");
                              setScanLoading(false);
                              return;
                            }
                            const data = await res.json();
                            if (data.success) setScanResult(data.data);
                          } catch {
                            /* ignore */
                          } finally {
                            setScanLoading(false);
                          }
                        }}
                        className="inline-flex items-center gap-2 rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50 dark:bg-gray-600 dark:hover:bg-gray-500"
                      >
                        {scanLoading ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <Search className="h-4 w-4" />
                        )}
                        Scan
                      </button>
                    </div>
                    {scanResult && (
                      <div className="mt-4 space-y-3">
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-gray-500 dark:text-gray-400">
                            Existing links:{" "}
                            <strong className="text-gray-900 dark:text-white">
                              {scanResult.existingLinks}
                            </strong>
                          </span>
                          <span className="text-green-600 dark:text-green-400">
                            New opportunities:{" "}
                            <strong>{scanResult.newCandidates.length}</strong>
                          </span>
                          <span className="text-red-600 dark:text-red-400">
                            Broken:{" "}
                            <strong>{scanResult.brokenLinks.length}</strong>
                          </span>
                        </div>
                        {scanResult.newCandidates.length > 0 && (
                          <div className="rounded-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
                                  <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-400">
                                    Anchor Text
                                  </th>
                                  <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-400">
                                    Target Type
                                  </th>
                                  <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-400">
                                    Relevance
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                                {scanResult.newCandidates.map((c, i) => (
                                  <tr key={i}>
                                    <td className="px-3 py-2 text-gray-900 dark:text-white font-medium">
                                      {c.anchorText}
                                    </td>
                                    <td className="px-3 py-2">
                                      <span
                                        className={clsx(
                                          "rounded px-1.5 py-0.5 text-xs font-medium",
                                          c.targetType === "POST"
                                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                            : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
                                        )}
                                      >
                                        {c.targetType}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2">
                                      <div className="flex items-center gap-2">
                                        <div className="h-1.5 w-16 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                                          <div
                                            className={clsx(
                                              "h-full rounded-full",
                                              c.relevanceScore >= 70
                                                ? "bg-green-500"
                                                : c.relevanceScore >= 40
                                                  ? "bg-yellow-500"
                                                  : "bg-red-500",
                                            )}
                                            style={{
                                              width: `${c.relevanceScore}%`,
                                            }}
                                          />
                                        </div>
                                        <span className="text-xs text-gray-500">
                                          {c.relevanceScore}
                                        </span>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                        {scanResult.brokenLinks.length > 0 && (
                          <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
                            <p className="text-sm font-medium text-red-800 dark:text-red-300 mb-2">
                              Broken Links Found:
                            </p>
                            <ul className="space-y-1">
                              {scanResult.brokenLinks.map((b, i) => (
                                <li
                                  key={i}
                                  className="text-xs text-red-700 dark:text-red-400 flex items-center gap-1"
                                >
                                  <Unlink className="h-3 w-3 shrink-0" />
                                  <code className="bg-red-100 dark:bg-red-900/30 px-1 py-0.5 rounded">
                                    {b.href}
                                  </code>
                                  {b.anchorText && (
                                    <span className="text-red-500">
                                      — &ldquo;{b.anchorText}&rdquo;
                                    </span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        <button
                          onClick={async () => {
                            try {
                              const res = await fetch(
                                `/api/seo?action=interlink-apply&id=${scanContentId}&type=${scanContentType.toLowerCase()}`,
                              );
                              if (!res.ok) {
                                toast("Failed to apply links", "error");
                                return;
                              }
                              const data = await res.json();
                              if (data.success) {
                                setScanResult(null);
                                setScanContentId("");
                                fetchInterlinkReport();
                              }
                            } catch {
                              /* ignore */
                            }
                          }}
                          disabled={scanResult.newCandidates.length === 0}
                          className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                        >
                          <Link2 className="h-3.5 w-3.5" />
                          Apply {scanResult.newCandidates.length} Links
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Link Distribution */}
                  <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                    <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                      <Network className="h-5 w-5 text-indigo-500" /> Link
                      Distribution
                    </h2>
                    <div className="space-y-3">
                      {interlinkReport.linkDistribution.map((d) => {
                        const maxCount = Math.max(
                          ...interlinkReport.linkDistribution.map(
                            (dd) => dd.count,
                          ),
                          1,
                        );
                        return (
                          <div
                            key={d.range}
                            className="flex items-center gap-3"
                          >
                            <span className="w-24 text-sm text-gray-600 dark:text-gray-400 shrink-0">
                              {d.range}
                            </span>
                            <div className="flex-1 h-6 rounded bg-gray-100 dark:bg-gray-700 overflow-hidden">
                              <div
                                className="h-full rounded bg-indigo-500 dark:bg-indigo-400 flex items-center justify-end pr-2"
                                style={{
                                  width: `${Math.max((d.count / maxCount) * 100, d.count > 0 ? 8 : 0)}%`,
                                }}
                              >
                                {d.count > 0 && (
                                  <span className="text-xs font-medium text-white">
                                    {d.count}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Two-column: Orphan Content + Hub Content */}
                  <div className="grid gap-6 lg:grid-cols-2">
                    {/* Orphan Content */}
                    <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                      <div className="p-5 pb-3">
                        <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                          <Unlink className="h-5 w-5 text-yellow-500" /> Orphan
                          Content
                          <span className="text-sm font-normal text-gray-400">
                            ({interlinkReport.orphanContent.length})
                          </span>
                        </h2>
                        <p className="text-xs text-gray-400 mt-1">
                          No internal links to or from these pages —
                          they&apos;re invisible to crawlers.
                        </p>
                      </div>
                      {interlinkReport.orphanContent.length > 0 ? (
                        <div className="divide-y divide-gray-100 border-t border-gray-100 dark:divide-gray-700/50 dark:border-gray-700 max-h-72 overflow-y-auto">
                          {interlinkReport.orphanContent.map((c) => (
                            <div
                              key={c.id}
                              className="flex items-center gap-2 px-5 py-3"
                            >
                              {c.type === "POST" ? (
                                <FileText className="h-4 w-4 text-primary shrink-0" />
                              ) : (
                                <File className="h-4 w-4 text-purple-500 shrink-0" />
                              )}
                              <span className="text-sm text-gray-900 dark:text-white truncate flex-1">
                                {c.title}
                              </span>
                              <span className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                                {c.type}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="border-t border-gray-100 dark:border-gray-700 px-5 py-8 text-center text-sm text-gray-400">
                          <CheckCircle2 className="mx-auto h-8 w-8 text-green-400 mb-2" />
                          No orphan content — great!
                        </div>
                      )}
                    </div>

                    {/* Hub Content */}
                    <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                      <div className="p-5 pb-3">
                        <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                          <Network className="h-5 w-5 text-green-500" /> Hub
                          Pages
                          <span className="text-sm font-normal text-gray-400">
                            (top 10)
                          </span>
                        </h2>
                        <p className="text-xs text-gray-400 mt-1">
                          Most connected content — hubs distribute PageRank to
                          other pages.
                        </p>
                      </div>
                      {interlinkReport.hubContent.length > 0 ? (
                        <div className="divide-y divide-gray-100 border-t border-gray-100 dark:divide-gray-700/50 dark:border-gray-700 max-h-72 overflow-y-auto">
                          {interlinkReport.hubContent.map((c) => (
                            <div
                              key={c.id}
                              className="flex items-center gap-2 px-5 py-3"
                            >
                              {c.type === "POST" ? (
                                <FileText className="h-4 w-4 text-primary shrink-0" />
                              ) : (
                                <File className="h-4 w-4 text-purple-500 shrink-0" />
                              )}
                              <span className="text-sm text-gray-900 dark:text-white truncate flex-1">
                                {c.title}
                              </span>
                              <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 shrink-0">
                                <span
                                  title="Outbound links"
                                  className="flex items-center gap-0.5"
                                >
                                  <ArrowRight className="h-3 w-3" />{" "}
                                  {c.outboundLinks}
                                </span>
                                <span
                                  title="Inbound links"
                                  className="flex items-center gap-0.5"
                                >
                                  <Link2 className="h-3 w-3" /> {c.inboundLinks}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="border-t border-gray-100 dark:border-gray-700 px-5 py-8 text-center text-sm text-gray-400">
                          No hub pages found yet
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Broken Links Detail */}
                  {interlinkReport.brokenLinks.length > 0 && (
                    <div className="rounded-xl border border-red-200 bg-white dark:border-red-800 dark:bg-gray-800">
                      <div className="p-5 pb-3">
                        <h2 className="font-semibold text-red-700 dark:text-red-400 flex items-center gap-2">
                          <XCircle className="h-5 w-5" /> Broken Internal Links
                          <span className="text-sm font-normal text-red-400">
                            ({interlinkReport.brokenLinks.length})
                          </span>
                        </h2>
                        <p className="text-xs text-gray-400 mt-1">
                          These links point to pages that no longer exist. Fix
                          or remove them.
                        </p>
                      </div>
                      <div className="max-h-64 overflow-y-auto divide-y divide-red-100 border-t border-red-100 dark:divide-red-900/30 dark:border-red-900/30">
                        {interlinkReport.brokenLinks.map((b, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-3 px-5 py-2.5 text-sm"
                          >
                            <Unlink className="h-4 w-4 text-red-400 shrink-0" />
                            <code className="rounded bg-red-50 px-1.5 py-0.5 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-400">
                              {b.href}
                            </code>
                            <ArrowRight className="h-3 w-3 text-gray-300 shrink-0" />
                            <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              from {b.sourceType.toLowerCase()}{" "}
                              {b.sourceId.slice(0, 8)}…
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ─── Sub-tab: Persisted Links ─── */}
              {interlinkSubTab === "links" && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <Database className="h-5 w-5 text-primary" /> Persisted
                        Links
                        <span className="text-sm font-normal text-gray-400">
                          ({persistedTotal})
                        </span>
                      </h2>
                      <div className="flex gap-2">
                        <select
                          value={linksFilter}
                          onChange={(e) => {
                            setLinksFilter(e.target.value);
                            setLinksPage(0);
                            fetchPersistedLinks(e.target.value, 0);
                          }}
                          className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                        >
                          <option value="">All Statuses</option>
                          <option value="ACTIVE">Active</option>
                          <option value="SUGGESTED">Suggested</option>
                          <option value="APPROVED">Approved</option>
                          <option value="REJECTED">Rejected</option>
                          <option value="BROKEN">Broken</option>
                          <option value="REMOVED">Removed</option>
                        </select>
                      </div>
                    </div>

                    {persistedLinks.length > 0 ? (
                      <>
                        <div className="rounded-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
                                <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-400">
                                  Anchor
                                </th>
                                <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-400">
                                  Target URL
                                </th>
                                <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-400">
                                  Score
                                </th>
                                <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-400">
                                  Status
                                </th>
                                <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-400">
                                  Origin
                                </th>
                                <th className="px-3 py-2 text-right font-medium text-gray-500 dark:text-gray-400">
                                  Actions
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                              {persistedLinks.map((link) => (
                                <tr key={link.id}>
                                  <td className="px-3 py-2 text-gray-900 dark:text-white font-medium max-w-32 truncate">
                                    {link.anchorText}
                                  </td>
                                  <td className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 max-w-40 truncate">
                                    {link.targetUrl}
                                  </td>
                                  <td className="px-3 py-2">
                                    <span className="text-xs font-medium">
                                      {link.relevanceScore}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2">
                                    <span
                                      className={clsx(
                                        "rounded px-1.5 py-0.5 text-[10px] font-medium",
                                        link.status === "ACTIVE"
                                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                          : link.status === "SUGGESTED"
                                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                            : link.status === "APPROVED"
                                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                              : link.status === "REJECTED"
                                                ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                                                : link.status === "BROKEN"
                                                  ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                                  : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400",
                                      )}
                                    >
                                      {link.status}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2">
                                    <span className="text-[10px] text-gray-400">
                                      {link.origin}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                      {(link.status === "SUGGESTED" ||
                                        link.status === "APPROVED") && (
                                        <button
                                          onClick={() =>
                                            handleApplyManualLink(link.id)
                                          }
                                          className="rounded p-1 text-primary hover:bg-primary/5 dark:hover:bg-primary/10"
                                          title="Apply now"
                                        >
                                          <Zap className="h-3.5 w-3.5" />
                                        </button>
                                      )}
                                      {link.status === "SUGGESTED" && (
                                        <button
                                          onClick={() =>
                                            handleLinkAction(
                                              link.id,
                                              "interlink-approve",
                                            )
                                          }
                                          className="rounded p-1 text-green-500 hover:bg-green-50 dark:hover:bg-green-900/30"
                                          title="Approve"
                                        >
                                          <ThumbsUp className="h-3.5 w-3.5" />
                                        </button>
                                      )}
                                      {(link.status === "SUGGESTED" ||
                                        link.status === "ACTIVE") && (
                                        <button
                                          onClick={() =>
                                            handleLinkAction(
                                              link.id,
                                              "interlink-reject",
                                            )
                                          }
                                          className="rounded p-1 text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/30"
                                          title="Reject"
                                        >
                                          <ThumbsDown className="h-3.5 w-3.5" />
                                        </button>
                                      )}
                                      {link.status === "ACTIVE" && (
                                        <button
                                          onClick={() =>
                                            handleLinkAction(
                                              link.id,
                                              "interlink-remove",
                                            )
                                          }
                                          className="rounded p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30"
                                          title="Remove"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div className="flex items-center justify-between mt-3">
                          <span className="text-xs text-gray-400">
                            Showing {linksPage + 1}–
                            {Math.min(linksPage + 20, persistedTotal)} of{" "}
                            {persistedTotal}
                          </span>
                          <div className="flex gap-2">
                            <button
                              disabled={linksPage === 0}
                              onClick={() => {
                                const p = Math.max(0, linksPage - 20);
                                setLinksPage(p);
                                fetchPersistedLinks(linksFilter, p);
                              }}
                              className="rounded px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 disabled:opacity-40"
                            >
                              Previous
                            </button>
                            <button
                              disabled={linksPage + 20 >= persistedTotal}
                              onClick={() => {
                                const p = linksPage + 20;
                                setLinksPage(p);
                                fetchPersistedLinks(linksFilter, p);
                              }}
                              className="rounded px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 disabled:opacity-40"
                            >
                              Next
                            </button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-8 text-sm text-gray-400">
                        <Database className="mx-auto h-8 w-8 mb-2 opacity-40" />
                        No persisted links found. Run auto-link to generate
                        them.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ─── Sub-tab: Exclusion Rules ─── */}
              {interlinkSubTab === "exclusions" && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                    <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                      <Ban className="h-5 w-5 text-red-500" /> Exclusion Rules
                      <span className="text-sm font-normal text-gray-400">
                        ({exclusions.length})
                      </span>
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                      Add phrases that should never be auto-linked. Useful for
                      brand names, abbreviations, or common words.
                    </p>

                    {/* Add Phrase Exclusion */}
                    <div className="flex flex-wrap items-end gap-3 mb-6 p-4 rounded-lg bg-gray-50 dark:bg-gray-900">
                      <div className="flex-1 min-w-40">
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                          Phrase
                        </label>
                        <input
                          type="text"
                          value={newExclPhrase}
                          onChange={(e) => setNewExclPhrase(e.target.value)}
                          placeholder="e.g. WordPress, CSS, API…"
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                        />
                      </div>
                      <div className="flex-1 min-w-40">
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                          Reason (optional)
                        </label>
                        <input
                          type="text"
                          value={newExclReason}
                          onChange={(e) => setNewExclReason(e.target.value)}
                          placeholder="Why exclude this?"
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                        />
                      </div>
                      <button
                        onClick={handleAddExclusion}
                        disabled={!newExclPhrase.trim()}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        <Plus className="h-4 w-4" />
                        Add Exclusion
                      </button>
                    </div>

                    {exclusions.length > 0 ? (
                      <div className="divide-y divide-gray-100 dark:divide-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-700">
                        {exclusions.map((ex) => (
                          <div
                            key={ex.id}
                            className="flex items-center justify-between px-4 py-3"
                          >
                            <div className="flex items-center gap-3">
                              <span
                                className={clsx(
                                  "rounded px-1.5 py-0.5 text-[10px] font-medium",
                                  ex.ruleType === "PHRASE"
                                    ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                                    : ex.ruleType === "TARGET"
                                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                      : ex.ruleType === "SOURCE"
                                        ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                                        : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400",
                                )}
                              >
                                {ex.ruleType}
                              </span>
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {ex.phrase || ex.contentId?.slice(0, 8)}
                              </span>
                              {ex.reason && (
                                <span className="text-xs text-gray-400">
                                  — {ex.reason}
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() => handleRemoveExclusion(ex.id)}
                              className="rounded p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30"
                              title="Remove exclusion"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-sm text-gray-400">
                        <ShieldCheck className="mx-auto h-8 w-8 mb-2 opacity-40" />
                        No exclusion rules defined. Auto-linking is
                        unrestricted.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ─── REDIRECTS TAB ─── */}
      {tab === "redirects" && (
        <div className="space-y-6">
          {/* Add / Edit form */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
            <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              {redirectEditing ? "Edit Redirect" : "Add Redirect"}
            </h3>
            <div className="grid gap-4 sm:grid-cols-4">
              <div className="sm:col-span-1">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  From Path
                </label>
                <input
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  placeholder="/old-path"
                  value={redirectForm.fromPath}
                  onChange={(e) =>
                    setRedirectForm((f) => ({ ...f, fromPath: e.target.value }))
                  }
                />
              </div>
              <div className="sm:col-span-1">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  To Path
                </label>
                <input
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  placeholder="/new-path"
                  value={redirectForm.toPath}
                  onChange={(e) =>
                    setRedirectForm((f) => ({ ...f, toPath: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Type
                </label>
                <select
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  value={redirectForm.statusCode}
                  onChange={(e) =>
                    setRedirectForm((f) => ({
                      ...f,
                      statusCode: Number(e.target.value),
                    }))
                  }
                >
                  <option value={301}>301 Permanent</option>
                  <option value={302}>302 Temporary</option>
                  <option value={307}>307 Temporary (strict)</option>
                  <option value={308}>308 Permanent (strict)</option>
                </select>
              </div>
              <div className="flex items-end gap-2">
                <button
                  onClick={saveRedirect}
                  disabled={
                    redirectSaving ||
                    !redirectForm.fromPath ||
                    !redirectForm.toPath
                  }
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
                >
                  {redirectSaving
                    ? "Saving..."
                    : redirectEditing
                      ? "Update"
                      : "Add"}
                </button>
                {redirectEditing && (
                  <button
                    onClick={() => {
                      setRedirectEditing(null);
                      setRedirectForm({
                        fromPath: "",
                        toPath: "",
                        statusCode: 301,
                        isActive: true,
                      });
                    }}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Redirects list */}
          <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
            <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Active Redirects ({redirects.length})
              </h3>
            </div>
            {redirects.length > 0 ? (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {redirects.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between px-6 py-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={clsx(
                          "shrink-0 rounded px-2 py-0.5 text-xs font-medium",
                          r.statusCode === 301 || r.statusCode === 308
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
                        )}
                      >
                        {r.statusCode}
                      </span>
                      <span className="truncate text-sm font-mono text-gray-900 dark:text-white">
                        {r.fromPath}
                      </span>
                      <span className="text-gray-400">→</span>
                      <span className="truncate text-sm font-mono text-primary dark:text-primary">
                        {r.toPath}
                      </span>
                      {r.hitCount > 0 && (
                        <span className="text-xs text-gray-400">
                          {r.hitCount} hits
                        </span>
                      )}
                      {!r.isActive && (
                        <span className="rounded bg-gray-200 px-1.5 py-0.5 text-xs text-gray-500 dark:bg-gray-600 dark:text-gray-400">
                          disabled
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => {
                          setRedirectEditing(r.id);
                          setRedirectForm({
                            fromPath: r.fromPath,
                            toPath: r.toPath,
                            statusCode: r.statusCode,
                            isActive: r.isActive,
                          });
                        }}
                        className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
                        title="Edit"
                      >
                        <Database className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => deleteRedirect(r.id)}
                        className="rounded p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-6 py-12 text-center text-sm text-gray-400">
                No redirects configured. Add one above.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
