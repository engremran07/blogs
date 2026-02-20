/**
 * ============================================================================
 * WORKFLOW:  Image Generation
 * STEPS:     extract → prompt → generate → store
 * PURPOSE:   Extract content context, build an image prompt, generate the
 *            image, and store it in the media library.
 * STATUS:    Scaffolded — each step returns stub data.
 * ============================================================================
 */
import "server-only";

import type { WorkflowStepMap } from "../../types";

export const steps: WorkflowStepMap = {
  extract: async (_job, _payload) => ({
    success: true,
    data: { step: "extract", status: "scaffolded" },
    nextStep: "prompt",
  }),

  prompt: async (_job, _payload) => ({
    success: true,
    data: { step: "prompt", status: "scaffolded" },
    nextStep: "generate",
  }),

  generate: async (_job, _payload) => ({
    success: true,
    data: { step: "generate", status: "scaffolded" },
    nextStep: "store",
  }),

  store: async (_job, _payload) => ({
    success: true,
    data: { step: "store", status: "scaffolded" },
    // No nextStep → final step
  }),
};
