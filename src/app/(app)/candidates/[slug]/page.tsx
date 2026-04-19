import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { VerdictBadge } from "@/components/cvs/verdict-badge";
import { CrossJobButton } from "@/components/cvs/cross-job-button";
import { formatDate } from "@/lib/utils";
import type { Verdict } from "@/types";

export const dynamic = "force-dynamic";

export default async function CandidateDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const name = decodeURIComponent(slug);
  const supabase = await createSupabaseServerClient();

  // Find CVs by candidate_name first, fall back to file_name
  let { data: cvs } = await supabase
    .from("cvs")
    .select("id, candidate_name, file_name, job_spec_id, status, created_at, scores(overall_score, verdict, confidence, result), job_specs(id, title, company)")
    .eq("candidate_name", name)
    .order("created_at", { ascending: false });

  if (!cvs?.length) {
    const { data: byFile } = await supabase
      .from("cvs")
      .select("id, candidate_name, file_name, job_spec_id, status, created_at, scores(overall_score, verdict, confidence, result), job_specs(id, title, company)")
      .eq("file_name", name)
      .order("created_at", { ascending: false });
    cvs = byFile;
  }

  if (!cvs?.length) notFound();

  // All org job specs for cross-job matching
  const { data: allJobs } = await supabase
    .from("job_specs")
    .select("id, title, company")
    .order("created_at", { ascending: false });

  const appliedJobIds = new Set(cvs.map((c) => c.job_spec_id));
  const otherJobs = (allJobs ?? []).filter((j) => !appliedJobIds.has(j.id));

  const displayName = cvs[0].candidate_name ?? cvs[0].file_name ?? name;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/candidates"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Candidates
        </Link>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{displayName}</h1>
          <p className="mt-1 text-muted-foreground">
            {cvs.length} role application{cvs.length !== 1 ? "s" : ""}
          </p>
        </div>
        {otherJobs.length > 0 && (
          <CrossJobButton
            cvId={cvs[0].id as string}
            otherJobs={otherJobs.map((j) => ({ id: j.id as string, title: j.title as string, company: j.company as string | null }))}
          />
        )}
      </div>

      <div className="space-y-4">
        {cvs.map((cv) => {
          const job = cv.job_specs as unknown as { id: string; title: string; company: string | null };
          const score = (cv.scores as Array<{ overall_score: number; verdict: string; confidence: string; result: { summary: string } }> | null)?.[0];

          return (
            <Card key={cv.id as string}>
              <CardContent className="p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{job?.title}</h3>
                      {job?.company && (
                        <span className="text-sm text-muted-foreground">· {job.company}</span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Applied {formatDate(cv.created_at as string)}
                    </p>
                    {score?.result?.summary && (
                      <p className="mt-3 text-sm text-muted-foreground">{score.result.summary}</p>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-2">
                    {score ? (
                      <>
                        <span className="text-3xl font-bold text-primary">{score.overall_score}</span>
                        <VerdictBadge verdict={score.verdict as Verdict} />
                        <Badge variant="outline" className="text-xs">
                          {score.confidence} confidence
                        </Badge>
                      </>
                    ) : (
                      <Badge variant="outline">
                        {cv.status === "scoring" ? "Scoring…" : cv.status === "failed" ? "Failed" : "Pending"}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <Link href={`/cv/${cv.id}`}>
                    <button className="rounded-md border border-border/60 px-3 py-1.5 text-sm font-medium hover:bg-secondary transition-colors">
                      Full report →
                    </button>
                  </Link>
                  <Link href={`/jobs/${job?.id}`}>
                    <button className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-secondary transition-colors">
                      View job
                    </button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
