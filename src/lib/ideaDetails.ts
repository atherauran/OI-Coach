import { z } from "zod";
import { generateJson } from "./ai";
import { IDEA_BY_SLUG } from "./ideas";
import { db } from "./supabase/server";
import { ideaInstructions } from "@/prompts/grader";
import type { IdeaDetails } from "./types";

const schema = z.object({
  intro: z.object({ when: z.array(z.string()).min(1), core: z.string(), example: z.string() }),
  template: z.string().min(10),
  traps: z.array(z.object({ type: z.enum(["condition", "trap", "impl"]), text: z.string() })).min(1),
});

export async function loadDetails(slug: string) {
  const { data } = await db().from("idea_details").select("*").eq("slug", slug).maybeSingle();
  return data as IdeaDetails | null;
}

export async function getOrCreateDetails(slug: string): Promise<IdeaDetails> {
  const existing = await loadDetails(slug);
  if (existing) return existing;
  const idea = IDEA_BY_SLUG.get(slug);
  if (!idea) throw new Error("unknown idea");
  const out = await generateJson({
    instructions: ideaInstructions,
    prompt: `Technique: ${idea.zh} (${idea.en})`,
    schema,
  });
  const row = { slug, ...out };
  await db().from("idea_details").upsert(row);
  return row;
}
