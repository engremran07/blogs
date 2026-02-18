import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { createLogger } from "@/server/observability/logger";

const logger = createLogger("api/newsletter/unsubscribe");

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get("token");
    if (!token) {
      return NextResponse.json(
        { success: false, error: "Unsubscribe token is required" },
        { status: 400 },
      );
    }

    const subscriber = await prisma.newsletterSubscriber.findUnique({
      where: { unsubscribeToken: token },
    });

    if (!subscriber) {
      return NextResponse.json(
        { success: false, error: "Invalid unsubscribe token" },
        { status: 404 },
      );
    }

    if (subscriber.unsubscribedAt) {
      // Already unsubscribed — redirect
      const siteUrl = process.env.NEXTAUTH_URL || "";
      return NextResponse.redirect(`${siteUrl}/?newsletter=already-unsubscribed`);
    }

    await prisma.newsletterSubscriber.update({
      where: { id: subscriber.id },
      data: {
        confirmed: false,
        unsubscribedAt: new Date(),
      },
    });

    // Log consent withdrawal
    await prisma.consentLog.create({
      data: {
        email: subscriber.email,
        consentType: "newsletter",
        granted: false,
        ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
        userAgent: req.headers.get("user-agent") || null,
        details: "User unsubscribed via one-click link",
      },
    });

    // Redirect to confirmation page
    const siteUrl = process.env.NEXTAUTH_URL || "";
    return NextResponse.redirect(`${siteUrl}/?newsletter=unsubscribed`);
  } catch (error) {
    logger.error("[api/newsletter/unsubscribe] error:", { error });
    return NextResponse.json(
      { success: false, error: "Failed to process unsubscribe request" },
      { status: 500 },
    );
  }
}
