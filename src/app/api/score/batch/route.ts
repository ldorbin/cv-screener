import { NextRequest, NextResponse } from "next/server";
import pLimit from "p-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { scoreCv } from "@/lib/scoring/score";
import { normaliseWeights } from "@/lib/scoring/weights";

export const runtime = "nodejs";
export const maxDuration = 120;

const CONCURRENCY = 3;

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { jobSpecId } = await request.json().catch(() => ({}));
  if (typeof jobSpecId !== "string") {
    return NextResponse.json({ error: "jobSpecId required" }, { status: 400 });
  }

  const { data: job, error: jobErr } = await supabase
    .from("job_specs")
    .select("*")
    .eq("id", jobSpecId)
    .single();
  if (jobErr || !job) {
    return NextResponse.json({ error: "job not found" }, { status: 404 });
  }

  const { data: cvs, error: cvsErr } = await supabase
    .from("cvs")
    .select("*")
    .eq("job_spec_id", jobSpecId)
    .in("status", ["pending", "failed"]);
  if (cvsErr) {
    return NextResponse.json({ error: cvsErr.message }, { status: 500 });
  }
  if (!cvs || cvs.length === 0) {
    return NextResponse.json({ scored: 0, failed: 0 });
  }

  const weights = normaliseWeights(
    (job.weights as Record<string, number> | null) ?? null,
  );

  await supabase
    .from("cvs")
    .update({ status: "scoring", error: null })
    .in(
      "id",
      cvs.map((c) => c.id),
    );

  const limit = pLimit(CONCURRENCY);
  let scored = 0;
  let failed = 0;

  await Promise.all(
    cvs.map((cv) =>
      limit(async () => {
        try {
          const { result, model } = await scoreCv({
            jobSpec: {
              title: job.title,
              company: job.company,
              description: job.description,
              requirements: job.requirements,
              blindMode: job.blind_mode,
            },
            cvText: cv.parsed_text,
            weights,
          });
          await supabase.from("scores").upsert(
            {
              cv_id: cv.id,
              user_id: user.id,
              job_spec_id: jobSpecId,
              overall_score: result.overallScore,
              verdict: result.verdict,
              confidence: result.confidence,
              result,
              model,
            },
            { onConflict: "cv_id" },
          );
          await supabase.from("cvs").update({ status: "scored" }).eq("id", cv.id);
          scored += 1;
        } catch (e) {
          failed += 1;
          const message = e instanceof Error ? e.message : "scoring failed";
          await supabase
            .from("cvs")
            .update({ status: "failed", error: message })
            .eq("id", cv.id);
        }
      }),
    ),
  );

  return NextResponse.json({ scored, failed, total: cvs.length });
}
