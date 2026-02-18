// src/server/mail/index.ts
// Real MailProvider implementation using nodemailer
import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import type { MailProvider } from "@/features/auth/types";
import type { SmtpConfig } from "@/features/settings/types";

/**
 * Lazy-loaded SMTP transporter.
 * Reads SMTP config at send-time so admin changes take effect without restart.
 */
export class NodemailerMailProvider implements MailProvider {
  private transporter: Transporter | null = null;
  private lastConfigHash = "";
  private getSmtpConfig: () => Promise<SmtpConfig>;

  constructor(getSmtpConfig: () => Promise<SmtpConfig>) {
    this.getSmtpConfig = getSmtpConfig;
  }

  /** Build or reuse a transporter. Rebuilds when config changes. */
  private async getTransporter(): Promise<Transporter> {
    const cfg = await this.getSmtpConfig();
    const hash = JSON.stringify(cfg);

    if (this.transporter && hash === this.lastConfigHash) {
      return this.transporter;
    }

    if (!cfg.smtpHost || !cfg.smtpUser || !cfg.smtpPassword) {
      throw new Error(
        "SMTP not configured. Set SMTP host, user, and password in Admin → Settings → Email."
      );
    }

    this.transporter = nodemailer.createTransport({
      host: cfg.smtpHost,
      port: cfg.smtpPort ?? 587,
      secure: cfg.smtpSecure ?? cfg.smtpPort === 465,
      auth: {
        user: cfg.smtpUser,
        pass: cfg.smtpPassword,
      },
      tls: { rejectUnauthorized: true },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 30_000,
    });

    this.lastConfigHash = hash;
    return this.transporter;
  }

  private async send(to: string, subject: string, html: string): Promise<void> {
    try {
      const transport = await this.getTransporter();
      const cfg = await this.getSmtpConfig();
      const from = cfg.emailFromName
        ? `"${cfg.emailFromName}" <${cfg.emailFromAddress || cfg.smtpUser}>`
        : cfg.emailFromAddress || cfg.smtpUser || "noreply@myblog.com";

      await transport.sendMail({ from, to, subject, html });
    } catch (err) {
      console.error("[MailProvider] Failed to send email:", (err as Error).message);
      // Don't throw — email failures should not break auth flows
    }
  }

  async sendWelcomeEmail(email: string, firstName?: string | null): Promise<void> {
    const name = firstName || "there";
    await this.send(
      email,
      "Welcome to our blog!",
      `<h2>Welcome, ${name}!</h2>
       <p>Thank you for creating an account. We're glad to have you on board.</p>
       <p>You can now leave comments, save your preferences, and engage with our community.</p>
       <p>— The Blog Team</p>`,
    );
  }

  async sendEmailVerification(email: string, token: string, code: string): Promise<void> {
    await this.send(
      email,
      "Verify your email address",
      `<h2>Email Verification</h2>
       <p>Please verify your email address by entering this code:</p>
       <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px; padding: 16px; background: #f3f4f6; border-radius: 8px; text-align: center;">${code}</p>
       <p>Or click the link below:</p>
       <p><a href="${process.env.NEXTAUTH_URL || ""}/api/auth/verify-email?token=${token}" style="color: #2563eb;">Verify Email →</a></p>
       <p>This link expires in 24 hours.</p>`,
    );
  }

  async sendPasswordReset(email: string, token: string): Promise<void> {
    await this.send(
      email,
      "Reset your password",
      `<h2>Password Reset</h2>
       <p>You (or someone else) requested a password reset for your account.</p>
       <p><a href="${process.env.NEXTAUTH_URL || ""}/login?resetToken=${token}" style="color: #2563eb; font-weight: bold;">Reset Password →</a></p>
       <p>This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>`,
    );
  }

  async sendPasswordResetConfirmation(email: string): Promise<void> {
    await this.send(
      email,
      "Your password has been changed",
      `<h2>Password Changed</h2>
       <p>Your password was successfully changed.</p>
       <p>If you did not make this change, please contact us immediately.</p>`,
    );
  }

  async sendEmailChangeVerification(email: string, code: string, type: "OLD" | "NEW"): Promise<void> {
    const context = type === "OLD"
      ? "We received a request to change the email on your account."
      : "Please verify this new email address.";

    await this.send(
      email,
      "Confirm your email change",
      `<h2>Email Change Verification</h2>
       <p>${context}</p>
       <p>Your verification code:</p>
       <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px; padding: 16px; background: #f3f4f6; border-radius: 8px; text-align: center;">${code}</p>
       <p>This code expires in 30 minutes.</p>`,
    );
  }
}

/**
 * Send a one-off transactional email (e.g. contact form notification).
 * Uses the same SMTP config from DB.
 */
export async function sendTransactionalEmail(
  getSmtpConfig: () => Promise<SmtpConfig>,
  to: string,
  subject: string,
  html: string,
): Promise<void> {
  const cfg = await getSmtpConfig();
  if (!cfg.smtpHost || !cfg.smtpUser || !cfg.smtpPassword) {
    console.warn("[Mail] SMTP not configured — skipping transactional email");
    return;
  }
  const transport = nodemailer.createTransport({
    host: cfg.smtpHost,
    port: cfg.smtpPort ?? 587,
    secure: cfg.smtpSecure ?? cfg.smtpPort === 465,
    auth: { user: cfg.smtpUser, pass: cfg.smtpPassword },
  });
  const from = cfg.emailFromName
    ? `"${cfg.emailFromName}" <${cfg.emailFromAddress || cfg.smtpUser}>`
    : cfg.emailFromAddress || cfg.smtpUser || "noreply@myblog.com";

  await transport.sendMail({ from, to, subject, html });
}
