"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  Sparkles,
  Save,
  RefreshCw,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import { clsx } from "clsx";

/* ─── Types ─── */

interface Check {
  name: string;
  status: "pass" | "fail" | "warn" | "info";
  severity: "CRITICAL" | "IMPORTANT" | "OPTIONAL" | "INFO";
  message: string;
  recommendation?: string;
  score: number;
  maxScore: number;
}

interface AuditResult {
  targetId: string;
  targetType: string;
  overallScore: number;
  checks: Check[];
  recommendations: string[];
}

interface ContentData {
  id: string;
  title: string;
  slug: string;
  seoTitle?: string | null;
  seoDescription?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  seoKeywords?: string[];
  excerpt?: string | null;
  featuredImage?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  ogImage?: string | null;
  canonicalUrl?: string | null;
}

interface SuggestedMeta {
  suggestedTitle: string;
  suggestedDescription: string;
  keywords: { term: string; score: number }[];
}

/* ─── Helpers ─── */

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

function StatusIcon({ status }: { status: Check["status"] }) {
  if (status === "pass") return <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />;
  if (status === "fail") return <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />;
  if (status === "warn") return <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />;
  return <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />;
}

/* ─── Real-time Validation Rules ─── */

type FieldStatus = "pass" | "fail" | "warn" | "idle";
interface FieldCheck { status: FieldStatus; message: string }

function checkSeoTitle(value: string): FieldCheck {
  if (!value) return { status: "fail", message: "Missing — add an SEO title" };
  if (value.length < 30) return { status: "warn", message: "Too short — aim for 50–60 characters" };
  if (value.length > 60) return { status: "warn", message: "Too long — may be truncated in search results" };
  if (value.length >= 50 && value.length <= 60) return { status: "pass", message: "Perfect length for search results" };
  return { status: "pass", message: "Good length" };
}

function checkSeoDescription(value: string): FieldCheck {
  if (!value) return { status: "fail", message: "Missing — add a meta description" };
  if (value.length < 70) return { status: "warn", message: "Too short — aim for 120–160 characters" };
  if (value.length > 160) return { status: "warn", message: "Too long — will be truncated in SERPs" };
  if (value.length >= 120 && value.length <= 160) return { status: "pass", message: "Ideal length for search results" };
  return { status: "pass", message: "Good length" };
}

function checkKeywords(value: string): FieldCheck {
  if (!value.trim()) return { status: "warn", message: "No keywords — add 3–5 focus keywords" };
  const keywords = value.split(",").map(s => s.trim()).filter(Boolean);
  if (keywords.length > 10) return { status: "warn", message: "Too many keywords — focus on 3–5 primary terms" };
  if (keywords.length < 2) return { status: "warn", message: "Add more keywords — aim for 3–5 focus terms" };
  if (keywords.length >= 3 && keywords.length <= 7) return { status: "pass", message: `${keywords.length} keywords — good focus` };
  return { status: "pass", message: `${keywords.length} keywords set` };
}

function checkExcerpt(value: string): FieldCheck {
  if (!value) return { status: "warn", message: "No excerpt — recommended for previews & social" };
  if (value.length < 50) return { status: "warn", message: "Very short — aim for 50–160 characters" };
  if (value.length > 300) return { status: "warn", message: "Quite long — keep it concise" };
  return { status: "pass", message: "Good excerpt length" };
}

function checkOgTitle(value: string, fallback: string): FieldCheck {
  const effective = value || fallback;
  if (!effective) return { status: "fail", message: "No OG title or SEO title set" };
  if (!value) return { status: "idle", message: "Will fall back to SEO title" };
  if (value.length > 60) return { status: "warn", message: "Long — may be truncated on social" };
  return { status: "pass", message: "OG title set" };
}

function checkOgDescription(value: string, fallback: string): FieldCheck {
  const effective = value || fallback;
  if (!effective) return { status: "warn", message: "No OG or meta description set" };
  if (!value) return { status: "idle", message: "Will fall back to meta description" };
  if (value.length > 200) return { status: "warn", message: "Long — may be truncated on social" };
  return { status: "pass", message: "OG description set" };
}

function checkOgImage(value: string): FieldCheck {
  if (!value) return { status: "warn", message: "No image — social shares look better with images" };
  try {
    new URL(value);
    return { status: "pass", message: "Image URL set" };
  } catch {
    return { status: "fail", message: "Invalid URL format" };
  }
}

