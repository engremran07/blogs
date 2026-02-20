/**
 * ============================================================================
 * WORKFLOW:  SEO Planner
 * STEPS:     analyze → research → score → suggest
 * PURPOSE:   Analyze content SEO, research keywords, score improvements,
 *            and generate actionable suggestions.
 * STATUS:    Scaffolded — each step returns stub data.
 * ============================================================================
 */
import "server-only";

import type { WorkflowStepMap } from "../../types";

export const steps: WorkflowStepMap = {
  analyze: async (_job, _payload) => ({
    success: true,
    data: { step: "analyze", status: "scaffolded" },
    nextStep: "research",
  }),

  research: async (_job, _payload) => ({
    success: true,
    data: { step: "research", status: "scaffolded" },
    nextStep: "score",
  }),

  score: async (_job, _payload) => ({
    success: true,
    data: { step: "score", status: "scaffolded" },
    nextStep: "suggest",
  }),

  suggest: async (_job, _payload) => ({
    success: true,
    data: { step: "suggest", status: "scaffolded" },
    // No nextStep → final step
  }),
};
