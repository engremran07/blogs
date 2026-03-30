/**
 * ============================================================================
 * WORKFLOW:  SEO Planner
 * STEPS:     analyze → research → score → suggest
 * PURPOSE:   Analyze content SEO, research keywords, score improvements,
 *            and generate actionable suggestions.
 * ============================================================================
 */
import "server-only";

import type { WorkflowStepMap } from "../../types";
import { prisma } from "@/server/db/prisma";
import { auditContent } from "@/features/seo/server/seo-audit.util";
import type { AuditableContent } from "@/features/seo/types";

export const steps: WorkflowStepMap = {
  /**
   * Step 1: Run the 22-check SEO audit on the target post.
   */
  analyze: async (_job, payload) => {
    const { postId } = payload as { postId: string };

    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        categories: { select: { name: true, slug: true } },
        tags: { select: { name: true, slug: true } },
        author: { select: { displayName: true, username: true } },
      },
    });

    if (!post) {
      return { success: false, error: `Post ${postId} not found` };
    }

    const auditable: AuditableContent = {
      id: post.id,
      title: post.title,
      slug: post.slug,
      content: post.content,
      seoTitle: post.seoTitle,
      seoDescription: post.seoDescription,
      seoKeywords: post.seoKeywords || [],
      excerpt: post.excerpt,
      featuredImage: post.featuredImage,
      ogTitle: post.ogTitle,
      ogDescription: post.ogDescription,
      ogImage: post.ogImage,
      canonicalUrl: post.canonicalUrl,
      wordCount: post.wordCount,
      readingTime: post.readingTime,
      categories: post.categories,
      tags: post.tags,
      publishedAt: post.publishedAt,
      updatedAt: post.updatedAt,
      author: post.author
        ? { name: post.author.displayName || post.author.username }
        : null,
      status: post.status,
    };

    const auditResult = auditContent(auditable, "POST");

    return {
      success: true,
      data: {
        step: "analyze",
        postId,
        score: auditResult.overallScore,
        totalChecks: auditResult.checks.length,
        passed: auditResult.checks.filter((c) => c.status === "pass").length,
        failed: auditResult.checks.filter((c) => c.status !== "pass").length,
        checks: auditResult.checks.map((c) => ({
          name: c.name,
          passed: c.status === "pass",
          severity: c.severity,
          message: c.message,
        })),
      },
      nextStep: "research",
    };
  },

  /**
   * Step 2: Research keyword data from the SeoKeyword table.
   */
  research: async (_job, payload) => {
    const { postId, targetKeywords } = payload as {
      postId: string;
      targetKeywords?: string[];
    };

    // Get the post's focus keyword and tags for keyword research
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: {
        seoKeywords: true,
        tags: { select: { name: true, slug: true } },
      },
    });

    const keywordsToResearch = [
      ...(targetKeywords || []),
      ...(post?.seoKeywords || []),
      ...(post?.tags.map((t: { name: string }) => t.name) || []),
    ].filter(Boolean);

    // Query keyword data from the SeoKeyword table
    const keywordData =
      keywordsToResearch.length > 0
        ? await prisma.seoKeyword.findMany({
            where: {
              OR: keywordsToResearch.map((kw) => ({
                term: { contains: kw, mode: "insensitive" as const },
              })),
            },
            select: {
              term: true,
              slug: true,
              intent: true,
              volume: true,
              competition: true,
              cpc: true,
              source: true,
            },
            take: 50,
          })
        : [];

    return {
      success: true,
      data: {
        step: "research",
        postId,
        queriedKeywords: keywordsToResearch,
        matchedKeywords: keywordData.length,
        keywords: keywordData.map((kw) => ({
          term: kw.term,
          intent: kw.intent,
          volume: kw.volume,
          competition: kw.competition,
        })),
      },
      nextStep: "score",
    };
  },

  /**
   * Step 3: Score the improvement opportunity based on audit gaps vs current state.
   */
  score: async (job, _payload) => {
    const result = (job.result ?? {}) as Record<string, unknown>;
    const analyzeData = result.analyze as Record<string, unknown> | undefined;
    const researchData = result.research as Record<string, unknown> | undefined;

    const auditScore = (analyzeData?.score as number) || 0;
    const totalChecks = (analyzeData?.totalChecks as number) || 1;
    const failedChecks = (analyzeData?.failed as number) || 0;
    const matchedKeywords = (researchData?.matchedKeywords as number) || 0;

    // Calculate improvement potential: higher when more checks fail
    const improvementPotential = Math.round((failedChecks / totalChecks) * 100);
    // Keyword coverage bonus
    const keywordBonus = Math.min(matchedKeywords * 5, 20);
    // Priority: low score + high improvement potential = high priority
    const priority =
      auditScore < 50 ? "HIGH" : auditScore < 75 ? "MEDIUM" : "LOW";

    return {
      success: true,
      data: {
        step: "score",
        currentScore: auditScore,
        improvementPotential,
        keywordCoverage: keywordBonus,
        priority,
        estimatedNewScore: Math.min(
          100,
          auditScore + improvementPotential * 0.6,
        ),
      },
      nextStep: "suggest",
    };
  },

  /**
   * Step 4: Generate SeoSuggestion records based on failed audit checks.
   */
  suggest: async (job, payload) => {
    const { postId } = payload as { postId: string };
    const result = (job.result ?? {}) as Record<string, unknown>;
    const analyzeData = result.analyze as Record<string, unknown> | undefined;
    const checks =
      (analyzeData?.checks as Array<{
        name: string;
        passed: boolean;
        severity: string;
        message: string;
      }>) || [];

    const failedChecks = checks.filter((c) => !c.passed);

    // Map severity to SeoSuggestion categories
    const severityToCategory = (severity: string) => {
      switch (severity) {
        case "critical":
          return "TECHNICAL";
        case "warning":
          return "CONTENT";
        default:
          return "META";
      }
    };

    // Create suggestions for each failed check
    const created = await Promise.all(
      failedChecks.slice(0, 20).map((check) =>
        prisma.seoSuggestion.create({
          data: {
            targetType: "POST",
            targetId: postId,
            category: severityToCategory(check.severity),
            title: `Fix: ${check.name}`,
            description: check.message,
            severity:
              check.severity === "critical"
                ? "HIGH"
                : check.severity === "warning"
                  ? "MEDIUM"
                  : "LOW",
            status: "NEW",
            source: "AUDIT",
            autoApply: false,
          },
        }),
      ),
    );

    return {
      success: true,
      data: {
        step: "suggest",
        postId,
        suggestionsCreated: created.length,
        suggestions: created.map((s) => ({
          id: s.id,
          title: s.title,
          severity: s.severity,
          category: s.category,
        })),
      },
    };
  },
};
