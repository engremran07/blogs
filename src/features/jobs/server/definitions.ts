/**
 * ============================================================================
 * MODULE:   features/jobs/server/definitions.ts
 * PURPOSE:  Job type payload schemas, step definitions, and constants.
 * ============================================================================
 */
import "server-only";

import { z } from "zod";
import { JobType } from "../types";

// ─── Constants ──────────────────────────────────────────────────────────────

/** Maximum number of attempts before a job is marked FAILED. */
export const JOB_MAX_ATTEMPTS = 3;

/** Per-step execution timeout in milliseconds (10 s). */
export const JOB_STEP_TIMEOUT = 10_000;

// ─── Payload Schemas ────────────────────────────────────────────────────────

export const SeoPlannerPayloadSchema = z.object({
  postId: z.string().min(1, "postId is required"),
  url: z.string().url().optional(),
  targetKeywords: z.array(z.string()).optional(),
});

export const ImageGenPayloadSchema = z.object({
  postId: z.string().min(1, "postId is required"),
  style: z.string().optional(),
  dimensions: z
    .object({
      width: z.number().int().positive(),
      height: z.number().int().positive(),
    })
    .optional(),
});

export const DistributionPayloadSchema = z.object({
  postId: z.string().min(1, "postId is required"),
  channels: z.array(z.string()).optional(),
});

export const BlogAutopublishPayloadSchema = z.object({
  criteria: z
    .object({
      status: z.string().optional(),
      tag: z.string().optional(),
    })
    .optional(),
  dryRun: z.boolean().optional(),
});

/** Unified discriminated map: job type → payload schema. */
export const JOB_PAYLOAD_SCHEMAS: Record<JobType, z.ZodType> = {
  [JobType.SEO_PLANNER]: SeoPlannerPayloadSchema,
  [JobType.IMAGE_GEN]: ImageGenPayloadSchema,
  [JobType.DISTRIBUTION]: DistributionPayloadSchema,
  [JobType.BLOG_AUTOPUBLISH]: BlogAutopublishPayloadSchema,
};

// ─── Step Definitions ───────────────────────────────────────────────────────

/**
 * Ordered list of step names for each job type.
 * The first element is the initial step; the runner advances through them
 * sequentially until the final step completes.
 */
export const JOB_STEPS: Record<JobType, readonly string[]> = {
  [JobType.SEO_PLANNER]: ["analyze", "research", "score", "suggest"],
  [JobType.IMAGE_GEN]: ["extract", "prompt", "generate", "store"],
  [JobType.DISTRIBUTION]: ["select-targets", "format", "distribute", "verify"],
  [JobType.BLOG_AUTOPUBLISH]: ["select", "validate", "publish", "notify"],
} as const;

// ─── Enqueue Body Schema (for the API route) ───────────────────────────────

export const EnqueueBodySchema = z.object({
  type: z.enum([
    JobType.SEO_PLANNER,
    JobType.IMAGE_GEN,
    JobType.DISTRIBUTION,
    JobType.BLOG_AUTOPUBLISH,
  ]),
  payload: z.record(z.string(), z.unknown()),
  priority: z.number().int().min(0).max(100).optional(),
});
