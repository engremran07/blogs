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
    async post(payload: SocialPostPayload): Promise<SocialPostResult> {
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

export const TwitterConnector = makeStubConnector(SocialPlatform.TWITTER);
export const FacebookConnector = makeStubConnector(SocialPlatform.FACEBOOK);
export const LinkedInConnector = makeStubConnector(SocialPlatform.LINKEDIN);
export const TelegramConnector = makeStubConnector(SocialPlatform.TELEGRAM);
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
