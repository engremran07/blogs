/**
 * /api/ads/scan-pages — Auto-discover all scannable page types
 *
 * Scans the database for all live content that can host ads:
 *   • Blog posts (each published post slug → "blog", category slugs)
 *   • Static pages (each published page slug → "page:{slug}")
 *   • Index pages ("home", "blog-index", "tags-index", "search")
 *   • Tag archive pages ("tag:{slug}")
 *   • Category archive pages ("category:{slug}")
 *   • Contact / About / Profile (static routes)
 *
 * GET  → Returns current scannable page types without mutating.
 * POST → Runs full sync: discovers live types, prunes deleted ones,
 *         and adds new ones to matching ad slots.
 *
 * Auto-exclude: When a page, tag, or category is deleted, the DELETE
 * handlers in /api/pages/[id], /api/tags/[id] call removePageTypesFromSlots
 * to strip the key from every ad slot automatically.
 */
import { NextResponse } from "next/server";
import { requireAuth } from "@/server/api-auth";
import { prisma } from "@/server/wiring";
import {
  discoverPageTypes,
  syncAdSlotPageTypes,
  generateScanHealthReport,
} from "@/features/ads/server/scan-pages";
import type { ScanPrisma } from "@/features/ads/server/scan-pages";

const scanPrisma: ScanPrisma = {
  category: { findMany: (args) => prisma.category.findMany(args as never) },
  tag: { findMany: (args) => prisma.tag.findMany(args as never) },
  page: { findMany: (args) => prisma.page.findMany(args as never) },
  post: {
    count: (args) => prisma.post.count(args as never),
    findMany: (args) => prisma.post.findMany(args as never),
  },
  adSlot: {
    findMany: (args) => prisma.adSlot.findMany(args as never),
    update: (args) => prisma.adSlot.update(args as never),
  },
};

// ─── GET — read-only scan with health report ───────────────────────────────

export async function GET() {
  try {
    const { errorResponse } = await requireAuth({ level: "moderator" });
    if (errorResponse) return errorResponse;

    const [pageTypes, healthReport] = await Promise.all([
      discoverPageTypes(scanPrisma),
      generateScanHealthReport(scanPrisma),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        pageTypes,
        count: pageTypes.length,
        health: healthReport,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ─── POST — full sync: prune stale + add new ──────────────────────────────

export async function POST() {
  try {
    const { errorResponse } = await requireAuth({ level: "admin" });
    if (errorResponse) return errorResponse;

    const result = await syncAdSlotPageTypes(scanPrisma);

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        message: `Discovered ${result.discovered} page types. Pruned stale types from ${result.pruned} slots, added new types to ${result.added} slots.`,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
