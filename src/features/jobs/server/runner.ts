/**
 * ============================================================================
 * MODULE:   features/jobs/server/runner.ts
 * PURPOSE:  Core job processing engine — picks up pending jobs, acquires a
 *           Redis lock, executes the current step via the dispatcher, and
 *           advances or fails the job accordingly.
 * ============================================================================
 */
import "server-only";

import { prisma } from "@/server/db/prisma";
import { Prisma } from "@prisma/client";
import { redis } from "@/server/cache/redis";
import { createLogger } from "@/server/observability/logger";
import { JobStatus } from "../types";
import type { BatchResult, StepResult } from "../types";
import { JOB_MAX_ATTEMPTS, JOB_STEP_TIMEOUT, JOB_STEPS } from "./definitions";
import { dispatchStep } from "./dispatcher";
import type { Job } from "@prisma/client";

const logger = createLogger("job-runner");

// ─── Lock helpers ───────────────────────────────────────────────────────────

const LOCK_TTL_SECONDS = 30;

function lockKey(jobId: string): string {
  return `jobs:lock:${jobId}`;
}

async function acquireJobLock(jobId: string): Promise<boolean> {
  // SET NX with TTL — returns "OK" on success, null if key already exists.
  const result = await redis.set(lockKey(jobId), "1", {
    nx: true,
    ex: LOCK_TTL_SECONDS,
  });
  return result === "OK";
}

async function releaseJobLock(jobId: string): Promise<void> {
  await redis.del(lockKey(jobId));
}

// ─── Step timeout wrapper ───────────────────────────────────────────────────

async function runWithTimeout(
  fn: () => Promise<StepResult>,
  timeoutMs: number,
): Promise<StepResult> {
  return Promise.race([
    fn(),
    new Promise<StepResult>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Step timed out after ${timeoutMs}ms`)),
        timeoutMs,
      ),
    ),
  ]);
}

// ─── Advance / fail helpers ─────────────────────────────────────────────────

function getNextStep(jobType: string, currentStep: string): string | null {
  const steps = JOB_STEPS[jobType as keyof typeof JOB_STEPS];
  if (!steps) return null;
  const idx = steps.indexOf(currentStep);
  if (idx === -1 || idx >= steps.length - 1) return null;
  return steps[idx + 1];
}

function isFinalStep(jobType: string, currentStep: string): boolean {
  const steps = JOB_STEPS[jobType as keyof typeof JOB_STEPS];
  if (!steps) return true;
  return steps.indexOf(currentStep) === steps.length - 1;
}

// ─── processNextJob ─────────────────────────────────────────────────────────

interface ProcessResult {
  jobId: string;
  type: string;
  step: string;
  status: "ok" | "failed" | "skipped";
  error?: string;
}

/**
 * Find the oldest actionable job, lock it, execute its current step, and
 * advance / fail accordingly.
 *
 * Returns `null` when there are no jobs to process.
 */
export async function processNextJob(): Promise<ProcessResult | null> {
  // 1. Find oldest actionable job
  const job: Job | null = await prisma.job.findFirst({
    where: {
      status: { in: [JobStatus.PENDING, JobStatus.RUNNING] },
    },
    orderBy: { createdAt: "asc" },
  });

  if (!job) return null;

  // 2. Acquire Redis lock
  const locked = await acquireJobLock(job.id);
  if (!locked) {
    logger.info(`Job ${job.id} already locked — skipping`);
    return { jobId: job.id, type: job.type, step: job.step, status: "skipped" };
  }

  try {
    // 3. Mark as RUNNING
    await prisma.job.update({
      where: { id: job.id },
      data: { status: JobStatus.RUNNING },
    });

    // 4. Execute step via dispatcher
    let stepResult: StepResult;
    try {
      stepResult = await runWithTimeout(
        () => dispatchStep(job),
        JOB_STEP_TIMEOUT,
      );
    } catch (err) {
      // Step threw / timed out — treat as failure
      const errorMessage = err instanceof Error ? err.message : String(err);
      stepResult = { success: false, error: errorMessage };
    }

    // 5. Handle result
    if (stepResult.success) {
      // Merge step data into cumulative result
      const existingResult = (job.result ?? {}) as Record<string, unknown>;
      const mergedResult: Record<string, unknown> = {
        ...existingResult,
        [job.step]: stepResult.data ?? { status: "ok" },
      };
      const mergedResultJson = mergedResult as unknown as Prisma.InputJsonValue;

      // Determine next step
      const nextStep = stepResult.nextStep ?? getNextStep(job.type, job.step);
      const final = !nextStep || isFinalStep(job.type, job.step);

      if (final && !nextStep) {
        // All steps done
        await prisma.job.update({
          where: { id: job.id },
          data: {
            status: JobStatus.DONE,
            result: mergedResultJson,
            error: null,
          },
        });
        logger.info(`Job ${job.id} completed all steps`);
      } else {
        // Advance to next step
        await prisma.job.update({
          where: { id: job.id },
          data: {
            step: nextStep ?? job.step,
            status: JobStatus.RUNNING,
            result: mergedResultJson,
            error: null,
          },
        });
        logger.info(`Job ${job.id} advanced to step: ${nextStep}`);
      }

      return { jobId: job.id, type: job.type, step: job.step, status: "ok" };
    } else {
      // Failure path
      const newAttempts = job.attempts + 1;
      const maxReached = newAttempts >= JOB_MAX_ATTEMPTS;

      await prisma.job.update({
        where: { id: job.id },
        data: {
          attempts: newAttempts,
          status: maxReached ? JobStatus.FAILED : JobStatus.PENDING,
          error: stepResult.error ?? "Unknown error",
        },
      });

      if (maxReached) {
        logger.error(
          `Job ${job.id} permanently failed after ${newAttempts} attempts: ${stepResult.error}`,
        );
      } else {
        logger.warn(
          `Job ${job.id} step "${job.step}" failed (attempt ${newAttempts}/${JOB_MAX_ATTEMPTS}): ${stepResult.error}`,
        );
      }

      return {
        jobId: job.id,
        type: job.type,
        step: job.step,
        status: "failed",
        error: stepResult.error,
      };
    }
  } catch (err) {
    // Unexpected error — mark failure
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error(`Unexpected error processing job ${job.id}: ${errorMessage}`);

    const newAttempts = job.attempts + 1;
    try {
      await prisma.job.update({
        where: { id: job.id },
        data: {
          attempts: newAttempts,
          status:
            newAttempts >= JOB_MAX_ATTEMPTS
              ? JobStatus.FAILED
              : JobStatus.PENDING,
          error: errorMessage,
        },
      });
    } catch {
      // Best effort — DB might be unreachable
    }

    return {
      jobId: job.id,
      type: job.type,
      step: job.step,
      status: "failed",
      error: errorMessage,
    };
  } finally {
    await releaseJobLock(job.id);
  }
}

// ─── processJobBatch ────────────────────────────────────────────────────────

/**
 * Process up to `limit` jobs sequentially.
 * Returns a summary of all operations.
 */
export async function processJobBatch(limit: number = 5): Promise<BatchResult> {
  const result: BatchResult = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    skipped: 0,
    details: [],
  };

  for (let i = 0; i < limit; i++) {
    const res = await processNextJob();
    if (!res) break; // No more jobs

    result.processed++;
    result.details.push(res);

    switch (res.status) {
      case "ok":
        result.succeeded++;
        break;
      case "failed":
        result.failed++;
        break;
      case "skipped":
        result.skipped++;
        break;
    }
  }

  return result;
}
