/**
 * ============================================================================
 * WORKFLOW:  Blog Auto-Publish
 * STEPS:     select → validate → publish → notify
 * PURPOSE:   Select draft posts matching criteria, validate readiness,
 *            publish them, and send notifications.
 * STATUS:    Scaffolded — each step returns stub data.
 * ============================================================================
 */
import "server-only";

import type { WorkflowStepMap } from "../../types";

export const steps: WorkflowStepMap = {
  select: async (_job, _payload) => ({
    success: true,
    data: { step: "select", status: "scaffolded" },
    nextStep: "validate",
  }),

  validate: async (_job, _payload) => ({
    success: true,
    data: { step: "validate", status: "scaffolded" },
    nextStep: "publish",
  }),

  publish: async (_job, _payload) => ({
    success: true,
    data: { step: "publish", status: "scaffolded" },
    nextStep: "notify",
  }),

  notify: async (_job, _payload) => ({
    success: true,
    data: { step: "notify", status: "scaffolded" },
    // No nextStep → final step
  }),
};
