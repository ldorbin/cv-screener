import { NextRequest, NextResponse } from "next/server";
import { parseFile } from "@/lib/parse";
import { scoreCv } from "@/lib/scoring/score";
import { normaliseWeights } from "@/lib/scoring/weights";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const file = form.get("cv");
    const jobTitle = form.get("jobTitle");
    const jobDescription = form.get("jobDescription");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "cv file required" }, { status: 400 });
    }
    if (typeof jobTitle !== "string" || jobTitle.trim().length < 2) {
      return NextResponse.json({ error: "jobTitle required" }, { status: 400 });
    }
    if (typeof jobDescription !== "string" || jobDescription.trim().length < 20) {
      return NextResponse.json({ error: "jobDescription must be at least 20 characters" }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "file too large (max 10 MB)" }, { status: 413 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = await parseFile(buffer, file.name);

    const { result } = await scoreCv({
      jobSpec: {
        title: jobTitle.trim(),
        company: null,
        description: jobDescription.trim(),
        requirements: null,
        blindMode: false,
      },
      cvText: parsed.text,
      weights: normaliseWeights(null),
      knockoutCriteria: [],
    });

    return NextResponse.json({ result, candidateName: parsed.candidateName });
  } catch (e) {
    const message = e instanceof Error ? e.message : "analysis failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
