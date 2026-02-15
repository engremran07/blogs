// src/features/distribution/server/message-builder.ts
import { MessageStyle } from "../types";
import type { PlatformRule, PostData } from "../types";
import { PLATFORM_RULES } from "./constants";
import { Sanitize } from "./sanitization";

export interface MessageBuilderInput {
  post: PostData;
  platform: string;
  style?: MessageStyle;
  overrideMessage?: string;
  hashtags?: string[];
  siteBaseUrl?: string;
  utmSource?: string;
}

export interface BuiltMessage {
  text: string;
  url?: string;
  hashtags: string[];
  truncated: boolean;
}

export class MessageBuilder {
  static build(input: MessageBuilderInput): BuiltMessage {
    const rules: PlatformRule | undefined = PLATFORM_RULES[input.platform];
    const maxChars = rules?.maxChars ?? 280;
    const hashtagLimit = rules?.hashtagLimit ?? 3;

    const postUrl = input.siteBaseUrl
      ? `${input.siteBaseUrl.replace(/\/$/, "")}/${input.post.slug}`
      : input.post.publishedUrl ?? "";

    const url = input.utmSource
      ? `${postUrl}${postUrl.includes("?") ? "&" : "?"}utm_source=${input.utmSource}&utm_medium=social&utm_campaign=distribution`
      : postUrl;

    const hashtags = rules?.includeHashtags
      ? Sanitize.hashtags(
          input.hashtags ?? input.post.tags?.map((t) => t.name) ?? [],
          hashtagLimit,
        )
      : [];

    if (input.overrideMessage) {
      const text = Sanitize.text(input.overrideMessage, maxChars);
      return { text, url, hashtags, truncated: input.overrideMessage.length > maxChars };
    }

    const title = Sanitize.text(input.post.title);
    const excerpt = input.post.excerpt ? Sanitize.text(input.post.excerpt) : "";
    const hashtagStr = hashtags.length ? "\n\n" + hashtags.join(" ") : "";

    let body: string;
    switch (input.style ?? MessageStyle.PROFESSIONAL) {
      case MessageStyle.CONCISE:
        body = `${title}\n\n${url}${hashtagStr}`;
        break;
      case MessageStyle.CASUAL:
        body = `Check this out! ${title}\n\n${excerpt ? excerpt + "\n\n" : ""}${url}${hashtagStr}`;
        break;
      case MessageStyle.PROMOTIONAL:
        body = `🚀 ${title}\n\n${excerpt ? excerpt + "\n\n" : ""}Read more: ${url}${hashtagStr}`;
        break;
      case MessageStyle.THREAD:
        body = `🧵 ${title}\n\n${excerpt ? excerpt + "\n\n" : ""}${url}${hashtagStr}`;
        break;
      case MessageStyle.PROFESSIONAL:
      default:
        body = `${title}\n\n${excerpt ? excerpt + "\n\n" : ""}${url}${hashtagStr}`;
        break;
    }

    const truncated = body.length > maxChars;
    const text = truncated ? body.slice(0, maxChars - 1) + "…" : body;
    return { text, url, hashtags, truncated };
  }
}
