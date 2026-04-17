export const DIMENSION_KEYS = [
  "skillsAlignment",
  "experienceDepth",
  "domainFit",
  "responsibilitiesMatch",
  "trajectoryAndGrowth",
  "credentials",
] as const;

export type DimensionKey = (typeof DIMENSION_KEYS)[number];

export const DIMENSION_LABELS: Record<DimensionKey, string> = {
  skillsAlignment: "Skills alignment",
  experienceDepth: "Experience depth",
  domainFit: "Domain fit",
  responsibilitiesMatch: "Responsibilities match",
  trajectoryAndGrowth: "Trajectory & growth",
  credentials: "Credentials",
};

export type DimensionWeights = Record<DimensionKey, number>;

export const DEFAULT_WEIGHTS: DimensionWeights = {
  skillsAlignment: 25,
  experienceDepth: 20,
  domainFit: 15,
  responsibilitiesMatch: 20,
  trajectoryAndGrowth: 10,
  credentials: 10,
};

export type Verdict = "strong-match" | "potential-match" | "weak-match";
export type Confidence = "high" | "medium" | "low";

export type CriterionType = "must-have" | "nice-to-have" | "hard-reject";
export interface KnockoutCriterion {
  id: string;
  text: string;
  type: CriterionType;
}
export interface KnockoutResult {
  criterionId: string;
  met: boolean;
  reasoning: string;
}

export interface DimensionResult {
  score: number;
  reasoning: string;
}

export interface ScoreResult {
  overallScore: number;
  verdict: Verdict;
  confidence: Confidence;
  dimensions: Record<DimensionKey, DimensionResult>;
  strengths: string[];
  gaps: string[];
  transferableStrengths: string[];
  interviewProbes: string[];
  redFlags: string[];
  summary: string;
  knockoutResults?: KnockoutResult[];
  hasHardReject?: boolean;
}

export interface JobSpec {
  id: string;
  user_id: string;
  title: string;
  company: string | null;
  description: string;
  requirements: unknown;
  weights: DimensionWeights | null;
  blind_mode: boolean;
  knockout_criteria: KnockoutCriterion[];
  created_at: string;
  updated_at: string;
}

export interface Cv {
  id: string;
  user_id: string;
  job_spec_id: string;
  candidate_name: string | null;
  file_path: string | null;
  file_name: string | null;
  parsed_text: string;
  status: "pending" | "scoring" | "scored" | "failed";
  error: string | null;
  created_at: string;
}

export interface Score {
  id: string;
  cv_id: string;
  user_id: string;
  job_spec_id: string;
  overall_score: number;
  verdict: Verdict;
  confidence: Confidence;
  result: ScoreResult;
  model: string;
  knockout_results: KnockoutResult[] | null;
  has_hard_reject: boolean;
  created_at: string;
}
