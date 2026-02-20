/**
 * ============================================================================
 * MODULE:   features/jobs/server/queue.ts
 * PURPOSE:  Enqueue new jobs into the Prisma Job table.
 * ============================================================================
 */
import "server-only";

import { prisma } from "@/server/db/prisma";
import { Prisma } from "@prisma/client";
import { JobType, JobStatus } from "../types";
import { JOB_STEPS, JOB_PAYLOAD_SCHEMAS } from "./definitions";
import { checkIdempotency, setIdempotency } from "./idempotency";
import type { Job } from "@prisma/client";

// ─── Options ────────────────────────────────────────────────────────────────

interface EnqueueOptions {
  /** Reserved for future priority-queue support (currently stored but unused). */
  priority?: number;
  /** Idempotency TTL in seconds (default 300 = 5 min). */
  deduplicationTtl?: number;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Deterministic hash of a payload for deduplication. */
function hashPayload(payload: unknown): string {
  const str = JSON.stringify(
    payload,
    Object.keys(payload as Record<string, unknown>).sort(),
  );
  // Simple djb2-style hash — no crypto needed for dedup keys.
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36);
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Insert a new job with status `PENDING`.
 *
 * - Validates the payload against the Zod schema for the given type.
 * - Checks Redis idempotency key to prevent duplicates.
 * - Sets the initial step to the first step defined for the workflow.
 */
export async function enqueueJob(
  type: JobType,
  payload: unknown,
  options?: EnqueueOptions,
): Promise<Job> {
  // 1. Validate type
  const steps = JOB_STEPS[type];
  if (!steps || steps.length === 0) {
    throw new Error(`Unknown or misconfigured job type: ${type}`);
  }

  // 2. Validate payload
  const schema = JOB_PAYLOAD_SCHEMAS[type];
  const parsed = schema.parse(payload);

  // 3. Idempotency check
  const payloadHash = hashPayload(parsed);
  const isDuplicate = await checkIdempotency(type, payloadHash);
  if (isDuplicate) {
    throw new Error(
      `Duplicate job detected for type=${type} (hash=${payloadHash})`,
    );
  }

  // 4. Insert into DB
  const job = await prisma.job.create({
    data: {
      type,
      step: steps[0],
      status: JobStatus.PENDING,
      payload: parsed as unknown as Prisma.InputJsonValue,
      attempts: 0,
    },
  });

  // 5. Set idempotency key so the same request isn't enqueued again
  const ttl = options?.deduplicationTtl ?? 300;
  await setIdempotency(type, payloadHash, ttl);

  return job;
}
