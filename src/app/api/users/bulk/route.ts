import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { auth } from "@/server/auth";
import { createLogger } from "@/server/observability/logger";
import { z } from "zod";
import { USER_ROLES } from "@/features/auth/types";

const logger = createLogger("api/users/bulk");

const ADMIN_ROLES = ["ADMINISTRATOR", "SUPER_ADMIN"];

const bulkActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("delete"),
    ids: z.array(z.string().min(1)).min(1, "At least one ID required"),
  }),
  z.object({
    action: z.literal("changeRole"),
    ids: z.array(z.string().min(1)).min(1, "At least one ID required"),
    role: z.enum(USER_ROLES),
  }),
]);

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !ADMIN_ROLES.includes(session.user.role)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const validation = bulkActionSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const parsed = validation.data;
    const callerRole = session.user.role;
    const callerId = (session.user as { id?: string })?.id;

    // Prevent operating on yourself
    if (callerId && parsed.ids.includes(callerId)) {
      return NextResponse.json(
        { success: false, error: "Cannot perform bulk actions on your own account" },
        { status: 403 }
      );
    }

    switch (parsed.action) {
      case "delete": {
        // Prevent deleting SUPER_ADMIN users (unless caller is SUPER_ADMIN)
        const superAdmins = await prisma.user.findMany({
          where: { id: { in: parsed.ids }, role: "SUPER_ADMIN" },
          select: { id: true },
        });

        let safeIds = parsed.ids;
        if (superAdmins.length > 0) {
          if (callerRole !== "SUPER_ADMIN") {
            const superAdminIds = new Set(superAdmins.map((u) => u.id));
            safeIds = parsed.ids.filter((id: string) => !superAdminIds.has(id));
          } else {
            // Even SUPER_ADMIN cannot delete the last SUPER_ADMIN
            const totalSuperAdmins = await prisma.user.count({ where: { role: "SUPER_ADMIN" } });
            if (totalSuperAdmins <= superAdmins.length) {
              return NextResponse.json(
                { success: false, error: "Cannot delete the last Super Admin account" },
                { status: 403 }
              );
            }
          }
        }

        if (safeIds.length === 0) {
          return NextResponse.json(
            { success: false, error: "No eligible users to delete (Super Admin users were excluded)" },
            { status: 403 }
          );
        }
        await prisma.user.deleteMany({ where: { id: { in: safeIds } } });
        return NextResponse.json({ success: true, message: `${safeIds.length} users deleted` });
      }
      case "changeRole": {
        const { role } = parsed;

        // Only SUPER_ADMIN can assign SUPER_ADMIN role
        if (role === "SUPER_ADMIN" && callerRole !== "SUPER_ADMIN") {
          return NextResponse.json(
            { success: false, error: "Only Super Admins can assign Super Admin role" },
            { status: 403 }
          );
        }

        // Non-SUPER_ADMIN cannot change the role of SUPER_ADMIN users
        if (callerRole !== "SUPER_ADMIN") {
          const superAdminTargets = await prisma.user.count({
            where: { id: { in: parsed.ids }, role: "SUPER_ADMIN" },
          });
          if (superAdminTargets > 0) {
            return NextResponse.json(
              { success: false, error: "Cannot change the role of Super Admin users" },
              { status: 403 }
            );
          }
        }

        await prisma.user.updateMany({
          where: { id: { in: parsed.ids } },
          data: { role },
        });
        return NextResponse.json({
          success: true,
          message: `${parsed.ids.length} users updated to ${role}`,
        });
      }
    }
  } catch (error) {
    logger.error("[api/users/bulk] POST error:", { error });
    return NextResponse.json({ success: false, error: "Bulk action failed" }, { status: 500 });
  }
}
