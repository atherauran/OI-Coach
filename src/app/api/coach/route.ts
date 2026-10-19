import { convertToModelMessages, createUIMessageStreamResponse, generateId, isStepCount, streamText, toUIMessageStream } from "ai";
import { effort, model } from "@/lib/ai";
import { getUserId } from "@/lib/auth";
import { coachState, coachTools, type CoachMessage, type Session } from "@/lib/coach";
import { db } from "@/lib/supabase/server";
import { coachInstructions } from "@/prompts/coach";
import type { Attempt, Problem } from "@/lib/types";

export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) return new Response("unauthorized", { status: 401 });
  const { attemptId, messages } = (await req.json()) as { attemptId: string; messages: CoachMessage[] };

  const sb = db();
  const { data: row } = await sb
    .from("attempts")
    .select("id, user_id, problem_id, list_id, status, found, hinted, hints_left, verdicts, rating, updated_at, problems(*)")
    .eq("id", attemptId)
    .eq("user_id", userId)
    .single();
  if (!row) return new Response("not found", { status: 404 });
  const { problems: problem, ...attempt } = row;

  const s: Session = { attempt: { ...attempt, messages } as Attempt, problem: problem as unknown as Problem, hintRequested: false };
  const last = messages[messages.length - 1];
  const report = last?.role === "user" ? last.metadata : undefined;
  if (report?.hint && s.attempt.hints_left > 0 && s.attempt.status === "active") s.hintRequested = true;
  if (report?.verdict) s.attempt.verdicts.push({ verdict: report.verdict, at: new Date().toISOString() });

  const codeShown = messages.some((m) => m.parts.some((p) => p.type === "tool-show_code"));
  const accepted = s.attempt.verdicts.some((v) => v.verdict === "AC");
  const active: (keyof ReturnType<typeof coachTools>)[] =
    s.attempt.status === "done"
      ? []
      : [
          "reveal_point",
          "claim_card",
          ...(codeShown ? [] : (["show_code"] as const)),
          ...(s.hintRequested ? (["give_hint"] as const) : []),
          ...(accepted ? (["wrap_up"] as const) : []),
        ];

  const result = streamText({
    model: model(),
    instructions: coachInstructions(coachState(s, codeShown, report)),
    messages: await convertToModelMessages(messages),
    tools: coachTools(s),
    activeTools: active,
    stopWhen: isStepCount(5),
    providerOptions: effort("low"),
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      originalMessages: messages,
      // Without this the saved reply can get an empty id, which breaks React keys after a reload.
      generateMessageId: generateId,
      sendReasoning: false,
      onEnd: async ({ messages: all }) => {
        await sb
          .from("attempts")
          .update({
            messages: all,
            found: s.attempt.found,
            hinted: s.attempt.hinted,
            hints_left: s.attempt.hints_left,
            verdicts: s.attempt.verdicts,
            updated_at: new Date().toISOString(),
          })
          .eq("id", attemptId);
      },
    }),
  });
}
