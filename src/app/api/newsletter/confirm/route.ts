import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { createLogger } from "@/server/observability/logger";

const logger = createLogger("api/newsletter/confirm");

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get("token");
    if (!token) {
      return NextResponse.json(
        { success: false, error: "Confirmation token is required" },
        { status: 400 },
      );
    }

    const subscriber = await prisma.newsletterSubscriber.findUnique({
      where: { confirmToken: token },
    });

    if (!subscriber) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired confirmation token" },
        { status: 404 },
      );
    }

    if (subscriber.confirmed) {
      // Already confirmed — redirect to success page
      const siteUrl = process.env.NEXTAUTH_URL || "";
      return NextResponse.redirect(`${siteUrl}/?newsletter=already-confirmed`);
    }

    await prisma.newsletterSubscriber.update({
      where: { id: subscriber.id },
      data: {
        confirmed: true,
        confirmToken: null, // Consume the token
        subscribedAt: new Date(),
      },
    });

    // Log consent confirmation
    await prisma.consentLog.create({
      data: {
        email: subscriber.email,
        consentType: "newsletter",
        granted: true,
        details: "Email confirmed via double opt-in",
      },
    });

    // Redirect to success page
    const siteUrl = process.env.NEXTAUTH_URL || "";
    return NextResponse.redirect(`${siteUrl}/?newsletter=confirmed`);
  } catch (error) {
    logger.error("[api/newsletter/confirm] error:", { error });
    return NextResponse.json(
      { success: false, error: "Failed to confirm subscription" },
      { status: 500 },
    );
  }
}
