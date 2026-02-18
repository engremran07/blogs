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

// ─── Helper ─────────────────────────────────────────────────────────────────

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max - 1) + "…" : text;
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

// ─── Real Twitter/X Connector (OAuth 1.0a) ──────────────────────────────────

function makeTwitterConnector(): SocialConnector {
  return {
    platform: SocialPlatform.TWITTER,
    async post(payload: SocialPostPayload, credentials?: PlatformCredentials): Promise<SocialPostResult> {
      const { apiKey, apiSecret, accessToken, accessTokenSecret } = credentials || {};
      if (!apiKey || !apiSecret || !accessToken || !accessTokenSecret) {
        return { success: false, platform: SocialPlatform.TWITTER, error: "Missing Twitter OAuth credentials (apiKey, apiSecret, accessToken, accessTokenSecret)" };
      }

      const tweetText = payload.url
        ? truncate(`${payload.title || ""}\n\n${payload.text || ""}`, 260) + `\n${payload.url}`
        : truncate(payload.text || payload.title || "", 280);

      // Twitter API v2 — POST /2/tweets
      const url = "https://api.twitter.com/2/tweets";
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const nonce = crypto.randomUUID().replace(/-/g, "");

      // Build OAuth 1.0a signature
      const oauthParams: Record<string, string> = {
        oauth_consumer_key: apiKey,
        oauth_nonce: nonce,
        oauth_signature_method: "HMAC-SHA1",
        oauth_timestamp: timestamp,
        oauth_token: accessToken,
        oauth_version: "1.0",
      };

      const sigBaseParams = Object.entries(oauthParams)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join("&");
      const sigBase = `POST&${encodeURIComponent(url)}&${encodeURIComponent(sigBaseParams)}`;
      const sigKey = `${encodeURIComponent(apiSecret)}&${encodeURIComponent(accessTokenSecret)}`;

      const keyData = new TextEncoder().encode(sigKey);
      const msgData = new TextEncoder().encode(sigBase);
      const cryptoKey = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
      const sig = await crypto.subtle.sign("HMAC", cryptoKey, msgData);
      const signature = btoa(String.fromCharCode(...new Uint8Array(sig)));

      const authHeader = `OAuth ${Object.entries({ ...oauthParams, oauth_signature: signature })
        .map(([k, v]) => `${encodeURIComponent(k)}="${encodeURIComponent(v)}"`)
        .join(", ")}`;

      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: tweetText }),
        signal: AbortSignal.timeout(15_000),
      });

      if (res.status === 429) {
        throw new ConnectorError("Rate limit exceeded", SocialPlatform.TWITTER, "RATE_LIMITED");
      }

      const data = await res.json();
      if (!res.ok || data.errors) {
        return { success: false, platform: SocialPlatform.TWITTER, error: data.detail || data.errors?.[0]?.message || "Twitter API error" };
      }

      return {
        success: true,
        platform: SocialPlatform.TWITTER,
        externalId: data.data?.id,
        externalUrl: data.data?.id ? `https://x.com/i/status/${data.data.id}` : undefined,
        publishedAt: new Date(),
      };
    },
    async validateCredentials(credentials: PlatformCredentials): Promise<boolean> {
      if (!credentials?.apiKey || !credentials?.apiSecret || !credentials?.accessToken || !credentials?.accessTokenSecret) return false;
      try {
        // Verify via GET /2/users/me — lightweight
        const url = "https://api.twitter.com/2/users/me";
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const nonce = crypto.randomUUID().replace(/-/g, "");
        const oauthParams: Record<string, string> = {
          oauth_consumer_key: credentials.apiKey,
          oauth_nonce: nonce,
          oauth_signature_method: "HMAC-SHA1",
          oauth_timestamp: timestamp,
          oauth_token: credentials.accessToken,
          oauth_version: "1.0",
        };
        const sigBaseParams = Object.entries(oauthParams)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
          .join("&");
        const sigBase = `GET&${encodeURIComponent(url)}&${encodeURIComponent(sigBaseParams)}`;
        const sigKey = `${encodeURIComponent(credentials.apiSecret)}&${encodeURIComponent(credentials.accessTokenSecret)}`;
        const keyData = new TextEncoder().encode(sigKey);
        const msgData = new TextEncoder().encode(sigBase);
        const cryptoKey = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
        const sig = await crypto.subtle.sign("HMAC", cryptoKey, msgData);
        const signature = btoa(String.fromCharCode(...new Uint8Array(sig)));
        const authHeader = `OAuth ${Object.entries({ ...oauthParams, oauth_signature: signature })
          .map(([k, v]) => `${encodeURIComponent(k)}="${encodeURIComponent(v)}"`)
          .join(", ")}`;
        const res = await fetch(url, { headers: { Authorization: authHeader }, signal: AbortSignal.timeout(10_000) });
        return res.ok;
      } catch {
        return false;
      }
    },
  };
}

