import Link from "next/link";
import { ArrowRight, Briefcase, Plus, TrendingUp, Upload, Zap } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VerdictBadge } from "@/components/cvs/verdict-badge";
import { formatDate } from "@/lib/utils";
import type { Verdict } from "@/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();

  const [
    { data: jobs },
    { data: topScores },
    { data: recent },
    { data: strongMatches },
    { count: weekCount },
  ] = await Promise.all([
    supabase
      .from("job_specs")
      .select("id, title, company, cvs(id, status)")
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("scores")
      .select("cv_id, overall_score, verdict, cvs(candidate_name, file_name), job_specs(title)")
      .order("overall_score", { ascending: false })
      .limit(5),
    supabase
      .from("scores")
      .select("cv_id, overall_score, verdict, created_at, cvs(candidate_name, file_name), job_specs(title)")
      .order("created_at", { ascending: false })
      .limit(6),
    supabase.from("scores").select("job_spec_id").eq("verdict", "strong-match"),
    supabase
      .from("scores")
      .select("id", { count: "exact", head: true })
      .gte("created_at", new Date(Date.now() - 7 * 864e5).toISOString()),
  ]);

  const strongMatchCounts = (strongMatches ?? []).reduce<Record<string, number>>((acc, s) => {
    acc[s.job_spec_id] = (acc[s.job_spec_id] ?? 0) + 1;
    return acc;
  }, {});

  const pipeline = (jobs ?? []).map((job) => {
    const cvs = (job.cvs as Array<{ id: string; status: string }>) ?? [];
    const total = cvs.length;
    const scored = cvs.filter((c) => c.status === "scored").length;
    const pending = cvs.filter((c) => c.status === "pending" || c.status === "failed").length;
    const strong = strongMatchCounts[job.id] ?? 0;
    return { ...job, total, scored, pending, strong };
  });

  const totalJobs = jobs?.length ?? 0;
  const totalScored = (topScores?.length ?? 0) > 0 ? (recent?.length ?? 0) : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Your pipeline</h1>
          <p className="mt-1 text-muted-foreground">
            {totalJobs === 0
              ? "No active jobs yet — create your first job spec to get started."
              : `${totalJobs} active job${totalJobs !== 1 ? "s" : ""} · ${weekCount ?? 0} CVs scored this week`}
          </p>
        </div>
        <Link href="/jobs/new" className="shrink-0">
          <Button className="w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            New job spec
          </Button>
        </Link>
      </div>

      {/* Pipeline cards */}
      {pipeline.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Briefcase className="mx-auto mb-4 h-10 w-10 text-muted-foreground/40" />
            <p className="text-muted-foreground">
              No jobs yet. Create a job spec, upload CVs, and let HireIQ do the screening.
            </p>
            <Link href="/jobs/new" className="mt-4 inline-block">
              <Button><Plus className="h-4 w-4" />Create job spec</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pipeline.map((job) => {
            const pct = job.total > 0 ? Math.round((job.scored / job.total) * 100) : 0;
            const strongPct = job.total > 0 ? Math.round((job.strong / job.total) * 100) : 0;
            return (
              <Card key={job.id} className="flex flex-col">
                <CardContent className="flex flex-1 flex-col p-5">
                  <div className="mb-4 flex-1">
                    <h3 className="truncate font-semibold leading-tight">{job.title}</h3>
                    {job.company && (
                      <p className="mt-0.5 truncate text-sm text-muted-foreground">{job.company}</p>
                    )}
                  </div>

                  {job.total === 0 ? (
                    <p className="mb-4 text-sm text-muted-foreground">No CVs uploaded yet</p>
                  ) : (
                    <div className="mb-4 space-y-2">
                      {/* Progress bar */}
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{job.scored}/{job.total} scored</span>
                        <span className="font-medium text-green-600">
                          {job.strong} strong match{job.strong !== 1 ? "es" : ""}
                        </span>
                      </div>
                      {job.pending > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-amber-200">
                          <Zap className="h-3 w-3" />
                          {job.pending} pending
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Link href={`/jobs/${job.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full">
                        View <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                    <Link href={`/jobs/${job.id}/upload`}>
                      <Button variant="ghost" size="sm">
                        <Upload className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {(jobs?.length ?? 0) >= 6 && (
            <Link href="/jobs">
              <Card className="flex h-full items-center justify-center border-dashed hover:bg-secondary/40 transition-colors">
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  View all jobs <ArrowRight className="inline h-3.5 w-3.5" />
                </CardContent>
              </Card>
            </Link>
          )}
        </div>
      )}

      {/* Top candidates + Recent activity */}
      {(topScores?.length ?? 0) > 0 && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Top candidates */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4 text-accent" />
                Top candidates
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 p-3 pt-0">
              {topScores?.map((row) => {
                const cv = row.cvs as unknown as { candidate_name: string | null; file_name: string | null };
                const job = row.job_specs as unknown as { title: string };
                const name = cv?.candidate_name ?? cv?.file_name ?? "—";
                return (
                  <Link
                    key={row.cv_id}
                    href={`/cv/${row.cv_id}`}
                    className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-secondary/50 transition-colors"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                      {row.overall_score}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{name}</p>
                      <p className="truncate text-xs text-muted-foreground">{job?.title}</p>
                    </div>
                    <VerdictBadge verdict={row.verdict as Verdict} />
                  </Link>
                );
              })}
              <div className="pt-1">
                <Link href="/candidates">
                  <Button variant="ghost" size="sm" className="w-full text-muted-foreground">
                    All candidates <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Recent activity */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Zap className="h-4 w-4 text-accent" />
                Recent activity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 p-3 pt-0">
              {recent?.map((row) => {
                const cv = row.cvs as unknown as { candidate_name: string | null; file_name: string | null };
                const job = row.job_specs as unknown as { title: string };
                const name = cv?.candidate_name ?? cv?.file_name ?? "—";
                return (
                  <Link
                    key={row.cv_id}
                    href={`/cv/${row.cv_id}`}
                    className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-secondary/50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{name}</p>
                      <p className="truncate text-xs text-muted-foreground">{job?.title}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="text-sm font-semibold text-primary">{row.overall_score}</span>
                      <p className="text-xs text-muted-foreground">{formatDate(row.created_at as string)}</p>
                    </div>
                  </Link>
                );
              })}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
