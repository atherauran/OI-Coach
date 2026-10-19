"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUserId } from "@/lib/auth";
import { addDays, today } from "@/lib/dates";
import { RECALL_DAYS } from "@/lib/review";
import { db } from "@/lib/supabase/server";

export async function logIdentify(problemId: string, correct: boolean) {
  const uid = await requireUserId();
  await db().from("review_log").insert({ user_id: uid, kind: "identify", ref: problemId, correct });
}

export async function answerRecall(problemId: string, remembered: boolean) {
  const uid = await requireUserId();
  const sb = db();
  const { data: item } = await sb.from("recall_items").select("stage").eq("user_id", uid).eq("problem_id", problemId).single();
  if (!item) return;
  const stage = remembered ? item.stage + 1 : item.stage;
  const due = !remembered ? addDays(today(), 1) : stage >= RECALL_DAYS.length ? null : addDays(today(), RECALL_DAYS[stage]);
  await sb.from("recall_items").update({ stage, due_on: due }).eq("user_id", uid).eq("problem_id", problemId);
  await sb.from("review_log").insert({ user_id: uid, kind: "recall", ref: problemId, correct: remembered });
}

export async function removeTrap(id: string) {
  const uid = await requireUserId();
  await db().from("trap_cards").delete().eq("id", id).eq("user_id", uid);
  revalidatePath("/review/traps");
}

export async function removeTemplate(slug: string) {
  const uid = await requireUserId();
  await db().from("templates").delete().eq("user_id", uid).eq("slug", slug);
  redirect("/review/templates");
}
