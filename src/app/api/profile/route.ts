// src/app/api/profile/route.ts
// Self-service profile endpoints: data export (GET), profile update (PATCH), account deletion (DELETE)
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/server/api-auth";
import { prisma } from "@/server/db/prisma";
import { userService, consentService } from "@/server/wiring";
import { deleteAccountSchema } from "@/features/auth/server/schemas";

const updateProfileSchema = z.object({
  displayName: z.string().trim().max(100).nullable().optional(),
  bio: z.string().max(1000).nullable().optional(),
  website: z.string().url().or(z.literal("")).nullable().optional(),
  phoneNumber: z.string().max(30).nullable().optional(),
  facebook: z.string().max(255).nullable().optional(),
  twitter: z.string().max(255).nullable().optional(),
  instagram: z.string().max(255).nullable().optional(),
  linkedin: z.string().max(255).nullable().optional(),
  github: z.string().max(255).nullable().optional(),
});

/**
 * PATCH /api/profile — Self-service profile update
 * Users can update their own displayName, bio, website, social links.
 */
export async function PATCH(req: NextRequest) {
  const { userId, errorResponse } = await requireAuth();
  if (errorResponse) return errorResponse;

  try {
    const body = await req.json();
    const parsed = updateProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const data: Record<string, unknown> = {};
    const fields = parsed.data;
    if (fields.displayName !== undefined) data.displayName = fields.displayName;
    if (fields.bio !== undefined) data.bio = fields.bio;
    if (fields.website !== undefined) data.website = fields.website || null;
    if (fields.phoneNumber !== undefined) data.phoneNumber = fields.phoneNumber;
    if (fields.facebook !== undefined) data.facebook = fields.facebook;
    if (fields.twitter !== undefined) data.twitter = fields.twitter;
    if (fields.instagram !== undefined) data.instagram = fields.instagram;
    if (fields.linkedin !== undefined) data.linkedin = fields.linkedin;
    if (fields.github !== undefined) data.github = fields.github;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ success: true, message: "No changes" });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      select: {
        id: true, displayName: true, bio: true, website: true,
        phoneNumber: true, facebook: true, twitter: true,
        instagram: true, linkedin: true, github: true,
      },
      data,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error("[Profile PATCH] Error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to update profile" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/profile — GDPR Article 20 data export
 * Returns a JSON dump of all personal data associated with the authenticated user.
 */
export async function GET() {
  const { userId, errorResponse } = await requireAuth();
  if (errorResponse) return errorResponse;

  try {
    const [user, comments, sessions, emailVerifications, emailChanges] =
      await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            email: true,
            username: true,
            firstName: true,
            lastName: true,
            displayName: true,
            nickname: true,
            bio: true,
            website: true,
            phoneNumber: true,
            alternateEmail: true,
            address: true,
            city: true,
            state: true,
            zipCode: true,
            country: true,
            role: true,
            isEmailVerified: true,
            createdAt: true,
            updatedAt: true,
            facebook: true,
            twitter: true,
            instagram: true,
            linkedin: true,
            youtube: true,
            github: true,
            telegram: true,
          },
        }),
        prisma.comment.findMany({
          where: { userId },
          select: {
            id: true,
            content: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            postId: true,
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.userSession.findMany({
          where: { userId },
          select: {
            id: true,
            ipAddress: true,
            userAgent: true,
            createdAt: true,
            expiresAt: true,
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.emailVerificationToken.findMany({
          where: { userId },
          select: { createdAt: true, expiresAt: true },
        }),
        prisma.emailChangeRequest.findMany({
          where: { userId },
          select: {
            oldEmail: true,
            newEmail: true,
            createdAt: true,
            completedAt: true,
            oldEmailVerified: true,
            newEmailVerified: true,
          },
        }),
      ]);

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 },
      );
    }

    // Log GDPR data export consent event
    await consentService.log({
      userId,
      email: user?.email,
      consentType: "data_export",
      granted: true,
      details: "User initiated GDPR Article 20 data export",
    });

    // Include consent history in export
    const consentHistory = await consentService.getUserConsentHistory(userId);

    const exportData = {
      exportDate: new Date().toISOString(),
      user,
      comments,
      sessions,
      emailVerifications,
      emailChanges,
      consentHistory,
    };

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="data-export-${userId}.json"`,
      },
    });
  } catch (err) {
    console.error("[Profile Export] Error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to export data" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/profile — Self-service account deletion
 * Requires password confirmation and "DELETE MY ACCOUNT" text.
 */
export async function DELETE(req: NextRequest) {
  const { session, userId, errorResponse } = await requireAuth();
  if (errorResponse) return errorResponse;

  try {
    const body = await req.json();

    // Validate with Zod schema
    const parsed = deleteAccountSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0]?.message || "Invalid input",
        },
        { status: 400 },
      );
    }
    const { password } = parsed.data;

    // Log account deletion consent event before deleting
    await consentService.log({
      userId,
      email: session.user.email,
      consentType: "account_deletion",
      granted: true,
      details: "User confirmed account self-deletion",
    });

    const result = await userService.deleteMyAccount(userId, password);
    return NextResponse.json({ success: true, message: result.message });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to delete account";
    const status = (err as { statusCode?: number }).statusCode || 400;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
