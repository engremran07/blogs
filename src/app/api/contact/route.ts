// src/app/api/contact/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { siteSettingsService } from "@/server/wiring";
import { sendTransactionalEmail } from "@/server/mail";

const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  email: z.string().trim().email("Valid email is required").max(200),
  subject: z.string().trim().max(300).optional().default(""),
  message: z.string().trim().min(10, "Message must be at least 10 characters").max(5000),
  captchaToken: z.string().min(1, "Please complete the security check"),
  captchaId: z.string().optional(),
  captchaType: z.string().optional(),
});

// ── In-memory rate limiter (per-IP, fallback when Upstash is unavailable) ──
const contactRateMap = new Map<string, { count: number; resetAt: number }>();
const CONTACT_RATE_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const CONTACT_RATE_MAX = 5; // max 5 submissions per window per IP

function isContactRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = contactRateMap.get(ip);
  if (!entry || now > entry.resetAt) {
    contactRateMap.set(ip, { count: 1, resetAt: now + CONTACT_RATE_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > CONTACT_RATE_MAX;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = contactSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues.map((i) => i.message).join(", ") },
        { status: 400 },
      );
    }

    const { name, email, subject, message } = parsed.data;

    // ── Rate limiting (in-memory fallback; middleware also rate-limits mutations) ──
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || req.headers.get("x-real-ip")
      || "unknown";
    if (isContactRateLimited(clientIp)) {
      return NextResponse.json(
        { success: false, error: "Too many submissions. Please try again later." },
        { status: 429 },
      );
    }

    // Verify CAPTCHA — fail-closed: deny on any unexpected error
    try {
      const { captchaVerificationService } = await import("@/server/wiring");
      const result = await captchaVerificationService.verify({
        token: parsed.data.captchaToken,
        clientIp: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown",
        captchaId: parsed.data.captchaId,
        captchaType: parsed.data.captchaType as "turnstile" | "recaptcha-v3" | "recaptcha-v2" | "hcaptcha" | "custom" | undefined,
      });
      if (!result.success) {
        return NextResponse.json(
          { success: false, error: "CAPTCHA verification failed" },
          { status: 400 },
        );
      }
    } catch (err) {
      // SECURITY: fail-closed — if captcha service errors, deny the request
      console.error("[Contact] CAPTCHA verification error:", (err as Error).message);
      return NextResponse.json(
        { success: false, error: "Security verification failed. Please try again." },
        { status: 400 },
      );
    }

    // Get settings to find recipient email
    const settings = await siteSettingsService.getSettings();
    const raw = settings as unknown as Record<string, unknown>;
    const recipientEmail = (raw.contactEmail as string)
      || (raw.emailFromAddress as string)
      || null;

    if (!recipientEmail) {
      console.warn("[Contact] No contact or from email configured — message logged but not sent");
    }

    // Send the email notification
    const safeSubject = subject ? `Contact: ${subject}` : `Contact message from ${name}`;
    const html = `
      <h2>New Contact Form Submission</h2>
      <table style="border-collapse:collapse; width:100%;">
        <tr><td style="padding:8px; font-weight:bold; border-bottom:1px solid #eee;">Name</td><td style="padding:8px; border-bottom:1px solid #eee;">${escapeHtml(name)}</td></tr>
        <tr><td style="padding:8px; font-weight:bold; border-bottom:1px solid #eee;">Email</td><td style="padding:8px; border-bottom:1px solid #eee;"><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></td></tr>
        ${subject ? `<tr><td style="padding:8px; font-weight:bold; border-bottom:1px solid #eee;">Subject</td><td style="padding:8px; border-bottom:1px solid #eee;">${escapeHtml(subject)}</td></tr>` : ""}
        <tr><td style="padding:8px; font-weight:bold; vertical-align:top;">Message</td><td style="padding:8px; white-space:pre-wrap;">${escapeHtml(message)}</td></tr>
      </table>
      <p style="color:#999; font-size:12px; margin-top:16px;">Sent via the blog contact form.</p>
    `;

    if (recipientEmail) {
      try {
        const smtpConfig = () => siteSettingsService.getSmtpConfig();
        await sendTransactionalEmail(smtpConfig, recipientEmail, safeSubject, html);
      } catch (err) {
        console.error("[Contact] Failed to send email:", (err as Error).message);
        // Still return success — message was received
      }
    }

    return NextResponse.json({ success: true, message: "Message sent successfully" });
  } catch (err) {
    console.error("[Contact API] Error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to process your message. Please try again." },
      { status: 500 },
    );
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}
