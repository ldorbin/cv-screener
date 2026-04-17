import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ComparisonTable } from "@/components/cvs/comparison-table";
import type { Cv, JobSpec, KnockoutCriterion, Score } from "@/types";

export const dynamic = "force-dynamic";

export default async function CompareShortlistPage({
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

  const { data: scores } = await supabase
    .from("scores")
    .select("*, cvs(*)")
    .eq("job_spec_id", id)
    .order("overall_score", { ascending: false })
    .limit(20)
    .returns<(Score & { cvs: Cv })[]>();

  const rows = (scores ?? []).map((s) => ({ cv: s.cvs, score: s }));
  const knockoutCriteria = (job.knockout_criteria ?? []) as KnockoutCriterion[];

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/jobs/${id}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          {job.title}
        </Link>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">Shortlist comparison</h1>
        <p className="mt-1 text-muted-foreground">
          Top {rows.length} scored candidates · click column headers to re-sort
        </p>
      </div>

      {rows.length < 2 ? (
        <p className="rounded-lg border border-border/60 p-8 text-center text-muted-foreground">
          Score at least 2 CVs to compare them.
        </p>
      ) : (
        <ComparisonTable rows={rows} knockoutCriteria={knockoutCriteria} />
      )}
    </div>
  );
}
