"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Metadata shape returned by /api/admin-bar/meta for a post or page.
 */
export interface PageMeta {
  id: string;
  editId: string | number;
  title: string;
  slug: string;
  status: string;
  wordCount: number;
  readingTime: number;
  publishedAt: string | null;
  updatedAt: string | null;
}

/**
 * Fetches lightweight metadata for a public post/page so the AdminBar can
 * display status, word count, reading time, and build the correct edit URL.
 *
 * Only fires when `type` and `slug` are both truthy. Aborts on unmount.
 * Caches per type:slug to avoid duplicate fetches during a session.
 */
export function usePageMeta(
  type: "post" | "page" | null,
  slug: string | null,
): { meta: PageMeta | null; loading: boolean } {
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const cacheRef = useRef<Map<string, PageMeta>>(new Map());

  // Derive initial state from params to avoid sync setState in effect
  const key = type && slug ? `${type}:${slug}` : null;

  useEffect(() => {
    if (!key || !type || !slug) return;

    // Check session cache
    const cached = cacheRef.current.get(key);
    if (cached) {
      setMeta(cached);
      return;
    }

    const controller = new AbortController();
    setLoading(true);

    fetch(
      `/api/admin-bar/meta?type=${encodeURIComponent(type)}&slug=${encodeURIComponent(slug)}`,
      {
        signal: controller.signal,
      },
    )
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((res) => {
        if (res.success && res.data) {
          const data = res.data as PageMeta;
          cacheRef.current.set(key, data);
          setMeta(data);
        }
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          console.warn("[usePageMeta] Failed to fetch metadata:", err);
        }
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [key, type, slug]);

  // When params become null, clear meta synchronously outside the effect
  const effectiveMeta = key ? meta : null;

  return { meta: effectiveMeta, loading };
}
