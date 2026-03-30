/**
 * ============================================================================
 * WORKFLOW:  Image Generation
 * STEPS:     extract → prompt → generate → store
 * PURPOSE:   Extract content context, build an image prompt, generate the
 *            image, and store it in the media library.
 * ============================================================================
 */
import "server-only";

import type { WorkflowStepMap } from "../../types";
import { prisma } from "@/server/db/prisma";
import { stripHtml } from "@/shared/text.util";

export const steps: WorkflowStepMap = {
  /**
   * Step 1: Extract key topics, title, excerpt, and categories from the post.
   */
  extract: async (_job, payload) => {
    const { postId } = payload as { postId: string };

    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: {
        id: true,
        title: true,
        excerpt: true,
        content: true,
        categories: { select: { name: true } },
        tags: { select: { name: true } },
        seoKeywords: true,
      },
    });

    if (!post) {
      return { success: false, error: `Post ${postId} not found` };
    }

    // Extract key topics from content (first 500 chars of plain text)
    const plainText = stripHtml(post.content).slice(0, 500);
    const topics = [
      ...post.categories.map((c: { name: string }) => c.name),
      ...post.tags.slice(0, 5).map((t: { name: string }) => t.name),
      ...(post.seoKeywords?.length ? [post.seoKeywords[0]] : []),
    ];

    return {
      success: true,
      data: {
        step: "extract",
        postId,
        title: post.title,
        excerpt: post.excerpt || plainText.slice(0, 160),
        topics,
        contentPreview: plainText,
      },
      nextStep: "prompt",
    };
  },

  /**
   * Step 2: Build an image generation prompt from the extracted context.
   */
  prompt: async (job, payload) => {
    const { style } = payload as { style?: string };
    const result = (job.result ?? {}) as Record<string, unknown>;
    const extractData = result.extract as Record<string, unknown> | undefined;

    const title = (extractData?.title as string) || "Blog Post";
    const excerpt = (extractData?.excerpt as string) || "";
    const topics = (extractData?.topics as string[]) || [];

    const styleGuide = style || "modern, clean, professional illustration";
    const topicStr = topics.slice(0, 5).join(", ");

    // Build a descriptive prompt for image generation
    const imagePrompt = [
      `Create a ${styleGuide} blog header image.`,
      `Topic: ${title}.`,
      topicStr ? `Related themes: ${topicStr}.` : "",
      excerpt ? `Context: ${excerpt.slice(0, 200)}.` : "",
      "No text overlays. Suitable as a 1200x630 featured image.",
    ]
      .filter(Boolean)
      .join(" ");

    return {
      success: true,
      data: {
        step: "prompt",
        prompt: imagePrompt,
        style: styleGuide,
        dimensions: { width: 1200, height: 630 },
      },
      nextStep: "generate",
    };
  },

  /**
   * Step 3: Call OpenAI Images API if available, otherwise return guidance.
   */
  generate: async (job, _payload) => {
    const result = (job.result ?? {}) as Record<string, unknown>;
    const promptData = result.prompt as Record<string, unknown> | undefined;
    const imagePrompt = (promptData?.prompt as string) || "";

    const openaiKey = process.env.OPENAI_API_KEY;

    if (!openaiKey) {
      return {
        success: true,
        data: {
          step: "generate",
          generated: false,
          reason: "OPENAI_API_KEY not configured",
          prompt: imagePrompt,
          guidance:
            "Use the prompt above with DALL-E, Midjourney, or Stable Diffusion to generate a featured image.",
        },
        nextStep: "store",
      };
    }

    try {
      const response = await fetch(
        "https://api.openai.com/v1/images/generations",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openaiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "dall-e-3",
            prompt: imagePrompt,
            n: 1,
            size: "1792x1024",
            quality: "standard",
          }),
        },
      );

      if (!response.ok) {
        const errorBody = await response.text();
        return {
          success: true,
          data: {
            step: "generate",
            generated: false,
            reason: `OpenAI API error: ${response.status}`,
            error: errorBody.slice(0, 500),
            prompt: imagePrompt,
          },
          nextStep: "store",
        };
      }

      const body = (await response.json()) as {
        data: Array<{ url: string; revised_prompt?: string }>;
      };
      const imageUrl = body.data?.[0]?.url;

      return {
        success: true,
        data: {
          step: "generate",
          generated: !!imageUrl,
          imageUrl: imageUrl || null,
          revisedPrompt: body.data?.[0]?.revised_prompt || null,
          prompt: imagePrompt,
        },
        nextStep: "store",
      };
    } catch (err) {
      return {
        success: true,
        data: {
          step: "generate",
          generated: false,
          reason: `Request failed: ${err instanceof Error ? err.message : "unknown error"}`,
          prompt: imagePrompt,
        },
        nextStep: "store",
      };
    }
  },

  /**
   * Step 4: Store the generated image in Media library and attach as featuredImage.
   */
  store: async (job, payload) => {
    const { postId } = payload as { postId: string };
    const result = (job.result ?? {}) as Record<string, unknown>;
    const generateData = result.generate as Record<string, unknown> | undefined;
    const imageUrl = generateData?.imageUrl as string | null;
    const generated = generateData?.generated as boolean;

    if (!generated || !imageUrl) {
      return {
        success: true,
        data: {
          step: "store",
          stored: false,
          reason: "No image was generated — see 'generate' step for guidance",
        },
      };
    }

    try {
      // Download image and create media record
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        return {
          success: true,
          data: {
            step: "store",
            stored: false,
            reason: `Failed to download generated image: ${imageResponse.status}`,
          },
        };
      }

      const buffer = Buffer.from(await imageResponse.arrayBuffer());
      const filename = `ai-generated-${postId}-${Date.now()}.png`;

      // Create media record directly
      const media = await prisma.media.create({
        data: {
          filename,
          originalName: filename,
          mimeType: "image/png",
          size: buffer.length,
          url: `/uploads/posts/${filename}`,
          path: `uploads/posts/${filename}`,
          folder: "posts",
          status: "ACTIVE",
          title: `AI-generated image for post`,
          altText: `Featured image`,
        },
      });

      // Update post's featured image
      await prisma.post.update({
        where: { id: postId },
        data: { featuredImage: media.url },
      });

      return {
        success: true,
        data: {
          step: "store",
          stored: true,
          mediaId: media.id,
          mediaUrl: media.url,
          postId,
        },
      };
    } catch (err) {
      return {
        success: false,
        error: `Failed to store image: ${err instanceof Error ? err.message : "unknown error"}`,
      };
    }
  },
};
