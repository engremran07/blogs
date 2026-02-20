/**
 * ============================================================================
 * WORKFLOW:  Distribution
 * STEPS:     select-targets → format → distribute → verify
 * PURPOSE:   Select distribution channels, format content for each,
 *            distribute, and verify delivery.
 * STATUS:    Scaffolded — each step returns stub data.
 * ============================================================================
 */
import "server-only";

import type { WorkflowStepMap } from "../../types";

export const steps: WorkflowStepMap = {
  "select-targets": async (_job, _payload) => ({
    success: true,
    data: { step: "select-targets", status: "scaffolded" },
    nextStep: "format",
  }),

  format: async (_job, _payload) => ({
    success: true,
    data: { step: "format", status: "scaffolded" },
    nextStep: "distribute",
  }),

  distribute: async (_job, _payload) => ({
    success: true,
    data: { step: "distribute", status: "scaffolded" },
    nextStep: "verify",
  }),

  verify: async (_job, _payload) => ({
    success: true,
    data: { step: "verify", status: "scaffolded" },
    // No nextStep → final step
  }),
};
