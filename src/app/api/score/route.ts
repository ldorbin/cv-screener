import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { scoreCv } from "@/lib/scoring/score";
import { normaliseWeights } from "@/lib/scoring/weights";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { cvId } = await request.json().catch(() => ({}));
  if (typeof cvId !== "string") {
    return NextResponse.json({ error: "cvId required" }, { status: 400 });
  }

  const { data: cv, error: cvErr } = await supabase
    .from("cvs")
    .select("*, job_specs(*)")
    .eq("id", cvId)
    .single();

  if (cvErr || !cv) {
    return NextResponse.json({ error: "cv not found" }, { status: 404 });
  }

  await supabase.from("cvs").update({ status: "scoring", error: null }).eq("id", cvId);

  try {
    const job = (cv as unknown as { job_specs: { title: string; company: string | null; description: string; requirements: unknown; weights: unknown; blind_mode: boolean; knockout_criteria: unknown } }).job_specs;
    const knockoutCriteria = Array.isArray(job.knockout_criteria) ? job.knockout_criteria : [];
    const { result, model } = await scoreCv({
      jobSpec: {
        title: job.title,
        company: job.company,
        description: job.description,
        requirements: job.requirements,
        blindMode: job.blind_mode,
      },
      cvText: cv.parsed_text,
      weights: normaliseWeights(
        (job.weights as Record<string, number> | null) ?? null,
      ),
      knockoutCriteria,
    });

    // Upsert score (unique on cv_id, so re-scoring replaces the previous result)
    const { error: scoreErr } = await supabase
      .from("scores")
      .upsert(
        {
          cv_id: cvId,
          user_id: user.id,
          job_spec_id: cv.job_spec_id,
          overall_score: result.overallScore,
          verdict: result.verdict,
          confidence: result.confidence,
          result,
          model,
          knockout_results: result.knockoutResults ?? null,
          has_hard_reject: result.hasHardReject ?? false,
        },
        { onConflict: "cv_id" },
      );
    if (scoreErr) throw new Error(scoreErr.message);

    await supabase.from("cvs").update({ status: "scored" }).eq("id", cvId);

    return NextResponse.json({ result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "scoring failed";
    await supabase.from("cvs").update({ status: "failed", error: message }).eq("id", cvId);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
