"use client";

import { useCallback, useRef, useState } from "react";

interface SeoScoreResult {
  overallScore: number;
  checks: Array<{
    name: string;
    status: "pass" | "warn" | "fail" | "info";
    message: string;
    score: number;
    maxScore: number;
  }>;
  recommendations: string[];
}

interface UseSeoScoreOptions {
  resourceType: "post" | "page" | null;
  resourceId: string | null;
  resourceSlug?: string | null;
}

interface UseSeoScoreReturn {
  score: number | null;
  checks: SeoScoreResult["checks"];
  recommendations: string[];
  loading: boolean;
  error: string | null;
  /** Fetch/refresh the SEO score. Call on-demand (e.g. when dropdown opens). */
  refresh: () => void;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * On-demand SEO score hook — zero API calls until `refresh()` is invoked.
 * Caches the result for 5 minutes. Uses AbortController to prevent race conditions.
 */
export function useSeoScore({
  resourceType,
  resourceId,
  resourceSlug,
}: UseSeoScoreOptions): UseSeoScoreReturn {
  const [score, setScore] = useState<number | null>(null);
  const [checks, setChecks] = useState<SeoScoreResult["checks"]>([]);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef<{
    key: string;
    data: SeoScoreResult;
    ts: number;
  } | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const refresh = useCallback(() => {
    if (!resourceType || (!resourceId && !resourceSlug)) return;

    const cacheKey = `${resourceType}:${resourceSlug ?? resourceId}`;

    // Return cached data if still fresh
    if (
      cacheRef.current &&
      cacheRef.current.key === cacheKey &&
      Date.now() - cacheRef.current.ts < CACHE_TTL
    ) {
      setScore(cacheRef.current.data.overallScore);
      setChecks(cacheRef.current.data.checks);
      setRecommendations(cacheRef.current.data.recommendations);
      return;
    }

    // Abort any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const action = resourceType === "post" ? "audit-post" : "audit-page";
    const query = new URLSearchParams({ action });
    if (resourceSlug) {
      query.set("slug", resourceSlug);
    } else if (resourceId) {
      query.set("id", resourceId);
    }
    const url = `/api/seo?${query.toString()}`;

    setLoading(true);
    setError(null);

    fetch(url, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (data.success && data.data?.audit) {
          const audit: SeoScoreResult = data.data.audit;
          setScore(audit.overallScore);
          setChecks(audit.checks ?? []);
          setRecommendations(audit.recommendations ?? []);
          cacheRef.current = { key: cacheKey, data: audit, ts: Date.now() };
        } else {
          setError(data.error || "SEO audit failed");
        }
      })
      .catch((err: Error) => {
        if (err.name === "AbortError") return; // Ignore aborted requests
        setError(err.message || "Network error");
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });
  }, [resourceType, resourceId, resourceSlug]);

  return { score, checks, recommendations, loading, error, refresh };
}