// ─── Real Facebook Page Connector ───────────────────────────────────────────

function makeFacebookConnector(): SocialConnector {
  return {
    platform: SocialPlatform.FACEBOOK,
    async post(payload: SocialPostPayload, credentials?: PlatformCredentials): Promise<SocialPostResult> {
      const { accessToken, pageId } = credentials || {};
      if (!accessToken || !pageId) {
        return { success: false, platform: SocialPlatform.FACEBOOK, error: "Missing Facebook accessToken or pageId" };
      }

      const message = payload.url
        ? `${payload.title || ""}\n\n${payload.text || ""}`
        : payload.text || payload.title || "";

      const body: Record<string, string> = { message: truncate(message, 63206), access_token: accessToken };
      if (payload.url) body.link = payload.url;

      const res = await fetch(`https://graph.facebook.com/v21.0/${pageId}/feed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15_000),
      });

      if (res.status === 429) {
        throw new ConnectorError("Rate limit exceeded", SocialPlatform.FACEBOOK, "RATE_LIMITED");
      }

      const data = await res.json();
      if (data.error) {
        return { success: false, platform: SocialPlatform.FACEBOOK, error: data.error.message || "Facebook API error" };
      }

      return {
        success: true,
        platform: SocialPlatform.FACEBOOK,
        externalId: data.id,
        externalUrl: data.id ? `https://www.facebook.com/${data.id}` : undefined,
        publishedAt: new Date(),
      };
    },
    async validateCredentials(credentials: PlatformCredentials): Promise<boolean> {
      if (!credentials?.accessToken || !credentials?.pageId) return false;
      try {
        const res = await fetch(`https://graph.facebook.com/v21.0/${credentials.pageId}?access_token=${credentials.accessToken}`, {
          signal: AbortSignal.timeout(10_000),
        });
        return res.ok;
      } catch {
        return false;
      }
    },
  };
}

// ─── Real LinkedIn Connector (Organization Share) ───────────────────────────

function makeLinkedInConnector(): SocialConnector {
  return {
    platform: SocialPlatform.LINKEDIN,
    async post(payload: SocialPostPayload, credentials?: PlatformCredentials): Promise<SocialPostResult> {
      const { accessToken, pageId } = credentials || {};
      if (!accessToken) {
        return { success: false, platform: SocialPlatform.LINKEDIN, error: "Missing LinkedIn accessToken" };
      }

      // pageId = organization URN like "urn:li:organization:12345" or user URN "urn:li:person:xxx"
      const author = pageId?.startsWith("urn:") ? pageId : `urn:li:person:${pageId || "me"}`;

      const shareBody: Record<string, unknown> = {
        author,
        lifecycleState: "PUBLISHED",
        specificContent: {
          "com.linkedin.ugc.ShareContent": {
            shareCommentary: { text: truncate(`${payload.title || ""}\n\n${payload.text || ""}`, 3000) },
            shareMediaCategory: payload.url ? "ARTICLE" : "NONE",
            ...(payload.url ? {
              media: [{
                status: "READY",
                originalUrl: payload.url,
                title: { text: payload.title || "" },
              }],
            } : {}),
          },
        },
        visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
      };

      const res = await fetch("https://api.linkedin.com/v2/ugcPosts", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "X-Restli-Protocol-Version": "2.0.0",
        },
        body: JSON.stringify(shareBody),
        signal: AbortSignal.timeout(15_000),
      });

      if (res.status === 429) {
        throw new ConnectorError("Rate limit exceeded", SocialPlatform.LINKEDIN, "RATE_LIMITED");
      }

      const data = await res.json();
      if (!res.ok) {
        return { success: false, platform: SocialPlatform.LINKEDIN, error: data.message || "LinkedIn API error" };
      }

      const postId = data.id;
      return {
        success: true,
        platform: SocialPlatform.LINKEDIN,
        externalId: postId,
        externalUrl: postId ? `https://www.linkedin.com/feed/update/${postId}` : undefined,
        publishedAt: new Date(),
      };
    },
    async validateCredentials(credentials: PlatformCredentials): Promise<boolean> {
      if (!credentials?.accessToken) return false;
      try {
        const res = await fetch("https://api.linkedin.com/v2/userinfo", {
          headers: { Authorization: `Bearer ${credentials.accessToken}` },
          signal: AbortSignal.timeout(10_000),
        });
        return res.ok;
      } catch {
        return false;
      }
    },
  };
}

