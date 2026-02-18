/**
 * Ad Slot Page-Type Auto-Scan Utilities
 *
 * Shared logic for:
 *   1. Discovering all scannable page types from the database
 *   2. Auto-adding new page types to ad slots (on content creation)
 *   3. Auto-removing stale page types from ad slots (on content deletion)
 *   4. Full sync: prune dead + add new (used by cron)
 *   5. Content scoring for intelligent ad placement prioritisation
 *   6. Slot health analysis (coverage gaps, over-served pages)
 */

// ─── Types ─────────────────────────────────────────────────────────────────

export interface ScannedPageType {
  key: string;
  label: string;
  kind: "static" | "blog" | "page" | "tag" | "category";
  /** Estimated relative traffic score (0–100). Higher = more traffic. */
  trafficScore: number;
  /** Number of ad slots currently targeting this page type */
  slotCoverage: number;
  /** Content freshness: days since last update (null for static) */
  freshnessAge: number | null;
}

export interface ScanHealthReport {
  totalPageTypes: number;
  coveredPageTypes: number;
  uncoveredPageTypes: number;
  overServedPageTypes: number;
  topUncovered: ScannedPageType[];
  topOverServed: ScannedPageType[];
  recommendations: string[];
}

/** Minimal Prisma client interface used by these helpers */
export interface ScanPrisma {
  category: { findMany: (args: Record<string, unknown>) => Promise<Array<{ slug: string; name: string; _count?: { posts: number } }>> };
  tag: { findMany: (args: Record<string, unknown>) => Promise<Array<{ slug: string; name: string; _count?: { posts: number } }>> };
  page: { findMany: (args: Record<string, unknown>) => Promise<Array<{ slug: string; title: string; updatedAt: Date | null }>> };
  post: { count: (args?: Record<string, unknown>) => Promise<number>; findMany: (args?: Record<string, unknown>) => Promise<unknown[]> };
  adSlot: {
    findMany: (args?: Record<string, unknown>) => Promise<Array<{ id: string; pageTypes: string[] }>>;
    update: (args: Record<string, unknown>) => Promise<unknown>;
  };
}

// ─── Well-known static page types ──────────────────────────────────────────

// ─── Well-known static page types with traffic weights ─────────────────────

const STATIC_TRAFFIC_SCORES: Record<string, number> = {
  home: 100,
  "blog-index": 80,
  "tags-index": 25,
  search: 40,
  contact: 35,
  about: 30,
  profile: 15,
  login: 10,
  register: 10,
};

export const STATIC_PAGE_TYPES = Object.keys(STATIC_TRAFFIC_SCORES) as (keyof typeof STATIC_TRAFFIC_SCORES)[];

// ─── Discover all live page types ──────────────────────────────────────────

export async function discoverPageTypes(prisma: ScanPrisma): Promise<ScannedPageType[]> {
  const types: ScannedPageType[] = [];

  // Pre-fetch slot data for coverage analysis
  const allSlots = await prisma.adSlot.findMany({
    select: { id: true, pageTypes: true },
  });

  function getSlotCoverage(key: string): number {
    return allSlots.filter((slot) => {
      const types = slot.pageTypes ?? [];
      if (types.includes("*")) return true;
      if (types.includes(key)) return true;
      return types.some((t: string) => t.endsWith(":*") && key.startsWith(t.replace(":*", ":")));
    }).length;
  }

  // 1. Static / well-known routes
  for (const key of STATIC_PAGE_TYPES) {
    types.push({
      key,
      label: key.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      kind: "static",
      trafficScore: STATIC_TRAFFIC_SCORES[key] ?? 20,
      slotCoverage: getSlotCoverage(key),
      freshnessAge: null,
    });
  }

  // 2. Blog — universal page type for all single posts
  const postCount = await prisma.post.count({ where: { status: "PUBLISHED" } });
  types.push({
    key: "blog",
    label: "Blog Post (single)",
    kind: "blog",
    trafficScore: Math.min(100, 50 + postCount * 2), // scales with content volume
    slotCoverage: getSlotCoverage("blog"),
    freshnessAge: null,
  });

  // 3. Categories (with post counts for traffic scoring)
  const categories = await prisma.category.findMany({
    select: { slug: true, name: true, _count: { select: { posts: true } } },
    orderBy: { name: "asc" },
  });
  for (const cat of categories) {
    const catCount = cat._count?.posts ?? 0;
    types.push({
      key: `category:${cat.slug}`,
      label: `Category: ${cat.name}`,
      kind: "category",
      trafficScore: Math.min(90, 20 + catCount * 5),
      slotCoverage: getSlotCoverage(`category:${cat.slug}`),
      freshnessAge: null,
    });
  }

  // 4. Tags (only tags with at least one post, scored by usage)
  const tags = await prisma.tag.findMany({
    select: { slug: true, name: true, _count: { select: { posts: true } } },
    where: { posts: { some: {} } },
    orderBy: { name: "asc" },
  });
  for (const tag of tags) {
    const tagCount = tag._count?.posts ?? 0;
    types.push({
      key: `tag:${tag.slug}`,
      label: `Tag: ${tag.name}`,
      kind: "tag",
      trafficScore: Math.min(70, 10 + tagCount * 3),
      slotCoverage: getSlotCoverage(`tag:${tag.slug}`),
      freshnessAge: null,
    });
  }

  // 5. Static pages (not deleted, scored by recency)
  const pages = await prisma.page.findMany({
    select: { slug: true, title: true, updatedAt: true },
    where: { status: { not: "DELETED" }, deletedAt: null },
    orderBy: { title: "asc" },
  });
  const now = Date.now();
  for (const page of pages) {
    const ageMs = page.updatedAt ? now - new Date(page.updatedAt).getTime() : 0;
    const ageDays = Math.round(ageMs / 86_400_000);
    types.push({
      key: `page:${page.slug}`,
      label: `Page: ${page.title}`,
      kind: "page",
      trafficScore: Math.max(10, 40 - Math.floor(ageDays / 30) * 5), // decay with age
      slotCoverage: getSlotCoverage(`page:${page.slug}`),
      freshnessAge: ageDays,
    });
  }

  // Sort by traffic score descending for better prioritisation
  types.sort((a, b) => b.trafficScore - a.trafficScore);

  return types;
}

