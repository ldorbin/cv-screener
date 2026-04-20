import { notFound } from "next/navigation";
import { CheckCircle2, TrendingUp, XCircle } from "lucide-react";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { VerdictBadge } from "@/components/cvs/verdict-badge";
import type { ScoreResult } from "@/types";

export const dynamic = "force-dynamic";

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = createSupabaseServiceClient();

  const { data: share } = await supabase
    .from("shortlist_shares")
    .select("job_spec_id")
    .eq("token", token)
    .maybeSingle();

  if (!share) notFound();

  const [{ data: job }, { data: cvs }] = await Promise.all([
    supabase
      .from("job_specs")
      .select("title, company, blind_mode")
      .eq("id", share.job_spec_id)
      .single(),
    supabase
      .from("cvs")
      .select("id, candidate_name, file_name, scores(overall_score, verdict, result)")
      .eq("job_spec_id", share.job_spec_id)
      .eq("status", "scored"),
  ]);

  if (!job) notFound();

  type CvRow = {
    id: string;
    candidate_name: string | null;
    file_name: string | null;
    scores: { overall_score: number; verdict: string; result: ScoreResult }[] | null;
  };

  const rows = ((cvs ?? []) as unknown as CvRow[])
    .map((cv) => {
      const score = cv.scores?.[0] ?? null;
      return { cv, score };
    })
    .filter((r) => r.score !== null)
    .sort((a, b) => (b.score?.overall_score ?? 0) - (a.score?.overall_score ?? 0));

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-card px-6 py-4">
        <div className="mx-auto max-w-3xl flex items-center justify-between">
          <span className="text-lg font-bold tracking-tight">HireIQ</span>
          <span className="text-sm text-muted-foreground">Shared shortlist</span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10 space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{job.title}</h1>
          {job.company && <p className="mt-1 text-muted-foreground">{job.company}</p>}
          <p className="mt-2 text-sm text-muted-foreground">
            {rows.length} candidate{rows.length !== 1 ? "s" : ""} · ranked by score
          </p>
        </div>

        {rows.length === 0 ? (
          <p className="text-muted-foreground">No scored candidates yet.</p>
        ) : (
          <div className="space-y-4">
            {rows.map(({ cv, score }, idx) => {
              const name = job.blind_mode
                ? `Candidate ${idx + 1}`
                : (cv.candidate_name ?? cv.file_name ?? `Candidate ${idx + 1}`);
              const result = score?.result as ScoreResult | undefined;

              return (
                <div
                  key={cv.id}
                  className="rounded-xl border border-border/60 bg-card p-5 space-y-3"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xl font-bold text-primary">
                        {score?.overall_score}
                      </div>
                      <div>
                        <p className="font-semibold">{name}</p>
                        {result?.verdict && (
                          <VerdictBadge verdict={result.verdict as "strong-match" | "potential-match" | "weak-match"} />
                        )}
                      </div>
                    </div>
                    {score && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        {(score as { has_hard_reject?: boolean }).has_hard_reject ? (
                          <span className="flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-destructive">
                            <XCircle className="h-3 w-3" /> Hard reject
                          </span>
                        ) : score.overall_score >= 70 ? (
                          <span className="flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-green-700">
                            <CheckCircle2 className="h-3 w-3" /> Strong match
                          </span>
                        ) : null}
                      </div>
                    )}
                  </div>

                  {result?.summary && (
                    <p className="text-sm text-muted-foreground">{result.summary}</p>
                  )}

                  {result?.strengths && result.strengths.length > 0 && (
                    <div>
                      <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        <TrendingUp className="h-3 w-3" /> Top strengths
                      </p>
                      <ul className="space-y-1">
                        {result.strengths.slice(0, 3).map((s, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" />
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      <footer className="border-t border-border/60 px-6 py-4 text-center text-xs text-muted-foreground">
        Shared via HireIQ · Powered by AI screening
      </footer>
    </div>
  );
}
