/**
 * ============================================================================
 * MODULE:   features/jobs/types.ts
 * PURPOSE:  Shared type definitions for the Job Runner system.
 * ============================================================================
 */
import type { Job } from "@prisma/client";

// ─── Job Type Enum ──────────────────────────────────────────────────────────

/** Supported workflow types — must match the `type` column stored in the DB. */
export const JobType = {
  SEO_PLANNER: "SEO_PLANNER",
  IMAGE_GEN: "IMAGE_GEN",
  DISTRIBUTION: "DISTRIBUTION",
  BLOG_AUTOPUBLISH: "BLOG_AUTOPUBLISH",
} as const;

export type JobType = (typeof JobType)[keyof typeof JobType];

// ─── Job Status Enum ────────────────────────────────────────────────────────

/**
 * Mirrors the Prisma `JobStatus` enum exactly:
 *   PENDING → waiting to be picked up
 *   RUNNING → currently executing a step
 *   DONE    → all steps completed successfully
 *   FAILED  → exceeded max attempts or permanently errored
 */
export const JobStatus = {
  PENDING: "PENDING",
  RUNNING: "RUNNING",
  DONE: "DONE",
  FAILED: "FAILED",
} as const;

export type JobStatus = (typeof JobStatus)[keyof typeof JobStatus];

// ─── Step Result ────────────────────────────────────────────────────────────

/** Value returned by every workflow step handler. */
export interface StepResult {
  /** Whether the step succeeded. */
  success: boolean;
  /** Arbitrary step-specific output data. */
  data?: Record<string, unknown>;
  /** Human-readable error message (populated on failure). */
  error?: string;
  /** Name of the next step to execute, or `undefined` if this is the final step. */
  nextStep?: string;
}

// ─── Workflow Handler ───────────────────────────────────────────────────────

/**
 * A single step function inside a workflow.
 * Receives the full Job row plus the parsed payload.
 */
export type WorkflowHandler = (
  job: Job,
  payload: Record<string, unknown>,
) => Promise<StepResult>;

// ─── Workflow Step Map ──────────────────────────────────────────────────────

/** Maps step names to their handler functions for a single workflow. */
export type WorkflowStepMap = Record<string, WorkflowHandler>;

// ─── Batch Result ───────────────────────────────────────────────────────────

/** Summary returned by `processJobBatch`. */
export interface BatchResult {
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
  details: Array<{
    jobId: string;
    type: string;
    step: string;
    status: "ok" | "failed" | "skipped";
    error?: string;
  }>;
}
