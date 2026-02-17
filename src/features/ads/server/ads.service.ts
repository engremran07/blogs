// src/features/ads/server/ads.service.ts
import type {
  AdsPrismaClient, CacheProvider, AdsConfig, SafeAdProvider,
  AdsOverviewStats, PlacementStats, ComplianceScanResult, ComplianceIssue,
} from "../types";
import { CACHE_KEYS, PROVIDER_SENSITIVE_FIELDS, DEFAULT_ADS_TXT, generateSlug } from "./constants";
import { sanitizeAdCode } from "./sanitization.util";

export interface AdsServiceDeps {
  prisma: AdsPrismaClient;
  cache: CacheProvider;
  getConfig: () => Promise<AdsConfig>;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export class AdsService {
  private prisma: AdsPrismaClient;
  private cache: CacheProvider;
  private getConfig: () => Promise<AdsConfig>;

  constructor(deps: AdsServiceDeps) {
    this.prisma = deps.prisma;
    this.cache = deps.cache;
    this.getConfig = deps.getConfig;
  }

  // ── Providers ────────────────────────────────────────────────────────────

  async findAllProviders(activeOnly = false): Promise<any[]> {
    const where = activeOnly ? { isActive: true, killSwitch: false } : {};
    return this.prisma.adProvider.findMany({
      where,
      include: { _count: { select: { placements: true } } },
      orderBy: { priority: "desc" },
    } as any);
  }

  stripSensitiveFields(provider: any): SafeAdProvider {
    const safe = { ...provider };
    for (const field of PROVIDER_SENSITIVE_FIELDS) {
      delete safe[field];
    }
    return safe;
  }

  async createProvider(input: Record<string, any>): Promise<any> {
    const slug = input.slug || generateSlug(input.name);
    const config = await this.getConfig();
    if (config.sanitizeAdCode && input.adCode) {
      input.adCode = sanitizeAdCode(input.adCode);
    }
    const provider = await this.prisma.adProvider.create({
      data: { ...input, slug } as any,
      include: { _count: { select: { placements: true } } },
    });
    await this.cache.invalidatePrefix("ads:");
    return provider;
  }

  async findProviderById(id: string): Promise<any | null> {
    return this.prisma.adProvider.findUnique({
      where: { id },
      include: { _count: { select: { placements: true } } },
    } as any);
  }

  async updateProvider(id: string, input: Record<string, any>): Promise<any> {
    if (input.name && !input.slug) {
      input.slug = generateSlug(input.name);
    }
    const provider = await this.prisma.adProvider.update({
      where: { id },
      data: input as any,
      include: { _count: { select: { placements: true } } },
    });
    await this.cache.invalidatePrefix("ads:");
    return provider;
  }

  async deleteProvider(id: string): Promise<void> {
    await this.prisma.adProvider.delete({ where: { id } });
    await this.cache.invalidatePrefix("ads:");
  }

  async toggleProviderKillSwitch(id: string, killed: boolean): Promise<any> {
    const provider = await this.prisma.adProvider.update({
      where: { id },
      data: { killSwitch: killed },
      include: { _count: { select: { placements: true } } },
    });
    await this.cache.invalidatePrefix("ads:");
    return provider;
  }

  // ── Slots ────────────────────────────────────────────────────────────────

  async findAllSlots(activeOnly = false): Promise<any[]> {
    const where = activeOnly ? { isActive: true } : {};
    return this.prisma.adSlot.findMany({
      where,
      include: { _count: { select: { placements: true } } },
      orderBy: { renderPriority: "desc" },
    } as any);
  }

  async createSlot(input: Record<string, any>): Promise<any> {
    const slug = input.slug || generateSlug(input.name);
    const slot = await this.prisma.adSlot.create({
      data: { ...input, slug } as any,
      include: { _count: { select: { placements: true } } },
    });
    await this.cache.invalidatePrefix("ads:");
    return slot;
  }

  async findSlotById(id: string): Promise<any | null> {
    return this.prisma.adSlot.findUnique({
      where: { id },
      include: { _count: { select: { placements: true } } },
    } as any);
  }

  async updateSlot(id: string, input: Record<string, any>): Promise<any> {
    if (input.name && !input.slug) {
      input.slug = generateSlug(input.name);
    }
    const slot = await this.prisma.adSlot.update({
      where: { id },
      data: input as any,
      include: { _count: { select: { placements: true } } },
    });
    await this.cache.invalidatePrefix("ads:");
    return slot;
  }

  async deleteSlot(id: string): Promise<void> {
    await this.prisma.adSlot.delete({ where: { id } });
    await this.cache.invalidatePrefix("ads:");
  }

  // ── Placements ───────────────────────────────────────────────────────────

  async findPlacementById(id: string): Promise<any | null> {
    return this.prisma.adPlacement.findUnique({
      where: { id },
      include: {
        provider: { select: { name: true, type: true } },
        slot: { select: { name: true, position: true, format: true } },
      },
    } as any);
  }

  async findPlacementsForPage(
    pageType?: string,
    category?: string,
    containerWidth?: number,
  ): Promise<any[]> {
    const now = new Date();
    const where: any = {
      isActive: true,
      provider: { isActive: true, killSwitch: false },
      slot: { isActive: true },
      OR: [
        { startDate: null },
        { startDate: { lte: now } },
      ],
    };

    if (pageType) {
      where.slot = {
        ...where.slot,
        OR: [
          { pageTypes: { isEmpty: true } },
          { pageTypes: { has: pageType } },
        ],
      };
    }

    return this.prisma.adPlacement.findMany({
      where,
      include: {
        provider: true,
        slot: true,
      },
      orderBy: { slot: { renderPriority: "desc" } },
    } as any);
  }

  async findAllPlacements(): Promise<any[]> {
    return this.prisma.adPlacement.findMany({
      include: {
        provider: { select: { name: true, type: true } },
        slot: { select: { name: true, position: true, format: true } },
      },
      orderBy: { createdAt: "desc" },
    } as any);
  }

  async createPlacement(input: Record<string, any>): Promise<any> {
    const config = await this.getConfig();
    if (config.sanitizeAdCode && input.adCode) {
      input.adCode = sanitizeAdCode(input.adCode);
    }
    if (config.sanitizeAdCode && input.customHtml) {
      input.customHtml = sanitizeAdCode(input.customHtml);
    }
    const placement = await this.prisma.adPlacement.create({
      data: input as any,
      include: {
        provider: { select: { name: true, type: true } },
        slot: { select: { name: true, position: true, format: true } },
      },
    });
    await this.cache.invalidatePrefix("ads:");
    return placement;
  }

  async updatePlacement(id: string, input: Record<string, any>): Promise<any> {
    const config = await this.getConfig();
    if (config.sanitizeAdCode && input.adCode) {
      input.adCode = sanitizeAdCode(input.adCode);
    }
    if (config.sanitizeAdCode && input.customHtml) {
      input.customHtml = sanitizeAdCode(input.customHtml);
    }
    const placement = await this.prisma.adPlacement.update({
      where: { id },
      data: input as any,
      include: {
        provider: { select: { name: true, type: true } },
        slot: { select: { name: true, position: true, format: true } },
      },
    });
    await this.cache.invalidatePrefix("ads:");
    return placement;
  }

  async deletePlacement(id: string): Promise<void> {
    await this.prisma.adPlacement.delete({ where: { id } });
    await this.cache.invalidatePrefix("ads:");
  }

  // ── Stats & Analytics ────────────────────────────────────────────────────

  async getPlacementStats(id: string, days = 30): Promise<PlacementStats> {
    const since = new Date(Date.now() - days * 86_400_000);
    const logs = await this.prisma.adLog.findMany({
      where: { placementId: id, createdAt: { gte: since } },
    });

    const impressions = logs.filter((l: any) => l.eventType === "IMPRESSION").length;
    const clicks = logs.filter((l: any) => l.eventType === "CLICK").length;
    const viewable = logs.filter((l: any) => l.eventType === "VIEWABLE").length;
    const closes = logs.filter((l: any) => l.eventType === "CLOSE").length;

    return {
      impressions,
      clicks,
      viewable,
      closes,
      ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
      viewabilityRate: impressions > 0 ? (viewable / impressions) * 100 : 0,
      revenue: (impressions / 1000) * 2, // Estimate at $2 CPM default until pricing model is added
    };
  }

  async getOverviewStats(): Promise<AdsOverviewStats> {
    const [activeProviders, activeSlots, activePlacements, totalProviders, totalSlots, totalPlacements] = await Promise.all([
      this.prisma.adProvider.count({ where: { isActive: true, killSwitch: false } }),
      this.prisma.adSlot.count({ where: { isActive: true } }),
      this.prisma.adPlacement.count({ where: { isActive: true } }),
      this.prisma.adProvider.count(),
      this.prisma.adSlot.count(),
      this.prisma.adPlacement.count(),
    ]);

    const totals = await this.prisma.adPlacement.aggregate({
      _sum: { impressions: true, clicks: true, revenue: true },
    });

    const totalImpressions = totals._sum?.impressions ?? 0;
    const totalClicks = totals._sum?.clicks ?? 0;
    const totalRevenue = totals._sum?.revenue ?? 0;

    // Aggregate stats by provider
    const providers = await this.prisma.adProvider.findMany({
      include: {
        placements: {
          select: { impressions: true, clicks: true },
        },
      },
    });
    const byProvider = providers.map((p) => {
      const impressions = p.placements.reduce((sum: number, pl: any) => sum + (pl.impressions ?? 0), 0);
      const clicks = p.placements.reduce((sum: number, pl: any) => sum + (pl.clicks ?? 0), 0);
      return {
        type: p.type as any,
        name: p.name,
        impressions,
        clicks,
        ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
      };
    });

    // Aggregate stats by slot position
    const slots = await this.prisma.adSlot.findMany({
      include: {
        placements: {
          select: { impressions: true, clicks: true },
        },
      },
    });
    const positionMap = new Map<string, { impressions: number; clicks: number }>();
    for (const slot of slots) {
      const existing = positionMap.get(slot.position) ?? { impressions: 0, clicks: 0 };
      for (const pl of slot.placements as any[]) {
        existing.impressions += pl.impressions ?? 0;
        existing.clicks += pl.clicks ?? 0;
      }
      positionMap.set(slot.position, existing);
    }
    const byPosition = Array.from(positionMap.entries()).map(([position, stats]) => ({
      position: position as any,
      impressions: stats.impressions,
      clicks: stats.clicks,
      ctr: stats.impressions > 0 ? (stats.clicks / stats.impressions) * 100 : 0,
    }));

    return {
      totalProviders,
      totalSlots,
      totalPlacements,
      activeProviders,
      activeSlots,
      activePlacements,
      totalImpressions,
      totalClicks,
      totalRevenue,
      ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
      rpm: totalImpressions > 0 ? (totalRevenue / totalImpressions) * 1000 : 0,
      byProvider,
      byPosition,
    };
  }

  // ── Compliance ───────────────────────────────────────────────────────────

  async scanCompliance(): Promise<ComplianceScanResult> {
    const placements = await this.prisma.adPlacement.findMany({
      where: { isActive: true },
      include: { provider: true, slot: true },
    } as any);

    const issues: ComplianceIssue[] = [];
    for (const p of placements) {
      if (!p.adCode && !p.customHtml && !p.adUnitId) {
        issues.push({
          placementId: p.id,
          severity: "high",
          message: "Placement has no ad code, custom HTML, or ad unit ID",
          rule: "MISSING_AD_CONTENT",
        });
      }
      if (p.startDate && p.endDate && new Date(p.startDate) >= new Date(p.endDate)) {
        issues.push({
          placementId: p.id,
          severity: "medium",
          message: "Start date is after end date",
          rule: "INVALID_DATE_RANGE",
        });
      }
    }

    return {
      scannedCount: placements.length,
      passedCount: placements.length - issues.length,
      issues,
    };
  }

  // ── Ads.txt ──────────────────────────────────────────────────────────────

  async generateAdsTxt(): Promise<string> {
    const providers = await this.prisma.adProvider.findMany({
      where: { isActive: true, killSwitch: false },
    });

    let txt = DEFAULT_ADS_TXT;
    for (const p of providers) {
      if (p.publisherId) {
        const domain = p.type === "ADSENSE" ? "google.com" : p.type.toLowerCase() + ".com";
        txt += `${domain}, ${p.publisherId}, DIRECT\n`;
      }
    }
    return txt;
  }

  // ── Event Recording ──────────────────────────────────────────────────────

  /** Debounce window for click deduplication (ms) */
  private static CLICK_DEDUP_WINDOW = 30_000;
  private clickDedup = new Map<string, number>();

  async recordEvent(
    placementId: string,
    eventType: string,
    metadata?: Record<string, unknown> | null,
  ): Promise<void> {
    // Click deduplication: reject same placement + IP within 30s
    if (eventType === "CLICK") {
      const ip = (metadata as any)?.ip || "unknown";
      const key = `${placementId}:${ip}`;
      const now = Date.now();
      const last = this.clickDedup.get(key);
      if (last && now - last < AdsService.CLICK_DEDUP_WINDOW) {
        return; // duplicate click — skip
      }
      this.clickDedup.set(key, now);
      // Prune old entries periodically
      if (this.clickDedup.size > 10_000) {
        for (const [k, v] of this.clickDedup) {
          if (now - v > AdsService.CLICK_DEDUP_WINDOW) this.clickDedup.delete(k);
        }
      }
    }

    await this.prisma.adLog.create({
      data: { placementId, eventType, metadata: metadata ?? undefined },
    });

    if (eventType === "IMPRESSION") {
      await this.prisma.adPlacement.update({
        where: { id: placementId },
        data: { impressions: { increment: 1 } } as any,
      });
    } else if (eventType === "CLICK") {
      await this.prisma.adPlacement.update({
        where: { id: placementId },
        data: { clicks: { increment: 1 } } as any,
      });
    }
  }

  // ── Global Kill Switch ───────────────────────────────────────────────────

  async globalKillSwitch(killed: boolean): Promise<void> {
    // Update all providers in one batch query
    const providers = await this.prisma.adProvider.findMany();
    await Promise.all(
      providers.map((p: any) =>
        this.prisma.adProvider.update({
          where: { id: p.id },
          data: { killSwitch: killed },
        }),
      ),
    );
    await this.cache.invalidatePrefix("ads:");
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */
