// src/app/api/profile/password/route.ts
// Self-service password change endpoint — any authenticated user can change their own password.
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/api-auth";
import { prisma } from "@/server/db/prisma";
import { changePasswordSchema } from "@/features/auth/server/schemas";
import {
  hashPassword,
  comparePassword,
  validatePasswordStrength,
} from "@/features/auth/server/password.util";
import { DEFAULT_USER_CONFIG } from "@/features/auth/server/constants";
import { createLogger } from "@/server/observability/logger";

const logger = createLogger("api/profile/password");

/**
 * PATCH /api/profile/password — Self-service password change
 * Requires: any authenticated user (no admin role needed).
 * Body: { currentPassword: string; newPassword: string }
 */
export async function PATCH(req: NextRequest) {
  const { userId, errorResponse } = await requireAuth();
  if (errorResponse) return errorResponse;

  try {
    const body = await req.json();
    const parsed = changePasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { currentPassword, newPassword } = parsed.data;

    // Fetch user with password hash
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 },
      );
    }

    // Verify current password
    const isValid = await comparePassword(currentPassword, user.password);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: "Current password is incorrect" },
        { status: 400 },
      );
    }

    // Validate new password strength against admin-configured policy
    try {
      validatePasswordStrength(newPassword, DEFAULT_USER_CONFIG);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Password does not meet requirements";
      return NextResponse.json(
        { success: false, error: message },
        { status: 400 },
      );
    }

    // Hash and persist
    const hashed = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashed },
    });

    logger.info("Password changed successfully", { userId });

    return NextResponse.json({
      success: true,
      data: { message: "Password changed successfully" },
    });
  } catch (err) {
    logger.error("Password change failed", { error: err });
    return NextResponse.json(
      { success: false, error: "Failed to change password" },
      { status: 500 },
    );
  }
}
