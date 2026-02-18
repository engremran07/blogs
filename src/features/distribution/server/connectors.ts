// src/features/distribution/server/connectors.ts
import { SocialPlatform } from "../types";
import type { SocialConnector, SocialPostPayload, SocialPostResult, PlatformCredentials } from "../types";

export class ConnectorError extends Error {
  constructor(
    message: string,
    public readonly platform: SocialPlatform,
    public readonly code: string = "CONNECTOR_ERROR",
  ) {
    super(message);
    this.name = "ConnectorError";
  }
}

// ─── Stub Connectors (implementations require actual API SDKs) ──────────────

function makeStubConnector(platform: SocialPlatform): SocialConnector {
  return {
    platform,
    async post(_payload: SocialPostPayload): Promise<SocialPostResult> {
      // Real implementation would call platform API
      return {
        success: true,
        platform,
        externalId: `stub-${Date.now()}`,
        publishedAt: new Date(),
      };
    },
    async validateCredentials(_credentials: PlatformCredentials): Promise<boolean> {
      return true;
    },
  };
}

// ─── Real Telegram Connector ────────────────────────────────────────────────

function makeTelegramConnector(): SocialConnector {
  return {
    platform: SocialPlatform.TELEGRAM,
    async post(payload: SocialPostPayload, credentials?: PlatformCredentials): Promise<SocialPostResult> {
      const botToken = credentials?.botToken;
      const chatId = credentials?.chatId;
      if (!botToken || !chatId) {
        return { success: false, platform: SocialPlatform.TELEGRAM, error: "Missing botToken or chatId" };
      }

      const text = payload.url
        ? `${payload.title}\n\n${payload.text || ""}\n\n${payload.url}`
        : `${payload.title}\n\n${payload.text || ""}`;

      const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: text.slice(0, 4096),
          parse_mode: "HTML",
          disable_web_page_preview: false,
        }),
        signal: AbortSignal.timeout(15_000),
      });

      const data = await res.json();
      if (!data.ok) {
        return { success: false, platform: SocialPlatform.TELEGRAM, error: data.description || "Telegram API error" };
      }

      return {
        success: true,
        platform: SocialPlatform.TELEGRAM,
        externalId: String(data.result?.message_id),
        externalUrl: chatId.startsWith("@")
          ? `https://t.me/${chatId.slice(1)}/${data.result?.message_id}`
          : undefined,
        publishedAt: new Date(),
      };
    },
    async validateCredentials(credentials: PlatformCredentials): Promise<boolean> {
      const botToken = credentials?.botToken;
      if (!botToken) return false;
      try {
        const res = await fetch(`https://api.telegram.org/bot${botToken}/getMe`, {
          signal: AbortSignal.timeout(10_000),
        });
        const data = await res.json();
        return data.ok === true;
      } catch {
        return false;
      }
    },
  };
}

export const TwitterConnector = makeStubConnector(SocialPlatform.TWITTER);
export const FacebookConnector = makeStubConnector(SocialPlatform.FACEBOOK);
export const LinkedInConnector = makeStubConnector(SocialPlatform.LINKEDIN);
export const TelegramConnector = makeTelegramConnector();
export const WhatsAppConnector = makeStubConnector(SocialPlatform.WHATSAPP);
export const PinterestConnector = makeStubConnector(SocialPlatform.PINTEREST);
export const RedditConnector = makeStubConnector(SocialPlatform.REDDIT);

const connectorRegistry = new Map<SocialPlatform, SocialConnector>([
  [SocialPlatform.TWITTER, TwitterConnector],
  [SocialPlatform.FACEBOOK, FacebookConnector],
  [SocialPlatform.LINKEDIN, LinkedInConnector],
  [SocialPlatform.TELEGRAM, TelegramConnector],
  [SocialPlatform.WHATSAPP, WhatsAppConnector],
  [SocialPlatform.PINTEREST, PinterestConnector],
  [SocialPlatform.REDDIT, RedditConnector],
]);

export function getConnector(platform: SocialPlatform): SocialConnector | undefined {
  return connectorRegistry.get(platform);
}

export function getSupportedPlatforms(): SocialPlatform[] {
  return Array.from(connectorRegistry.keys());
}

export function registerConnector(platform: SocialPlatform, connector: SocialConnector): void {
  connectorRegistry.set(platform, connector);
}
