import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { pageService } from "@/server/wiring";
import { createLogger } from "@/server/observability/logger";
import {
  BulkUpdateStatusSchema,
  BulkDeleteSchema,
  BulkReorderSchema,
  BulkMoveSchema,
  BulkTemplateSchema,
  BulkRestoreSchema,
  BulkSetVisibilitySchema,
  BulkScheduleSchema,
} from "@/features/pages/server/schemas";
import { PageError } from "@/features/pages/types";

const logger = createLogger("api/pages/bulk");

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
    const { action, ...rest } = body;

    if (!action) {
      return NextResponse.json(
        { success: false, error: "Action is required" },
        { status: 400 },
      );
    }

    switch (action) {
      case "delete": {
        const parsed = BulkDeleteSchema.safeParse(rest);
        if (!parsed.success) {
          return NextResponse.json(
            { success: false, error: parsed.error.flatten().fieldErrors },
            { status: 400 },
          );
        }
        const result = await pageService.bulkDelete(
          parsed.data.ids,
          parsed.data.permanent,
        );
        return NextResponse.json({
          success: true,
          message: `${result.count} pages deleted`,
        });
      }

      case "publish": {
        const parsed = BulkUpdateStatusSchema.safeParse({
          ids: rest.ids,
          status: "PUBLISHED",
        });
        if (!parsed.success) {
          return NextResponse.json(
            { success: false, error: parsed.error.flatten().fieldErrors },
            { status: 400 },
          );
        }
        const result = await pageService.bulkUpdateStatus(
          parsed.data.ids,
          "PUBLISHED",
        );
        return NextResponse.json({
          success: true,
          message: `${result.count} pages published`,
        });
      }

      case "draft": {
        const parsed = BulkUpdateStatusSchema.safeParse({
          ids: rest.ids,
          status: "DRAFT",
        });
        if (!parsed.success) {
          return NextResponse.json(
            { success: false, error: parsed.error.flatten().fieldErrors },
            { status: 400 },
          );
        }
        const result = await pageService.bulkUpdateStatus(
          parsed.data.ids,
          "DRAFT",
        );
        return NextResponse.json({
          success: true,
          message: `${result.count} pages moved to draft`,
        });
      }

      case "archive": {
        const parsed = BulkUpdateStatusSchema.safeParse({
          ids: rest.ids,
          status: "ARCHIVED",
        });
        if (!parsed.success) {
          return NextResponse.json(
            { success: false, error: parsed.error.flatten().fieldErrors },
            { status: 400 },
          );
        }
        const result = await pageService.bulkUpdateStatus(
          parsed.data.ids,
          "ARCHIVED",
        );
        return NextResponse.json({
          success: true,
          message: `${result.count} pages archived`,
        });
      }

      case "schedule": {
        const parsed = BulkScheduleSchema.safeParse(rest);
        if (!parsed.success) {
          return NextResponse.json(
            { success: false, error: parsed.error.flatten().fieldErrors },
            { status: 400 },
          );
        }
        const result = await pageService.bulkSchedule(
          parsed.data.ids,
          parsed.data.scheduledFor,
        );
        return NextResponse.json({
          success: true,
          message: `${result.count} pages scheduled`,
        });
      }

      case "reorder": {
        const parsed = BulkReorderSchema.safeParse(rest);
        if (!parsed.success) {
          return NextResponse.json(
            { success: false, error: parsed.error.flatten().fieldErrors },
            { status: 400 },
          );
        }
        const result = await pageService.bulkReorder(parsed.data.items);
        return NextResponse.json({
          success: true,
          message: `${result.count} pages reordered`,
          errors: result.errors,
        });
      }

      case "move": {
        const parsed = BulkMoveSchema.safeParse(rest);
        if (!parsed.success) {
          return NextResponse.json(
            { success: false, error: parsed.error.flatten().fieldErrors },
            { status: 400 },
          );
        }
        const result = await pageService.bulkMove(
          parsed.data.ids,
          parsed.data.parentId ?? null,
        );
        return NextResponse.json({
          success: true,
          message: `${result.count} pages moved`,
          errors: result.errors,
        });
      }

      case "template": {
        const parsed = BulkTemplateSchema.safeParse(rest);
        if (!parsed.success) {
          return NextResponse.json(
            { success: false, error: parsed.error.flatten().fieldErrors },
            { status: 400 },
          );
        }
        const result = await pageService.bulkSetTemplate(
          parsed.data.ids,
          parsed.data.template,
        );
        return NextResponse.json({
          success: true,
          message: `${result.count} pages updated`,
        });
      }

      case "visibility": {
        const parsed = BulkSetVisibilitySchema.safeParse(rest);
        if (!parsed.success) {
          return NextResponse.json(
            { success: false, error: parsed.error.flatten().fieldErrors },
            { status: 400 },
          );
        }
        const result = await pageService.bulkSetVisibility(
          parsed.data.ids,
          parsed.data.visibility,
        );
        return NextResponse.json({
          success: true,
          message: `${result.count} pages updated`,
        });
      }

      case "restore": {
        const parsed = BulkRestoreSchema.safeParse(rest);
        if (!parsed.success) {
          return NextResponse.json(
            { success: false, error: parsed.error.flatten().fieldErrors },
            { status: 400 },
          );
        }
        const result = await pageService.bulkRestore(parsed.data.ids);
        return NextResponse.json({
          success: true,
          message: `${result.count} pages restored`,
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: "Invalid action" },
          { status: 400 },
        );
    }
  } catch (error) {
    if (error instanceof PageError) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: error.statusCode },
      );
    }
    logger.error("[api/pages/bulk] POST error:", { error });
    return NextResponse.json(
      { success: false, error: "Bulk action failed" },
      { status: 500 },
    );
  }
}