// ─── Remove specific page types from all ad slots ──────────────────────────

/**
 * Removes stale pageType keys from every ad slot that references them.
 * Called when content is deleted (page, tag, category).
 *
 * @param prisma  - Prisma client
 * @param keys    - pageType keys to remove, e.g. ["page:my-slug", "tag:old-tag"]
 * @returns       - Number of ad slots updated
 */
export async function removePageTypesFromSlots(
  prisma: ScanPrisma,
  keys: string[],
): Promise<number> {
  if (keys.length === 0) return 0;

  const keysSet = new Set(keys);
  const slots = await prisma.adSlot.findMany({
    select: { id: true, pageTypes: true },
  });

  let updated = 0;
  for (const slot of slots) {
    const existing = (slot.pageTypes as string[]) ?? [];
    const filtered = existing.filter((t: string) => !keysSet.has(t));
    if (filtered.length < existing.length) {
      await prisma.adSlot.update({
        where: { id: slot.id },
        data: { pageTypes: filtered },
      });
      updated++;
    }
  }

  return updated;
}

// ─── Add specific page types to matching ad slots ──────────────────────────

/**
 * Adds new pageType keys to ad slots that use wildcard patterns or
 * are configured as "universal" (contain "*").
 *
 * Called when new content is created (page, tag, category).
 *
 * @param prisma  - Prisma client
 * @param keys    - pageType keys to add, e.g. ["page:new-slug"]
 * @returns       - Number of ad slots updated
 */
export async function addPageTypesToSlots(
  prisma: ScanPrisma,
  keys: string[],
): Promise<number> {
  if (keys.length === 0) return 0;

  const slots = await prisma.adSlot.findMany({
    select: { id: true, pageTypes: true },
  });

  let updated = 0;
  for (const slot of slots) {
    const existing = (slot.pageTypes as string[]) ?? [];
    const isUniversal = existing.includes("*");

    if (isUniversal) {
      // Universal slot — add all new keys
      const merged = new Set(existing);
      let changed = false;
      for (const key of keys) {
        if (!merged.has(key)) { merged.add(key); changed = true; }
      }
      if (changed) {
        await prisma.adSlot.update({
          where: { id: slot.id },
          data: { pageTypes: [...merged] },
        });
        updated++;
      }
      continue;
    }

    // Check if slot uses wildcard patterns matching the new keys
    const patterns = existing.filter((t: string) => t.endsWith(":*"));
    if (patterns.length > 0) {
      const merged = new Set(existing);
      let changed = false;
      for (const pattern of patterns) {
        const prefix = pattern.replace(":*", ":");
        for (const key of keys) {
          if (key.startsWith(prefix) && !merged.has(key)) {
            merged.add(key);
            changed = true;
          }
        }
      }
      if (changed) {
        await prisma.adSlot.update({
          where: { id: slot.id },
          data: { pageTypes: [...merged] },
        });
        updated++;
      }
    }
  }

  return updated;
}

// ─── Full sync: prune stale + add missing ──────────────────────────────────

