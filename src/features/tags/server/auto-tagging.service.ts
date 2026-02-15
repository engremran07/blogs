// tags/auto-tagging.service.ts
// Keyword extraction, LLM-powered tagging, suggestions, batch auto-tag, synonym gen
// Pure TS + Prisma — zero framework dependency
// LLM is optional: inject via constructor or omit for keyword-only mode

import type {
  TagsPrismaClient,
  TagsConfig,
  LlmService,
  AutoTagResult,
  TagSuggestion,
  BatchAutoTagResult,
} from '../types';
import { DEFAULT_CONFIG, STOP_WORDS } from './constants';
import { TagService } from './tag.service';

export class AutoTaggingService {
  private cfg: Required<TagsConfig>;

  constructor(
    private readonly prisma: TagsPrismaClient,
    private readonly tagService: TagService,
    config: Partial<TagsConfig> = {},
    private readonly llm?: LlmService,
  ) {
    this.cfg = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Update runtime config (called by AdminSettingsService on admin changes).
   */
  updateConfig(newConfig: Partial<TagsConfig>): void {
    Object.assign(this.cfg, newConfig);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // KEYWORD-BASED AUTO-TAGGING
  // ═══════════════════════════════════════════════════════════════════════════

  /** Extract keywords from content + title, resolve to existing or new tags */
  async extractKeywordTags(content: string, title: string): Promise<string[]> {
    const plain = content.replace(/<[^>]*>/g, ' ').toLowerCase();
    const titleWords = title.toLowerCase().split(/\s+/);

    const words = plain.match(/\b[a-z]{3,}\b/g) || [];

    // Count frequency
    const freq: Record<string, number> = {};
    for (const w of words) {
      if (!STOP_WORDS.has(w)) freq[w] = (freq[w] || 0) + 1;
    }

    // Boost title words 3x
    for (const w of titleWords) {
      if (freq[w]) freq[w] *= 3;
    }

    // Top keywords
    const topKeywords = Object.entries(freq)
      .sort(([, a], [, b]) => b - a)
      .slice(0, this.cfg.autoTagMaxTags)
      .map(([w]) => w);

    // Resolve to tag IDs (match by slug, name, or synonym)
    const tagIds: string[] = [];
    for (const keyword of topKeywords) {
      const slug = keyword.replace(/\s+/g, '-');
      let tag = await this.prisma.tag.findFirst({
        where: {
          OR: [
            { slug },
            { name: { equals: keyword, mode: 'insensitive' } },
            { synonyms: { has: keyword.toLowerCase() } },
          ],
        },
      });

      if (tag) {
        // Increment usage, and synonym hit if matched via synonym
        await this.prisma.tag.update({
          where: { id: tag.id },
          data: {
            usageCount: { increment: 1 },
            synonymHits: (tag as any).synonyms?.includes(keyword.toLowerCase())
              ? { increment: 1 }
              : undefined,
          },
        });
      } else {
        tag = await this.prisma.tag.create({
          data: {
            slug,
            name: keyword.charAt(0).toUpperCase() + keyword.slice(1),
            description: `Auto-generated tag for "${keyword}"`,
            usageCount: 1,
          },
        });
      }
      tagIds.push(tag.id);
    }

    return tagIds;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SMART AUTO-TAG (LLM with keyword fallback)
  // ═══════════════════════════════════════════════════════════════════════════

  async smartAutoTag(
    postId: string,
    opts: {
      maxTags?: number;
      minConfidence?: number;
      useLlm?: boolean;
      syncRelation?: boolean;
    } = {},
  ): Promise<AutoTagResult> {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, title: true, content: true, excerpt: true, tags: { select: { id: true } } },
    });
    if (!post) throw new Error(`Post ${postId} not found`);

    const maxTags = opts.maxTags ?? this.cfg.autoTagMaxTags;
    const minConfidence = opts.minConfidence ?? this.cfg.autoTagMinConfidence;
    const useLlm = opts.useLlm !== false;
    const syncRelation = opts.syncRelation !== false;

    const plain = ((post as any).content || '').replace(/<[^>]*>/g, ' ').substring(0, 3000);
    const context = `Title: ${(post as any).title}\n\n${(post as any).excerpt || ''}\n\n${plain}`;

    // Try LLM first
    if (useLlm && this.llm) {
      try {
        const result = await this.extractTagsViaLlm(context, maxTags);
        if (result.tags.length > 0) {
          const tagIds = await this.resolveAndCreateTags(result.tags, result.confidence, minConfidence);
          if (syncRelation) await this.syncTagRelation(postId, tagIds);
          return { tags: tagIds, source: 'llm', confidence: result.confidence };
        }
      } catch {
        // Fall through to keyword
      }
    }

    // Keyword fallback
    const keywordTags = await this.extractKeywordTags(
      (post as any).content || '',
      (post as any).title,
    );
    if (syncRelation) await this.syncTagRelation(postId, keywordTags);
    return { tags: keywordTags, source: 'keyword', confidence: keywordTags.map(() => 0.5) };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TAG SUGGESTIONS (non-persisting — for editor UI)
  // ═══════════════════════════════════════════════════════════════════════════

  async suggestTags(text: string, maxSuggestions = 10): Promise<TagSuggestion[]> {
    // Try LLM
    if (this.llm) {
      try {
        const result = await this.extractTagsViaLlm(text, maxSuggestions);
        const suggestions: TagSuggestion[] = [];
        for (let i = 0; i < result.tags.length; i++) {
          const name = result.tags[i];
          const slug = name.replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
          const existing = await this.prisma.tag.findFirst({
            where: {
              OR: [
                { slug },
                { name: { equals: name, mode: 'insensitive' } },
                { synonyms: { has: name.toLowerCase() } },
              ],
            },
            select: { id: true, name: true, slug: true },
          });
          suggestions.push({
            name: existing?.name ?? this.titleCase(name),
            slug: existing?.slug ?? slug,
            id: existing?.id,
            isExisting: !!existing,
            confidence: result.confidence[i] ?? 0.5,
          });
        }
        return suggestions;
      } catch {
        // Fall through to keyword
      }
    }

    // Keyword fallback
    const plain = text.replace(/<[^>]*>/g, ' ').toLowerCase();
    const words = plain.match(/\b[a-z]{3,}\b/g) || [];
    const freq: Record<string, number> = {};
    for (const w of words) { if (!STOP_WORDS.has(w)) freq[w] = (freq[w] || 0) + 1; }
    const topWords = Object.entries(freq)
      .sort(([, a], [, b]) => b - a)
      .slice(0, maxSuggestions)
      .map(([w]) => w);

    const suggestions: TagSuggestion[] = [];
    for (const word of topWords) {
      const slug = word.replace(/\s+/g, '-');
      const existing = await this.prisma.tag.findFirst({
        where: { OR: [{ slug }, { name: { equals: word, mode: 'insensitive' } }] },
        select: { id: true, name: true, slug: true },
      });
      suggestions.push({
        name: existing?.name ?? this.titleCase(word),
        slug: existing?.slug ?? slug,
        id: existing?.id,
        isExisting: !!existing,
        confidence: 0.5,
      });
    }
    return suggestions;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BATCH AUTO-TAG
  // ═══════════════════════════════════════════════════════════════════════════

  async batchAutoTag(opts: {
    maxPosts?: number;
    minTagsRequired?: number;
    useLlm?: boolean;
  } = {}): Promise<BatchAutoTagResult> {
    const maxPosts = opts.maxPosts ?? 50;
    const minTagsRequired = opts.minTagsRequired ?? 1;

    const posts = await this.prisma.post.findMany({
      where: { status: 'PUBLISHED' },
      select: { id: true, title: true, _count: { select: { tags: true } } },
      orderBy: { createdAt: 'desc' },
      take: maxPosts * 2,
    });

    const underTagged = posts
      .filter((p: any) => p._count.tags < minTagsRequired)
      .slice(0, maxPosts);

    const result: BatchAutoTagResult = { processed: 0, tagged: 0, errors: 0, details: [] };

    for (const post of underTagged) {
      result.processed++;
      try {
        const tagResult = await this.smartAutoTag(post.id, {
          useLlm: opts.useLlm,
          syncRelation: true,
        });
        result.tagged++;
        result.details.push({
          postId: post.id,
          title: (post as any).title,
          tagsAdded: tagResult.tags.length,
          source: tagResult.source,
        });
      } catch {
        result.errors++;
      }
    }

    return result;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SYNONYM GENERATION
  // ═══════════════════════════════════════════════════════════════════════════

  async generateSynonyms(tagId: string): Promise<string[]> {
    const tag = await this.prisma.tag.findUnique({ where: { id: tagId } });
    if (!tag) throw new Error(`Tag ${tagId} not found`);

    if (!this.llm) {
      // Heuristic: plurals, singulars, dash/space variants
      const name = tag.name.toLowerCase();
      const heuristic: string[] = [];
      if (!name.endsWith('s')) heuristic.push(name + 's');
      if (name.endsWith('s') && name.length > 3) heuristic.push(name.slice(0, -1));
      if (name.includes(' ')) heuristic.push(name.replace(/\s+/g, '-'));
      if (name.includes('-')) heuristic.push(name.replace(/-/g, ' '));
      const newOnes = heuristic.filter((s) => !tag.synonyms.includes(s));
      if (newOnes.length > 0) {
        await this.prisma.tag.update({
          where: { id: tagId },
          data: { synonyms: [...tag.synonyms, ...newOnes] },
        });
      }
      return newOnes;
    }

    const prompt = `Generate 5-8 synonyms or alternative names for the blog tag "${tag.name}".
${tag.description ? `Tag description: ${tag.description}` : ''}
Include: common abbreviations, plural/singular forms, related terms, alternative phrasings.
Respond in JSON: {"synonyms": ["synonym1", "synonym2", ...]}`;

    const result = await this.llm.executeTask({
      taskType: 'synonym_generation',
      prompt,
      maxTokens: 200,
      temperature: 0.5,
    });

    const text = this.extractLlmText(result.result);
    try {
      const match = text.match(/\{[\s\S]*"synonyms"[\s\S]*\}/);
      if (!match) return [];
      const parsed = JSON.parse(match[0]) as { synonyms: string[] };
      const newSynonyms = parsed.synonyms
        .map((s) => String(s).toLowerCase().trim())
        .filter((s) => s && !tag.synonyms.includes(s) && s !== tag.name.toLowerCase());

      await this.prisma.tag.update({
        where: { id: tagId },
        data: { synonyms: [...tag.synonyms, ...newSynonyms] },
      });
      return newSynonyms;
    } catch {
      return [];
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INTERNAL
  // ═══════════════════════════════════════════════════════════════════════════

  /** Use LLM to extract tags with confidence scores */
  private async extractTagsViaLlm(
    text: string,
    maxTags: number,
  ): Promise<{ tags: string[]; confidence: number[] }> {
    if (!this.llm) throw new Error('LLM service not available');

    const existingTags = await this.prisma.tag.findMany({
      select: { name: true },
      take: 200,
      orderBy: { usageCount: 'desc' },
    });
    const tagNames = existingTags.map((t: any) => t.name);

    const prompt = `You are a content tagging AI. Analyze the following blog post and extract the most relevant tags.

EXISTING TAGS IN THE SYSTEM (prefer these when relevant):
${tagNames.slice(0, 100).join(', ')}

CONTENT TO TAG:
${text.substring(0, 2500)}

INSTRUCTIONS:
1. Extract ${maxTags} most relevant tags for this content
2. Prefer existing tags from the list above when they match
3. Create new tag names only when existing ones don't cover the topic
4. Tags should be 1-3 words, lowercase, specific but not too narrow
5. Include a mix of topic tags, technology tags, and category-level tags
6. Rate your confidence for each tag from 0.0 to 1.0

Respond in STRICT JSON format only:
{"tags": ["tag1", "tag2", ...], "confidence": [0.9, 0.8, ...]}`;

    const result = await this.llm.executeTask({
      taskType: 'tag_extraction',
      prompt,
      maxTokens: 500,
      temperature: 0.3,
    });

    const responseText = this.extractLlmText(result.result);
    const jsonMatch = responseText.match(/\{[\s\S]*"tags"[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in LLM response');

    const parsed = JSON.parse(jsonMatch[0]) as { tags: string[]; confidence: number[] };
    if (!Array.isArray(parsed.tags)) throw new Error('Invalid tags format');

    return {
      tags: parsed.tags.slice(0, maxTags).map((t) => String(t).toLowerCase().trim()),
      confidence: parsed.confidence?.slice(0, maxTags) ?? parsed.tags.map(() => 0.7),
    };
  }

  /** Resolve tag names → IDs, creating new tags as needed */
  private async resolveAndCreateTags(
    tagNames: string[],
    confidence: number[],
    minConfidence: number,
  ): Promise<string[]> {
    const tagIds: string[] = [];

    for (let i = 0; i < tagNames.length; i++) {
      if ((confidence[i] ?? 0) < minConfidence) continue;

      const name = tagNames[i];
      const slug = name.replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      if (!slug) continue;

      let tag = await this.prisma.tag.findFirst({
        where: {
          OR: [
            { slug },
            { name: { equals: name, mode: 'insensitive' } },
            { synonyms: { has: name.toLowerCase() } },
          ],
        },
      });

      if (tag) {
        await this.prisma.tag.update({
          where: { id: tag.id },
          data: {
            usageCount: { increment: 1 },
            synonymHits: (tag as any).synonyms?.includes(name.toLowerCase())
              ? { increment: 1 }
              : undefined,
          },
        });
      } else {
        tag = await this.prisma.tag.create({
          data: {
            slug,
            name: this.titleCase(name),
            description: 'AI-generated tag',
            usageCount: 1,
          },
        });
      }

      if (!tagIds.includes(tag.id)) tagIds.push(tag.id);
    }

    return tagIds;
  }

  /** Sync tag IDs with Post→Tag many-to-many (merges with existing) */
  async syncTagRelation(postId: string, newTagIds: string[]): Promise<void> {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { tags: { select: { id: true } } },
    });
    if (!post) return;

    const existingIds = new Set((post as any).tags.map((t: { id: string }) => t.id));
    const merged = new Set([...existingIds, ...newTagIds]);

    await this.prisma.post.update({
      where: { id: postId },
      data: { tags: { set: [...merged].map((id) => ({ id })) } },
    });
  }

  /** Extract text from LLM API response (OpenAI / Anthropic compatible) */
  private extractLlmText(result: Record<string, unknown>): string {
    const choices = result.choices as Array<{ message?: { content?: string }; text?: string }> | undefined;
    if (choices?.[0]?.message?.content) return choices[0].message.content;
    if (choices?.[0]?.text) return choices[0].text;
    const content = result.content as Array<{ text?: string }> | undefined;
    if (content?.[0]?.text) return content[0].text;
    return JSON.stringify(result);
  }

  private titleCase(s: string): string {
    return s.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }
}
