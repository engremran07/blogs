/**
 * ============================================================================
 * MODULE  : seo/constants.ts
 * PURPOSE : All SEO-related constants, thresholds, word lists, and defaults
 * PATTERN : Framework-agnostic — pure runtime values
 * ============================================================================
 */

import type { SitemapChangeFrequency } from '../types';

/* ========================================================================== */
/*  SECTION 1 — Title & Meta Description Thresholds                           */
/* ========================================================================== */

/** Optimal title length range (characters). */
export const TITLE_MIN_LENGTH = 30;
export const TITLE_MAX_LENGTH = 60;
export const TITLE_PIXEL_MAX = 600;

/** Optimal meta-description length range (characters). */
export const META_DESCRIPTION_MIN_LENGTH = 120;
export const META_DESCRIPTION_MAX_LENGTH = 160;

/** OG title / description limits. */
export const OG_TITLE_MAX_LENGTH = 95;
export const OG_DESCRIPTION_MAX_LENGTH = 200;

/** Twitter title / description limits. */
export const TWITTER_TITLE_MAX_LENGTH = 70;
export const TWITTER_DESCRIPTION_MAX_LENGTH = 200;

/* ========================================================================== */
/*  SECTION 2 — Content Thresholds                                            */
/* ========================================================================== */

export const CONTENT_MIN_WORD_COUNT = 300;
export const CONTENT_GOOD_WORD_COUNT = 1000;
export const CONTENT_EXCELLENT_WORD_COUNT = 2000;

export const KEYWORD_DENSITY_MIN = 0.5;
export const KEYWORD_DENSITY_MAX = 2.5;
export const KEYWORD_DENSITY_IDEAL = 1.5;

export const MAX_KEYWORD_STUFFING_DENSITY = 3.0;

export const READING_TIME_WPM = 238;

export const SLUG_MAX_LENGTH = 75;
export const SLUG_MAX_WORDS = 8;

/* ========================================================================== */
/*  SECTION 3 — Heading Structure                                             */
/* ========================================================================== */

export const HEADING_MAX_H1 = 1;
export const HEADING_MIN_H2 = 1;
export const HEADING_MAX_PER_300_WORDS = 1;

/* ========================================================================== */
/*  SECTION 4 — Image SEO                                                     */
/* ========================================================================== */

export const IMAGE_ALT_MAX_LENGTH = 125;
export const IMAGE_TITLE_MAX_LENGTH = 100;

/* ========================================================================== */
/*  SECTION 5 — Link Thresholds                                               */
/* ========================================================================== */

export const INTERNAL_LINKS_MIN = 2;
export const INTERNAL_LINKS_RECOMMENDED = 5;
export const EXTERNAL_LINKS_MIN = 1;
export const EXTERNAL_LINKS_MAX = 100;

/* ========================================================================== */
/*  SECTION 6 — Content Freshness                                             */
/* ========================================================================== */

/** Number of months after which content is considered stale. */
export const CONTENT_STALE_MONTHS = 12;
export const CONTENT_REVIEW_MONTHS = 6;

/* ========================================================================== */
/*  SECTION 7 — Audit Scoring Weights                                         */
/* ========================================================================== */

export const AUDIT_WEIGHTS = {
  CRITICAL: 15,
  IMPORTANT: 10,
  OPTIONAL: 5,
  INFO: 0,
} as const;

export const AUDIT_SCORE_THRESHOLDS = {
  EXCELLENT: 90,
  GOOD: 70,
  NEEDS_WORK: 50,
  POOR: 0,
} as const;

/* ========================================================================== */
/*  SECTION 8 — Stop Words (English)                                          */
/* ========================================================================== */

export const STOP_WORDS = new Set<string>([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during',
  'before', 'after', 'above', 'below', 'between', 'out', 'off', 'over',
  'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when',
  'where', 'why', 'how', 'all', 'both', 'each', 'few', 'more', 'most',
  'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same',
  'so', 'than', 'too', 'very', 'can', 'will', 'just', 'do', 'should',
  'now', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us',
  'them', 'my', 'your', 'his', 'its', 'our', 'their', 'this', 'that',
  'these', 'those', 'am', 'is', 'are', 'was', 'were', 'be', 'been',
  'being', 'have', 'has', 'had', 'having', 'does', 'did', 'doing',
  'would', 'could', 'might', 'must', 'shall', 'need', 'dare', 'ought',
  'used', 'also', 'get', 'got', 'getting', 'make', 'makes', 'made',
  'go', 'goes', 'going', 'went', 'gone', 'take', 'takes', 'took',
  'say', 'says', 'said', 'see', 'seen', 'saw', 'know', 'known', 'knew',
  'think', 'thought', 'come', 'came', 'want', 'give', 'gave', 'tell',
  'told', 'work', 'call', 'try', 'ask', 'put', 'keep', 'let', 'begin',
  'seem', 'help', 'show', 'hear', 'play', 'run', 'move', 'live', 'believe',
  'bring', 'happen', 'write', 'provide', 'sit', 'stand', 'lose', 'pay',
  'meet', 'include', 'continue', 'set', 'learn', 'change', 'lead',
  'understand', 'watch', 'follow', 'stop', 'create', 'speak', 'read',
  'allow', 'add', 'spend', 'grow', 'open', 'walk', 'win', 'offer',
  'remember', 'love', 'consider', 'appear', 'buy', 'wait', 'serve',
  'die', 'send', 'expect', 'build', 'stay', 'fall', 'cut', 'reach',
  'kill', 'remain', 'whose', 'which', 'what', 'whom',
]);

