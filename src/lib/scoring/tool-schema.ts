import type { Anthropic } from "@anthropic-ai/sdk";
import { DIMENSION_KEYS, DIMENSION_LABELS, type KnockoutCriterion } from "@/types";

const dimensionProperty = {
  type: "object",
  properties: {
    reasoning: {
      type: "string",
      description:
        "2-4 sentences explaining the score. Reference concrete evidence from the CV and requirements from the job spec. Reason BEFORE committing to a number.",
    },
    score: {
      type: "integer",
      minimum: 0,
      maximum: 100,
      description: "0-100 score for this dimension",
    },
  },
  required: ["reasoning", "score"],
} as const;

const dimensionsSchema = {
  type: "object",
  properties: Object.fromEntries(
    DIMENSION_KEYS.map((k) => [k, { ...dimensionProperty, description: DIMENSION_LABELS[k] }]),
  ),
  required: [...DIMENSION_KEYS],
} as const;

const knockoutResultsSchema = {
  type: "array",
  items: {
    type: "object",
    properties: {
      criterionId: { type: "string" },
      met: { type: "boolean", description: "true if the candidate meets this criterion based on CV evidence" },
      reasoning: { type: "string", description: "1-2 sentences citing specific CV evidence for the pass/fail decision" },
    },
    required: ["criterionId", "met", "reasoning"],
  },
} as const;

export function buildScoringTool(knockoutCriteria: KnockoutCriterion[]): Anthropic.Tool {
  const hasKnockout = knockoutCriteria.length > 0;
  const extraProperties = hasKnockout
    ? {
        knockoutResults: { ...knockoutResultsSchema, description: "Evaluate every knockout criterion in the order provided." },
        hasHardReject: {
          type: "boolean",
          description: "true if ANY hard-reject criterion is not met. false otherwise.",
        },
      }
    : {};
  const extraRequired = hasKnockout ? ["knockoutResults", "hasHardReject"] : [];

  const base = SCORING_TOOL.input_schema as {
    type: "object";
    properties: Record<string, unknown>;
    required: string[];
  };
  return {
    ...SCORING_TOOL,
    input_schema: {
      type: "object" as const,
      properties: { ...base.properties, ...extraProperties },
      required: [...base.required, ...extraRequired],
    },
  };
}

export const SCORING_TOOL: Anthropic.Tool = {
  name: "record_cv_evaluation",
  description:
    "Record a complete, rubric-based evaluation of a single CV against a single job spec. Must be called exactly once.",
  input_schema: {
    type: "object",
    properties: {
      dimensions: dimensionsSchema,
      overallScore: {
        type: "integer",
        minimum: 0,
        maximum: 100,
        description:
          "Holistic overall score 0-100. This is NOT a mechanical average — it should reflect the weighted rubric but also capture whether the candidate would succeed in the role.",
      },
      verdict: {
        type: "string",
        enum: ["strong-match", "potential-match", "weak-match"],
        description:
          "strong-match ≈ overall ≥ 75; potential-match ≈ 50–74; weak-match ≈ < 50. Let the holistic assessment drive this, not just the number.",
      },
      confidence: {
        type: "string",
        enum: ["high", "medium", "low"],
        description:
          "How confident you are in the evaluation given CV length, specificity, and signal quality.",
      },
      strengths: {
        type: "array",
        items: { type: "string" },
        description:
          "3–6 concrete strengths that directly map to the job spec. Evidence-based, not generic (e.g. 'led migration of 40M-row Postgres DB to Aurora' not 'strong DB skills').",
      },
      gaps: {
        type: "array",
        items: { type: "string" },
        description:
          "Gaps relative to the job spec. Be specific — cite which requirement is missing or under-evidenced.",
      },
      transferableStrengths: {
        type: "array",
        items: { type: "string" },
        description:
          "Non-obvious value — skills or experiences that transfer to the role even if not a literal match. This is where a keyword filter would miss signal.",
      },
      interviewProbes: {
        type: "array",
        items: { type: "string" },
        description:
          "3–5 specific, pointed questions a recruiter should ask to verify ambiguous claims or explore gaps. Not generic behavioural questions.",
      },
      redFlags: {
        type: "array",
        items: { type: "string" },
        description:
          "Concerning signals: unexplained gaps, misrepresented claims, inconsistencies, overqualification risk. Empty array if none.",
      },
      summary: {
        type: "string",
        description:
          "2–3 sentence holistic recommendation a hiring manager can read in 10 seconds.",
      },
    },
    required: [
      "dimensions",
      "overallScore",
      "verdict",
      "confidence",
      "strengths",
      "gaps",
      "transferableStrengths",
      "interviewProbes",
      "redFlags",
      "summary",
    ],
  },
};
