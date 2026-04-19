import Link from "next/link";
import { ArrowRight, Briefcase, Building2, Plus, TrendingUp, Upload, Zap } from "lucide-react";
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
    { data: allScores },
    { data: recent },
    { count: weekCount },
  ] = await Promise.all([
    supabase
      .from("job_specs")
      .select("id, title, company, created_at, cvs(id, status)")
      .order("company", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("scores")
      .select("job_spec_id, cv_id, overall_score, verdict, cvs(candidate_name, file_name)"),
    supabase
      .from("scores")
      .select("cv_id, overall_score, verdict, created_at, cvs(candidate_name, file_name), job_specs(title, company)")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("scores")
      .select("id", { count: "exact", head: true })
      .gte("created_at", new Date(Date.now() - 7 * 864e5).toISOString()),
  ]);

  // Index scores by job
  type ScoreRow = { job_spec_id: string; cv_id: string; overall_score: number; verdict: string; cvs: unknown };
  const scoresByJob = new Map<string, ScoreRow[]>();
  for (const s of (allScores ?? []) as unknown as ScoreRow[]) {
    const list = scoresByJob.get(s.job_spec_id) ?? [];
    list.push(s);
    scoresByJob.set(s.job_spec_id, list);
  }

  // Enrich pipeline jobs
  const pipeline = (jobs ?? []).map((job) => {
    const cvs = (job.cvs as Array<{ id: string; status: string }>) ?? [];
    const total = cvs.length;
    const scored = cvs.filter((c) => c.status === "scored").length;
    const pending = cvs.filter((c) => c.status === "pending" || c.status === "failed").length;
    const jobScores = scoresByJob.get(job.id) ?? [];
    const strong = jobScores.filter((s) => s.verdict === "strong-match").length;
    const potential = jobScores.filter((s) => s.verdict === "potential-match").length;
    const avgScore = jobScores.length > 0
      ? Math.round(jobScores.reduce((sum, s) => sum + s.overall_score, 0) / jobScores.length)
      : null;
    const topScore = jobScores.reduce<ScoreRow | null>(
      (best, s) => (!best || s.overall_score > best.overall_score ? s : best),
      null,
    );
    const topCv = topScore?.cvs as { candidate_name: string | null; file_name: string | null } | null;
    const topName = topCv?.candidate_name ?? topCv?.file_name ?? null;
    return { ...job, total, scored, pending, strong, potential, avgScore, topScore, topName };
  });

  // Global stats
  const totalCvs = pipeline.reduce((s, j) => s + j.total, 0);
  const totalScored = pipeline.reduce((s, j) => s + j.scored, 0);
  const totalStrong = pipeline.reduce((s, j) => s + j.strong, 0);
  const allScoreValues = (allScores ?? []).map((s) => s.overall_score);
  const globalAvg = allScoreValues.length > 0
    ? Math.round(allScoreValues.reduce((a, b) => a + b, 0) / allScoreValues.length)
    : null;

  // Group jobs by company
  const companyGroups = new Map<string, typeof pipeline>();
  for (const job of pipeline) {
    const key = job.company ?? "No company";
    const list = companyGroups.get(key) ?? [];
    list.push(job);
    companyGroups.set(key, list);
  }
  const sortedGroups = Array.from(companyGroups.entries()).sort(([a], [b]) => {
    if (a === "No company") return 1;
    if (b === "No company") return -1;
    return a.localeCompare(b);
  });

  // Top candidates across all jobs (deduplicated by cv_id)
  const topScores = [...(allScores ?? [])]
    .sort((a, b) => b.overall_score - a.overall_score)
    .slice(0, 5) as ScoreRow[];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Your pipeline</h1>
          <p className="mt-1 text-muted-foreground">
            {pipeline.length === 0
              ? "No active jobs yet — create your first job spec to get started."
              : `${pipeline.length} role${pipeline.length !== 1 ? "s" : ""} across ${sortedGroups.filter(([k]) => k !== "No company").length || pipeline.length} company${sortedGroups.filter(([k]) => k !== "No company").length !== 1 ? "ies" : ""}`}
          </p>
        </div>
        <Link href="/jobs/new" className="shrink-0">
          <Button className="w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            New job spec
          </Button>
        </Link>
      </div>

      {/* Global stats strip */}
      {totalCvs > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {[
            { label: "Roles", value: pipeline.length },
            { label: "CVs uploaded", value: totalCvs },
            { label: "Scored", value: totalScored },
            { label: "Strong matches", value: totalStrong, highlight: true },
            { label: "Avg score", value: globalAvg ?? "—" },
          ].map(({ label, value, highlight }) => (
            <div key={label} className="rounded-lg border border-border/60 bg-card px-4 py-3">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className={`mt-1 text-2xl font-bold ${highlight ? "text-green-600" : "text-foreground"}`}>
                {value}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Jobs grouped by company */}
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
        <div className="space-y-8">
          {sortedGroups.map(([company, companyJobs]) => (
            <section key={company}>
              <div className="mb-3 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <h2 className="font-semibold text-foreground">{company}</h2>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                  {companyJobs.length} role{companyJobs.length !== 1 ? "s" : ""}
                </span>
                <div className="flex-1 border-t border-border/60" />
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {companyJobs.map((job) => {
                  const pct = job.total > 0 ? (job.scored / job.total) * 100 : 0;
                  const strongPct = job.total > 0 ? (job.strong / job.total) * 100 : 0;
                  const otherPct = job.total > 0 ? ((job.scored - job.strong) / job.total) * 100 : 0;

                  return (
                    <Card key={job.id} className="flex flex-col">
                      <CardContent className="flex flex-1 flex-col p-5">
                        {/* Title */}
                        <div className="mb-3">
                          <Link href={`/jobs/${job.id}`}>
                            <h3 className="font-semibold leading-tight hover:text-primary transition-colors">
                              {job.title}
                            </h3>
                          </Link>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            Added {formatDate(job.created_at as string)}
                          </p>
                        </div>

                        {job.total === 0 ? (
                          <div className="mb-4 flex-1 rounded-md border border-dashed border-border/60 py-4 text-center text-xs text-muted-foreground">
                            No CVs yet
                            <br />
                            <Link href={`/jobs/${job.id}/upload`} className="mt-1 inline-block text-primary hover:underline">
                              Upload CVs →
                            </Link>
                          </div>
                        ) : (
                          <div className="mb-3 flex-1 space-y-3">
                            {/* Segmented progress bar */}
                            <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                              <div className="flex h-full">
                                <div
                                  className="h-full bg-green-500 transition-all"
                                  style={{ width: `${strongPct}%` }}
                                />
                                <div
                                  className="h-full bg-primary/50 transition-all"
                                  style={{ width: `${otherPct}%` }}
                                />
                              </div>
                            </div>

                            {/* Counts */}
                            <div className="grid grid-cols-3 gap-1 text-center text-xs">
                              <div className="rounded bg-secondary/60 py-1">
                                <span className="block font-semibold text-foreground">{job.total}</span>
                                <span className="text-muted-foreground">uploaded</span>
                              </div>
                              <div className="rounded bg-secondary/60 py-1">
                                <span className="block font-semibold text-foreground">{job.scored}</span>
                                <span className="text-muted-foreground">scored</span>
                              </div>
                              <div className="rounded bg-green-50 py-1 ring-1 ring-green-200">
                                <span className="block font-semibold text-green-700">{job.strong}</span>
                                <span className="text-green-600">strong</span>
                              </div>
                            </div>

                            {/* Top candidate + avg score */}
                            {job.topName && (
                              <div className="rounded-md border border-border/60 bg-secondary/30 px-3 py-2 text-xs">
                                <span className="text-muted-foreground">Top candidate</span>
                                <div className="mt-0.5 flex items-center justify-between">
                                  <span className="font-medium truncate mr-2">{job.topName}</span>
                                  <span className="shrink-0 font-bold text-primary">{job.topScore?.overall_score}</span>
                                </div>
                              </div>
                            )}

                            {job.avgScore !== null && (
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>Avg score</span>
                                <span className="font-medium text-foreground">{job.avgScore}</span>
                              </div>
                            )}

                            {job.pending > 0 && (
                              <div className="flex items-center gap-1.5 rounded-md bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-700 ring-1 ring-amber-200">
                                <Zap className="h-3 w-3" />
                                {job.pending} CV{job.pending !== 1 ? "s" : ""} pending scoring
                              </div>
                            )}
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2 pt-1">
                          <Link href={`/jobs/${job.id}`} className="flex-1">
                            <Button variant="outline" size="sm" className="w-full">
                              View <ArrowRight className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                          <Link href={`/jobs/${job.id}/upload`} title="Upload CVs">
                            <Button variant="ghost" size="sm">
                              <Upload className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                          {job.pending > 0 && (
                            <Link href={`/jobs/${job.id}`} title="Score pending CVs">
                              <Button variant="ghost" size="sm" className="text-amber-600 hover:text-amber-700 hover:bg-amber-50">
                                <Zap className="h-3.5 w-3.5" />
                              </Button>
                            </Link>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Top candidates + Recent activity */}
      {topScores.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Top candidates */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4 text-accent" />
                Top candidates across all roles
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 p-3 pt-0">
              {topScores.map((row) => {
                const cv = row.cvs as { candidate_name: string | null; file_name: string | null } | null;
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
                {weekCount != null && weekCount > 0 && (
                  <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    {weekCount} this week
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 p-3 pt-0">
              {recent?.map((row) => {
                const cv = row.cvs as unknown as { candidate_name: string | null; file_name: string | null };
                const job = row.job_specs as unknown as { title: string; company: string | null };
                const name = cv?.candidate_name ?? cv?.file_name ?? "—";
                return (
                  <Link
                    key={row.cv_id}
                    href={`/cv/${row.cv_id}`}
                    className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-secondary/50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {job?.title}{job?.company ? ` · ${job.company}` : ""}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className={`text-sm font-semibold ${
                        row.overall_score >= 75 ? "text-green-600" :
                        row.overall_score >= 50 ? "text-primary" : "text-muted-foreground"
                      }`}>{row.overall_score}</span>
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
