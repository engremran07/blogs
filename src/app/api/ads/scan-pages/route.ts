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
import { auth } from "@/server/auth";
import { prisma } from "@/server/wiring";
import {
  discoverPageTypes,
  syncAdSlotPageTypes,
  generateScanHealthReport,
} from "@/features/ads/server/scan-pages";
import type { ScanPrisma } from "@/features/ads/server/scan-pages";

// ─── GET — read-only scan with health report ───────────────────────────────

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || !["ADMINISTRATOR", "SUPER_ADMIN", "EDITOR"].includes(session.user.role)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const [pageTypes, healthReport] = await Promise.all([
      discoverPageTypes(prisma as unknown as ScanPrisma),
      generateScanHealthReport(prisma as unknown as ScanPrisma),
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
    const session = await auth();
    if (!session?.user || !["ADMINISTRATOR", "SUPER_ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const result = await syncAdSlotPageTypes(prisma as unknown as ScanPrisma);

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
