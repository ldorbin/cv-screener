import { CLAUDE_MODEL, getAnthropic } from "@/lib/anthropic";
import { buildScoringTool } from "./tool-schema";
import { SYSTEM_PROMPT, buildUserPrompt, type BuildUserPromptArgs } from "./prompts";
import type { ScoreResult } from "@/types";

export interface ScoreCvResult {
  result: ScoreResult;
  model: string;
  inputTokens: number;
  outputTokens: number;
}

export async function scoreCv(args: BuildUserPromptArgs): Promise<ScoreCvResult> {
  const anthropic = getAnthropic();
  const tool = buildScoringTool(args.knockoutCriteria ?? []);

  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 4096,
    temperature: 0.2,
    system: SYSTEM_PROMPT,
    tools: [tool],
    tool_choice: { type: "tool", name: tool.name },
    messages: [{ role: "user", content: buildUserPrompt(args) }],
  });

  const toolUse = response.content.find((c) => c.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error(
      `Claude did not call the scoring tool. stop_reason=${response.stop_reason}, output_tokens=${response.usage.output_tokens}`,
    );
  }

  const result = toolUse.input as ScoreResult;

  // Sanity-check the shape; the model occasionally drops a field.
  const missingFields = ["overallScore", "verdict", "dimensions", "summary"].filter(
    (f) => !(f in (result as unknown as Record<string, unknown>)),
  );
  if (missingFields.length > 0 || typeof result.overallScore !== "number") {
    throw new Error(
      `Claude returned an incomplete evaluation. Missing fields: ${missingFields.join(", ") || "none (overallScore wrong type)"}`,
    );
  }

  return {
    result,
    model: CLAUDE_MODEL,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
}
