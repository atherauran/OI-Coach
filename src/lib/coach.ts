import { tool, type InferUITools, type UIMessage } from "ai";
import { z } from "zod";
import { addDays, today } from "./dates";
import { RECALL_DAYS, recallPoint } from "./review";
import { db } from "./supabase/server";
import type { Attempt, KeyPoint, Problem } from "./types";

export type CoachMeta = { hint?: boolean; verdict?: string; fills?: Record<number, string> };

// Mutable per-request session state; tools update it and the route persists it at the end.
export type Session = {
  attempt: Attempt;
  problem: Problem;
  hintRequested: boolean;
};

export function rate(unaided: number, total: number) {
  if (unaided >= total) return "S";
  if (unaided / total >= 0.75) return "A";
  if (unaided / total >= 0.5) return "B";
  return "C";
}

async function finish(s: Session, question: string) {
  const { attempt: a, problem: p } = s;
  const points = p.key_points ?? [];
  const hinted = new Set(a.hinted);
  const unaided = points.filter((k) => a.found[k.id] && !hinted.has(k.id)).length;
  const rating = rate(unaided, points.length);
  const weak = points.filter((k) => !a.found[k.id] || hinted.has(k.id));
  const traps = weak.filter((k) => k.type === "trap" || k.type === "condition");
  const sb = db();

  if (traps.length)
    await sb.from("trap_cards").upsert(
      traps.map((k) => ({
        user_id: a.user_id,
        problem_id: p.id,
        point_id: k.id,
        type: k.type,
        name: k.name,
        detail: k.detail,
        reason: a.found[k.id] ? "hinted" : "missed",
      })),
      { onConflict: "user_id,problem_id,point_id" },
    );
  const recall = recallPoint(points, new Set(weak.map((k) => k.id)));
  await sb.from("recall_items").upsert({
    user_id: a.user_id,
    problem_id: p.id,
    point_id: recall.id,
    stage: 0,
    due_on: addDays(today(), RECALL_DAYS[0]),
    created_at: new Date().toISOString(),
  });
  await sb
    .from("attempts")
    .update({ status: "done", rating, finished_at: new Date().toISOString() })
    .eq("id", a.id);
  a.status = "done";
  a.rating = rating;

  return {
    rating,
    unaided,
    total: points.length,
    traps: traps.map((k) => k.name),
    points: points.map((k) => ({ ...k, found: !!a.found[k.id], hinted: hinted.has(k.id) })),
    question,
  };
}

export function coachTools(s: Session) {
  const point = (id: string) => (s.problem.key_points ?? []).find((k) => k.id === id);
  return {
    reveal_point: tool({
      description: "Mark a hidden key point as found because the student's own words show they get it. Flips its card on the map.",
      inputSchema: z.object({
        point_id: z.string().describe("id of the key point, e.g. k2"),
        evidence: z.string().describe("short quote of the student's words that earned it"),
      }),
      execute: async ({ point_id, evidence }) => {
        const k = point(point_id);
        if (!k) throw new Error("unknown point id");
        s.attempt.found[point_id] ??= evidence;
        return { id: k.id, type: k.type, name: k.name, hinted: s.attempt.hinted.includes(k.id) };
      },
    }),
    give_hint: tool({
      description: "Give the hint the student asked for, aimed at one unfound key point. Only when the student requested a hint.",
      inputSchema: z.object({
        point_id: z.string(),
        hint: z.string().describe("the hint, in the student's language; points the way without stating the answer"),
      }),
      execute: async ({ point_id, hint }) => {
        const k = point(point_id);
        if (!k || !s.hintRequested || s.attempt.hints_left <= 0) throw new Error("no hint available now");
        s.hintRequested = false;
        s.attempt.hints_left--;
        if (!s.attempt.hinted.includes(point_id)) s.attempt.hinted.push(point_id);
        return { id: k.id, type: k.type, hint };
      },
    }),
    claim_card: tool({
      description:
        "Show the student a plausible claim to agree with or refute (tests a condition or trap). The tool result is their choice: agree or refute.",
      inputSchema: z.object({ claim: z.string().describe("the claim, in the student's language, phrased as something a classmate might say") }),
      outputSchema: z.enum(["agree", "refute"]),
    }),
    show_code: tool({
      description: "Show the reference code with blanks on decision points. The student fills them, copies the code, submits on the judge, and reports the verdict.",
      inputSchema: z.object({}),
      execute: async () => ({ shown: true }),
    }),
    wrap_up: tool({
      description: "Finish the problem after AC: computes the rating, files trap cards, schedules recall, and shows the wrap-up card.",
      inputSchema: z.object({ question: z.string().describe("one short follow-up question extending the problem, in the student's language") }),
      execute: async ({ question }) => finish(s, question),
    }),
  };
}

export type CoachTools = InferUITools<ReturnType<typeof coachTools>>;
export type CoachMessage = UIMessage<CoachMeta, never, CoachTools>;
export type WrapUp = Awaited<ReturnType<typeof finish>>;

export function coachState(s: Session, codeShown: boolean, report: CoachMeta | undefined) {
  const { attempt: a, problem: p } = s;
  const points = (p.key_points ?? []) as KeyPoint[];
  const line = (k: KeyPoint) => {
    const status = a.found[k.id]
      ? `FOUND${a.hinted.includes(k.id) ? " (after a hint)" : ""}: "${a.found[k.id]}"`
      : a.hinted.includes(k.id)
        ? "HIDDEN, already hinted"
        : "HIDDEN";
    return `- ${k.id} [${k.type}] ${k.name}: ${k.detail} | ${status}`;
  };
  const answers = (p.blanks?.answers ?? []).map((b) => `⟦${b.id}⟧ = ${b.answer}`).join("; ");
  const fills = report?.fills ? Object.entries(report.fills).map(([id, v]) => `⟦${id}⟧ = ${v || "(empty)"}`).join("; ") : "";
  return `# Session state (hidden from the student)
Problem ${p.id}: ${p.title}
Limits: ${p.time_limit ?? "?"} ms, ${p.memory_limit ?? "?"} MB

## Statement
${p.statement}

## Reference analysis
${p.solution}

## Reference code
\`\`\`cpp
${p.code}
\`\`\`

## Code with blanks (what show_code displays)
\`\`\`cpp
${p.blanks?.code}
\`\`\`
Reference answers: ${answers}

## Key points
${points.map(line).join("\n")}

## Progress
- Hints left: ${a.hints_left}
- Student requested a hint just now: ${s.hintRequested ? "YES, call give_hint" : "no"}
- Code with blanks shown: ${codeShown ? "yes" : "no"}
- Verdicts so far: ${a.verdicts.map((v) => v.verdict).join(", ") || "none"}
${report?.verdict ? `- Just reported: ${report.verdict}, with blanks filled as: ${fills}` : ""}
- Attempt finished: ${a.status === "done" ? "yes (just chat; the problem is wrapped up)" : "no"}`;
}
