import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { createLogger } from "@/server/observability/logger";
import { sendTransactionalEmail } from "@/server/mail";
import { siteSettingsService } from "@/server/wiring";
import { z } from "zod";
import crypto from "crypto";

const logger = createLogger("api/newsletter/subscribe");

const SubscribeSchema = z.object({
  email: z.string().email("Invalid email address").max(254),
  name: z.string().max(100).nullish(),
  source: z.string().max(50).default("website"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = SubscribeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues.map(e => e.message).join(", ") },
        { status: 400 },
      );
    }

    const { email, name, source } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Check if already subscribed
    const existing = await prisma.newsletterSubscriber.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      if (existing.confirmed) {
        // Don't reveal subscription status — return generic success
        return NextResponse.json({
          success: true,
          message: "If this email is not already subscribed, a confirmation email has been sent.",
        });
      }
      // Re-send confirmation for unconfirmed subscriber
      const confirmToken = crypto.randomUUID();
      await prisma.newsletterSubscriber.update({
        where: { id: existing.id },
        data: { confirmToken },
      });
      await sendConfirmationEmail(normalizedEmail, confirmToken, name);
      return NextResponse.json({
        success: true,
        message: "If this email is not already subscribed, a confirmation email has been sent.",
      });
    }

    // Create new subscriber
    const confirmToken = crypto.randomUUID();
    const unsubscribeToken = crypto.randomUUID();

    await prisma.newsletterSubscriber.create({
      data: {
        email: normalizedEmail,
        name: name || null,
        confirmed: false,
        confirmToken,
        unsubscribeToken,
        source,
        ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
      },
    });

    // Log consent
    await prisma.consentLog.create({
      data: {
        email: normalizedEmail,
        consentType: "newsletter",
        granted: true,
        ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
        userAgent: req.headers.get("user-agent") || null,
      },
    });

    await sendConfirmationEmail(normalizedEmail, confirmToken, name);

    return NextResponse.json({
      success: true,
      message: "If this email is not already subscribed, a confirmation email has been sent.",
    });
  } catch (error) {
    logger.error("[api/newsletter/subscribe] error:", { error });
    return NextResponse.json(
      { success: false, error: "Failed to process subscription" },
      { status: 500 },
    );
  }
}

async function sendConfirmationEmail(email: string, token: string, name?: string | null) {
  try {
    const siteUrl = process.env.NEXTAUTH_URL || "";
    const confirmUrl = `${siteUrl}/api/newsletter/confirm?token=${token}`;
    const greeting = name ? `Hi ${name}` : "Hi there";

    await sendTransactionalEmail(
      () => siteSettingsService.getSmtpConfig(),
      email,
      "Confirm your newsletter subscription",
      `<h2>${greeting}!</h2>
       <p>Thank you for subscribing to our newsletter.</p>
       <p>Please confirm your subscription by clicking the link below:</p>
       <p><a href="${confirmUrl}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;">Confirm Subscription →</a></p>
       <p style="color:#6b7280;font-size:14px;">If you didn't subscribe, you can safely ignore this email.</p>`,
    );
  } catch (err) {
    logger.error("[newsletter] Failed to send confirmation email:", { error: err });
  }
}
