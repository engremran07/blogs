/**
 * ============================================================================
 * MODULE  : seo/json-ld.util.ts
 * PURPOSE : Pure JSON-LD structured data generators for Schema.org types
 * PATTERN : Framework-agnostic, zero side-effects
 * ============================================================================
 */

import type {
  ArticleJsonLdInput,
  WebSiteJsonLdInput,
  WebPageJsonLdInput,
  BreadcrumbItem,
  FaqItem,
  HowToJsonLdInput,
  OrganizationJsonLdInput,
  PersonJsonLdInput,
} from '../types';

/* ========================================================================== */
/*  SECTION 1 — Article / BlogPosting                                         */
/* ========================================================================== */

/** Generate Article / BlogPosting JSON-LD from input. */
export function buildArticleJsonLd(
  input: ArticleJsonLdInput,
): Record<string, unknown> {
  const ld: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: input.title,
    description: input.description,
    url: input.url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': input.url },
    datePublished: input.publishedAt,
    author: {
      '@type': 'Person',
      name: input.authorName,
      ...(input.authorUrl ? { url: input.authorUrl } : {}),
    },
    publisher: {
      '@type': 'Organization',
      name: input.publisherName ?? 'MyBlog',
      ...(input.publisherLogoUrl
        ? { logo: { '@type': 'ImageObject', url: input.publisherLogoUrl } }
        : {}),
    },
  };

  if (input.modifiedAt) ld.dateModified = input.modifiedAt;
  if (input.imageUrl) ld.image = input.imageUrl;
  if (input.section) ld.articleSection = input.section;
  if (input.tags && input.tags.length > 0) ld.keywords = input.tags.join(', ');
  if (input.wordCount) ld.wordCount = input.wordCount;
  if (input.language) ld.inLanguage = input.language;

  return ld;
}

/* ========================================================================== */
/*  SECTION 2 — BreadcrumbList                                                */
/* ========================================================================== */

/** Generate BreadcrumbList JSON-LD from an ordered list of items. */
export function buildBreadcrumbJsonLd(
  items: BreadcrumbItem[],
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/* ========================================================================== */
/*  SECTION 3 — WebSite (with SearchAction)                                   */
/* ========================================================================== */

/** Generate WebSite JSON-LD, optionally with SearchAction for sitelinks. */
export function buildWebSiteJsonLd(
  input: WebSiteJsonLdInput,
): Record<string, unknown> {
  const ld: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: input.name,
    url: input.url,
  };

  if (input.description) ld.description = input.description;
  if (input.language) ld.inLanguage = input.language;

  if (input.searchUrl) {
    ld.potentialAction = {
      '@type': 'SearchAction',
      target: `${input.searchUrl}{search_term_string}`,
      'query-input': 'required name=search_term_string',
    };
  }

  return ld;
}

/* ========================================================================== */
/*  SECTION 4 — WebPage                                                       */
/* ========================================================================== */

/** Generate WebPage JSON-LD. */
export function buildWebPageJsonLd(
  input: WebPageJsonLdInput,
): Record<string, unknown> {
  const ld: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: input.name,
    url: input.url,
  };

  if (input.description) ld.description = input.description;
  if (input.datePublished) ld.datePublished = input.datePublished;
  if (input.dateModified) ld.dateModified = input.dateModified;
  if (input.inLanguage) ld.inLanguage = input.inLanguage;
  if (input.imageUrl) ld.image = input.imageUrl;
  if (input.primaryImageOfPage) {
    ld.primaryImageOfPage = { '@type': 'ImageObject', url: input.primaryImageOfPage };
  }
  if (input.isPartOf) {
    ld.isPartOf = { '@type': 'WebSite', name: input.isPartOf.name, url: input.isPartOf.url };
  }
  if (input.breadcrumb && input.breadcrumb.length > 0) {
    ld.breadcrumb = buildBreadcrumbJsonLd(input.breadcrumb);
  }
  if (input.speakable && input.speakable.length > 0) {
    ld.speakable = { '@type': 'SpeakableSpecification', cssSelector: input.speakable };
  }

  return ld;
}

/* ========================================================================== */
/*  SECTION 5 — FAQPage                                                       */
/* ========================================================================== */

/** Generate FAQPage JSON-LD from a list of question/answer pairs. */
export function buildFaqJsonLd(
  items: FaqItem[],
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}

/* ========================================================================== */
/*  SECTION 6 — HowTo                                                        */
/* ========================================================================== */

/** Generate HowTo JSON-LD. */
export function buildHowToJsonLd(
  input: HowToJsonLdInput,
): Record<string, unknown> {
  const ld: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: input.name,
    description: input.description,
    step: input.steps.map((step, idx) => ({
      '@type': 'HowToStep',
      position: idx + 1,
      name: step.name,
      text: step.text,
      ...(step.url ? { url: step.url } : {}),
      ...(step.imageUrl ? { image: step.imageUrl } : {}),
    })),
  };

  if (input.totalTime) ld.totalTime = input.totalTime;
  if (input.imageUrl) ld.image = input.imageUrl;
  if (input.estimatedCost) {
    ld.estimatedCost = {
      '@type': 'MonetaryAmount',
      currency: input.estimatedCost.currency,
      value: input.estimatedCost.value,
    };
  }

  return ld;
}

/* ========================================================================== */
/*  SECTION 7 — Organization                                                  */
/* ========================================================================== */

/** Generate Organization JSON-LD. */
export function buildOrganizationJsonLd(
  input: OrganizationJsonLdInput,
): Record<string, unknown> {
  const ld: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: input.name,
    url: input.url,
  };

  if (input.logoUrl) ld.logo = input.logoUrl;
  if (input.description) ld.description = input.description;
  if (input.email) ld.email = input.email;
  if (input.phone) ld.telephone = input.phone;
  if (input.socialLinks && input.socialLinks.length > 0) ld.sameAs = input.socialLinks;
  if (input.address) {
    ld.address = {
      '@type': 'PostalAddress',
      ...(input.address.street ? { streetAddress: input.address.street } : {}),
      ...(input.address.city ? { addressLocality: input.address.city } : {}),
      ...(input.address.state ? { addressRegion: input.address.state } : {}),
      ...(input.address.postalCode ? { postalCode: input.address.postalCode } : {}),
      ...(input.address.country ? { addressCountry: input.address.country } : {}),
    };
  }

  return ld;
}

/* ========================================================================== */
/*  SECTION 8 — Person                                                        */
/* ========================================================================== */

/** Generate Person JSON-LD. */
export function buildPersonJsonLd(
  input: PersonJsonLdInput,
): Record<string, unknown> {
  const ld: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: input.name,
  };

  if (input.url) ld.url = input.url;
  if (input.imageUrl) ld.image = input.imageUrl;
  if (input.jobTitle) ld.jobTitle = input.jobTitle;
  if (input.worksFor) ld.worksFor = { '@type': 'Organization', name: input.worksFor };
  if (input.sameAs && input.sameAs.length > 0) ld.sameAs = input.sameAs;

  return ld;
}

/* ========================================================================== */
/*  SECTION 9 — Helper: Serialize to <script> tag                             */
/* ========================================================================== */

/** Serialize one or more JSON-LD objects to a safe inline script string. */
export function serializeJsonLd(
  data: Record<string, unknown> | Record<string, unknown>[],
): string {
  const json = JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
  return json;
}