/* ========================================================================== */
/*  SECTION 9 — Power Words & Emotional Triggers                              */
/* ========================================================================== */

export const POWER_WORDS = new Set<string>([
  'ultimate', 'complete', 'comprehensive', 'essential', 'definitive',
  'proven', 'guaranteed', 'exclusive', 'premium', 'revolutionary',
  'breakthrough', 'powerful', 'incredible', 'remarkable', 'extraordinary',
  'stunning', 'unbelievable', 'amazing', 'spectacular', 'outstanding',
  'epic', 'massive', 'critical', 'urgent', 'instant', 'limited',
  'secret', 'hidden', 'insider', 'expert', 'master', 'genius',
  'hack', 'trick', 'strategy', 'blueprint', 'formula', 'system',
  'free', 'bonus', 'save', 'discount', 'deal', 'offer',
  'new', 'latest', 'trending', 'updated', 'fresh', 'modern',
  'simple', 'easy', 'effortless', 'quick', 'fast', 'rapid',
  'best', 'top', 'first', 'only', 'unique', 'rare',
  'transform', 'boost', 'skyrocket', 'supercharge', 'maximize', 'unleash',
  'discover', 'reveal', 'unlock', 'uncover', 'expose', 'decode',
  'avoid', 'mistake', 'warning', 'danger', 'risk', 'never',
  'scientific', 'research', 'data', 'evidence', 'study', 'analysis',
]);

export const EMOTIONAL_WORDS = new Set<string>([
  'love', 'hate', 'fear', 'joy', 'anger', 'surprise', 'trust', 'disgust',
  'excited', 'thrilled', 'delighted', 'passionate', 'inspired', 'motivated',
  'worried', 'anxious', 'frustrated', 'outraged', 'heartbroken', 'devastated',
  'grateful', 'blessed', 'proud', 'confident', 'empowered', 'relieved',
  'shocking', 'terrifying', 'hilarious', 'touching', 'beautiful', 'gorgeous',
  'stunning', 'breathtaking', 'mind-blowing', 'life-changing', 'heartwarming',
  'unforgettable', 'irresistible', 'captivating', 'mesmerizing', 'enchanting',
]);

/* ========================================================================== */
/*  SECTION 10 — Keyword Intent Patterns                                      */
/* ========================================================================== */

export const INTENT_PATTERNS: Record<string, RegExp> = {
  TRANSACTIONAL: /\b(buy|purchase|order|price|cost|cheap|affordable|deal|discount|coupon|shop|checkout|cart|subscribe|download|sign\s*up|register|booking|reserve|hire|rent)\b/i,
  LOCAL: /\b(near\s*me|nearby|in\s+\w+|local|directions|map|address|located|location|open\s*now|hours|closest|nearest)\b/i,
  COMMERCIAL: /\b(best|top|review|compare|comparison|vs|versus|alternative|recommendation|rated|ranking|benchmark|pros\s+and\s+cons|worth|should\s+i)\b/i,
  NAVIGATIONAL: /\b(login|sign\s*in|official|website|homepage|portal|dashboard|account|app|download\s+page)\b/i,
  INFORMATIONAL: /\b(what|how|why|when|where|who|which|guide|tutorial|learn|explain|definition|meaning|example|tips|ways|steps|ideas|list|types|history|overview|introduction|faq|help)\b/i,
};

/* ========================================================================== */
/*  SECTION 11 — Sitemap Defaults                                             */
/* ========================================================================== */

