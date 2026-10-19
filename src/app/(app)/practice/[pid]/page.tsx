import { notFound, redirect } from "next/navigation";
import { createAttempt } from "@/lib/attempts";
import { requireUserId } from "@/lib/auth";
import { loadList } from "@/lib/lists";
import { problemProgress } from "@/lib/progress";
import { db } from "@/lib/supabase/server";
import type { Attempt, Problem } from "@/lib/types";
import type { CoachMessage } from "@/lib/coach";
import Practice from "./Practice";

export default async function PracticePage({
  params,
  searchParams,
}: {
  params: Promise<{ pid: string }>;
  searchParams: Promise<{ list?: string }>;
}) {
  const uid = await requireUserId();
  const [{ pid }, { list: requestedList = null }] = await Promise.all([params, searchParams]);
  const sb = db();
  const requested = requestedList ? loadList(requestedList, uid) : null;
  const [{ data: problem }, { data: latest }, progress] = await Promise.all([
    sb.from("problems").select("*").eq("id", pid).maybeSingle<Problem>(),
    sb
      .from("attempts")
      .select("*")
      .eq("user_id", uid)
      .eq("problem_id", pid)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<Attempt>(),
    problemProgress(uid),
  ]);
  if (!problem) notFound();
  if (problem.stage !== "ready") redirect(`/import?links=${pid}`);

  const attempt: Attempt = latest ?? (await createAttempt(uid, pid, requestedList));
  const listId = requestedList ?? attempt.list_id;
  const mainIdea = problem.ideas[0]?.slug;
  const [loaded, { data: same }] = await Promise.all([
    requested ?? (listId ? loadList(listId, uid) : null),
    mainIdea
      ? sb.from("problems").select("id, title").eq("stage", "ready").neq("id", pid).contains("ideas", JSON.stringify([{ slug: mainIdea }])).limit(20)
      : { data: [] as { id: string; title: string | null }[] },
  ]);

  let list = null;
  let next: { href: string; title: string } | null = null;
  if (loaded) {
    const { items } = loaded;
    list = {
      id: loaded.list.id,
      name: loaded.list.name,
      items: items.map((i) => ({ id: i.id, title: i.title ?? i.id, done: !!progress.get(i.id)?.done, current: i.id === pid })),
    };
    const n = items[items.findIndex((i) => i.id === pid) + 1];
    if (n) next = { href: `/practice/${n.id}?list=${loaded.list.id}`, title: n.title ?? n.id };
  }
  if (!next) {
    const n = (same ?? []).find((p) => !progress.get(p.id)?.done);
    if (n) next = { href: `/practice/${n.id}`, title: n.title ?? n.id };
  }

  return (
    <Practice
      key={attempt.id}
      attemptId={attempt.id}
      initialMessages={attempt.messages as CoachMessage[]}
      done={attempt.status === "done"}
      problem={{
        id: problem.id,
        title: problem.title ?? problem.id,
        url: problem.url,
        statement: problem.statement ?? "",
        samples: problem.samples,
        timeLimit: problem.time_limit,
        memoryLimit: problem.memory_limit,
        ideas: problem.ideas.map((i) => ({ slug: i.slug, role: i.role })),
        blanks: problem.blanks
          ? { code: problem.blanks.code, placeholders: Object.fromEntries(problem.blanks.answers.map((a) => [a.id, a.placeholder])) }
          : null,
        points: (problem.key_points ?? []).map((k) => ({ id: k.id, type: k.type })),
      }}
      list={list}
      next={next}
      listParam={loaded ? listId : null}
    />
  );
}
