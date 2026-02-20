/**
 * ============================================================================
 * MODULE:   captcha/server/verification.service.ts
 * PURPOSE:  Server-side CAPTCHA token verification for ALL providers.
 *           Verifies tokens against external APIs (Turnstile, reCAPTCHA, hCaptcha)
 *           and validates in-house challenges against DB-stored answers.
 *
 * SECURITY: This is the ONLY place where captcha tokens should be trusted.
 *           Client-side checks are UX only — server MUST verify.
 * ============================================================================
 */

import { createLogger } from "@/server/observability/logger";
import type { CaptchaPrismaClient, CaptchaProviderType } from "../types";
import { CAPTCHA_DISABLED_TOKEN } from "../utils/constants";

const logger = createLogger("captcha/verification");

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CaptchaVerificationResult {
  success: boolean;
  provider?: string;
  score?: number;
  error?: string;
}

export interface CaptchaVerifyOptions {
  token: string;
  clientIp: string;
  captchaType?: CaptchaProviderType;
  captchaId?: string;
}

interface ProviderSecrets {
  turnstileSecret?: string;
  recaptchaSecret?: string;
  recaptchaV2Secret?: string;
  hcaptchaSecret?: string;
}

// ─── Verification Service ───────────────────────────────────────────────────

export class CaptchaVerificationService {
  private secrets: ProviderSecrets;

  constructor(
    private readonly prisma: CaptchaPrismaClient,
    secrets?: Partial<ProviderSecrets>,
  ) {
    this.secrets = {
      turnstileSecret:
        secrets?.turnstileSecret ?? process.env.CLOUDFLARE_TURNSTILE_SECRET,
      recaptchaSecret:
        secrets?.recaptchaSecret ?? process.env.RECAPTCHA_SECRET_KEY,
      recaptchaV2Secret:
        secrets?.recaptchaV2Secret ??
        process.env.RECAPTCHA_V2_SECRET_KEY ??
        process.env.RECAPTCHA_SECRET_KEY,
      hcaptchaSecret:
        secrets?.hcaptchaSecret ?? process.env.HCAPTCHA_SECRET_KEY,
    };
  }

  /**
   * Verify a CAPTCHA token server-side.
   * Returns { success: true } only if the token is genuinely valid.
   *
   * SECURITY:
   *  - Rejects the disabled sentinel token
   *  - Rejects empty/missing tokens
   *  - Dispatches to the correct provider's verification API
   *  - Records the attempt for rate-limiting / lockout
   */
  async verify(opts: CaptchaVerifyOptions): Promise<CaptchaVerificationResult> {
    const { token, clientIp, captchaType, captchaId } = opts;

    // ── Reject disabled sentinel ──
    if (!token || token === CAPTCHA_DISABLED_TOKEN) {
      return { success: false, error: "Missing or invalid CAPTCHA token" };
    }

    let result: CaptchaVerificationResult;

    try {
      switch (captchaType) {
        case "turnstile":
          result = await this.verifyTurnstile(token, clientIp);
          break;
        case "recaptcha-v3":
          result = await this.verifyRecaptchaV3(token, clientIp);
          break;
        case "recaptcha-v2":
          result = await this.verifyRecaptchaV2(token, clientIp);
          break;
        case "hcaptcha":
          result = await this.verifyHCaptcha(token, clientIp);
          break;
        case "custom":
          result = await this.verifyInhouse(token, captchaId);
          break;
        default:
          // Auto-detect: try to infer from token format or verify against all
          result = await this.verifyAutoDetect(token, clientIp, captchaId);
          break;
      }
    } catch (err) {
      logger.error("CAPTCHA verification error", {
        error: err instanceof Error ? err.message : String(err),
        provider: captchaType,
      });
      result = { success: false, error: "Verification service error" };
    }

    // ── Record attempt ──
    try {
      await this.prisma.captchaAttempt.create({
        data: {
          clientIp,
          provider: captchaType ?? "unknown",
          success: result.success,
          score: result.score ?? null,
          service: null,
        },
      });
    } catch {
      // Don't fail verification if attempt recording fails
    }

    return result;
  }

  // ─── Provider Verifiers ─────────────────────────────────────────────────

