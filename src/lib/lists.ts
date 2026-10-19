import { db } from "./supabase/server";
import type { KeyPoint, ProblemIdea } from "./types";

export type ListProblem = { id: string; title: string | null; ideas: ProblemIdea[]; key_points: KeyPoint[] | null };

// The list, its problems and the viewer's membership in one parallel batch; null if the viewer can't see it.
export async function loadList(listId: string, userId: string) {
  const sb = db();
  const [{ data: list, error }, { data: member }, { data: items }] = await Promise.all([
    sb.from("lists").select("id, name, owner, visibility, due_date, profiles!lists_owner_fkey(name)").eq("id", listId).maybeSingle(),
    sb.from("list_members").select("assigned").eq("list_id", listId).eq("user_id", userId).maybeSingle(),
    sb.from("list_items").select("position, problems(id, title, ideas, key_points)").eq("list_id", listId).order("position"),
  ]);
  if (error) throw error;
  if (!list || (list.owner !== userId && list.visibility === "private" && !member)) return null;
  return {
    list: { ...list, ownerName: (list.profiles as unknown as { name: string }).name },
    member: member as { assigned: boolean } | null,
    items: (items ?? []).map((r) => r.problems as unknown as ListProblem),
  };
}