export const SITEMAP_DEFAULTS = {
  MAX_ENTRIES_PER_SITEMAP: 50_000,
  MAX_SIZE_BYTES: 50 * 1024 * 1024,
  DEFAULT_CHANGE_FREQ: 'weekly' as SitemapChangeFrequency,
  DEFAULT_PRIORITY: 0.5,
  HOMEPAGE_PRIORITY: 1.0,
  POST_PRIORITY: 0.8,
  CATEGORY_PRIORITY: 0.6,
  TAG_PRIORITY: 0.4,
  PAGE_PRIORITY: 0.7,
  AUTHOR_PRIORITY: 0.3,
  XML_DECLARATION: '<?xml version="1.0" encoding="UTF-8"?>',
  URLSET_OPEN:
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
  URLSET_CLOSE: '</urlset>',
  SITEMAP_INDEX_OPEN:
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  SITEMAP_INDEX_CLOSE: '</sitemapindex>',
} as const;

/* ========================================================================== */
/*  SECTION 12 — XSL Stylesheets for Sitemap Rendering                       */
/* ========================================================================== */

export const SITEMAP_XSL = `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="2.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:sitemap="http://www.sitemaps.org/schemas/sitemap/0.9">
<xsl:output method="html" encoding="UTF-8" indent="yes"/>
<xsl:template match="/">
<html lang="en">
<head>
  <title>XML Sitemap</title>
  <style>
    body{font-family:system-ui,-apple-system,sans-serif;margin:2rem;color:#333;background:#fafafa}
    h1{color:#1a73e8;font-size:1.5rem}
    table{border-collapse:collapse;width:100%;margin-top:1rem}
    th{background:#1a73e8;color:#fff;text-align:left;padding:.6rem .8rem;font-size:.85rem}
    td{padding:.5rem .8rem;border-bottom:1px solid #e0e0e0;font-size:.85rem}
    tr:hover td{background:#e8f0fe}
    a{color:#1a73e8;text-decoration:none}
    a:hover{text-decoration:underline}
    .meta{color:#666;font-size:.8rem;margin-top:.5rem}
  </style>
</head>
<body>
  <h1>XML Sitemap</h1>
  <p class="meta">Total URLs: <xsl:value-of select="count(sitemap:urlset/sitemap:url)"/></p>
  <table>
    <tr><th>URL</th><th>Last Modified</th><th>Change Freq</th><th>Priority</th></tr>
    <xsl:for-each select="sitemap:urlset/sitemap:url">
      <xsl:sort select="sitemap:priority" order="descending" data-type="number"/>
      <tr>
        <td><a href="{sitemap:loc}"><xsl:value-of select="sitemap:loc"/></a></td>
        <td><xsl:value-of select="sitemap:lastmod"/></td>
        <td><xsl:value-of select="sitemap:changefreq"/></td>
        <td><xsl:value-of select="sitemap:priority"/></td>
      </tr>
    </xsl:for-each>
  </table>
</body>
</html>
</xsl:template>
</xsl:stylesheet>`;

export const SITEMAP_INDEX_XSL = `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="2.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:sitemap="http://www.sitemaps.org/schemas/sitemap/0.9">
<xsl:output method="html" encoding="UTF-8" indent="yes"/>
<xsl:template match="/">
<html lang="en">
<head>
  <title>XML Sitemap Index</title>
  <style>
    body{font-family:system-ui,-apple-system,sans-serif;margin:2rem;color:#333;background:#fafafa}
    h1{color:#1a73e8;font-size:1.5rem}
    table{border-collapse:collapse;width:100%;margin-top:1rem}
    th{background:#1a73e8;color:#fff;text-align:left;padding:.6rem .8rem;font-size:.85rem}
    td{padding:.5rem .8rem;border-bottom:1px solid #e0e0e0;font-size:.85rem}
    tr:hover td{background:#e8f0fe}
    a{color:#1a73e8;text-decoration:none}
    a:hover{text-decoration:underline}
    .meta{color:#666;font-size:.8rem;margin-top:.5rem}
  </style>
</head>
<body>
  <h1>XML Sitemap Index</h1>
  <p class="meta">Total Sitemaps: <xsl:value-of select="count(sitemap:sitemapindex/sitemap:sitemap)"/></p>
  <table>
    <tr><th>Sitemap</th><th>Last Modified</th></tr>
    <xsl:for-each select="sitemap:sitemapindex/sitemap:sitemap">
      <tr>
        <td><a href="{sitemap:loc}"><xsl:value-of select="sitemap:loc"/></a></td>
        <td><xsl:value-of select="sitemap:lastmod"/></td>
      </tr>
    </xsl:for-each>
  </table>
</body>
</html>
</xsl:template>
</xsl:stylesheet>`;

/* ========================================================================== */
/*  SECTION 13 — Robots.txt Defaults                                          */
/* ========================================================================== */

export const ROBOTS_DEFAULTS = {
  DEFAULT_USER_AGENT: '*',
  COMMON_DISALLOW: [
    '/api/',
    '/admin/',
    '/dashboard/',
    '/_next/',
    '/private/',
    '/tmp/',
    '/*.json$',
    '/search?',
  ],
  COMMON_ALLOW: ['/', '/blog/', '/about', '/contact', '/sitemap.xml'],
} as const;

