import Link from "next/link";
import { Briefcase, Gauge, Plus, Sparkles, Trophy } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/stat-card";
import { VerdictBadge } from "@/components/cvs/verdict-badge";
import { formatDate } from "@/lib/utils";
import type { Score, Verdict } from "@/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();

  const [{ count: jobCount }, { data: recent }, { count: weekCount }] = await Promise.all([
    supabase.from("job_specs").select("id", { count: "exact", head: true }),
    supabase
      .from("scores")
      .select("id, overall_score, verdict, confidence, created_at, cv_id, cvs(candidate_name, file_name), job_specs(title)")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("scores")
      .select("id", { count: "exact", head: true })
      .gte(
        "created_at",
        new Date(Date.now() - 7 * 864e5).toISOString(),
      ),
  ]);

  const { data: avgRow } = await supabase
    .from("scores")
    .select("overall_score");
  const avg =
    avgRow && avgRow.length > 0
      ? Math.round(
          avgRow.reduce((s, r) => s + (r.overall_score as number), 0) /
            avgRow.length,
        )
      : null;

  const { data: top } = await supabase
    .from("scores")
    .select("overall_score, cvs(candidate_name, file_name)")
    .order("overall_score", { ascending: false })
    .limit(1);

  const rawCv = top?.[0]?.cvs;
  const topCv = (Array.isArray(rawCv) ? rawCv[0] : rawCv) as
    | { candidate_name: string | null; file_name: string | null }
    | null
    | undefined;
  const topName = topCv?.candidate_name ?? topCv?.file_name ?? "—";

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-muted-foreground">
            A quick look at your screening activity.
          </p>
        </div>
        <Link href="/jobs/new">
          <Button>
            <Plus className="h-4 w-4" />
            New job spec
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Briefcase} label="Job specs" value={jobCount ?? 0} />
        <StatCard
          icon={Sparkles}
          label="CVs scored (7d)"
          value={weekCount ?? 0}
        />
        <StatCard
          icon={Gauge}
          label="Average score"
          value={avg != null ? avg : "—"}
          hint="across all scored CVs"
        />
        <StatCard icon={Trophy} label="Top candidate" value={topName} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent scores</CardTitle>
        </CardHeader>
        <CardContent>
          {!recent || recent.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">
                No scores yet. Create a job spec and upload some CVs to get started.
              </p>
              <Link href="/jobs/new" className="mt-4 inline-block">
                <Button>
                  <Plus className="h-4 w-4" />
                  New job spec
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border/60">
              <table className="w-full text-sm">
                <thead className="bg-secondary/50 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Candidate</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Score</th>
                    <th className="px-4 py-3">Verdict</th>
                    <th className="px-4 py-3">When</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {recent.map((row) => {
                    const cv = row.cvs as unknown as { candidate_name: string | null; file_name: string | null };
                    const job = row.job_specs as unknown as { title: string };
                    return (
                      <tr key={row.id}>
                        <td className="px-4 py-3 font-medium">
                          {cv?.candidate_name ?? cv?.file_name ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{job?.title}</td>
                        <td className="px-4 py-3 font-semibold text-primary">
                          {row.overall_score as number}
                        </td>
                        <td className="px-4 py-3">
                          <VerdictBadge verdict={row.verdict as Verdict} />
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {formatDate(row.created_at as string)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/cv/${row.cv_id}`}
                            className="text-sm font-medium text-primary hover:underline"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
