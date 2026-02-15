/**
 * ============================================================================
 * MODULE  : seo/robots.util.ts
 * PURPOSE : Pure robots.txt generation with per-bot rules, crawl-delay,
 *           sitemap directives, and host directive support
 * PATTERN : Framework-agnostic, zero side-effects
 * ============================================================================
 */

import type { RobotsConfig, RobotsRule } from '../types';
import { ROBOTS_DEFAULTS } from './constants';

/* ========================================================================== */
/*  SECTION 1 — Robots.txt Generation                                         */
/* ========================================================================== */

/**
 * Generate a complete robots.txt string from a configuration object.
 *
 * Output format:
 *   User-agent: <agent>
 *   Allow: <path>
 *   Disallow: <path>
 *   Crawl-delay: <seconds>
 *
 *   Sitemap: <url>
 *   Host: <hostname>
 */
export function generateRobotsTxt(config: RobotsConfig): string {
  const lines: string[] = [];

  for (let i = 0; i < config.rules.length; i++) {
    const rule = config.rules[i];

    if (i > 0) lines.push('');
    lines.push(`User-agent: ${rule.userAgent}`);

    if (rule.allow) {
      for (const path of rule.allow) {
        lines.push(`Allow: ${path}`);
      }
    }

    if (rule.disallow) {
      for (const path of rule.disallow) {
        lines.push(`Disallow: ${path}`);
      }
    }

    if (rule.crawlDelay !== undefined && rule.crawlDelay > 0) {
      lines.push(`Crawl-delay: ${rule.crawlDelay}`);
    }
  }

  // Sitemap directives
  if (config.sitemapUrls && config.sitemapUrls.length > 0) {
    lines.push('');
    for (const url of config.sitemapUrls) {
      lines.push(`Sitemap: ${url}`);
    }
  }

  // Host directive (used by Yandex)
  if (config.host) {
    lines.push('');
    lines.push(`Host: ${config.host}`);
  }

  return lines.join('\n') + '\n';
}

/* ========================================================================== */
/*  SECTION 2 — Default Configuration Builder                                 */
/* ========================================================================== */

/**
 * Build a sensible default robots.txt configuration.
 * Allows all crawlers with standard disallow paths for API, admin, etc.
 */
export function buildDefaultRobotsConfig(
  baseUrl: string,
  sitemapPaths: string[] = ['/sitemap.xml', '/sitemap-index.xml'],
): RobotsConfig {
  const host = baseUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const sitemapUrls = sitemapPaths.map((path) =>
    `${baseUrl.replace(/\/$/, '')}${path}`,
  );

  return {
    rules: [
      {
        userAgent: ROBOTS_DEFAULTS.DEFAULT_USER_AGENT,
        allow: [...ROBOTS_DEFAULTS.COMMON_ALLOW],
        disallow: [...ROBOTS_DEFAULTS.COMMON_DISALLOW],
      },
    ],
    sitemapUrls,
    host,
  };
}

/* ========================================================================== */
/*  SECTION 3 — Bot-Specific Rules                                            */
/* ========================================================================== */

/**
 * Create a rule set for specific known bots.
 * Useful for throttling aggressive crawlers or blocking AI scrapers.
 */
export function buildBotSpecificRules(
  bots: {
    userAgent: string;
    allow?: string[];
    disallow?: string[];
    crawlDelay?: number;
  }[],
): RobotsRule[] {
  return bots.map((bot) => ({
    userAgent: bot.userAgent,
    allow: bot.allow,
    disallow: bot.disallow,
    crawlDelay: bot.crawlDelay,
  }));
}

/** Common AI scraper bots to optionally block. */
export const AI_SCRAPER_BOTS = [
  'GPTBot',
  'ChatGPT-User',
  'CCBot',
  'Google-Extended',
  'anthropic-ai',
  'ClaudeBot',
  'Bytespider',
  'Omgilibot',
  'FacebookBot',
] as const;

/**
 * Generate rules that block common AI training scrapers.
 * This is a white-hat approach to control content usage.
 */
