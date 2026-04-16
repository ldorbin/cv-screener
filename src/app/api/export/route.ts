import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { buildScoresCsv } from "@/lib/export/csv";
import { renderScoringPdf } from "@/lib/export/pdf";
import type { Cv, JobSpec, Score } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const jobId = request.nextUrl.searchParams.get("jobId");
  const format = request.nextUrl.searchParams.get("format") ?? "csv";
  if (!jobId) return NextResponse.json({ error: "jobId required" }, { status: 400 });

  const { data: job } = await supabase
    .from("job_specs")
    .select("*")
    .eq("id", jobId)
    .single<JobSpec>();
  if (!job) return NextResponse.json({ error: "job not found" }, { status: 404 });

  const { data: cvs } = await supabase
    .from("cvs")
    .select("*")
    .eq("job_spec_id", jobId)
    .order("created_at", { ascending: true })
    .returns<Cv[]>();

  const { data: scores } = await supabase
    .from("scores")
    .select("*")
    .eq("job_spec_id", jobId)
    .returns<Score[]>();

  const scoresByCv = new Map((scores ?? []).map((s) => [s.cv_id, s]));
  const entries = (cvs ?? []).map((cv) => ({
    cv,
    score: scoresByCv.get(cv.id) ?? null,
  }));

  if (format === "pdf") {
    const buffer = await renderScoringPdf(job, entries);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${slug(job.title)}-scoring.pdf"`,
      },
    });
  }

  const csv = buildScoresCsv(entries);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug(job.title)}-scoring.csv"`,
    },
  });
}

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "job";
}
