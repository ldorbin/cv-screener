import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CandidatesClient, type CandidateGroup } from "./client";
import type { Verdict } from "@/types";

export const dynamic = "force-dynamic";

export default async function CandidatesPage() {
  const supabase = await createSupabaseServerClient();

  const { data: cvs } = await supabase
    .from("cvs")
    .select("id, candidate_name, file_name, job_spec_id, status, created_at, scores(overall_score, verdict)")
    .order("created_at", { ascending: false });

  // Group by candidate_name (fall back to file_name)
  const candidateMap = new Map<string, CandidateGroup>();

  for (const cv of cvs ?? []) {
    const name = cv.candidate_name ?? cv.file_name ?? `CV ${(cv.id as string).slice(0, 8)}`;
    const slug = encodeURIComponent(name);
    const scoreRow = (cv.scores as Array<{ overall_score: number; verdict: string }> | null)?.[0];
    const score = scoreRow?.overall_score ?? null;
    const verdict = (scoreRow?.verdict ?? null) as Verdict | null;

    const existing = candidateMap.get(name);
    if (!existing) {
      candidateMap.set(name, {
        name,
        slug,
        jobCount: 1,
        bestScore: score,
        bestVerdict: verdict,
        lastActivity: cv.created_at as string,
      });
    } else {
      existing.jobCount += 1;
      if (score !== null && (existing.bestScore === null || score > existing.bestScore)) {
        existing.bestScore = score;
        existing.bestVerdict = verdict;
      }
      if ((cv.created_at as string) > existing.lastActivity) {
        existing.lastActivity = cv.created_at as string;
      }
    }
  }

  const candidates = Array.from(candidateMap.values()).sort(
    (a, b) => (b.bestScore ?? -1) - (a.bestScore ?? -1),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Candidates</h1>
        <p className="mt-1 text-muted-foreground">
          {candidates.length === 0
            ? "No candidates yet — upload CVs against a job spec to get started."
            : `${candidates.length} candidate${candidates.length !== 1 ? "s" : ""} across all roles`}
        </p>
      </div>
      <CandidatesClient candidates={candidates} />
    </div>
  );
}
