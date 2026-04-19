import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { scoreCv } from "@/lib/scoring/score";
import { normaliseWeights } from "@/lib/scoring/weights";
import { getUserOrg, checkScoringAllowed, incrementCvCount } from "@/lib/org";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { sourceCvId, targetJobSpecId } = await request.json().catch(() => ({}));
    if (!sourceCvId || !targetJobSpecId) {
      return NextResponse.json({ error: "sourceCvId and targetJobSpecId required" }, { status: 400 });
    }

    const org = await getUserOrg(user.id);
    if (!org) return NextResponse.json({ error: "no organisation" }, { status: 403 });

    const { allowed, reason } = await checkScoringAllowed(org.orgId);
    if (!allowed) return NextResponse.json({ error: reason || "scoring not allowed" }, { status: 403 });

    const { data: sourceCv } = await supabase
      .from("cvs")
      .select("parsed_text, candidate_name, file_name, org_id")
      .eq("id", sourceCvId)
      .single();
    if (!sourceCv) return NextResponse.json({ error: "source CV not found" }, { status: 404 });

    if (sourceCv.org_id && sourceCv.org_id !== org.orgId) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    // Check if this candidate has already been scored for the target job
    const matchField = sourceCv.candidate_name ? "candidate_name" : "file_name";
    const matchValue = sourceCv.candidate_name ?? sourceCv.file_name;
    const { data: existing } = await supabase
      .from("cvs")
      .select("id")
      .eq("job_spec_id", targetJobSpecId)
      .eq(matchField, matchValue)
      .limit(1)
      .maybeSingle();

    if (existing) return NextResponse.json({ existingCvId: existing.id });

    const { data: job } = await supabase
      .from("job_specs")
      .select("*")
      .eq("id", targetJobSpecId)
      .single();
    if (!job) return NextResponse.json({ error: "job spec not found" }, { status: 404 });

    if ((job as { org_id?: string }).org_id && (job as { org_id?: string }).org_id !== org.orgId) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const { data: newCv, error: insertErr } = await supabase
      .from("cvs")
      .insert({
        parsed_text: sourceCv.parsed_text,
        candidate_name: sourceCv.candidate_name,
        file_name: sourceCv.file_name,
        job_spec_id: targetJobSpecId,
        org_id: org.orgId,
        user_id: user.id,
        status: "scoring",
      })
      .select("id")
      .single();

    if (insertErr || !newCv) {
      return NextResponse.json({ error: "failed to create CV record" }, { status: 500 });
    }

    try {
      const knockoutCriteria = Array.isArray(job.knockout_criteria) ? job.knockout_criteria : [];
      const { result, model } = await scoreCv({
        jobSpec: {
          title: job.title,
          company: job.company,
          description: job.description,
          requirements: job.requirements,
          blindMode: job.blind_mode,
        },
        cvText: sourceCv.parsed_text,
        weights: normaliseWeights((job.weights as Record<string, number> | null) ?? null),
        knockoutCriteria,
      });

      await supabase.from("scores").insert({
        cv_id: newCv.id,
        user_id: user.id,
        job_spec_id: targetJobSpecId,
        overall_score: result.overallScore,
        verdict: result.verdict,
        confidence: result.confidence,
        result,
        model,
        knockout_results: result.knockoutResults ?? null,
        has_hard_reject: result.hasHardReject ?? false,
        org_id: org.orgId,
      });

      await supabase.from("cvs").update({ status: "scored" }).eq("id", newCv.id);
      await incrementCvCount(org.orgId);

      return NextResponse.json({ newCvId: newCv.id });
    } catch (e) {
      const message = e instanceof Error ? e.message : "scoring failed";
      await supabase.from("cvs").update({ status: "failed", error: message }).eq("id", newCv.id);
      return NextResponse.json({ error: message }, { status: 500 });
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
