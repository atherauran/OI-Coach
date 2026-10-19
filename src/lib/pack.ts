import { z } from "zod";
import { generateJson } from "./ai";
import { db } from "./supabase/server";
import { IDEAS, IDEA_BY_SLUG } from "./ideas";
import { fetchLuogu, problemUrl } from "./luogu";
import { fillBlanks } from "./blanks";
import { pointsInstructions, pointsPrompt, solveInstructions, solvePrompt } from "@/prompts/pack";
import type { Problem } from "./types";

export type Stage = Problem["stage"];

async function load(pid: string) {
  const { data } = await db().from("problems").select("*").eq("id", pid).maybeSingle();
  return data as Problem | null;
}

async function save(pid: string, fields: Partial<Problem>) {
  const { error } = await db().from("problems").update({ ...fields, updated_at: new Date().toISOString() }).eq("id", pid);
  if (error) throw error;
}

// Step 1: get the statement, from Luogu or from text the student pasted.
export async function fetchStage(pid: string, userId: string, pasted?: string): Promise<{ stage: Stage; title: string | null }> {
  const existing = await load(pid);
  if (existing && existing.stage !== "new") return { stage: existing.stage, title: existing.title };
  if (!existing) await db().from("problems").insert({ id: pid, url: problemUrl(pid), created_by: userId });

  if (pasted) {
    const firstLine = pasted.trim().split("\n")[0].replace(/^#+\s*/, "").slice(0, 60);
    await save(pid, { title: firstLine || pid, statement: pasted.trim(), stage: "fetched" });
    return { stage: "fetched", title: firstLine || pid };
  }
  const f = await fetchLuogu(pid);
  await save(pid, {
    title: f.title,
    statement: f.statement,
    samples: f.samples,
    time_limit: f.timeLimit,
    memory_limit: f.memoryLimit,
    stage: "fetched",
  });
  return { stage: "fetched", title: f.title };
}

// Step 2: the pack builder solves the problem on its own.
export async function solveStage(pid: string): Promise<Stage> {
  const p = await load(pid);
  if (!p) throw new Error("not found");
  if (p.stage !== "fetched") return p.stage;
  const out = await generateJson({
    instructions: solveInstructions,
    prompt: solvePrompt({
      title: p.title ?? pid,
      statement: p.statement ?? "",
      samples: p.samples,
      timeLimit: p.time_limit,
      memoryLimit: p.memory_limit,
    }),
    schema: z.object({ analysis: z.string().min(20), code: z.string().min(20) }),
    effort: "max",
  });
  await save(pid, { solution: out.analysis, code: out.code.trim(), stage: "solved" });
  return "solved";
}

const pointsSchema = z.object({
  brief: z.string().min(10),
  key_points: z
    .array(
      z.object({
        id: z.string(),
        type: z.enum(["logic", "condition", "trap", "impl"]),
        name: z.string().min(1),
        detail: z.string().min(1),
      }),
    )
    .min(3)
    .max(6),
  blanks: z.object({
    code: z.string(),
    answers: z
      .array(z.object({ id: z.number().int(), answer: z.string().min(1), placeholder: z.string() }))
      .min(1)
      .max(3),
  }),
  ideas: z
    .array(z.object({ slug: z.string(), role: z.enum(["standard", "variant", "disguised", "mixed"]), why: z.string() }))
    .min(1)
    .max(3),
});

const normalize = (code: string) =>
  code
    .split("\n")
    .map((l) => l.trimEnd())
    .join("\n")
    .trim();


// Step 3: key points, blanks on decision points, and idea tags.
export async function pointsStage(pid: string): Promise<Stage> {
  const p = await load(pid);
  if (!p) throw new Error("not found");
  if (p.stage !== "solved") return p.stage;
  const code = p.code ?? "";
  const out = await generateJson({
    instructions: pointsInstructions(IDEAS.map((i) => `${i.slug}: ${i.zh}`).join("\n")),
    prompt: pointsPrompt({ title: p.title ?? pid, statement: p.statement ?? "", analysis: p.solution ?? "", code }),
    schema: pointsSchema,
    check: (v) => {
      const bad = v.ideas.find((i) => !IDEA_BY_SLUG.has(i.slug));
      if (bad) return `unknown idea slug "${bad.slug}"`;
      if (v.blanks.answers.some((a) => a.answer.includes("\n"))) return "each blank answer must be a single line";
      const markers = [...v.blanks.code.matchAll(/⟦(\d+)⟧/g)].map((m) => Number(m[1]));
      if (markers.length !== v.blanks.answers.length || v.blanks.answers.some((a) => !markers.includes(a.id)))
        return "every answer needs exactly one matching ⟦id⟧ marker in blanks.code";
      const fills = Object.fromEntries(v.blanks.answers.map((a) => [a.id, a.answer]));
      if (normalize(fillBlanks(v.blanks.code, fills)) !== normalize(code))
        return "substituting the answers into blanks.code does not reproduce the reference code exactly";
      return null;
    },
  });
  await save(pid, {
    brief: out.brief,
    key_points: out.key_points.map((k, i) => ({ ...k, id: `k${i + 1}` })),
    blanks: out.blanks,
    ideas: out.ideas,
    stage: "ready",
  });
  return "ready";
}
