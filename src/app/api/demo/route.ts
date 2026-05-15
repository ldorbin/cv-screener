import { NextRequest, NextResponse } from "next/server";
import { parseFile } from "@/lib/parse";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const file = form.get("cv");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "cv file required" }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "file too large (max 10 MB)" }, { status: 413 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = await parseFile(buffer, file.name);

    return NextResponse.json({ cvText: parsed.text, candidateName: parsed.candidateName });
  } catch (e) {
    const message = e instanceof Error ? e.message : "parse failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
