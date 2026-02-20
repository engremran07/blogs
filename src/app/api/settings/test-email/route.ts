import { NextResponse } from "next/server";
import { requireAuth } from "@/server/api-auth";
import { siteSettingsService } from "@/server/wiring";
import { sendTransactionalEmail } from "@/server/mail";
import { createLogger } from "@/server/observability/logger";

const logger = createLogger("api/settings/test-email");

export async function POST() {
  try {
    const { errorResponse } = await requireAuth({ level: "admin" });
    if (errorResponse) return errorResponse;

    const smtpCfg = await siteSettingsService.getSmtpConfig();

    if (!smtpCfg.smtpHost || !smtpCfg.smtpUser || !smtpCfg.smtpPassword) {
      return NextResponse.json(
        {
          success: false,
          error:
            "SMTP is not configured. Please fill in host, user, and password first.",
        },
        { status: 400 },
      );
    }

    const recipient = smtpCfg.emailFromAddress || smtpCfg.smtpUser;
    if (!recipient) {
      return NextResponse.json(
        {
          success: false,
          error:
            "No recipient address available. Set a From Email or SMTP username.",
        },
        { status: 400 },
      );
    }

    await sendTransactionalEmail(
      () => siteSettingsService.getSmtpConfig(),
      recipient,
      "✅ SMTP Test — Your email is working!",
      `<div style="font-family:system-ui,sans-serif;max-width:500px;margin:0 auto;padding:24px;">
        <h2 style="color:#16a34a;">SMTP Test Successful</h2>
        <p>This is a test email sent from your blog's admin panel.</p>
        <p>If you received this message, your SMTP configuration is correct and emails will be delivered.</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;" />
        <p style="font-size:12px;color:#9ca3af;">
          Sent at ${new Date().toISOString()}<br/>
          Host: ${smtpCfg.smtpHost}:${smtpCfg.smtpPort ?? 587}
        </p>
      </div>`,
    );

    return NextResponse.json({
      success: true,
      message: `Test email sent to ${recipient}`,
    });
  } catch (error) {
    logger.error("SMTP test email failed:", { error });
    const msg =
      error instanceof Error ? error.message : "Failed to send test email";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
