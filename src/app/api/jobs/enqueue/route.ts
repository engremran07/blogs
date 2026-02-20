/**
 * ============================================================================
 * API ROUTE:  POST /api/jobs/enqueue
 * PURPOSE:    Enqueue a new background job (admin only).
 * ============================================================================
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/api-auth";
import { enqueueJob } from "@/features/jobs/server/queue";
import { EnqueueBodySchema } from "@/features/jobs/server/definitions";
import { createLogger } from "@/server/observability/logger";
import type { JobType } from "@/features/jobs/types";

const logger = createLogger("api:jobs:enqueue");

export async function POST(request: NextRequest) {
  // 1. Auth — require admin capability
  const { errorResponse } = await requireAuth({ level: "admin" });
  if (errorResponse) return errorResponse;

  // 2. Parse & validate body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const parsed = EnqueueBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: "Validation failed",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const { type, payload, priority } = parsed.data;

  // 3. Enqueue
  try {
    const job = await enqueueJob(type as JobType, payload, { priority });

    logger.info(`Job enqueued: ${job.id} (${type})`, { jobId: job.id, type });

    return NextResponse.json(
      {
        success: true,
        job: { id: job.id, type: job.type, step: job.step, status: job.status },
      },
      { status: 201 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    // Duplicate detection returns a user-friendly 409
    if (message.includes("Duplicate job detected")) {
      return NextResponse.json(
        { success: false, error: message },
        { status: 409 },
      );
    }

    logger.error("Failed to enqueue job", { error: message });
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
