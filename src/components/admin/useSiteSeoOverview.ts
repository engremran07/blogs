"use client";

import { useCallback, useRef, useState } from "react";

interface SeoOverview {
  overallScore: number;
  totalPosts: number;
  totalPages: number;
  totalContent: number;
  issueCounts: Record<string, number>;
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
}

interface UseSiteSeoOverviewReturn {
  data: SeoOverview | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * On-demand site-wide SEO overview. Fetches only when refresh() is called.
 */
export function useSiteSeoOverview(): UseSiteSeoOverviewReturn {
  const [data, setData] = useState<SeoOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef<{ data: SeoOverview; ts: number } | null>(null);

  const refresh = useCallback(() => {
    // Return cached data if still fresh
    if (cacheRef.current && Date.now() - cacheRef.current.ts < CACHE_TTL) {
      setData(cacheRef.current.data);
      return;
    }

    setLoading(true);
    setError(null);

    fetch("/api/seo?action=overview")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((payload) => {
        if (payload.success && payload.data) {
          setData(payload.data as SeoOverview);
          cacheRef.current = { data: payload.data as SeoOverview, ts: Date.now() };
        } else {
          setError(payload.error || "SEO overview failed");
        }
      })
      .catch((err: Error) => {
        setError(err.message || "Network error");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return { data, loading, error, refresh };
}
