// src/app/api/profile/route.ts
// Self-service profile endpoints: data export (GET) and account deletion (DELETE)
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { prisma } from "@/server/db/prisma";
import { userService, consentService } from "@/server/wiring";

/**
 * GET /api/profile — GDPR Article 20 data export
 * Returns a JSON dump of all personal data associated with the authenticated user.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const [user, comments, sessions, emailVerifications, emailChanges] = await Promise.all([
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
        select: { oldEmail: true, newEmail: true, createdAt: true, completedAt: true, oldEmailVerified: true, newEmailVerified: true },
      }),
    ]);

    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
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
    return NextResponse.json({ success: false, error: "Failed to export data" }, { status: 500 });
  }
}

/**
 * DELETE /api/profile — Self-service account deletion
 * Requires password confirmation and "DELETE MY ACCOUNT" text.
 */
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { password, confirmText } = body;

    if (!password || typeof password !== "string") {
      return NextResponse.json({ success: false, error: "Password is required" }, { status: 400 });
    }
    if (confirmText !== "DELETE MY ACCOUNT") {
      return NextResponse.json(
        { success: false, error: 'You must type "DELETE MY ACCOUNT" to confirm' },
        { status: 400 },
      );
    }

    // Log account deletion consent event before deleting
    await consentService.log({
      userId: session.user.id,
      email: session.user.email,
      consentType: "account_deletion",
      granted: true,
      details: "User confirmed account self-deletion",
    });

    const result = await userService.deleteMyAccount(session.user.id, password);
    return NextResponse.json({ success: true, message: result.message });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete account";
    const status = (err as { statusCode?: number }).statusCode || 400;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
