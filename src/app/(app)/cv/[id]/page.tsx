import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ChevronLeft, Lightbulb, Target, TrendingUp } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DimensionRadar } from "@/components/cvs/dimension-radar";
import { VerdictBadge } from "@/components/cvs/verdict-badge";
import { RescoreCvButton } from "@/components/cvs/rescore-cv-button";
import { DIMENSION_LABELS, type Cv, type Score, type ScoreResult } from "@/types";

export const dynamic = "force-dynamic";

export default async function CvReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: cv } = await supabase
    .from("cvs")
    .select("*, job_specs(id, title, company)")
    .eq("id", id)
    .single();

  if (!cv) notFound();

  const { data: score } = await supabase
    .from("scores")
    .select("*")
    .eq("cv_id", id)
    .maybeSingle<Score>();

  const job = (cv as unknown as Cv & { job_specs: { id: string; title: string; company: string | null } }).job_specs;

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

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {cv.candidate_name ?? cv.file_name ?? "Candidate"}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {cv.file_name ?? "CV"} · scored against {job.title}
          </p>
        </div>
        <RescoreCvButton cvId={cv.id} />
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
        <ReportBody result={score.result as ScoreResult} score={score} />
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

function ReportBody({ result, score }: { result: ScoreResult; score: Score }) {
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
