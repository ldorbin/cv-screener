import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CLAUDE_MODEL, getAnthropic } from "@/lib/anthropic";
import type { ScoreResult } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { cvId } = await request.json().catch(() => ({}));
  if (typeof cvId !== "string") {
    return NextResponse.json({ error: "cvId required" }, { status: 400 });
  }

  const { data: score } = await supabase
    .from("scores")
    .select("*, cvs(candidate_name, file_name, job_specs(title, company))")
    .eq("cv_id", cvId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!score) return NextResponse.json({ error: "score not found" }, { status: 404 });

  const result = score.result as ScoreResult;
  const cvMeta = score.cvs as { candidate_name: string | null; file_name: string | null; job_specs: { title: string; company: string | null } };
  const candidateName = cvMeta.candidate_name ?? cvMeta.file_name ?? "the candidate";
  const roleTitle = cvMeta.job_specs.title;
  const company = cvMeta.job_specs.company;

  const prompt = `You are a recruitment consultant preparing a candidate submission note for a hiring manager.

Candidate: ${candidateName}
Role: ${roleTitle}${company ? ` at ${company}` : ""}
Overall score: ${result.overallScore}/100 (${result.verdict.replace("-", " ")}, ${result.confidence} confidence)

Summary from screening: ${result.summary}

Strengths: ${result.strengths.join("; ")}
Gaps: ${result.gaps.join("; ")}
Transferable strengths: ${result.transferableStrengths.join("; ")}
Key interview probes: ${result.interviewProbes.slice(0, 3).join("; ")}
${result.redFlags.length > 0 ? `Red flags: ${result.redFlags.join("; ")}` : ""}

Write a concise hiring manager brief with exactly three sections:

## Why they fit
2-3 sentences. Lead with their strongest evidence-backed qualification for this role. Be specific, not generic.

## Where they fall short
1-2 sentences. Name the real gaps honestly. If there are none material, say so briefly.

## How to present them
1-2 sentences. Practical advice for the recruiter on how to position this candidate — what angle to lead with, what to address proactively.

Keep the whole brief under 200 words. Write in plain, professional English — no bullet points, no filler phrases.`;

  const anthropic = getAnthropic();
  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 400,
    temperature: 0.3,
    messages: [{ role: "user", content: prompt }],
  });

  const brief = response.content.find((c) => c.type === "text")?.text ?? "";
  return NextResponse.json({ brief });
}