  private async verifyTurnstile(
    token: string,
    clientIp: string,
  ): Promise<CaptchaVerificationResult> {
    const secret = this.secrets.turnstileSecret;
    if (!secret) {
      return { success: false, error: "Turnstile secret key not configured" };
    }

    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          secret,
          response: token,
          remoteip: clientIp,
        }),
      },
    );

    const data = (await res.json()) as {
      success: boolean;
      "error-codes"?: string[];
    };
    return {
      success: data.success === true,
      provider: "turnstile",
      error: data.success
        ? undefined
        : `Turnstile: ${(data["error-codes"] ?? []).join(", ")}`,
    };
  }

  private async verifyRecaptchaV3(
    token: string,
    clientIp: string,
  ): Promise<CaptchaVerificationResult> {
    const secret = this.secrets.recaptchaSecret;
    if (!secret) {
      return {
        success: false,
        error: "reCAPTCHA v3 secret key not configured",
      };
    }

    const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret,
        response: token,
        remoteip: clientIp,
      }),
    });

    const data = (await res.json()) as {
      success: boolean;
      score?: number;
      "error-codes"?: string[];
    };
    const scoreThreshold = 0.5;
    const passed = data.success === true && (data.score ?? 0) >= scoreThreshold;

    return {
      success: passed,
      provider: "recaptcha-v3",
      score: data.score,
      error: passed
        ? undefined
        : `reCAPTCHA v3: score ${data.score ?? "N/A"} below threshold`,
    };
  }

  private async verifyRecaptchaV2(
    token: string,
    clientIp: string,
  ): Promise<CaptchaVerificationResult> {
    const secret = this.secrets.recaptchaV2Secret;
    if (!secret) {
      return {
        success: false,
        error: "reCAPTCHA v2 secret key not configured",
      };
    }

    const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret,
        response: token,
        remoteip: clientIp,
      }),
    });

    const data = (await res.json()) as {
      success: boolean;
      "error-codes"?: string[];
    };
    return {
      success: data.success === true,
      provider: "recaptcha-v2",
      error: data.success
        ? undefined
        : `reCAPTCHA v2: ${(data["error-codes"] ?? []).join(", ")}`,
    };
  }

  private async verifyHCaptcha(
    token: string,
    clientIp: string,
  ): Promise<CaptchaVerificationResult> {
    const secret = this.secrets.hcaptchaSecret;
    if (!secret) {
      return { success: false, error: "hCaptcha secret key not configured" };
    }

    const res = await fetch("https://api.hcaptcha.com/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret,
        response: token,
        remoteip: clientIp,
      }),
    });

    const data = (await res.json()) as {
      success: boolean;
      "error-codes"?: string[];
    };
    return {
      success: data.success === true,
      provider: "hcaptcha",
      error: data.success
        ? undefined
        : `hCaptcha: ${(data["error-codes"] ?? []).join(", ")}`,
    };
  }

  /**
   * Verify in-house captcha against the server-stored challenge.
   * The challenge must exist in DB and not be expired or already used.
   */
  private async verifyInhouse(
    token: string,
    captchaId?: string,
  ): Promise<CaptchaVerificationResult> {
    if (!captchaId) {
      return { success: false, error: "In-house captcha: missing captcha ID" };
    }

    try {
      // Find the challenge in DB
      const challenge = (await this.prisma.captchaChallenge?.findUnique?.({
        where: { id: captchaId },
      })) as
        | {
            id: string;
            expiresAt: Date;
            usedAt: Date | null;
            attempts: number;
            maxAttempts: number | null;
            answer: string;
          }
        | null
        | undefined;

      if (!challenge) {
        return {
          success: false,
          error: "In-house captcha: challenge not found",
        };
      }

      // Check expiry
      if (new Date() > new Date(challenge.expiresAt)) {
        // Clean up expired challenge
        await this.prisma.captchaChallenge
          ?.delete?.({ where: { id: captchaId } })
          .catch(() => {});
        return { success: false, error: "In-house captcha: challenge expired" };
      }

      // Check if already used
      if (challenge.usedAt) {
        return {
          success: false,
          error: "In-house captcha: challenge already used",
        };
      }

      // Check max attempts
      if (challenge.attempts >= (challenge.maxAttempts ?? 3)) {
        await this.prisma.captchaChallenge
          ?.delete?.({ where: { id: captchaId } })
          .catch(() => {});
        return {
          success: false,
          error: "In-house captcha: max attempts exceeded",
        };
      }

      // Increment attempt counter
      await this.prisma.captchaChallenge
        ?.update?.({
          where: { id: captchaId },
          data: { attempts: { increment: 1 } },
        })
        .catch(() => {});

      // Extract answer from token (format: answer:timestamp:captchaId)
      const parts = token.split(":");
      const submittedAnswer = parts[0];

      // Constant-time comparison to prevent timing attacks
      const expected = String(challenge.answer);
      const submitted = String(submittedAnswer);
      if (expected.length !== submitted.length) {
        return {
          success: false,
          provider: "custom",
          error: "In-house captcha: incorrect answer",
        };
      }

      let mismatch = 0;
      for (let i = 0; i < expected.length; i++) {
        mismatch |= expected.charCodeAt(i) ^ submitted.charCodeAt(i);
      }

      if (mismatch !== 0) {
        return {
          success: false,
          provider: "custom",
          error: "In-house captcha: incorrect answer",
        };
      }

      // Mark as used
      await this.prisma.captchaChallenge
        ?.update?.({
          where: { id: captchaId },
          data: { usedAt: new Date() },
        })
        .catch(() => {});

      return { success: true, provider: "custom" };
    } catch (err) {
      logger.error("In-house captcha verification error", {
        error: err instanceof Error ? err.message : String(err),
      });
      return { success: false, error: "In-house captcha verification failed" };
    }
  }

  /**
   * Auto-detect provider and try verification.
   * Tries each configured provider in order.
   */
  private async verifyAutoDetect(
    token: string,
    clientIp: string,
    captchaId?: string,
  ): Promise<CaptchaVerificationResult> {
    // If captchaId is present, it's likely in-house
    if (captchaId) {
      return this.verifyInhouse(token, captchaId);
    }

    // Try providers in order based on which secrets are configured
    if (this.secrets.turnstileSecret) {
      const r = await this.verifyTurnstile(token, clientIp);
      if (r.success) return r;
    }
    if (this.secrets.recaptchaSecret) {
      const r = await this.verifyRecaptchaV3(token, clientIp);
      if (r.success) return r;
    }
    if (this.secrets.recaptchaV2Secret) {
      const r = await this.verifyRecaptchaV2(token, clientIp);
      if (r.success) return r;
    }
    if (this.secrets.hcaptchaSecret) {
      const r = await this.verifyHCaptcha(token, clientIp);
      if (r.success) return r;
    }

    return {
      success: false,
      error: "No CAPTCHA provider could verify the token",
    };
  }
}
