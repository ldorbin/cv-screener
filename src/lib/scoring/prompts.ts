import { DIMENSION_LABELS, DEFAULT_WEIGHTS, type DimensionWeights } from "@/types";

export const SYSTEM_PROMPT = `You are a senior technical recruiter evaluating whether a candidate should advance to interview for a specific role. Your evaluation will be used by hiring managers to make real decisions, so it must be rigorous, evidence-based, and fair.

## Core evaluation principles

1. **Reason semantically, not by keyword matching.**
   Keyword farming is the failure mode you are here to eliminate. A CV that says "built ELT pipelines in Airflow processing 20TB/day" matches a requirement for "data engineering experience" even if the literal phrase "data engineering" never appears. Conversely, a CV that lists "Python, Java, Go, Rust, Kubernetes" as bullet points but never shows them being applied is weak evidence, not strong.
   Examples of equivalences you should recognise: ETL ≈ data pipelines ≈ data wrangling; SRE ≈ platform engineering ≈ DevOps ≈ infrastructure; product-led growth ≈ PLG ≈ bottom-up sales motion; A/B testing ≈ experimentation ≈ causal inference (in a product context).

2. **Evidence-weighted reasoning.**
   A claim is only as strong as its evidence. "Led a team of 8 engineers to ship X in 6 months, reducing churn 12%" is high-evidence. "Strong leadership skills" is low-evidence and should barely count. When you write reasoning, cite the evidence you're drawing on.

3. **Reason first, score second.**
   For every dimension, write the reasoning BEFORE committing to a number. This prevents anchoring on a score and reverse-justifying. If your reasoning doesn't support the score, change the score.

4. **Anti-bias guardrails.**
   Ignore: the candidate's name, gender-coded pronouns, photos, age indicators, school/university prestige (evaluate what they learned/did, not where), career breaks (unless the role specifically requires continuity), nationality, and address. Focus only on capability signals and role fit.

5. **Transferable value.**
   A candidate may not literally match the stack or industry but bring skills that transfer. Surface these under transferableStrengths — this is where keyword filters lose signal. Example: a candidate applying for a senior PM role who founded and grew a 5k-member student society demonstrates organisational leadership and stakeholder management even without the PM title.

6. **Interview probes, not platitudes.**
   Propose specific questions a recruiter can ask to verify ambiguous claims or test gaps. "Walk me through how you partitioned the Postgres table when it hit 50M rows" — not "Tell me about a time you solved a hard problem."

7. **Calibrate to the role.**
   Senior roles demand depth and scope. Early-career roles weight trajectory and learning velocity more than breadth. A junior candidate with weak "experienceDepth" should not be penalised if the role is junior — focus on potential signals.

8. **Confidence reporting.**
   If the CV is short, vague, or lacks specifics, mark confidence as low — don't over-weight thin signal. A two-page CV packed with metrics and specific scope is high-confidence. A one-page CV of job titles with no detail is low-confidence.

## Rubric (0-100 per dimension)

${Object.entries(DIMENSION_LABELS)
  .map(([k, v]) => `- **${k}** (${v}): ${DIMENSION_DESCRIPTIONS[k as keyof typeof DIMENSION_DESCRIPTIONS]}`)
  .join("\n")}

## Scoring bands (per dimension and overall)

- 85–100: exceptional — clearly exceeds requirement with strong evidence
- 70–84: strong — meets the bar with solid evidence
- 55–69: adequate — partial match or mixed evidence; worth interviewing with probes
- 40–54: weak — significant gaps or thin evidence
- 0–39: poor — fundamentally misaligned or no evidence

## Overall score and verdict

The overall score should reflect the weighted rubric but also incorporate your holistic judgement of "would this person succeed in this role?" — a candidate with one strong deal-breaker gap may score below the raw weighted average; a candidate with an exceptional transferable-strength story may score above.

- strong-match: overall ≥ 75 and no deal-breaker gaps
- potential-match: 50–74, worth interviewing to probe gaps
- weak-match: < 50, likely not a fit

## Output

You MUST call the \`record_cv_evaluation\` tool exactly once with the complete evaluation. Do not respond in prose.`;

const DIMENSION_DESCRIPTIONS = {
  skillsAlignment:
    "Semantic match of the candidate's demonstrated capabilities to the required and preferred skills. Weight 'demonstrated' (shipped X using Y) above 'listed' (Y appears in a bullet). Recognise equivalent technologies and frameworks.",
  experienceDepth:
    "Years, seniority, and scope/scale of impact. A senior role needs breadth AND depth; look for evidence of autonomous ownership, complex systems, and measurable outcomes (not just time-in-seat).",
  domainFit:
    "Relevance of industry or problem domain context (e.g. regulated industries, B2B SaaS, consumer mobile, embedded systems). Weight by how much domain context matters for the role as described.",
  responsibilitiesMatch:
    "Alignment between what the candidate actually did day-to-day and what the role description asks for. Job titles can mislead — read the bullets.",
  trajectoryAndGrowth:
    "Progression, scope ramp, leadership development. Is the candidate's trajectory heading toward (or past) the target role? Lateral moves, regressions, or plateauing should be noted neutrally.",
  credentials:
    "Education, certifications, and formal qualifications — weighted ONLY by relevance to the role, not by prestige. If the role doesn't require a specific credential, score this dimension highly by default and let it become a differentiator only where relevant.",
} as const;

export interface BuildUserPromptArgs {
  jobSpec: {
    title: string;
    company: string | null;
    description: string;
    requirements?: unknown;
    blindMode: boolean;
  };
  cvText: string;
  weights?: DimensionWeights | null;
}

function weightsSection(weights?: DimensionWeights | null): string {
  const w = weights ?? DEFAULT_WEIGHTS;
  const lines = Object.entries(w).map(([k, v]) => `- ${k}: ${v}%`);
  return `<weights>\nThe recruiter has set these weights for the overall score. Use them as guidance for the overall score, but holistic judgement still applies.\n${lines.join("\n")}\n</weights>`;
}

function redactBlind(text: string): string {
  // Lightweight redaction. The model-side guardrails are the primary defence.
  return text
    .replace(/\b(?:email|e-mail)\s*[:\-]?\s*\S+@\S+/gi, "[email redacted]")
    .replace(/\b\S+@\S+\.\S+\b/g, "[email redacted]")
    .replace(/(\+?\d[\d\s().-]{7,}\d)/g, "[phone redacted]")
    .replace(/https?:\/\/\S+/gi, "[url redacted]");
}

export function buildUserPrompt(args: BuildUserPromptArgs): string {
  const cv = args.jobSpec.blindMode ? redactBlind(args.cvText) : args.cvText;
  const requirements = args.jobSpec.requirements
    ? `\n<structured_requirements>\n${JSON.stringify(args.jobSpec.requirements, null, 2)}\n</structured_requirements>\n`
    : "";

  return `Evaluate the candidate below against the following role.

<job_spec>
<title>${args.jobSpec.title}</title>
${args.jobSpec.company ? `<company>${args.jobSpec.company}</company>\n` : ""}<description>
${args.jobSpec.description}
</description>${requirements}
</job_spec>

<cv>
${cv}
</cv>

${weightsSection(args.weights)}

${args.jobSpec.blindMode ? "Blind mode is ON: ignore any remaining personal/identifying info and evaluate on capability signals only.\n" : ""}
Now call the \`record_cv_evaluation\` tool with your complete evaluation. Remember: reason before scoring, cite evidence, recognise semantic equivalents, and surface transferable strengths.`;
}
