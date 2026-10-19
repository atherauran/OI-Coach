import { getT } from "./lang";
import { db } from "./supabase/server";
import type { Attempt } from "./types";

export async function createAttempt(userId: string, pid: string, listId: string | null) {
  const { t } = await getT();
  const opener = { id: crypto.randomUUID(), role: "assistant", parts: [{ type: "text", text: t.practice.opener }] };
  const { data, error } = await db()
    .from("attempts")
    .insert({ user_id: userId, problem_id: pid, list_id: listId, messages: [opener] })
    .select("*")
    .single();
  if (error) throw error;
  return data as Attempt;
}
