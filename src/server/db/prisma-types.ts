/**
 * ============================================================================
 * prisma-types.ts — Intersection type that unifies all feature Prisma clients
 * ============================================================================
 * `AppPrismaClient` is the intersection of every feature-specific Prisma
 * client interface used by the DI container (`server/wiring/index.ts`).
 *
 * By casting the real `PrismaClient` to `AppPrismaClient` **once** at the
 * wiring boundary, every service that expects a narrowed client (e.g.
 * `BlogPrismaClient`, `TagsPrismaClient`) can receive it directly —
 * because an intersection type is assignable to each of its members.
 * ============================================================================
 */

import type { PrismaClient } from "@prisma/client";

// ─── Feature-specific Prisma client types ───────────────────────────────────
import type { UsersPrismaClient } from "@/features/auth/types";
import type { BlogPrismaClient } from "@/features/blog/types";
import type { CommentsPrismaClient } from "@/features/comments/types";
import type { TagsPrismaClient } from "@/features/tags/types";
import type { CaptchaPrismaClient } from "@/features/captcha/types";
import type { PagesPrismaClient } from "@/features/pages/types";
import type { SiteSettingsPrismaClient } from "@/features/settings/types";
import type { ThemePrismaClient } from "@/features/settings/theme/types";
import type { MenuBuilderPrismaClient } from "@/features/settings/menu-builder/types";
import type { MediaPrismaClient } from "@/features/media/types";
import type { AdsPrismaClient } from "@/features/ads/types";
import type { DistributionPrismaClient } from "@/features/distribution/types";

// ─── SEO delegate types (SeoService takes individual delegates, not a client) ─
import type {
  PrismaSeoSuggestionDelegate,
  PrismaSeoKeywordDelegate,
  PrismaSeoEntityDelegate,
  PrismaSeoEntityEdgeDelegate,
  PrismaBatchOperationDelegate,
  PrismaTransactionFn,
  PrismaRawQueryFn,
} from "@/features/seo/types";

// ─── SEO model delegates accessed directly on the Prisma client ─────────────
interface SeoPrismaModels {
  seoSuggestion: PrismaSeoSuggestionDelegate;
  seoKeyword: PrismaSeoKeywordDelegate;
  seoEntity: PrismaSeoEntityDelegate;
  seoEntityEdge: PrismaSeoEntityEdgeDelegate;
  batchOperation: PrismaBatchOperationDelegate;
  $transaction: PrismaTransactionFn;
  $queryRawUnsafe: PrismaRawQueryFn;
}

// ─── Consent log delegate (typed from the concrete PrismaClient) ────────────
type ConsentPrismaModels = Pick<PrismaClient, "consentLog">;

// ─── Unified intersection type ──────────────────────────────────────────────

/**
 * Intersection of **all** feature-specific Prisma client interfaces.
 *
 * The real `PrismaClient` structurally satisfies every member of this
 * intersection because each feature interface only declares a subset of
 * models/delegates that already exist on the full client.
 *
 * Usage in wiring:
 * ```ts
 * const db = prisma as unknown as AppPrismaClient;
 * // Now `db` can be passed to any service without further casts.
 * ```
 */
export type AppPrismaClient = UsersPrismaClient &
  BlogPrismaClient &
  CommentsPrismaClient &
  TagsPrismaClient &
  CaptchaPrismaClient &
  PagesPrismaClient &
  SiteSettingsPrismaClient &
  ThemePrismaClient &
  MenuBuilderPrismaClient &
  MediaPrismaClient &
  AdsPrismaClient &
  DistributionPrismaClient &
  SeoPrismaModels &
  ConsentPrismaModels;