// ─── WhatsApp Business Cloud API Connector ──────────────────────────────────

function makeWhatsAppConnector(): SocialConnector {
  return {
    platform: SocialPlatform.WHATSAPP,
    async post(payload: SocialPostPayload, credentials?: PlatformCredentials): Promise<SocialPostResult> {
      const { accessToken, phoneNumberId, chatId } = credentials || {};
      if (!accessToken || !phoneNumberId || !chatId) {
        return { success: false, platform: SocialPlatform.WHATSAPP, error: "Missing WhatsApp accessToken, phoneNumberId, or chatId (recipient phone)" };
      }

      const text = payload.url
        ? `*${payload.title || ""}*\n\n${payload.text || ""}\n\n${payload.url}`
        : `*${payload.title || ""}*\n\n${payload.text || ""}`;

      const res = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: chatId,
          type: "text",
          text: { body: truncate(text, 4096) },
        }),
        signal: AbortSignal.timeout(15_000),
      });

      if (res.status === 429) {
        throw new ConnectorError("Rate limit exceeded", SocialPlatform.WHATSAPP, "RATE_LIMITED");
      }

      const data = await res.json();
      if (data.error) {
        return { success: false, platform: SocialPlatform.WHATSAPP, error: data.error.message || "WhatsApp API error" };
      }

      return {
        success: true,
        platform: SocialPlatform.WHATSAPP,
        externalId: data.messages?.[0]?.id,
        publishedAt: new Date(),
      };
    },
    async validateCredentials(credentials: PlatformCredentials): Promise<boolean> {
      if (!credentials?.accessToken || !credentials?.phoneNumberId) return false;
      try {
        const res = await fetch(`https://graph.facebook.com/v21.0/${credentials.phoneNumberId}`, {
          headers: { Authorization: `Bearer ${credentials.accessToken}` },
          signal: AbortSignal.timeout(10_000),
        });
        return res.ok;
      } catch {
        return false;
      }
    },
  };
}

// ─── Pinterest Create Pin Connector ─────────────────────────────────────────

