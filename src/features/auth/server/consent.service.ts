/**
 * GDPR Consent Audit Log Service
 *
 * Records all consent-related events (newsletter subscription, data processing
 * agreement, cookie acceptance, account deletion, data export) to the
 * `consent_logs` table for compliance.
 */

import type { PrismaClient } from "@prisma/client";

export type ConsentType =
  | "newsletter"
  | "data_processing"
  | "cookies"
  | "terms"
  | "account_deletion"
  | "data_export"
  | "email_change"
  | "marketing";

export interface LogConsentInput {
  userId?: string;
  email?: string;
  consentType: ConsentType;
  granted: boolean;
  ipAddress?: string;
  userAgent?: string;
  details?: string;
}

type ConsentPrisma = Pick<PrismaClient, "consentLog">;

export class ConsentService {
  constructor(private readonly prisma: ConsentPrisma) {}

  /**
   * Record a consent event.
   */
  async log(input: LogConsentInput): Promise<void> {
    try {
      await this.prisma.consentLog.create({
        data: {
          userId: input.userId ?? null,
          email: input.email ?? null,
          consentType: input.consentType,
          granted: input.granted,
          ipAddress: input.ipAddress ?? null,
          userAgent: input.userAgent ?? null,
          details: input.details ?? null,
        },
      });
    } catch (err) {
      // Best-effort — never block the calling operation for audit logging
      console.error("[ConsentService] Failed to log consent:", err);
    }
  }

  /**
   * Retrieve consent history for a user (for data export / audit).
   */
  async getUserConsentHistory(userId: string) {
    return this.prisma.consentLog.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Retrieve consent history by email (for unauthenticated subscribers).
   */
  async getEmailConsentHistory(email: string) {
    return this.prisma.consentLog.findMany({
      where: { email },
      orderBy: { createdAt: "desc" },
    });
  }
}
