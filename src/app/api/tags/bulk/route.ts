import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { prisma } from "@/server/db/prisma";
import { TagService } from "@/features/tags/server/tag.service";
import { bulkIdsSchema, mergeTagsSchema, bulkMergeDuplicatesSchema } from "@/features/tags/server/schemas";
import { removePageTypesFromSlots } from "@/features/ads/server/scan-pages";
import { createLogger } from "@/server/observability/logger";

const logger = createLogger("api/tags/bulk");

const tagService = new TagService(prisma as any);

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
    }
    const role = (session.user as any).role;
    if (!["EDITOR", "ADMINISTRATOR", "SUPER_ADMIN"].includes(role)) {
      return NextResponse.json({ success: false, error: "Insufficient permissions" }, { status: 403 });
    }

    const body = await req.json();
    const { action, ids } = body;

    // Actions that don't require ids
    if (action === "findDuplicates") {
      const threshold = body.threshold ?? 0.6;
      const candidates = await tagService.findDuplicateTags(threshold);
      return NextResponse.json({ success: true, data: candidates });
    }

    if (action === "groupDuplicates") {
      const threshold = body.threshold ?? 0.6;
      const groups = await tagService.groupDuplicates(threshold, body.excludeIds);
      return NextResponse.json({ success: true, data: groups });
    }

    if (action === "mergeDuplicates") {
      const parsed = bulkMergeDuplicatesSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ success: false, error: "Validation failed", details: parsed.error.flatten().fieldErrors }, { status: 400 });
      }
      const { threshold = 0.6, dryRun = false } = parsed.data;
      const result = await tagService.bulkMergeDuplicates(threshold, dryRun, body.excludeIds);
      return NextResponse.json({ success: true, data: result, message: dryRun ? `Found ${result.groupsMerged} groups to merge` : `Merged ${result.groupsMerged} groups, deleted ${result.tagsDeleted} tags` });
    }

    if (action === "merge") {
      const parsed = mergeTagsSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ success: false, error: "sourceIds and targetId required", details: parsed.error.flatten().fieldErrors }, { status: 400 });
      }
      await tagService.mergeTags(parsed.data.sourceIds, parsed.data.targetId);
      return NextResponse.json({ success: true, message: `Merged ${parsed.data.sourceIds.length} tags into target` });
    }

    if (action === "cleanup") {
      const result = await tagService.cleanupOrphanedTags();
      return NextResponse.json({ success: true, data: result, message: `Deleted ${result.deleted} orphaned tags, skipped ${result.skipped}` });
    }

    if (!ids?.length) {
      return NextResponse.json({ success: false, error: "No IDs provided" }, { status: 400 });
    }

    // Validate ids array
    const idsResult = bulkIdsSchema.safeParse({ tagIds: ids });
    if (!idsResult.success) {
      return NextResponse.json({ success: false, error: "Invalid IDs", details: idsResult.error.flatten().fieldErrors }, { status: 400 });
    }
    const validIds: string[] = idsResult.data.tagIds;

    switch (action) {
      case "delete": {
        // Fetch slugs before deleting so we can remove from ad slots
        const tagsToDelete = await prisma.tag.findMany({
          where: { id: { in: validIds } },
          select: { slug: true },
        });
        const result = await tagService.bulkDelete(validIds);
        // Auto-exclude deleted tags from ad slot pageTypes
        const pageTypes = tagsToDelete.map((t: { slug: string }) => `tag:${t.slug}`);
        if (pageTypes.length > 0) {
          void removePageTypesFromSlots(prisma as any, pageTypes).catch(() => {});
        }
        return NextResponse.json({ success: true, message: `${result.deleted} tags deleted` });
      }
      case "feature": {
        const result = await tagService.bulkUpdateStyle(validIds, { featured: true });
        return NextResponse.json({ success: true, message: `${result.updated} tags featured` });
      }
      case "unfeature": {
        const result = await tagService.bulkUpdateStyle(validIds, { featured: false });
        return NextResponse.json({ success: true, message: `${result.updated} tags unfeatured` });
      }
      case "lock": {
        const result = await tagService.bulkLock(validIds, true);
        return NextResponse.json({ success: true, message: `${result.updated} tags locked` });
      }
      case "unlock": {
        const result = await tagService.bulkLock(validIds, false);
        return NextResponse.json({ success: true, message: `${result.updated} tags unlocked` });
      }
      default:
        return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bulk action failed";
    logger.error("[api/tags/bulk] POST error:", { error });
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
