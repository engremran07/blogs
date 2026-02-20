import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import {
  hashPassword,
  validatePasswordStrength,
} from "@/features/auth/server/password.util";
import { registerSchema } from "@/features/auth/server/schemas";
import {
  sanitizeEmail,
  sanitizeSlug,
} from "@/features/auth/server/sanitization.util";
import { DEFAULT_USER_CONFIG } from "@/features/auth/server/constants";
import { createLogger } from "@/server/observability/logger";
import {
  captchaVerificationService,
  captchaAdminSettings,
  siteSettingsService,
} from "@/server/wiring";
import { sendTransactionalEmail } from "@/server/mail";

const logger = createLogger("api/auth/register");

export async function POST(request: Request) {
  try {
    // Check if registration is enabled — honour BOTH SiteSettings and UserSettings
    let config = DEFAULT_USER_CONFIG;
    try {
      const settings = await prisma.userSettings.findFirst();
      if (settings)
        config = { ...DEFAULT_USER_CONFIG, ...settings } as typeof config;
    } catch {
      /* use defaults */
    }

    if (!config.registrationEnabled) {
      return NextResponse.json(
        { success: false, error: "Registration is currently disabled" },
        { status: 403 },
      );
    }

    // Also check SiteSettings.enableRegistration (admin toggle on settings page)
    try {
      const siteSettings = await prisma.siteSettings.findFirst();
      if (siteSettings && siteSettings.enableRegistration === false) {
        return NextResponse.json(
          { success: false, error: "Registration is currently disabled" },
          { status: 403 },
        );
      }
    } catch {
      /* proceed if SiteSettings unavailable */
    }

    const body = await request.json();

    // ── CAPTCHA verification ──
    const captchaRequired = await captchaAdminSettings.isCaptchaRequired({
      service: "registration",
    });

    if (captchaRequired.required) {
      const { captchaToken, captchaType, captchaId } = body;
      if (!captchaToken) {
        return NextResponse.json(
          { success: false, error: "CAPTCHA verification is required" },
          { status: 400 },
        );
      }

      const clientIp =
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        request.headers.get("x-real-ip") ??
        "127.0.0.1";

      const captchaResult = await captchaVerificationService.verify({
        token: captchaToken,
        clientIp,
        captchaType,
        captchaId,
      });

      if (!captchaResult.success) {
        return NextResponse.json(
          { success: false, error: "CAPTCHA verification failed" },
          { status: 403 },
        );
      }
    }

    // Validate input with Zod schema
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      const messages = parsed.error.issues.map((e) => e.message).join(", ");
      return NextResponse.json(
        { success: false, error: messages },
        { status: 400 },
      );
    }

    const {
      email: rawEmail,
      password,
      name,
      username: rawUsername,
    } = parsed.data;

    // Sanitize email
    const email = sanitizeEmail(rawEmail);
    if (!email) {
      return NextResponse.json(
        { success: false, error: "Invalid email format" },
        { status: 400 },
      );
    }

    // Validate password strength against admin-configured policy
    try {
      validatePasswordStrength(password, config);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Password does not meet requirements";
      return NextResponse.json(
        { success: false, error: message },
        { status: 400 },
      );
    }

    // Check existing user by email
    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      return NextResponse.json(
        { success: false, error: "Email already in use" },
        { status: 409 },
      );
    }

    // Generate unique username
    const baseUsername = sanitizeSlug(rawUsername || email.split("@")[0]);
    let username = baseUsername;
    let counter = 1;
    const MAX_USERNAME_ATTEMPTS = 100;
    while (await prisma.user.findUnique({ where: { username } })) {
      username = `${baseUsername}${counter}`;
      counter++;
      if (counter > MAX_USERNAME_ATTEMPTS) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Unable to generate a unique username. Please provide a different username.",
          },
          { status: 409 },
        );
      }
    }

    const hashedPassword = await hashPassword(password, config.bcryptRounds);

    const firstName = name?.split(" ")[0] || undefined;
    const lastName = name?.split(" ").slice(1).join(" ") || undefined;

    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        displayName: name || undefined,
        firstName,
        lastName,
        role: config.defaultRole,
      },
      select: { id: true, username: true, email: true, role: true },
    });

    // ── Post-registration emails (fire-and-forget) ──────────────────────
    try {
      const notifyCfg = await siteSettingsService.getNotificationConfig();
      const smtpCfg = () => siteSettingsService.getSmtpConfig();

      // Welcome email to the new user
      if (notifyCfg.emailWelcomeEnabled) {
        sendTransactionalEmail(
          smtpCfg,
          email,
          "Welcome to our blog!",
          `<h2>Welcome, ${firstName || name || "there"}!</h2>
           <p>Thank you for creating an account. We're glad to have you on board.</p>
           <p>You can now leave comments, save your preferences, and engage with our community.</p>
           <p>— The Blog Team</p>`,
        ).catch((err) =>
          logger.warn("Welcome email failed:", {
            error: (err as Error).message,
          }),
        );
      }

      // Notify admin of new registration
      if (notifyCfg.emailNotifyOnUser) {
        const adminEmail = (await siteSettingsService.getSmtpConfig())
          .emailFromAddress;
        if (adminEmail) {
          sendTransactionalEmail(
            smtpCfg,
            adminEmail,
            `New user registered: ${username}`,
            `<h2>New Registration</h2>
             <table style="border-collapse:collapse;width:100%;max-width:500px;">
               <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:600;">Username</td><td style="padding:8px;border:1px solid #e5e7eb;">${username}</td></tr>
               <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:600;">Email</td><td style="padding:8px;border:1px solid #e5e7eb;">${email}</td></tr>
               <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:600;">Role</td><td style="padding:8px;border:1px solid #e5e7eb;">${config.defaultRole}</td></tr>
               <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:600;">Time</td><td style="padding:8px;border:1px solid #e5e7eb;">${new Date().toISOString()}</td></tr>
             </table>`,
          ).catch((err) =>
            logger.warn("Admin registration notification failed:", {
              error: (err as Error).message,
            }),
          );
        }
      }
    } catch (notifyErr) {
      logger.warn("Post-registration email setup failed:", {
        error: (notifyErr as Error).message,
      });
    }

    return NextResponse.json({ success: true, data: user }, { status: 201 });
  } catch (error) {
    logger.error("Registration error:", { error });
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
