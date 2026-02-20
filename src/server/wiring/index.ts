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

// ─── Unified Prisma Client Type ──────────────────────────────────────────────
import type { AppPrismaClient } from "@/server/db/prisma-types";
import type {
  PrismaPostDelegate,
  PrismaTransactionFn,
  PrismaRawQueryFn,
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

// Real mail provider — reads SMTP config from the shared siteSettingsService
// instance (defined below, hoisted as a module-level const).
let _mailProvider: NodemailerMailProvider | undefined;
function getMailProvider(): NodemailerMailProvider {
  if (!_mailProvider) {
    _mailProvider = new NodemailerMailProvider(() =>
      siteSettingsService.getSmtpConfig(),
    );
  }
  return _mailProvider;
}

const commentEventBus = new CommentEventBus();

// ─── Typed Prisma client (single cast eliminates all per-service casts) ─────
const db = prisma as unknown as AppPrismaClient;

// ─── Service Instances ──────────────────────────────────────────────────────

// Admin settings services (these read/write singleton settings rows)
const userAdminSettings = new UserAdminSettingsService(db);
export const commentAdminSettings = new CommentAdminSettingsService(db);
const tagAdminSettings = new TagAdminSettingsService(db);
export const captchaAdminSettings = new CaptchaAdminSettingsService(db);
export const captchaVerificationService = new CaptchaVerificationService(db);

// Adapt CaptchaVerificationService to the CaptchaProvider interface expected by AuthService
const captchaProvider: CaptchaProvider = {
  async verify(
    token: string,
    ip: string,
    captchaId?: string,
    captchaType?: string,
  ): Promise<boolean> {
    const result = await captchaVerificationService.verify({
      token,
      clientIp: ip,
      captchaType: captchaType as CaptchaProviderType | undefined,
      captchaId,
    });
    return result.success;
  },
};

const pagesAdminSettings = new PagesAdminSettingsService(db);
export const siteSettingsService = new SiteSettingsService(db);
const _themeService = new ThemeService(db);
const _menuBuilderService = new MenuBuilderService(db);

// Core services
const authService = new AuthService(
  db,
  noopJwt,
  getMailProvider(),
  captchaProvider,
  {},
  { log: authLogger.info, warn: authLogger.warn, error: authLogger.error },
);
export const userService = new UserService(db, getMailProvider());

export const blogService = new BlogService({
  prisma: db,
  cache: cacheProvider,
  logger: blogLogger,
  revalidate: revalidateCallback,
});

const spamService = new SpamService();
export const moderationService = new ModerationService(db, commentEventBus);
export const commentService = new CommentService(
  db,
  spamService,
  commentEventBus,
);

export const tagService = new TagService(db);
const autocompleteService = new AutocompleteService(db);
const autoTaggingService = new AutoTaggingService(db, tagService);

export const seoService = new SeoService({
  post: db.post as unknown as PrismaPostDelegate,
  page: db.page,
  category: db.category,
  tag: db.tag,
  seoSuggestion: db.seoSuggestion,
  seoKeyword: db.seoKeyword,
  seoEntity: db.seoEntity,
  seoEntityEdge: db.seoEntityEdge,
  batchOperation: db.batchOperation,
  transaction: prisma.$transaction.bind(
    prisma,
  ) as unknown as PrismaTransactionFn,
  rawQuery: prisma.$queryRawUnsafe.bind(prisma) as unknown as PrismaRawQueryFn,
  cache: cacheProvider,
  logger: seoLogger,
});

export const pageService = new PageService({
  prisma: db,
  cache: cacheProvider,
  logger: pageLogger,
  revalidate: revalidateCallback,
});

// Media
const _mediaEventBus = new MediaEventBus();

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

const _mediaAdminSettings = new MediaAdminSettingsService({
  prisma: db,
  cache: cacheProvider,
  logger: mediaLogger,
});

export const mediaService = new MediaService({
  prisma: db,
  storage: mediaStorageProvider,
  cache: cacheProvider,
  logger: mediaLogger,
  imageProcessor: mediaImageProcessor,
  revalidate: revalidateCallback,
});

// Re-export prisma for direct use in route handlers
export { prisma };

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
  prisma: db,
  cache: cacheProvider,
});

export const adsService = new AdsService({
  prisma: db,
  cache: cacheProvider,
  getConfig: () => adsAdminSettings.getConfig(),
});

// ─── Distribution Module ────────────────────────────────────────────────────

const distributionEventBus = new DistributionEventBus();

export const distributionService = new DistributionService(
  db,
  distributionEventBus,
  {
    distributionEnabled: true,
    siteBaseUrl: env.NEXT_PUBLIC_SITE_URL ?? "",
  },
);

// ─── GDPR Consent Module ────────────────────────────────────────────────────

export const consentService = new ConsentService(db);
