/**
 * ============================================================================
 * SERVER WIRING — Dependency Injection Container
 * ============================================================================
 * Single source of truth for all service instantiation.
 * Import from `@/server/wiring` in route handlers and pages.
 * ============================================================================
 */
import "server-only";

import { prisma } from "@/server/db/prisma";
import { redis } from "@/server/cache/redis";
import { env } from "@/server/env";
import { createLogger } from "@/server/observability/logger";

// ─── Feature Service Imports ────────────────────────────────────────────────
// Auth
import { AuthService } from "@/features/auth/server/auth.service";
import { UserService } from "@/features/auth/server/user.service";
import { UserAdminSettingsService } from "@/features/auth/server/admin-settings.service";
import { ConsentService } from "@/features/auth/server/consent.service";

// Blog
import { BlogService } from "@/features/blog/server/blog.service";

// Comments
import { CommentService } from "@/features/comments/server/comment.service";
import { ModerationService } from "@/features/comments/server/moderation.service";
import { SpamService } from "@/features/comments/server/spam.service";
import { CommentAdminSettingsService } from "@/features/comments/server/admin-settings.service";
import { CommentEventBus } from "@/features/comments/server/events";

// Tags
import { TagService } from "@/features/tags/server/tag.service";
import { AdminSettingsService as TagAdminSettingsService } from "@/features/tags/server/admin-settings.service";
import { AutocompleteService } from "@/features/tags/server/autocomplete.service";
import { AutoTaggingService } from "@/features/tags/server/auto-tagging.service";

// SEO
import { SeoService } from "@/features/seo/server/seo.service";

// Pages
import { PageService } from "@/features/pages/server/page.service";
import { PagesAdminSettingsService } from "@/features/pages/server/admin-settings.service";

// Settings
import { SiteSettingsService } from "@/features/settings/server/site-settings.service";
import { ThemeService } from "@/features/settings/theme/server/theme.service";
import { MenuBuilderService } from "@/features/settings/menu-builder/server/menu-builder.service";

// Editor
import { EditorAdminSettingsService } from "@/features/editor/server/admin-settings.service";

// Captcha
import { CaptchaAdminSettingsService } from "@/features/captcha/server/admin-settings.service";
import { CaptchaVerificationService } from "@/features/captcha/server/verification.service";
import type { CaptchaProvider } from "@/features/auth/types";
import type { CaptchaProviderType } from "@/features/captcha/types";

// Media
import { MediaService } from "@/features/media/server/media.service";
import { MediaAdminSettingsService } from "@/features/media/server/admin-settings.service";
import { MediaEventBus } from "@/features/media/server/events";
import { LocalStorageProvider } from "@/features/media/server/storage/local.adapter";
import { SharpImageProcessor } from "@/features/media/server/image-processor";
import path from "path";

// Ads
import { AdsService } from "@/features/ads/server/ads.service";
import { AdsAdminSettingsService } from "@/features/ads/server/admin-settings.service";

// Distribution
import { DistributionService } from "@/features/distribution/server/distribution.service";
import { DistributionEventBus } from "@/features/distribution/server/events";

// ─── Feature Prisma Client Types ────────────────────────────────────────────
import type { UsersPrismaClient } from "@/features/auth/types";
import type { CommentsPrismaClient } from "@/features/comments/types";
import type { TagsPrismaClient } from "@/features/tags/types";
import type { EditorPrismaClient } from "@/features/editor/types";
import type { CaptchaPrismaClient } from "@/features/captcha/types";
import type { PagesPrismaClient } from "@/features/pages/types";
import type { SiteSettingsPrismaClient } from "@/features/settings/types";
import type { ThemePrismaClient } from "@/features/settings/theme/types";
import type { MenuBuilderPrismaClient } from "@/features/settings/menu-builder/types";
import type { BlogPrismaClient } from "@/features/blog/types";
import type { MediaPrismaClient } from "@/features/media/types";
import type { AdsPrismaClient } from "@/features/ads/types";
import type { DistributionPrismaClient } from "@/features/distribution/types";
import type {
  PrismaPostDelegate, PrismaPageDelegate, PrismaCategoryDelegate,
  PrismaTagDelegate, PrismaSeoSuggestionDelegate, PrismaSeoKeywordDelegate,
  PrismaSeoEntityDelegate, PrismaSeoEntityEdgeDelegate, PrismaBatchOperationDelegate,
  PrismaTransactionFn, PrismaRawQueryFn,
} from "@/features/seo/types";

