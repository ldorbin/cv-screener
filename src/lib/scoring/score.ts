import { CLAUDE_MODEL, getAnthropic } from "@/lib/anthropic";
import { SCORING_TOOL } from "./tool-schema";
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

  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 2000,
    temperature: 0.2,
    system: SYSTEM_PROMPT,
    tools: [SCORING_TOOL],
    tool_choice: { type: "tool", name: SCORING_TOOL.name },
    messages: [{ role: "user", content: buildUserPrompt(args) }],
  });

  const toolUse = response.content.find((c) => c.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error(
      `Claude did not return a tool_use block. stop_reason=${response.stop_reason}`,
    );
  }

  const result = toolUse.input as ScoreResult;

  // Sanity-check the shape; the model occasionally drops a field.
  if (
    typeof result.overallScore !== "number" ||
    !result.verdict ||
    !result.dimensions ||
    !result.summary
  ) {
    throw new Error("Claude returned an incomplete evaluation");
  }

  return {
    result,
    model: CLAUDE_MODEL,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
}
