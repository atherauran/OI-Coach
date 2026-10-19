import { createDeepSeek } from "@ai-sdk/deepseek";
import { generateText } from "ai";
import type { z } from "zod";

export function model() {
  return createDeepSeek({ apiKey: process.env.DEEPSEEK_API_KEY })(process.env.DEEPSEEK_MODEL ?? "deepseek-flash");
}

export type Effort = "low" | "high" | "max";
export const effort = (e: Effort) => ({ deepseek: { reasoningEffort: e } });

function extractJson(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  return JSON.parse(raw.slice(start, end + 1));
}

// Asks for strict JSON, validates it, and feeds validation errors back for a second try.
export async function generateJson<T>(opts: {
  instructions: string;
  prompt: string;
  schema: z.ZodType<T>;
  check?: (value: T) => string | null;
  effort?: Effort;
  tries?: number;
}): Promise<T> {
  const tries = opts.tries ?? 3;
  let prompt = opts.prompt;
  let lastError = "";
  for (let i = 0; i < tries; i++) {
    const { text } = await generateText({
      model: model(),
      instructions: opts.instructions,
      prompt,
      providerOptions: effort(opts.effort ?? "high"),
    });
    try {
      const value = opts.schema.parse(extractJson(text));
      const problem = opts.check?.(value);
      if (!problem) return value;
      lastError = problem;
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }
    prompt = `${opts.prompt}\n\nYour previous answer was rejected: ${lastError}\nReturn corrected strict JSON only.`;
  }
  throw new Error(`model output invalid: ${lastError}`);
}
