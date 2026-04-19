import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, CheckCircle2, ChevronLeft, Lightbulb, Target, TrendingUp, XCircle } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DimensionRadar } from "@/components/cvs/dimension-radar";
import { VerdictBadge } from "@/components/cvs/verdict-badge";
import { RescoreCvButton } from "@/components/cvs/rescore-cv-button";
import { HmBriefButton } from "@/components/cvs/hm-brief-button";
import { CrossJobButton } from "@/components/cvs/cross-job-button";
import { DIMENSION_LABELS, type Cv, type KnockoutCriterion, type Score, type ScoreResult } from "@/types";

export const dynamic = "force-dynamic";

export default async function CvReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const [{ data: cv }, { data: allJobs }] = await Promise.all([
    supabase
      .from("cvs")
      .select("*, job_specs(id, title, company, knockout_criteria)")
      .eq("id", id)
      .single(),
    supabase
      .from("job_specs")
      .select("id, title, company")
      .order("created_at", { ascending: false }),
  ]);

  if (!cv) notFound();

  const { data: score } = await supabase
    .from("scores")
    .select("*")
    .eq("cv_id", id)
    .maybeSingle<Score>();

  const job = (cv as unknown as Cv & { job_specs: { id: string; title: string; company: string | null; knockout_criteria: KnockoutCriterion[] } }).job_specs;

  const otherJobs = (allJobs ?? [])
    .filter((j) => j.id !== job.id)
    .map((j) => ({ id: j.id as string, title: j.title as string, company: j.company as string | null }));

  return (
    <div className="space-y-8">
      <div>
        <Link
          href={`/jobs/${job.id}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          {job.title}
        </Link>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {cv.candidate_name ?? cv.file_name ?? "Candidate"}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {cv.file_name ?? "CV"} · scored against {job.title}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {score && <HmBriefButton cvId={cv.id} />}
          <CrossJobButton cvId={cv.id as string} otherJobs={otherJobs} />
          <RescoreCvButton cvId={cv.id} />
        </div>
      </div>

      {!score ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              This CV hasn&apos;t been scored yet.
              {cv.status === "failed" && cv.error && (
                <> Last error: <span className="text-destructive">{cv.error}</span></>
              )}
            </p>
          </CardContent>
        </Card>
      ) : (
        <ReportBody
          result={score.result as ScoreResult}
          score={score}
          knockoutCriteria={job.knockout_criteria ?? []}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Parsed CV</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="whitespace-pre-wrap font-mono text-xs text-muted-foreground">
            {cv.parsed_text as string}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}

function ReportBody({ result, score, knockoutCriteria }: { result: ScoreResult; score: Score; knockoutCriteria: KnockoutCriterion[] }) {
  return (
    <>
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardContent className="flex flex-col items-center justify-center p-8 text-center">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              Overall score
            </span>
            <span className="mt-2 text-6xl font-bold text-primary">
              {result.overallScore}
            </span>
            <div className="mt-4 flex flex-col items-center gap-2">
              <VerdictBadge verdict={result.verdict} />
              <Badge variant="outline">Confidence: {result.confidence}</Badge>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">{result.summary}</p>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Rubric breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <DimensionRadar result={result} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dimension reasoning</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(result.dimensions).map(([k, d]) => (
            <div key={k} className="rounded-lg border border-border/60 p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-medium">
                  {DIMENSION_LABELS[k as keyof typeof DIMENSION_LABELS]}
                </span>
                <span className="text-2xl font-semibold text-primary">
                  {d.score}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{d.reasoning}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <ListCard
          icon={TrendingUp}
          title="Strengths"
          items={result.strengths}
          tone="success"
        />
        <ListCard
          icon={Target}
          title="Gaps"
          items={result.gaps}
          tone="warning"
        />
        <ListCard
          icon={Lightbulb}
          title="Transferable strengths"
          items={result.transferableStrengths}
          tone="accent"
        />
        <ListCard
          icon={Lightbulb}
          title="Interview probes"
          items={result.interviewProbes}
          tone="primary"
        />
      </div>

      {knockoutCriteria.length > 0 && score.knockout_results && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {score.has_hard_reject ? (
                <XCircle className="h-5 w-5 text-destructive" />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              )}
              Knockout criteria
              {score.has_hard_reject && (
                <span className="ml-auto rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                  Hard reject
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {knockoutCriteria.map((criterion) => {
              const res = score.knockout_results?.find((r) => r.criterionId === criterion.id);
              const met = res?.met ?? null;
              return (
                <div key={criterion.id} className="rounded-lg border border-border/60 p-3">
                  <div className="mb-1 flex items-center gap-2">
                    {met === true && <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />}
                    {met === false && <XCircle className="h-4 w-4 shrink-0 text-destructive" />}
                    {met === null && <span className="h-4 w-4 shrink-0 rounded-full border-2 border-muted-foreground/30" />}
                    <span className="font-medium text-sm">{criterion.text}</span>
                    <span className={`ml-auto rounded-full border px-2 py-0.5 text-xs ${
                      criterion.type === "hard-reject"
                        ? "border-red-200 bg-red-50 text-red-700"
                        : criterion.type === "must-have"
                        ? "border-blue-200 bg-blue-50 text-blue-700"
                        : "border-green-200 bg-green-50 text-green-700"
                    }`}>
                      {criterion.type}
                    </span>
                  </div>
                  {res?.reasoning && (
                    <p className="ml-6 text-xs text-muted-foreground">{res.reasoning}</p>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {result.redFlags.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Red flags
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {result.redFlags.map((r, i) => (
                <li key={i} className="rounded-lg bg-destructive/5 p-3 text-destructive">
                  {r}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground">
        Scored with {score.model} · {new Date(score.created_at).toLocaleString()}
      </p>
    </>
  );
}

function ListCard({
  icon: Icon,
  title,
  items,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  items: string[];
  tone: "success" | "warning" | "accent" | "primary";
}) {
  const toneClass = {
    success: "text-success",
    warning: "text-warning",
    accent: "text-accent",
    primary: "text-primary",
  }[tone];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className={`h-4 w-4 ${toneClass}`} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">None flagged.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {items.map((s, i) => (
              <li key={i} className="flex gap-2">
                <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-current ${toneClass}`} />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