/**
 * Runs a full sync: discovers all live page types, then for every ad slot:
 *   - Removes any pageType that no longer exists in the database
 *   - Adds any new pageType that matches the slot's wildcard patterns
 *
 * Used by the cron job. Returns counts.
 */
export async function syncAdSlotPageTypes(
  prisma: ScanPrisma,
): Promise<{ discovered: number; pruned: number; added: number }> {
  const liveTypes = await discoverPageTypes(prisma);
  const liveKeys = new Set(liveTypes.map((t) => t.key));

  // Also keep static types and wildcards as always-valid
  for (const s of STATIC_PAGE_TYPES) liveKeys.add(s);
  liveKeys.add("blog");

  const slots = await prisma.adSlot.findMany({
    select: { id: true, pageTypes: true },
  });

  let pruned = 0;
  let added = 0;

  for (const slot of slots) {
    const existing = (slot.pageTypes as string[]) ?? [];
    const isUniversal = existing.includes("*");

    // Step 1: prune stale (skip wildcards like "category:*")
    const cleaned = existing.filter(
      (t: string) => t === "*" || t.endsWith(":*") || liveKeys.has(t),
    );
    const prunedCount = existing.length - cleaned.length;

    // Step 2: add new keys if universal or pattern-matched
    const final = new Set(cleaned);
    let addedCount = 0;

    if (isUniversal) {
      for (const key of liveKeys) {
        if (!final.has(key)) { final.add(key); addedCount++; }
      }
    } else {
      const patterns = cleaned.filter((t: string) => t.endsWith(":*"));
      for (const pattern of patterns) {
        const prefix = pattern.replace(":*", ":");
        for (const key of liveKeys) {
          if (key.startsWith(prefix) && !final.has(key)) {
            final.add(key);
            addedCount++;
          }
        }
      }
    }

    if (prunedCount > 0 || addedCount > 0) {
      await prisma.adSlot.update({
        where: { id: slot.id },
        data: { pageTypes: [...final] },
      });
      if (prunedCount > 0) pruned++;
      if (addedCount > 0) added++;
    }
  }

  return { discovered: liveTypes.length, pruned, added };
}

// ─── Scan Health Report ────────────────────────────────────────────────────

/**
 * Generates a health report analysing ad slot coverage across all page types.
 * Identifies coverage gaps (high-traffic pages with no ads) and
 * over-served pages (low-traffic pages with many ad slots).
 */
export async function generateScanHealthReport(
  prisma: ScanPrisma,
): Promise<ScanHealthReport> {
  const pageTypes = await discoverPageTypes(prisma);
  const total = pageTypes.length;

  const covered = pageTypes.filter((t) => t.slotCoverage > 0);
  const uncovered = pageTypes.filter((t) => t.slotCoverage === 0);
  const overServed = pageTypes.filter((t) => t.slotCoverage > 3);

  // Top uncovered by traffic score
  const topUncovered = uncovered
    .sort((a, b) => b.trafficScore - a.trafficScore)
    .slice(0, 5);

  // Top over-served
  const topOverServed = overServed
    .sort((a, b) => b.slotCoverage - a.slotCoverage)
    .slice(0, 5);

  // Generate recommendations
  const recommendations: string[] = [];

  if (uncovered.length > 0) {
    const highTrafficUncovered = uncovered.filter((t) => t.trafficScore >= 50);
    if (highTrafficUncovered.length > 0) {
      recommendations.push(
        `${highTrafficUncovered.length} high-traffic page${highTrafficUncovered.length > 1 ? "s" : ""} ha${highTrafficUncovered.length > 1 ? "ve" : "s"} no ad slots: ${highTrafficUncovered.map((t) => t.label).join(", ")}`,
      );
    }
  }

  if (overServed.length > 0) {
    recommendations.push(
      `${overServed.length} page${overServed.length > 1 ? "s" : ""} ha${overServed.length > 1 ? "ve" : "s"} more than 3 ad slots — consider reducing to improve UX`,
    );
  }

  const coveragePercent = total > 0 ? Math.round((covered.length / total) * 100) : 0;
  if (coveragePercent < 50) {
    recommendations.push(
      `Only ${coveragePercent}% of page types have ad coverage. Use wildcard patterns (e.g. "category:*") to increase coverage efficiently.`,
    );
  }

  if (recommendations.length === 0) {
    recommendations.push("Ad coverage is well-balanced across all page types.");
  }

  return {
    totalPageTypes: total,
    coveredPageTypes: covered.length,
    uncoveredPageTypes: uncovered.length,
    overServedPageTypes: overServed.length,
    topUncovered,
    topOverServed,
    recommendations,
  };
}
