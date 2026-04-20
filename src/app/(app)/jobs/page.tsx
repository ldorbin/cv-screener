import Link from "next/link";
import { Plus, Upload, Zap } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/jobs/status-select";
import { formatDate } from "@/lib/utils";
import type { JobStatus } from "@/types";

export const dynamic = "force-dynamic";

export default async function JobsPage() {
  const supabase = await createSupabaseServerClient();
  const [{ data: jobs }, { data: strongMatches }] = await Promise.all([
    supabase
      .from("job_specs")
      .select("id, title, company, status, created_at, cvs(id, status)")
      .order("created_at", { ascending: false }),
    supabase.from("scores").select("job_spec_id").eq("verdict", "strong-match"),
  ]);

  const strongMatchCounts = (strongMatches ?? []).reduce<Record<string, number>>((acc, s) => {
    acc[s.job_spec_id] = (acc[s.job_spec_id] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Job specs</h1>
          <p className="mt-1 text-muted-foreground">
            Each job spec is a screening workspace. Upload CVs, adjust weights, score the batch.
          </p>
        </div>
        <Link href="/jobs/new" className="shrink-0">
          <Button className="w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            New job spec
          </Button>
        </Link>
      </div>

      {!jobs || jobs.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground">You don&apos;t have any job specs yet.</p>
            <Link href="/jobs/new" className="mt-4 inline-block">
              <Button><Plus className="h-4 w-4" />Create your first job spec</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {jobs.map((j) => {
            const cvs = (j.cvs as Array<{ id: string; status: string }>) ?? [];
            const total = cvs.length;
            const scored = cvs.filter((c) => c.status === "scored").length;
            const pending = cvs.filter((c) => c.status === "pending" || c.status === "failed").length;
            const strong = strongMatchCounts[j.id] ?? 0;
            const pct = total > 0 ? Math.round((scored / total) * 100) : 0;

            return (
              <Card key={j.id} className="transition-shadow hover:shadow-lift">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Link href={`/jobs/${j.id}`}>
                          <h3 className="truncate text-lg font-semibold hover:text-primary transition-colors">
                            {j.title}
                          </h3>
                        </Link>
                        <StatusBadge status={(j.status as JobStatus) ?? "open"} />
                      </div>
                      <p className="truncate text-sm text-muted-foreground">
                        {j.company ?? "No company"} · {formatDate(j.created_at as string)}
                      </p>
                    </div>
                    <Link href={`/jobs/${j.id}/upload`}>
                      <Button variant="ghost" size="icon" className="shrink-0" title="Upload CVs">
                        <Upload className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>

                  {total > 0 ? (
                    <div className="mt-4 space-y-2">
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{total} CVs</span>
                        <span>·</span>
                        <span>{scored} scored</span>
                        {strong > 0 && (
                          <>
                            <span>·</span>
                            <span className="font-medium text-green-600">{strong} strong</span>
                          </>
                        )}
                        {pending > 0 && (
                          <span className="ml-auto flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-700 ring-1 ring-amber-200">
                            <Zap className="h-3 w-3" />{pending} pending
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 text-xs text-muted-foreground">No CVs yet</div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
