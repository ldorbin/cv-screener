import { scoreCv } from "@/lib/scoring/score";
import { normaliseWeights } from "@/lib/scoring/weights";

export const runtime = "edge";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      cvText?: string;
      jobTitle?: string;
      jobDescription?: string;
      candidateName?: string | null;
    };

    const { cvText, jobTitle, jobDescription, candidateName = null } = body;

    if (!cvText || typeof cvText !== "string" || cvText.trim().length < 50) {
      return new Response(JSON.stringify({ error: "CV text missing or too short" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (!jobTitle || !jobDescription) {
      return new Response(JSON.stringify({ error: "Job title and description are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
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

    return new Response(JSON.stringify({ result, candidateName }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "scoring failed";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