function makePinterestConnector(): SocialConnector {
  return {
    platform: SocialPlatform.PINTEREST,
    async post(payload: SocialPostPayload, credentials?: PlatformCredentials): Promise<SocialPostResult> {
      const { accessToken, boardId } = credentials || {};
      if (!accessToken || !boardId) {
        return { success: false, platform: SocialPlatform.PINTEREST, error: "Missing Pinterest accessToken or boardId" };
      }

      if (!payload.url) {
        return { success: false, platform: SocialPlatform.PINTEREST, error: "Pinterest requires a URL (link) for each pin" };
      }

      const pinBody: Record<string, unknown> = {
        board_id: boardId,
        title: truncate(payload.title || "", 100),
        description: truncate(payload.text || "", 500),
        link: payload.url,
      };
      if (payload.imageUrl) {
        pinBody.media_source = { source_type: "image_url", url: payload.imageUrl };
      }

      const res = await fetch("https://api.pinterest.com/v5/pins", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(pinBody),
        signal: AbortSignal.timeout(15_000),
      });

      if (res.status === 429) {
        throw new ConnectorError("Rate limit exceeded", SocialPlatform.PINTEREST, "RATE_LIMITED");
      }

      const data = await res.json();
      if (!res.ok) {
        return { success: false, platform: SocialPlatform.PINTEREST, error: data.message || "Pinterest API error" };
      }

      return {
        success: true,
        platform: SocialPlatform.PINTEREST,
        externalId: data.id,
        externalUrl: data.id ? `https://www.pinterest.com/pin/${data.id}/` : undefined,
        publishedAt: new Date(),
      };
    },
    async validateCredentials(credentials: PlatformCredentials): Promise<boolean> {
      if (!credentials?.accessToken) return false;
      try {
        const res = await fetch("https://api.pinterest.com/v5/user_account", {
          headers: { Authorization: `Bearer ${credentials.accessToken}` },
          signal: AbortSignal.timeout(10_000),
        });
        return res.ok;
      } catch {
        return false;
      }
    },
  };
}

// ─── Reddit Link Post Connector ─────────────────────────────────────────────

function makeRedditConnector(): SocialConnector {
  return {
    platform: SocialPlatform.REDDIT,
    async post(payload: SocialPostPayload, credentials?: PlatformCredentials): Promise<SocialPostResult> {
      const { accessToken, subreddit } = credentials || {};
      if (!accessToken || !subreddit) {
        return { success: false, platform: SocialPlatform.REDDIT, error: "Missing Reddit accessToken or subreddit" };
      }

      const sub = subreddit.startsWith("r/") ? subreddit.slice(2) : subreddit;
      const isLink = !!payload.url;

      const formData = new URLSearchParams();
      formData.set("sr", sub);
      formData.set("title", truncate(payload.title || payload.text || "", 300));
      formData.set("kind", isLink ? "link" : "self");
      if (isLink) {
        formData.set("url", payload.url!);
      } else {
        formData.set("text", truncate(payload.text || "", 40000));
      }
      formData.set("resubmit", "true");

      const res = await fetch("https://oauth.reddit.com/api/submit", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "MyBlog/1.0",
        },
        body: formData.toString(),
        signal: AbortSignal.timeout(15_000),
      });

      if (res.status === 429) {
        throw new ConnectorError("Rate limit exceeded", SocialPlatform.REDDIT, "RATE_LIMITED");
      }

      const data = await res.json();
      if (data.json?.errors?.length) {
        return { success: false, platform: SocialPlatform.REDDIT, error: data.json.errors[0]?.join(" ") || "Reddit API error" };
      }

      const postUrl = data.json?.data?.url;
      const postId = data.json?.data?.id || data.json?.data?.name;
      return {
        success: true,
        platform: SocialPlatform.REDDIT,
        externalId: postId,
        externalUrl: postUrl,
        publishedAt: new Date(),
      };
    },
    async validateCredentials(credentials: PlatformCredentials): Promise<boolean> {
      if (!credentials?.accessToken) return false;
      try {
        const res = await fetch("https://oauth.reddit.com/api/v1/me", {
          headers: {
            Authorization: `Bearer ${credentials.accessToken}`,
            "User-Agent": "MyBlog/1.0",
          },
          signal: AbortSignal.timeout(10_000),
        });
        return res.ok;
      } catch {
        return false;
      }
    },
  };
}

// ─── Connector Instances ────────────────────────────────────────────────────

export const TwitterConnector = makeTwitterConnector();
export const FacebookConnector = makeFacebookConnector();
export const LinkedInConnector = makeLinkedInConnector();
export const TelegramConnector = makeTelegramConnector();
export const WhatsAppConnector = makeWhatsAppConnector();
export const PinterestConnector = makePinterestConnector();
export const RedditConnector = makeRedditConnector();

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

export function registerConnector(platform: SocialPlatform, connector: SocialConnector): void {
  connectorRegistry.set(platform, connector);
}

export function getSupportedPlatforms(): SocialPlatform[] {
  return Array.from(connectorRegistry.keys());
}
