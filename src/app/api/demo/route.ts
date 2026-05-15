import { NextRequest } from "next/server";
import { parseFile } from "@/lib/parse";
import { scoreCv } from "@/lib/scoring/score";
import { normaliseWeights } from "@/lib/scoring/weights";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  function evt(name: string, data: unknown) {
    return encoder.encode(`event: ${name}\ndata: ${JSON.stringify(data)}\n\n`);
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const form = await request.formData();
        const file = form.get("cv");
        const jobTitle = form.get("jobTitle");
        const jobDescription = form.get("jobDescription");

        if (!(file instanceof File)) {
          controller.enqueue(evt("error", { error: "cv file required" }));
          return;
        }
        if (typeof jobTitle !== "string" || jobTitle.trim().length < 2) {
          controller.enqueue(evt("error", { error: "jobTitle required" }));
          return;
        }
        if (typeof jobDescription !== "string" || jobDescription.trim().length < 20) {
          controller.enqueue(evt("error", { error: "jobDescription must be at least 20 characters" }));
          return;
        }
        if (file.size > 10 * 1024 * 1024) {
          controller.enqueue(evt("error", { error: "file too large (max 10 MB)" }));
          return;
        }

        controller.enqueue(evt("status", { message: "Parsing CV…" }));
        const buffer = Buffer.from(await file.arrayBuffer());
        const parsed = await parseFile(buffer, file.name);

        controller.enqueue(evt("status", { message: "Scoring with AI…" }));
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

        controller.enqueue(evt("result", { result, candidateName: parsed.candidateName }));
      } catch (e) {
        const message = e instanceof Error ? e.message : "analysis failed";
        controller.enqueue(evt("error", { error: message }));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
