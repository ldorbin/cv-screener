import Anthropic from "@anthropic-ai/sdk";

export const CLAUDE_MODEL = "claude-haiku-4-5-20251001";

let client: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  if (client) return client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Add it to .env.local (dev) or Netlify env vars (prod).",
    );
  }
  client = new Anthropic({ apiKey });
  return client;
}