// ─── Loggers ────────────────────────────────────────────────────────────────
const authLogger = createLogger("auth");
const blogLoggerRaw = createLogger("blog");
const blogLogger = { ...blogLoggerRaw, log: blogLoggerRaw.info };
const seoLogger = createLogger("seo");
const pageLoggerRaw = createLogger("pages");
const pageLogger = { ...pageLoggerRaw, log: pageLoggerRaw.info };
const mediaLogger = createLogger("media");


// ─── Cache Provider (wraps Redis for features that need it) ─────────────────
const cacheProvider = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const val = await redis.get(key);
      if (val === null || val === undefined) return null;
      // Upstash auto-deserialises JSON, but if we stored with JSON.stringify
      // and it comes back as a string, parse it manually.
      if (typeof val === "string") {
        try {
          return JSON.parse(val) as T;
        } catch {
          return val as T;
        }
      }
      return val as T;
    } catch {
      return null;
    }
  },
  async set(key: string, value: unknown, ttl?: number): Promise<void> {
    try {
      if (ttl) {
        await redis.set(key, JSON.stringify(value), { ex: ttl });
      } else {
        await redis.set(key, JSON.stringify(value));
      }
    } catch {
      // Silently fail in dev without Redis
    }
  },
  async del(key: string): Promise<void> {
    try {
      await redis.del(key);
    } catch {
      // Silently fail
    }
  },
  async delPattern(_pattern: string): Promise<void> {
    // Upstash HTTP mode doesn't support SCAN — no-op
  },
  async flush(_pattern: string): Promise<void> {
    // No-op
  },
  async invalidatePattern(_pattern: string): Promise<void> {
    // No-op
  },
  async invalidatePrefix(_prefix: string): Promise<void> {
    // Upstash HTTP mode doesn't support SCAN — no-op
    // In production, consider using Upstash Redis REST bulk-delete or tagged keys
  },
};

// ─── Revalidation callback ──────────────────────────────────────────────────
const revalidateCallback = async (paths: string | string[]) => {
  try {
    // In Next.js, revalidation is done via revalidatePath/revalidateTag
    // This is a placeholder — actual revalidation happens in route handlers
    void paths;
  } catch {
    // Silently fail
  }
};

// ─── Providers ──────────────────────────────────────────────────────────────
import type { JwtSigner } from "@/features/auth/types";
import { NodemailerMailProvider } from "@/server/mail";

// Auth flows use NextAuth — the JwtSigner interface is unused but required by AuthService constructor.
const noopJwt: JwtSigner = {
  sign: async () => "noop-jwt",
  verify: async <T extends Record<string, unknown>>() => ({}) as T,
};

// Real mail provider — reads SMTP config from SiteSettings at send-time
// (reuses the SiteSettingsService import above and SiteSettingsPrismaClient type)
const _smtpSettingsService = new SiteSettingsService(prisma as unknown as SiteSettingsPrismaClient);
const mailProvider = new NodemailerMailProvider(() => _smtpSettingsService.getSmtpConfig());

const commentEventBus = new CommentEventBus();

// ─── Service Instances ──────────────────────────────────────────────────────

// Admin settings services (these read/write singleton settings rows)
export const userAdminSettings = new UserAdminSettingsService(prisma as unknown as UsersPrismaClient);
export const commentAdminSettings = new CommentAdminSettingsService(prisma as unknown as CommentsPrismaClient);
export const tagAdminSettings = new TagAdminSettingsService(prisma as unknown as TagsPrismaClient);
export const editorAdminSettings = new EditorAdminSettingsService(prisma as unknown as EditorPrismaClient);
export const captchaAdminSettings = new CaptchaAdminSettingsService(prisma as unknown as CaptchaPrismaClient);
export const captchaVerificationService = new CaptchaVerificationService(prisma as unknown as CaptchaPrismaClient);

// Adapt CaptchaVerificationService to the CaptchaProvider interface expected by AuthService
const captchaProvider: CaptchaProvider = {
  async verify(token: string, ip: string, captchaId?: string, captchaType?: string): Promise<boolean> {
    const result = await captchaVerificationService.verify({
      token,
      clientIp: ip,
      captchaType: captchaType as CaptchaProviderType | undefined,
      captchaId,
    });
    return result.success;
  },
};

export const pagesAdminSettings = new PagesAdminSettingsService(prisma as unknown as PagesPrismaClient);
export const siteSettingsService = new SiteSettingsService(prisma as unknown as SiteSettingsPrismaClient);
export const themeService = new ThemeService(prisma as unknown as ThemePrismaClient);
export const menuBuilderService = new MenuBuilderService(prisma as unknown as MenuBuilderPrismaClient);

// Core services
export const authService = new AuthService(
  prisma as unknown as UsersPrismaClient,
  noopJwt,
  mailProvider,
  captchaProvider,
  {},
  { log: authLogger.info, warn: authLogger.warn, error: authLogger.error },
);
export const userService = new UserService(prisma as unknown as UsersPrismaClient, mailProvider);