function checkCanonical(value: string): FieldCheck {
  if (!value) return { status: "idle", message: "Default canonical — usually fine" };
  try {
    const u = new URL(value);
    if (!["http:", "https:"].includes(u.protocol)) return { status: "fail", message: "Must be http or https URL" };
    return { status: "pass", message: "Custom canonical URL set" };
  } catch {
    return { status: "fail", message: "Invalid URL format" };
  }
}

function FieldStatusBadge({ check }: { check: FieldCheck }) {
  if (check.status === "idle") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
        <Info className="h-3 w-3" />
        {check.message}
      </span>
    );
  }
  if (check.status === "pass") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
        <CheckCircle2 className="h-3 w-3" />
        {check.message}
      </span>
    );
  }
  if (check.status === "warn") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-400">
        <AlertTriangle className="h-3 w-3" />
        {check.message}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
      <XCircle className="h-3 w-3" />
      {check.message}
    </span>
  );
}

/* ─── Component ─── */

export default function SeoFixPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const type = (searchParams.get("type") || "POST") as "POST" | "PAGE";

  const [content, setContent] = useState<ContentData | null>(null);
  const [audit, setAudit] = useState<AuditResult | null>(null);
  const [suggestions, setSuggestions] = useState<SuggestedMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Editable fields
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [ogTitle, setOgTitle] = useState("");
  const [ogDescription, setOgDescription] = useState("");
  const [ogImage, setOgImage] = useState("");
  const [canonicalUrl, setCanonicalUrl] = useState("");
  const [seoKeywords, setSeoKeywords] = useState("");

  const isPost = type === "POST";

  /* ─── Real-time field checks ─── */

  const fieldChecks = useMemo(() => ({
    seoTitle: checkSeoTitle(seoTitle),
    seoDescription: checkSeoDescription(seoDescription),
    keywords: checkKeywords(seoKeywords),
    excerpt: checkExcerpt(excerpt),
    ogTitle: checkOgTitle(ogTitle, seoTitle),
    ogDescription: checkOgDescription(ogDescription, seoDescription),
    ogImage: checkOgImage(ogImage),
    canonical: checkCanonical(canonicalUrl),
  }), [seoTitle, seoDescription, seoKeywords, excerpt, ogTitle, ogDescription, ogImage, canonicalUrl]);

  const realtimeScore = useMemo(() => {
    const checks = Object.values(fieldChecks);
    const total = checks.length;
    const passed = checks.filter(c => c.status === "pass").length;
    const idle = checks.filter(c => c.status === "idle").length;
    return Math.round(((passed + idle * 0.5) / total) * 100);
  }, [fieldChecks]);

  /* ─── Fetch content + audit ─── */

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch the content
      const contentUrl = isPost ? `/api/posts/${id}` : `/api/pages/${id}`;
      const [contentRes, auditRes] = await Promise.all([
        fetch(contentUrl),
        fetch(`/api/seo?action=${isPost ? "audit-post" : "audit-page"}&id=${id}`),
      ]);

      const contentData = await contentRes.json();
      const auditData = await auditRes.json();

      if (contentData.success && contentData.data) {
        const c = contentData.data;
        setContent(c);
        setSeoTitle(isPost ? c.seoTitle || "" : c.metaTitle || "");
        setSeoDescription(isPost ? c.seoDescription || "" : c.metaDescription || "");
        setExcerpt(c.excerpt || "");
        setOgTitle(c.ogTitle || "");
        setOgDescription(c.ogDescription || "");
        setOgImage(c.ogImage || "");
        setCanonicalUrl(c.canonicalUrl || "");
        setSeoKeywords(isPost && c.seoKeywords ? c.seoKeywords.join(", ") : "");
      }

      if (auditData.success) {
        setAudit(auditData.data.audit);
      }
    } catch {
      toast("Failed to load content", "error");
    } finally {
      setLoading(false);
    }
  }, [id, isPost]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ─── Generate AI suggestions ─── */

  async function generateSuggestions() {
    setGenerating(true);
    try {
      const res = await fetch(`/api/seo?action=generate-meta&id=${id}&type=${isPost ? "post" : "page"}`);
      const data = await res.json();
      if (data.success) {
        setSuggestions(data.data);
        toast("Suggestions generated", "success");
      } else {
        toast(data.error || "Failed to generate", "error");
      }
    } catch {
      toast("Failed to generate suggestions", "error");
    } finally {
      setGenerating(false);
    }
  }

  /* ─── Apply a suggestion ─── */

  function applySuggestion(field: "title" | "description" | "keywords") {
    if (!suggestions) return;
    if (field === "title") setSeoTitle(suggestions.suggestedTitle);
    if (field === "description") setSeoDescription(suggestions.suggestedDescription);
    if (field === "keywords") setSeoKeywords(suggestions.keywords.map(k => k.term).join(", "));
    toast("Applied suggestion", "success");
  }

  /* ─── Save ─── */

  async function handleSave() {
    setSaving(true);
    try {
      const url = isPost ? `/api/posts/${id}` : `/api/pages/${id}`;
      const body: Record<string, unknown> = isPost
        ? {
            seoTitle: seoTitle || null,
            seoDescription: seoDescription || null,
            seoKeywords: seoKeywords ? seoKeywords.split(",").map(s => s.trim()).filter(Boolean) : [],
            excerpt: excerpt || null,
            ogTitle: ogTitle || null,
            ogDescription: ogDescription || null,
            ogImage: ogImage || null,
            canonicalUrl: canonicalUrl || null,
          }
        : {
            metaTitle: seoTitle || null,
            metaDescription: seoDescription || null,
            ogTitle: ogTitle || null,
            ogDescription: ogDescription || null,
            ogImage: ogImage || null,
            canonicalUrl: canonicalUrl || null,
          };

      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (data.success) {
        toast("SEO fields updated!", "success");
        // Re-fetch audit to see updated score
        fetchData();
      } else {
        toast(data.error || "Failed to save", "error");
      }
    } catch {
      toast("Failed to save", "error");
    } finally {
      setSaving(false);
    }
  }

  /* ─── Loading ─── */

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!content) {
    return (
      <div className="py-16 text-center text-gray-500">
        Content not found.{" "}
        <Link href="/admin/seo" className="text-blue-600 hover:underline">
          Back to SEO
        </Link>
      </div>
    );
  }

  const failedChecks = audit?.checks.filter(c => c.status === "fail") || [];
  const warnChecks = audit?.checks.filter(c => c.status === "warn") || [];
  const passChecks = audit?.checks.filter(c => c.status === "pass") || [];

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/admin/seo"
          className="mb-3 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <ArrowLeft className="h-4 w-4" /> Back to SEO Dashboard
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Fix SEO: {content.title}
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {isPost ? "Post" : "Page"} &middot; /{content.slug}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {audit && (
              <div className={clsx("flex items-center gap-2 rounded-lg px-3 py-2", scoreBg(audit.overallScore))}>
                <span className={clsx("text-2xl font-bold", scoreColor(audit.overallScore))}>
                  {audit.overallScore}
                </span>
                <span className="text-xs text-gray-500">/100</span>
              </div>
            )}
            <Link
              href={isPost ? `/blog/${content.slug}` : `/${content.slug}`}
              target="_blank"
              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <Eye className="h-4 w-4" /> Preview
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Editable fields */}
        <div className="lg:col-span-2 space-y-6">
          {/* SEO Fields Card */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 dark:text-white">SEO Fields</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={generateSuggestions}
                loading={generating}
                icon={<Sparkles className="h-4 w-4" />}
              >
                Auto-Generate
              </Button>
            </div>

            <div className="space-y-4">
              {/* SEO Title */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    SEO Title
                  </label>
                  <span className={clsx("text-xs", seoTitle.length > 60 ? "text-red-500" : seoTitle.length > 50 ? "text-yellow-500" : "text-gray-400")}>
                    {seoTitle.length}/60
                  </span>
                </div>
                <input
                  type="text"
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                  placeholder={content.title}
                  className={clsx(
                    "w-full rounded-lg border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 dark:bg-gray-700 dark:text-white",
                    fieldChecks.seoTitle.status === "pass" ? "border-green-300 focus:border-green-500 focus:ring-green-500 dark:border-green-700" :
                    fieldChecks.seoTitle.status === "fail" ? "border-red-300 focus:border-red-500 focus:ring-red-500 dark:border-red-700" :
                    fieldChecks.seoTitle.status === "warn" ? "border-yellow-300 focus:border-yellow-500 focus:ring-yellow-500 dark:border-yellow-700" :
                    "border-gray-300 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600"
                  )}
                />
                <div className="mt-1">
                  <FieldStatusBadge check={fieldChecks.seoTitle} />
                </div>
                {suggestions?.suggestedTitle && seoTitle !== suggestions.suggestedTitle && (
                  <button
                    onClick={() => applySuggestion("title")}
                    className="mt-1 text-xs text-blue-600 hover:underline dark:text-blue-400"
                  >
                    💡 Use: &quot;{suggestions.suggestedTitle.substring(0, 60)}&quot;
                  </button>
                )}
              </div>

              {/* SEO Description */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    SEO Description
                  </label>
                  <span className={clsx("text-xs", seoDescription.length > 160 ? "text-red-500" : seoDescription.length > 140 ? "text-yellow-500" : "text-gray-400")}>
                    {seoDescription.length}/160
                  </span>
                </div>
                <textarea
                  value={seoDescription}
                  onChange={(e) => setSeoDescription(e.target.value)}
                  rows={3}
                  placeholder="Meta description for search engines..."
                  className={clsx(
                    "w-full rounded-lg border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 dark:bg-gray-700 dark:text-white",
                    fieldChecks.seoDescription.status === "pass" ? "border-green-300 focus:border-green-500 focus:ring-green-500 dark:border-green-700" :
                    fieldChecks.seoDescription.status === "fail" ? "border-red-300 focus:border-red-500 focus:ring-red-500 dark:border-red-700" :
                    fieldChecks.seoDescription.status === "warn" ? "border-yellow-300 focus:border-yellow-500 focus:ring-yellow-500 dark:border-yellow-700" :
                    "border-gray-300 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600"
                  )}
                />
                <div className="mt-1">
                  <FieldStatusBadge check={fieldChecks.seoDescription} />
                </div>
                {suggestions?.suggestedDescription && seoDescription !== suggestions.suggestedDescription && (
                  <button
                    onClick={() => applySuggestion("description")}
                    className="mt-1 text-xs text-blue-600 hover:underline dark:text-blue-400"
                  >
                    💡 Use suggested description
                  </button>
                )}
              </div>

              {/* Keywords (posts only) */}
              {isPost && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    SEO Keywords
                  </label>
                  <input
                    type="text"
                    value={seoKeywords}
                    onChange={(e) => setSeoKeywords(e.target.value)}
                    placeholder="keyword1, keyword2, keyword3"
                    className={clsx(
                      "w-full rounded-lg border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 dark:bg-gray-700 dark:text-white",
                      fieldChecks.keywords.status === "pass" ? "border-green-300 focus:border-green-500 focus:ring-green-500 dark:border-green-700" :
                      fieldChecks.keywords.status === "warn" ? "border-yellow-300 focus:border-yellow-500 focus:ring-yellow-500 dark:border-yellow-700" :
                      "border-gray-300 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600"
                    )}
                  />
                  <div className="mt-1">
                    <FieldStatusBadge check={fieldChecks.keywords} />
                  </div>
                  {suggestions?.keywords && suggestions.keywords.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      <span className="text-xs text-gray-400">Suggested:</span>
                      {suggestions.keywords.slice(0, 8).map((kw) => (
                        <button
                          key={kw.term}
                          onClick={() => {
                            const current = seoKeywords ? seoKeywords.split(",").map(s => s.trim()) : [];
                            if (!current.includes(kw.term)) {
                              setSeoKeywords([...current, kw.term].join(", "));
                            }
                          }}
                          className="rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400"
                        >
                          +{kw.term}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Excerpt (posts only) */}
              {isPost && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Excerpt
                  </label>
                  <textarea
                    value={excerpt}
                    onChange={(e) => setExcerpt(e.target.value)}
                    rows={2}
                    placeholder="Brief summary of the post..."
                    className={clsx(
                      "w-full rounded-lg border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 dark:bg-gray-700 dark:text-white",
                      fieldChecks.excerpt.status === "pass" ? "border-green-300 focus:border-green-500 focus:ring-green-500 dark:border-green-700" :
                      fieldChecks.excerpt.status === "warn" ? "border-yellow-300 focus:border-yellow-500 focus:ring-yellow-500 dark:border-yellow-700" :
                      "border-gray-300 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600"
                    )}
                  />
                  <div className="mt-1">
                    <FieldStatusBadge check={fieldChecks.excerpt} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Open Graph Card */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
            <h2 className="mb-4 font-semibold text-gray-900 dark:text-white">Open Graph / Social</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">OG Title</label>
                  <input
                    type="text"
                    value={ogTitle}
                    onChange={(e) => setOgTitle(e.target.value)}
                    placeholder={seoTitle || content.title}
                    className={clsx(
                      "w-full rounded-lg border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 dark:bg-gray-700 dark:text-white",
                      fieldChecks.ogTitle.status === "pass" ? "border-green-300 focus:border-green-500 focus:ring-green-500 dark:border-green-700" :
                      fieldChecks.ogTitle.status === "fail" ? "border-red-300 focus:border-red-500 focus:ring-red-500 dark:border-red-700" :
                      fieldChecks.ogTitle.status === "warn" ? "border-yellow-300 focus:border-yellow-500 focus:ring-yellow-500 dark:border-yellow-700" :
                      "border-gray-300 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600"
                    )}
                  />
                  <div className="mt-1">
                    <FieldStatusBadge check={fieldChecks.ogTitle} />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">OG Image URL</label>
                  <input
                    type="text"
                    value={ogImage}
                    onChange={(e) => setOgImage(e.target.value)}
                    placeholder="https://..."
                    className={clsx(
                      "w-full rounded-lg border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 dark:bg-gray-700 dark:text-white",
                      fieldChecks.ogImage.status === "pass" ? "border-green-300 focus:border-green-500 focus:ring-green-500 dark:border-green-700" :
                      fieldChecks.ogImage.status === "fail" ? "border-red-300 focus:border-red-500 focus:ring-red-500 dark:border-red-700" :
                      fieldChecks.ogImage.status === "warn" ? "border-yellow-300 focus:border-yellow-500 focus:ring-yellow-500 dark:border-yellow-700" :
                      "border-gray-300 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600"
                    )}
                  />
                  <div className="mt-1">
                    <FieldStatusBadge check={fieldChecks.ogImage} />
                  </div>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">OG Description</label>
                <textarea
                  value={ogDescription}
                  onChange={(e) => setOgDescription(e.target.value)}
                  rows={2}
                  placeholder={seoDescription || "Description for social sharing..."}
                  className={clsx(
                    "w-full rounded-lg border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 dark:bg-gray-700 dark:text-white",
                    fieldChecks.ogDescription.status === "pass" ? "border-green-300 focus:border-green-500 focus:ring-green-500 dark:border-green-700" :
                    fieldChecks.ogDescription.status === "warn" ? "border-yellow-300 focus:border-yellow-500 focus:ring-yellow-500 dark:border-yellow-700" :
                    "border-gray-300 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600"
                  )}
                />
                <div className="mt-1">
                  <FieldStatusBadge check={fieldChecks.ogDescription} />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Canonical URL</label>
                <input
                  type="text"
                  value={canonicalUrl}
                  onChange={(e) => setCanonicalUrl(e.target.value)}
                  placeholder="Leave empty for default"
                  className={clsx(
                    "w-full rounded-lg border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 dark:bg-gray-700 dark:text-white",
                    fieldChecks.canonical.status === "pass" ? "border-green-300 focus:border-green-500 focus:ring-green-500 dark:border-green-700" :
                    fieldChecks.canonical.status === "fail" ? "border-red-300 focus:border-red-500 focus:ring-red-500 dark:border-red-700" :
                    "border-gray-300 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600"
                  )}
                />
                <div className="mt-1">
                  <FieldStatusBadge check={fieldChecks.canonical} />
                </div>
              </div>
            </div>
          </div>

          {/* Save */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={fetchData} icon={<RefreshCw className="h-4 w-4" />}>
              Re-audit
            </Button>
            <Button onClick={handleSave} loading={saving} icon={<Save className="h-4 w-4" />}>
              Save SEO Changes
            </Button>
          </div>
        </div>

        {/* Right: Audit Results Sidebar */}
        <div className="space-y-4">
          {/* Real-time Field Health */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
            <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Field Health (Live)</h3>
            <div className="flex items-center justify-center mb-3">
              <div className={clsx("flex h-16 w-16 items-center justify-center rounded-full border-4 text-xl font-bold",
                scoreBg(realtimeScore), scoreColor(realtimeScore),
                realtimeScore >= 80 ? "border-green-300 dark:border-green-700" :
                realtimeScore >= 60 ? "border-yellow-300 dark:border-yellow-700" :
                realtimeScore >= 40 ? "border-orange-300 dark:border-orange-700" :
                "border-red-300 dark:border-red-700"
              )}>
                {realtimeScore}
              </div>
            </div>
            <div className="space-y-1.5">
              {[
                { label: "SEO Title", check: fieldChecks.seoTitle },
                { label: "Description", check: fieldChecks.seoDescription },
                ...(isPost ? [{ label: "Keywords", check: fieldChecks.keywords }] : []),
                ...(isPost ? [{ label: "Excerpt", check: fieldChecks.excerpt }] : []),
                { label: "OG Title", check: fieldChecks.ogTitle },
                { label: "OG Description", check: fieldChecks.ogDescription },
                { label: "OG Image", check: fieldChecks.ogImage },
                { label: "Canonical", check: fieldChecks.canonical },
              ].map(({ label, check }) => (
                <div key={label} className="flex items-center justify-between text-xs">
                  <span className="text-gray-600 dark:text-gray-400">{label}</span>
                  {check.status === "pass" ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                    : check.status === "fail" ? <XCircle className="h-3.5 w-3.5 text-red-500" />
                    : check.status === "warn" ? <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />
                    : <Info className="h-3.5 w-3.5 text-gray-400" />
                  }
                </div>
              ))}
            </div>
          </div>

          {/* Score Card */}
          {audit && (
            <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Audit Score</h3>
              <div className="flex items-center justify-center">
                <div className={clsx("flex h-20 w-20 items-center justify-center rounded-full border-4 text-2xl font-bold", scoreBg(audit.overallScore), scoreColor(audit.overallScore),
                  audit.overallScore >= 80 ? "border-green-300 dark:border-green-700" :
                  audit.overallScore >= 60 ? "border-yellow-300 dark:border-yellow-700" :
                  audit.overallScore >= 40 ? "border-orange-300 dark:border-orange-700" :
                  "border-red-300 dark:border-red-700"
                )}>
                  {audit.overallScore}
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <p className="font-bold text-red-600 dark:text-red-400">{failedChecks.length}</p>
                  <p className="text-gray-400">Fails</p>
                </div>
                <div>
                  <p className="font-bold text-yellow-600 dark:text-yellow-400">{warnChecks.length}</p>
                  <p className="text-gray-400">Warnings</p>
                </div>
                <div>
                  <p className="font-bold text-green-600 dark:text-green-400">{passChecks.length}</p>
                  <p className="text-gray-400">Passed</p>
                </div>
              </div>
            </div>
          )}

          {/* Issues to Fix */}
          {failedChecks.length > 0 && (
            <div className="rounded-xl border border-red-200 bg-red-50/50 p-5 dark:border-red-900/50 dark:bg-red-900/10">
              <h3 className="mb-3 text-sm font-semibold text-red-700 dark:text-red-400 flex items-center gap-1">
                <XCircle className="h-4 w-4" /> Failed Checks ({failedChecks.length})
              </h3>
              <div className="space-y-3">
                {failedChecks.map((check, i) => (
                  <div key={i} className="text-sm">
                    <div className="flex items-start gap-2">
                      <StatusIcon status={check.status} />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{check.name}</p>
                        <p className="text-gray-600 dark:text-gray-400 text-xs">{check.message}</p>
                        {check.recommendation && (
                          <p className="mt-0.5 text-blue-600 dark:text-blue-400 text-xs">
                            💡 {check.recommendation}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Warnings */}
          {warnChecks.length > 0 && (
            <div className="rounded-xl border border-yellow-200 bg-yellow-50/50 p-5 dark:border-yellow-900/50 dark:bg-yellow-900/10">
              <h3 className="mb-3 text-sm font-semibold text-yellow-700 dark:text-yellow-400 flex items-center gap-1">
                <AlertTriangle className="h-4 w-4" /> Warnings ({warnChecks.length})
              </h3>
              <div className="space-y-3">
                {warnChecks.map((check, i) => (
                  <div key={i} className="text-sm">
                    <div className="flex items-start gap-2">
                      <StatusIcon status={check.status} />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{check.name}</p>
                        <p className="text-gray-600 dark:text-gray-400 text-xs">{check.message}</p>
                        {check.recommendation && (
                          <p className="mt-0.5 text-blue-600 dark:text-blue-400 text-xs">
                            💡 {check.recommendation}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Passed Checks */}
          {passChecks.length > 0 && (
            <div className="rounded-xl border border-green-200 bg-green-50/50 p-5 dark:border-green-900/50 dark:bg-green-900/10">
              <h3 className="mb-3 text-sm font-semibold text-green-700 dark:text-green-400 flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4" /> Passed ({passChecks.length})
              </h3>
              <div className="space-y-1">
                {passChecks.map((check, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                    <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
                    {check.name}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
