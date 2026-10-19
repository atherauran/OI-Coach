import { addDays, daysToContest, startOfToday, today } from "./dates";
import { IDEAS } from "./ideas";
import { db } from "./supabase/server";
import type { KeyPoint, Problem, ProblemIdea, Profile } from "./types";

export const RECALL_DAYS = [2, 7, 14];

export const mastery = (halflife: number, lastReviewedAt: string) =>
  Math.pow(2, -(Date.now() - Date.parse(lastReviewedAt)) / 86400000 / halflife);

export function contestPressure(profile: Pick<Profile, "contest_date">) {
  const d = daysToContest(profile.contest_date);
  if (d !== null && d <= 7) return { threshold: 0.85, perDay: 3 };
  if (d !== null && d <= 14) return { threshold: 0.7, perDay: 2 };
  return { threshold: 0.5, perDay: 1 };
}

export const nextHalflife = (h: number, score: number) =>
  score >= 80 ? Math.max(2, h * 2.5) : score >= 50 ? h * 1.2 : Math.max(0.5, h * 0.5);

export type IdentifyQ = { problemId: string; brief: string; options: string[]; correct: number; why: string };
export type RecallQ = { problemId: string; title: string; pointId: string; point: KeyPoint; solvedAgo: number };
export type TemplateQ = { slug: string; mastery: number };

const shuffle = <T,>(a: T[]) => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

async function identifyQuestions(userId: string): Promise<IdentifyQ[]> {
  const sb = db();
  const [{ count }, { data: problems }, { data: recent }] = await Promise.all([
    sb
      .from("review_log")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("kind", "identify")
      .gte("at", startOfToday()),
    sb.from("problems").select("id, brief, ideas").eq("stage", "ready"),
    sb
      .from("review_log")
      .select("ref")
      .eq("user_id", userId)
      .eq("kind", "identify")
      .gte("at", new Date(Date.now() - 14 * 86400000).toISOString()),
  ]);
  if (count) return [];
  const seen = new Set((recent ?? []).map((r) => r.ref));
  const pool = (problems ?? []) as Pick<Problem, "id" | "brief" | "ideas">[];
  const fresh = shuffle(pool.filter((p) => !seen.has(p.id)));
  const picked: typeof pool = [];
  const usedIdeas = new Set<string>();
  for (const p of fresh) {
    if (picked.length < 3 && !usedIdeas.has(p.ideas[0].slug)) {
      picked.push(p);
      usedIdeas.add(p.ideas[0].slug);
    }
  }
  for (const p of fresh) if (picked.length < 3 && !picked.includes(p)) picked.push(p);

  const inUse = [...new Set(pool.flatMap((p) => p.ideas.map((i) => i.slug)))];
  return picked.map((p) => {
    const main: ProblemIdea = p.ideas[0];
    const own = new Set(p.ideas.map((i) => i.slug));
    const preferred = shuffle(inUse.filter((s) => !own.has(s)));
    const rest = shuffle(IDEAS.map((i) => i.slug).filter((s) => !own.has(s) && !preferred.includes(s)));
    const options = shuffle([main.slug, ...[...preferred, ...rest].slice(0, 3)]);
    return { problemId: p.id, brief: p.brief ?? "", options, correct: options.indexOf(main.slug), why: main.why };
  });
}

async function recallQuestions(userId: string): Promise<RecallQ[]> {
  const { data } = await db()
    .from("recall_items")
    .select("problem_id, point_id, created_at, problems(title, key_points)")
    .eq("user_id", userId)
    .lte("due_on", today())
    .order("due_on");
  return (data ?? []).flatMap((r) => {
    const p = r.problems as unknown as { title: string; key_points: KeyPoint[] };
    const point = p.key_points.find((k) => k.id === r.point_id);
    if (!point) return [];
    const solvedAgo = Math.max(0, Math.round((Date.now() - Date.parse(r.created_at)) / 86400000));
    return [{ problemId: r.problem_id, title: p.title, pointId: r.point_id, point, solvedAgo }];
  });
}

// The profile (for the contest date) is passed as a promise so its query overlaps with the others.
export async function dailyQueue(userId: string, profile: Promise<Profile>) {
  const [identify, recall, { data: rows }, me] = await Promise.all([
    identifyQuestions(userId),
    recallQuestions(userId),
    db().from("templates").select("slug, halflife, last_reviewed_at").eq("user_id", userId),
    profile,
  ]);
  const { threshold, perDay } = contestPressure(me);
  const templates: TemplateQ[] = (rows ?? [])
    .map((t) => ({ slug: t.slug, mastery: mastery(t.halflife, t.last_reviewed_at) }))
    .filter((t) => t.mastery < threshold)
    .sort((a, b) => a.mastery - b.mastery)
    .slice(0, perDay);
  return { identify, recall, templates };
}

// Pick what to ask about later: a missed or hinted trap/condition first, then any trap/condition.
export function recallPoint(points: KeyPoint[], weak: Set<string>) {
  const order = ["trap", "condition", "impl", "logic"];
  const ranked = [...points].sort(
    (a, b) => Number(weak.has(b.id)) - Number(weak.has(a.id)) || order.indexOf(a.type) - order.indexOf(b.type),
  );
  return ranked[0];
}

export const scheduleFirstRecall = () => addDays(today(), RECALL_DAYS[0]);
