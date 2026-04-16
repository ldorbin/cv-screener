import type { Score, Cv } from "@/types";

function csvEscape(v: unknown): string {
  if (v == null) return "";
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export interface CsvRow {
  cv: Cv;
  score: Score | null;
}

export function buildScoresCsv(rows: CsvRow[]): string {
  const headers = [
    "candidate",
    "file",
    "status",
    "overall_score",
    "verdict",
    "confidence",
    "skillsAlignment",
    "experienceDepth",
    "domainFit",
    "responsibilitiesMatch",
    "trajectoryAndGrowth",
    "credentials",
    "strengths",
    "gaps",
    "transferable_strengths",
    "interview_probes",
    "red_flags",
    "summary",
  ];

  const lines = [headers.join(",")];
  for (const { cv, score } of rows) {
    const r = score?.result;
    lines.push(
      [
        cv.candidate_name ?? "",
        cv.file_name ?? "",
        cv.status,
        score?.overall_score ?? "",
        score?.verdict ?? "",
        score?.confidence ?? "",
        r?.dimensions.skillsAlignment.score ?? "",
        r?.dimensions.experienceDepth.score ?? "",
        r?.dimensions.domainFit.score ?? "",
        r?.dimensions.responsibilitiesMatch.score ?? "",
        r?.dimensions.trajectoryAndGrowth.score ?? "",
        r?.dimensions.credentials.score ?? "",
        r?.strengths.join(" | ") ?? "",
        r?.gaps.join(" | ") ?? "",
        r?.transferableStrengths.join(" | ") ?? "",
        r?.interviewProbes.join(" | ") ?? "",
        r?.redFlags.join(" | ") ?? "",
        r?.summary ?? "",
      ]
        .map(csvEscape)
        .join(","),
    );
  }
  return lines.join("\n");
}
