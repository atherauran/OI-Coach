import { z } from "zod";
import { generateJson } from "@/lib/ai";
import { getUserId } from "@/lib/auth";
import { getOrCreateDetails } from "@/lib/ideaDetails";
import { IDEA_BY_SLUG } from "@/lib/ideas";
import { db } from "@/lib/supabase/server";
import { summaryInstructions, summaryPrompt } from "@/prompts/grader";
import type { KeyPoint } from "@/lib/types";

export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) return new Response("unauthorized", { status: 401 });
  const { slug, text } = (await req.json()) as { slug: string; text: string };
  try {
    const details = await getOrCreateDetails(slug);
    const sb = db();
    const { data: done } = await sb
      .from("attempts")
      .select("problems!inner(title, key_points, ideas)")
      .eq("user_id", userId)
      .eq("status", "done")
      .contains("problems.ideas", JSON.stringify([{ slug }]));
    const problems = (done ?? [])
      .map((d) => d.problems as unknown as { title: string; key_points: KeyPoint[] })
      .map((p) => `- ${p.title}: ${p.key_points.map((k) => `${k.name}（${k.detail}）`).join("；")}`)
      .join("\n");
    const feedback = await generateJson({
      instructions: summaryInstructions,
      prompt: summaryPrompt({
        idea: IDEA_BY_SLUG.get(slug)?.zh ?? slug,
        core: details.intro.core,
        traps: details.traps.map((t) => t.text).join("；"),
        problems: problems || "(none)",
        text,
      }),
      schema: z.object({ score: z.number(), got: z.string(), missed: z.string() }),
      effort: "low",
    });
    await sb.from("idea_summaries").upsert({ user_id: userId, slug, text, feedback, updated_at: new Date().toISOString() });
    return Response.json({ feedback, details });
  } catch (e) {
    console.error("grade summary", e);
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
