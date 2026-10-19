import { db } from "./supabase/server";

export type Progress = { done: boolean; rating: string | null; activeFound: number | null; attemptAt: string };
const RANK: Record<string, number> = { S: 4, A: 3, B: 2, C: 1 };

// Latest state of each problem for one user: done (with best rating) and/or an active attempt.
// Without pids it covers every problem the user has touched, so it can run in parallel with other queries.
export async function problemProgress(userId: string, pids?: string[]) {
  const map = new Map<string, Progress>();
  if (pids && !pids.length) return map;
  let q = db().from("attempts").select("problem_id, status, found, rating, updated_at").eq("user_id", userId);
  if (pids) q = q.in("problem_id", pids);
  const { data } = await q.order("updated_at", { ascending: false });
  for (const a of data ?? []) {
    const p = map.get(a.problem_id) ?? { done: false, rating: null, activeFound: null, attemptAt: a.updated_at };
    if (a.status === "done") {
      p.done = true;
      if (!p.rating || (RANK[a.rating] ?? 0) > (RANK[p.rating] ?? 0)) p.rating = a.rating;
    } else if (p.activeFound === null) {
      p.activeFound = Object.keys(a.found ?? {}).length;
    }
    map.set(a.problem_id, p);
  }
  return map;
}