export function buildAiBlockRules(): RobotsRule[] {
  return AI_SCRAPER_BOTS.map((bot) => ({
    userAgent: bot,
    disallow: ['/'],
  }));
}

/* ========================================================================== */
/*  SECTION 4 — Validation                                                    */
/* ========================================================================== */

export interface RobotsValidationResult {
  valid: boolean;
  issues: string[];
  warnings: string[];
}

/** Validate a robots.txt configuration for common issues. */
export function validateRobotsConfig(
  config: RobotsConfig,
): RobotsValidationResult {
  const issues: string[] = [];
  const warnings: string[] = [];

  if (!config.rules || config.rules.length === 0) {
    issues.push('No rules defined — robots.txt will be empty.');
  }

  for (const rule of config.rules) {
    if (!rule.userAgent || !rule.userAgent.trim()) {
      issues.push('Rule has empty User-agent.');
    }

    if (!rule.allow?.length && !rule.disallow?.length) {
      warnings.push(
        `Rule for "${rule.userAgent}" has no Allow or Disallow directives.`,
      );
    }

    if (rule.crawlDelay !== undefined) {
      if (rule.crawlDelay < 0) {
        issues.push(
          `Crawl-delay for "${rule.userAgent}" is negative.`,
        );
      }
      if (rule.crawlDelay > 60) {
        warnings.push(
          `Crawl-delay of ${rule.crawlDelay}s for "${rule.userAgent}" is very aggressive.`,
        );
      }
    }

    // Check for contradictory rules (allow and disallow same path)
    if (rule.allow && rule.disallow) {
      const conflicts = rule.allow.filter((a) => rule.disallow!.includes(a));
      if (conflicts.length > 0) {
        warnings.push(
          `Rule for "${rule.userAgent}" has conflicting Allow/Disallow for: ${conflicts.join(', ')}`,
        );
      }
    }
  }

  // Check for wildcard-disallow-all without any allow
  const wildcardRule = config.rules.find((r) => r.userAgent === '*');
  if (
    wildcardRule?.disallow?.includes('/') &&
    (!wildcardRule.allow || wildcardRule.allow.length === 0)
  ) {
    warnings.push(
      'Wildcard rule blocks all crawling with no Allow directives — site will not be indexed.',
    );
  }

  if (!config.sitemapUrls || config.sitemapUrls.length === 0) {
    warnings.push('No Sitemap URLs declared — crawlers must discover the sitemap by other means.');
  }

  return {
    valid: issues.length === 0,
    issues,
    warnings,
  };
}

/* ========================================================================== */
/*  SECTION 5 — Parser (for testing/importing existing robots.txt)            */
/* ========================================================================== */

/** Parse a robots.txt string back into a RobotsConfig object. */
export function parseRobotsTxt(text: string): RobotsConfig {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));

  const rules: RobotsRule[] = [];
  const sitemapUrls: string[] = [];
  let host: string | undefined;
  let currentRule: RobotsRule | null = null;

  for (const line of lines) {
    const [directive, ...valueParts] = line.split(':');
    const directiveLower = directive.trim().toLowerCase();
    const value = valueParts.join(':').trim();

    switch (directiveLower) {
      case 'user-agent':
        if (currentRule) rules.push(currentRule);
        currentRule = { userAgent: value };
        break;
      case 'allow':
        if (currentRule) {
          if (!currentRule.allow) currentRule.allow = [];
          currentRule.allow.push(value);
        }
        break;
      case 'disallow':
        if (currentRule) {
          if (!currentRule.disallow) currentRule.disallow = [];
          currentRule.disallow.push(value);
        }
        break;
      case 'crawl-delay':
        if (currentRule) {
          const delay = parseFloat(value);
          if (!isNaN(delay)) currentRule.crawlDelay = delay;
        }
        break;
      case 'sitemap':
        sitemapUrls.push(value);
        break;
      case 'host':
        host = value;
        break;
    }
  }

  if (currentRule) rules.push(currentRule);

  return { rules, sitemapUrls: sitemapUrls.length > 0 ? sitemapUrls : undefined, host };
}