export const blogService = new BlogService({
  prisma: prisma as unknown as BlogPrismaClient,
  cache: cacheProvider,
  logger: blogLogger,
  revalidate: revalidateCallback,
});

export const spamService = new SpamService();
export const moderationService = new ModerationService(prisma as unknown as CommentsPrismaClient, commentEventBus);
export const commentService = new CommentService(prisma as unknown as CommentsPrismaClient, spamService, commentEventBus);

export const tagService = new TagService(prisma as unknown as TagsPrismaClient);
export const autocompleteService = new AutocompleteService(prisma as unknown as TagsPrismaClient);
export const autoTaggingService = new AutoTaggingService(prisma as unknown as TagsPrismaClient, tagService);

export const seoService = new SeoService({
  post: prisma.post as unknown as PrismaPostDelegate,
  page: prisma.page as unknown as PrismaPageDelegate,
  category: prisma.category as unknown as PrismaCategoryDelegate,
  tag: prisma.tag as unknown as PrismaTagDelegate,
  seoSuggestion: prisma.seoSuggestion as unknown as PrismaSeoSuggestionDelegate,
  seoKeyword: prisma.seoKeyword as unknown as PrismaSeoKeywordDelegate,
  seoEntity: prisma.seoEntity as unknown as PrismaSeoEntityDelegate,
  seoEntityEdge: prisma.seoEntityEdge as unknown as PrismaSeoEntityEdgeDelegate,
  batchOperation: prisma.batchOperation as unknown as PrismaBatchOperationDelegate,
  transaction: prisma.$transaction.bind(prisma) as unknown as PrismaTransactionFn,
  rawQuery: prisma.$queryRawUnsafe.bind(prisma) as unknown as PrismaRawQueryFn,
  cache: cacheProvider,
  logger: seoLogger,
});

export const pageService = new PageService({
  prisma: prisma as unknown as PagesPrismaClient,
  cache: cacheProvider,
  logger: pageLogger,
  revalidate: revalidateCallback,
});

// Media
const mediaEventBus = new MediaEventBus();

const mediaStorageProvider = new LocalStorageProvider({
  rootDir: path.join(process.cwd(), "public", "uploads"),
  urlPrefix: "/uploads",
});

let mediaImageProcessor: SharpImageProcessor | undefined;
try {
  mediaImageProcessor = new SharpImageProcessor();
} catch {
  // sharp not installed — image optimisation disabled
}

export const mediaAdminSettings = new MediaAdminSettingsService({
  prisma: prisma as unknown as MediaPrismaClient,
  cache: cacheProvider,
  logger: mediaLogger,
});

export const mediaService = new MediaService({
  prisma: prisma as unknown as MediaPrismaClient,
  storage: mediaStorageProvider,
  cache: cacheProvider,
  logger: mediaLogger,
  imageProcessor: mediaImageProcessor,
  revalidate: revalidateCallback,
});

// Re-export prisma, redis, event bus for direct use in route handlers
export { prisma, redis, commentEventBus, mediaEventBus };

// ─── Config propagation — register consumers with admin settings ────────────
userAdminSettings.registerConsumer(authService);
userAdminSettings.registerConsumer(userService);
commentAdminSettings.registerConsumer(commentService);
commentAdminSettings.registerConsumer(moderationService);
commentAdminSettings.registerConsumer(spamService);
tagAdminSettings.registerConsumer(tagService);
tagAdminSettings.registerConsumer(autocompleteService);
tagAdminSettings.registerConsumer(autoTaggingService);
pagesAdminSettings.registerConsumer(pageService);

// ─── Ads Module ─────────────────────────────────────────────────────────────

export const adsAdminSettings = new AdsAdminSettingsService({
  prisma: prisma as unknown as AdsPrismaClient,
  cache: cacheProvider,
});

export const adsService = new AdsService({
  prisma: prisma as unknown as AdsPrismaClient,
  cache: cacheProvider,
  getConfig: () => adsAdminSettings.getConfig(),
});

// ─── Distribution Module ────────────────────────────────────────────────────

export const distributionEventBus = new DistributionEventBus();

export const distributionService = new DistributionService(
  prisma as unknown as DistributionPrismaClient,
  distributionEventBus,
  {
    distributionEnabled: true,
    siteBaseUrl: env.NEXT_PUBLIC_SITE_URL ?? "",
  },
);

// ─── GDPR Consent Module ────────────────────────────────────────────────────

export const consentService = new ConsentService(prisma as unknown as { consentLog: typeof prisma.consentLog });