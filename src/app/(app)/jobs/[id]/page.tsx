import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Download, FileSpreadsheet, LayoutGrid, Upload } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScoreRow } from "@/components/cvs/score-row";
import { RescoreButton } from "@/components/jobs/rescore-button";
import type { Cv, JobSpec, Score } from "@/types";

export const dynamic = "force-dynamic";

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: job } = await supabase
    .from("job_specs")
    .select("*")
    .eq("id", id)
    .single<JobSpec>();

  if (!job) notFound();

  const { data: cvs } = await supabase
    .from("cvs")
    .select("*")
    .eq("job_spec_id", id)
    .returns<Cv[]>();

  const { data: scores } = await supabase
    .from("scores")
    .select("*")
    .eq("job_spec_id", id)
    .returns<Score[]>();

  const scoresByCv = new Map((scores ?? []).map((s) => [s.cv_id, s]));

  const rows = (cvs ?? [])
    .map((cv) => ({ cv, score: scoresByCv.get(cv.id) ?? null }))
    .sort((a, b) => {
      const sa = a.score?.overall_score ?? -1;
      const sb = b.score?.overall_score ?? -1;
      return sb - sa;
    });

  const scoredCount = rows.filter((r) => r.score).length;
  const pendingCount = rows.filter((r) => !r.score && r.cv.status !== "failed").length;

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/jobs"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          All job specs
        </Link>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{job.title}</h1>
            <p className="mt-1 text-muted-foreground">{job.company ?? "No company"}</p>
            {job.blind_mode && (
              <Badge variant="outline" className="mt-2">
                Blind mode ON
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/jobs/${id}/upload`}>
              <Button variant="outline" size="sm">
                <Upload className="h-4 w-4" />
                <span className="sm:inline">Upload more</span>
              </Button>
            </Link>
            {pendingCount > 0 && <RescoreButton jobSpecId={id} />}
            {scoredCount >= 2 && (
              <Link href={`/jobs/${id}/compare`}>
                <Button variant="outline" size="sm">
                  <LayoutGrid className="h-4 w-4" />
                  <span className="sm:inline">Compare</span>
                </Button>
              </Link>
            )}
            <a href={`/api/export?jobId=${id}&format=csv`}>
              <Button variant="outline" size="sm">
                <FileSpreadsheet className="h-4 w-4" />
                <span className="hidden sm:inline">CSV</span>
              </Button>
            </a>
            <a href={`/api/export?jobId=${id}&format=pdf`}>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">PDF</span>
              </Button>
            </a>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Total CVs</div>
            <div className="mt-2 text-3xl font-semibold">{rows.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Scored</div>
            <div className="mt-2 text-3xl font-semibold">{scoredCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Pending</div>
            <div className="mt-2 text-3xl font-semibold">{pendingCount}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ranked candidates</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">No CVs yet.</p>
              <Link href={`/jobs/${id}/upload`} className="mt-4 inline-block">
                <Button>
                  <Upload className="h-4 w-4" />
                  Upload CVs
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {rows.map(({ cv, score }) => (
                <ScoreRow key={cv.id} cv={cv} score={score} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Job description</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="whitespace-pre-wrap font-sans text-sm text-muted-foreground">
            {job.description}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
