/**
 * ============================================================================
 * MODULE:   features/jobs/server/dispatcher.ts
 * PURPOSE:  Maps job type + current step → workflow handler function.
 * ============================================================================
 */
import "server-only";

import type { Job } from "@prisma/client";
import type { StepResult, WorkflowStepMap } from "../types";
import { JobType } from "../types";

// ─── Workflow imports ───────────────────────────────────────────────────────
import { steps as seoPlannerSteps } from "./workflows/seo-planner.workflow";
import { steps as imageGenSteps } from "./workflows/image-gen.workflow";
import { steps as distributionSteps } from "./workflows/distribution.workflow";
import { steps as blogAutopublishSteps } from "./workflows/blog-autopublish.workflow";

// ─── Registry ───────────────────────────────────────────────────────────────

const WORKFLOW_REGISTRY: Record<string, WorkflowStepMap> = {
  [JobType.SEO_PLANNER]: seoPlannerSteps,
  [JobType.IMAGE_GEN]: imageGenSteps,
  [JobType.DISTRIBUTION]: distributionSteps,
  [JobType.BLOG_AUTOPUBLISH]: blogAutopublishSteps,
};

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Look up and execute the handler for `job.type` + `job.step`.
 *
 * @throws if the job type or step has no registered handler.
 */
export async function dispatchStep(job: Job): Promise<StepResult> {
  const workflow = WORKFLOW_REGISTRY[job.type];
  if (!workflow) {
    throw new Error(`No workflow registered for job type: ${job.type}`);
  }

  const handler = workflow[job.step];
  if (!handler) {
    throw new Error(
      `No handler for step "${job.step}" in workflow "${job.type}"`,
    );
  }

  const payload = (job.payload ?? {}) as Record<string, unknown>;
  return handler(job, payload);
}
