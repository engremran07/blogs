/**
 * InArticleAd — Auto-injects ad slots between paragraphs in blog post content.
 *
 * Takes raw HTML content and inserts ad containers at calculated intervals
 * based on minParagraphs and paragraphGap settings from AdSettings.
 *
 * Server component — fetches settings from DB, parses HTML, injects ad slots.
 */
import { prisma } from "@/server/db/prisma";
import { AdContainer } from "./AdContainer";

/** Typed ad-settings Prisma table not on the default client type */
interface AdSettingsPrismaExt {
  adSettings: {
    findFirst(args: Record<string, unknown>): Promise<{
      enableAutoPlacement?: boolean;
      defaultMinParagraphs?: number;
      defaultParagraphGap?: number;
      globalMaxAdsPerPage?: number;
      skipCodeBlocks?: boolean;
    } | null>;
  };
}

interface InArticleAdProps {
  /** Raw HTML content of the blog post */
  content: string;
  /** Page type key for ad targeting */
  pageType: string;
  /** Prose wrapper className */
  className?: string;
}

/**
 * Split HTML content at paragraph boundaries and inject ad containers.
 *
 * Algorithm:
 * 1. Split content at </p> boundaries  
 * 2. Skip first N paragraphs (minParagraphs)
 * 3. Insert an ad every `paragraphGap` paragraphs after that
 * 4. Don't insert inside code blocks, blockquotes, or lists
 * 5. Cap total injected ads at maxAdsPerPage
 */
function splitContentWithAds(
  html: string,
  minParagraphs: number,
  paragraphGap: number,
  maxAds: number,
  skipCodeBlocks: boolean,
): { segments: string[]; adPositions: number[] } {
  // Split on closing </p> tags while keeping the tag
  const parts = html.split(/(<\/p>)/i);

  // Reconstruct actual paragraphs
  const paragraphs: string[] = [];
  let buffer = "";
  for (const part of parts) {
    buffer += part;
    if (part.toLowerCase() === "</p>") {
      paragraphs.push(buffer);
      buffer = "";
    }
  }
  // Remaining content (non-paragraph tail)
  if (buffer.trim()) paragraphs.push(buffer);

  const adPositions: number[] = [];
  let paragraphCount = 0;
  let adsInserted = 0;
  let insideCodeBlock = false;

  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i];

    // Track code blocks / pre tags
    if (skipCodeBlocks) {
      const preOpens = (p.match(/<pre[\s>]/gi) || []).length;
      const preCloses = (p.match(/<\/pre>/gi) || []).length;
      insideCodeBlock = insideCodeBlock
        ? preCloses <= preOpens
        : preOpens > preCloses;
    }

    // Only count actual <p> tags as paragraphs (skip divs, headers, lists, etc.)
    if (/<p[\s>]/i.test(p) && !insideCodeBlock) {
      paragraphCount++;
    }

    // Check if we should insert an ad after this paragraph
    if (
      paragraphCount >= minParagraphs &&
      (paragraphCount - minParagraphs) % paragraphGap === 0 &&
      paragraphCount > 0 &&
      adsInserted < maxAds &&
      !insideCodeBlock &&
      // Don't insert after the very last paragraph
      i < paragraphs.length - 1
    ) {
      adPositions.push(i);
      adsInserted++;
    }
  }

  return { segments: paragraphs, adPositions };
}

export async function InArticleAd({ content, pageType, className = "" }: InArticleAdProps) {
  if (!content) return null;

  // Check if ads are enabled
  const siteSettings = await prisma.siteSettings.findFirst({
    select: { adsEnabled: true },
  });
  if (!siteSettings?.adsEnabled) {
    return (
      <div
        className={className}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  }

  // Fetch ad settings
  const adSettings = await (prisma as unknown as AdSettingsPrismaExt).adSettings.findFirst({
    select: {
      enableAutoPlacement: true,
      defaultMinParagraphs: true,
      defaultParagraphGap: true,
      globalMaxAdsPerPage: true,
      skipCodeBlocks: true,
    },
  });

  const enableAuto = adSettings?.enableAutoPlacement ?? false;
  const minParagraphs = adSettings?.defaultMinParagraphs ?? 3;
  const paragraphGap = adSettings?.defaultParagraphGap ?? 4;
  const maxAds = Math.min(adSettings?.globalMaxAdsPerPage ?? 3, 5);
  const skipCodeBlocks = adSettings?.skipCodeBlocks ?? true;

  // If auto-placement is disabled, render content as-is
  if (!enableAuto) {
    return (
      <div
        className={className}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  }

  const { segments, adPositions } = splitContentWithAds(
    content, minParagraphs, paragraphGap, maxAds, skipCodeBlocks,
  );

  // Build the interleaved content
  return (
    <div className={className}>
      {segments.map((segment, i) => (
        <div key={i}>
          <div dangerouslySetInnerHTML={{ __html: segment }} />
          {adPositions.includes(i) && (
            <div className="my-6 not-prose">
              <AdContainer
                position="IN_ARTICLE"
                pageType={pageType}
                showPlaceholder={false}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
