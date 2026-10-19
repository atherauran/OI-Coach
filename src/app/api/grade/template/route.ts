import { z } from "zod";
import { generateJson } from "@/lib/ai";
import { getUserId } from "@/lib/auth";
import { getOrCreateDetails } from "@/lib/ideaDetails";
import { IDEA_BY_SLUG } from "@/lib/ideas";
import { nextHalflife } from "@/lib/review";
import { db } from "@/lib/supabase/server";
import { templateInstructions, templatePrompt } from "@/prompts/grader";

export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) return new Response("unauthorized", { status: 401 });
  const { slug, code } = (await req.json()) as { slug: string; code: string };
  try {
    const details = await getOrCreateDetails(slug);
    const result = await generateJson({
      instructions: templateInstructions,
      prompt: templatePrompt({ idea: IDEA_BY_SLUG.get(slug)?.zh ?? slug, reference: details.template, code }),
      schema: z.object({ score: z.number(), feedback: z.string() }),
      effort: "low",
    });
    const sb = db();
    const { data: row } = await sb.from("templates").select("halflife, reviews").eq("user_id", userId).eq("slug", slug).maybeSingle();
    await sb.from("templates").upsert({
      user_id: userId,
      slug,
      halflife: nextHalflife(row?.halflife ?? 1, result.score),
      reviews: (row?.reviews ?? 0) + 1,
      last_score: result.score,
      last_reviewed_at: new Date().toISOString(),
    });
    await sb.from("review_log").insert({ user_id: userId, kind: "template", ref: slug, correct: result.score >= 80 });
    return Response.json(result);
  } catch (e) {
    console.error("grade template", e);
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