/* ========================================================================== */
/*  SECTION 14 — Cache Keys & TTLs                                            */
/* ========================================================================== */

export const CACHE_KEYS = {
  PREFIX: 'seo',
  META: 'seo:meta',
  AUDIT: 'seo:audit',
  SITEMAP: 'seo:sitemap',
  KEYWORDS: 'seo:keywords',
  ENTITIES: 'seo:entities',
  VOLUME_HISTORY: 'seo:volume-history',
} as const;

export const CACHE_TTLS = {
  META: 3600,
  AUDIT: 1800,
  SITEMAP: 7200,
  KEYWORDS: 3600,
  ENTITIES: 3600,
  VOLUME_HISTORY: 86400,
} as const;

/* ========================================================================== */
/*  SECTION 15 — Volume History Defaults                                      */
/* ========================================================================== */

export const VOLUME_HISTORY_DEFAULTS = {
  TREND_WINDOW_DAYS: 7,
  TREND_RISING_THRESHOLD: 10,
  TREND_FALLING_THRESHOLD: -10,
  RETENTION_DAYS: 365,
  MAX_BATCH_SIZE: 500,
  CSV_HEADER: 'keyword,volume,timestamp,source,competition',
} as const;

/* ========================================================================== */
/*  SECTION 16 — Check Names (canonical identifiers)                          */
/* ========================================================================== */

export const CHECK_NAMES = {
  TITLE_LENGTH: 'Title Length',
  META_DESCRIPTION: 'Meta Description',
  URL_STRUCTURE: 'URL Structure',
  CONTENT_LENGTH: 'Content Length',
  FOCUS_KEYWORDS: 'Focus Keywords',
  KEYWORD_DENSITY: 'Keyword Density',
  HEADING_STRUCTURE: 'Heading Structure',
  IMAGE_ALT_TEXT: 'Images & Alt Text',
  INTERNAL_LINKS: 'Internal Linking',
  EXTERNAL_LINKS: 'External Links',
  OPEN_GRAPH: 'Open Graph',
  TWITTER_CARD: 'Twitter Card',
  READING_TIME: 'Reading Time',
  CATEGORIES: 'Categories',
  TAGS: 'Tags',
  PUBLISH_DATE: 'Publish Date & Freshness',
  CANONICAL_URL: 'Canonical URL',
  STRUCTURED_DATA: 'Structured Data',
  CONTENT_UNIQUENESS: 'Content Uniqueness',
  MOBILE_FRIENDLINESS: 'Mobile Friendliness',
  KEYWORD_STUFFING: 'Keyword Stuffing Check',
} as const;

/* ========================================================================== */
/*  SECTION 17 — SEO Suggestion Category Mapping from Check Names             */
/* ========================================================================== */

export const CHECK_TO_CATEGORY_MAP: Record<string, string> = {
  [CHECK_NAMES.TITLE_LENGTH]: 'META',
  [CHECK_NAMES.META_DESCRIPTION]: 'META',
  [CHECK_NAMES.URL_STRUCTURE]: 'TECHNICAL',
  [CHECK_NAMES.CONTENT_LENGTH]: 'CONTENT',
  [CHECK_NAMES.FOCUS_KEYWORDS]: 'CONTENT',
  [CHECK_NAMES.KEYWORD_DENSITY]: 'CONTENT',
  [CHECK_NAMES.HEADING_STRUCTURE]: 'CONTENT',
  [CHECK_NAMES.IMAGE_ALT_TEXT]: 'IMAGE',
  [CHECK_NAMES.INTERNAL_LINKS]: 'LINKING',
  [CHECK_NAMES.EXTERNAL_LINKS]: 'LINKING',
  [CHECK_NAMES.OPEN_GRAPH]: 'SOCIAL',
  [CHECK_NAMES.TWITTER_CARD]: 'SOCIAL',
  [CHECK_NAMES.READING_TIME]: 'CONTENT',
  [CHECK_NAMES.CATEGORIES]: 'CONTENT',
  [CHECK_NAMES.TAGS]: 'CONTENT',
  [CHECK_NAMES.PUBLISH_DATE]: 'CONTENT',
  [CHECK_NAMES.CANONICAL_URL]: 'TECHNICAL',
  [CHECK_NAMES.STRUCTURED_DATA]: 'STRUCTURED_DATA',
  [CHECK_NAMES.CONTENT_UNIQUENESS]: 'CONTENT',
  [CHECK_NAMES.MOBILE_FRIENDLINESS]: 'TECHNICAL',
  [CHECK_NAMES.KEYWORD_STUFFING]: 'CONTENT',
};
