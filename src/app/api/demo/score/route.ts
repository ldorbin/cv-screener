import { scoreCv } from "@/lib/scoring/score";
import { normaliseWeights } from "@/lib/scoring/weights";

// Edge runtime: genuinely streams and has ~50s execution budget on Netlify
// regardless of plan tier, unlike Lambda which buffers and kills at 10-26s.
export const runtime = "edge";
export const maxDuration = 60;

export async function POST(request: Request) {
  const encoder = new TextEncoder();

  function evt(name: string, data: unknown) {
    return encoder.encode(`event: ${name}\ndata: ${JSON.stringify(data)}\n\n`);
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const body = await request.json() as {
          cvText?: string;
          jobTitle?: string;
          jobDescription?: string;
          candidateName?: string | null;
        };

        const { cvText, jobTitle, jobDescription, candidateName = null } = body;

        if (!cvText || !jobTitle || !jobDescription) {
          controller.enqueue(evt("error", { error: "Missing required fields" }));
          return;
        }

        const { result } = await scoreCv({
          jobSpec: {
            title: jobTitle,
            company: null,
            description: jobDescription,
            requirements: null,
            blindMode: false,
          },
          cvText,
          weights: normaliseWeights(null),
          knockoutCriteria: [],
        });

        controller.enqueue(evt("result", { result, candidateName }));
      } catch (e) {
        const message = e instanceof Error ? e.message : "scoring failed";
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
