import Link from "next/link";
import { Plus } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function JobsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: jobs } = await supabase
    .from("job_specs")
    .select("id, title, company, created_at, cvs(count), scores(count)")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Job specs</h1>
          <p className="mt-1 text-muted-foreground">
            Each job spec is a screening workspace. Upload CVs, adjust weights, score the batch.
          </p>
        </div>
        <Link href="/jobs/new">
          <Button>
            <Plus className="h-4 w-4" />
            New job spec
          </Button>
        </Link>
      </div>

      {!jobs || jobs.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground">
              You don&apos;t have any job specs yet.
            </p>
            <Link href="/jobs/new" className="mt-4 inline-block">
              <Button>
                <Plus className="h-4 w-4" />
                Create your first job spec
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {jobs.map((j) => {
            const cvCount = (j.cvs as unknown as { count: number }[])?.[0]?.count ?? 0;
            const scoreCount = (j.scores as unknown as { count: number }[])?.[0]?.count ?? 0;
            return (
              <Link key={j.id} href={`/jobs/${j.id}`}>
                <Card className="transition-shadow hover:shadow-lift">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="truncate text-lg font-semibold">{j.title}</h3>
                        <p className="truncate text-sm text-muted-foreground">
                          {j.company ?? "No company"}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatDate(j.created_at as string)}
                      </span>
                    </div>
                    <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{cvCount} CVs</span>
                      <span>·</span>
                      <span>{scoreCount} scored</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
