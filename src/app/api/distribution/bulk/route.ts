/**
 * /api/distribution/bulk — Bulk distribute multiple posts
 * Kill switch: distributionEnabled in SiteSettings
 */
import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { auth } from "@/server/auth";
import { distributionService } from "@/server/wiring";
import { prisma } from "@/server/db/prisma";
import { bulkDistributeSchema } from "@/features/distribution/server/schemas";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !["ADMINISTRATOR", "SUPER_ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    // Kill switch guard
    const settings = await prisma.siteSettings.findFirst();
    if (!settings?.distributionEnabled) {
      return NextResponse.json({ success: false, error: "Distribution is currently disabled" }, { status: 503 });
    }

    const body = await req.json();
    const input = bulkDistributeSchema.parse(body);
    const records = await distributionService.bulkDistribute(input);
    return NextResponse.json({ success: true, data: records }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues.map((i) => i.message).join(", ") },
        { status: 400 },
      );
    }
    const status = (error as { statusCode?: number })?.statusCode ?? 500;
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status },
    );
  }
}
