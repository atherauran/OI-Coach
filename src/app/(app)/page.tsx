import Link from "next/link";
import { requireUser, requireUserId } from "@/lib/auth";
import { daysToContest } from "@/lib/dates";
import { IDEAS, ideaName } from "@/lib/ideas";
import { getT } from "@/lib/lang";
import { problemProgress } from "@/lib/progress";
import { dailyQueue } from "@/lib/review";
import { db } from "@/lib/supabase/server";
import { Check, Cycle, Eye, Pen } from "@/components/icons";
import { TypeTag } from "@/components/ui";
import type { KeyPoint, ProblemIdea } from "@/lib/types";
import HomeImport from "./HomeImport";

export default async function Home() {
  const uid = await requireUserId();
  const sb = db();

  const [me, { t, lang }, { data: active }, { data: problems }, queue, { data: owned }, { data: memberOf }, progress] = await Promise.all([
    requireUser(),
    getT(),
    sb
      .from("attempts")
      .select("problem_id, list_id, found, problems(title, key_points, ideas)")
      .eq("user_id", uid)
      .eq("status", "active")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    sb.from("problems").select("id, ideas").eq("stage", "ready"),
    dailyQueue(uid, requireUser()),
    sb.from("lists").select("id, name, visibility, due_date, list_items(count)").eq("owner", uid).order("created_at", { ascending: false }).limit(4),
    sb
      .from("list_members")
      .select("assigned, lists(id, name, due_date, owner, profiles!lists_owner_fkey(name), list_items(count))")
      .eq("user_id", uid)
      .eq("assigned", true),
    problemProgress(uid),
  ]);

  const all = (problems ?? []) as { id: string; ideas: ProblemIdea[] }[];
  const dueIdeas = new Set([
    ...queue.templates.map((x) => x.slug),
    ...queue.recall.flatMap((r) => all.find((p) => p.id === r.problemId)?.ideas.map((i) => i.slug) ?? []),
  ]);
  const tiles = IDEAS.map((idea) => {
    const ps = all.filter((p) => p.ideas.some((i) => i.slug === idea.slug));
    return {
      idea,
      total: ps.length,
      done: ps.filter((p) => progress.get(p.id)?.done).length,
      active: ps.some((p) => progress.get(p.id)?.activeFound != null),
      due: dueIdeas.has(idea.slug),
    };
  })
    .filter((x) => x.total > 0)
    .sort((a, b) => Number(b.active) - Number(a.active) || Number(b.due) - Number(a.due) || b.done - a.done || b.total - a.total)
    .slice(0, 9);

  type MemberRow = { lists: { id: string; name: string; due_date: string | null; profiles: { name: string }; list_items: { count: number }[] } };
  const assigned = ((memberOf ?? []) as unknown as MemberRow[]).map((m) => m.lists);
  const listRows = [
    ...assigned.map((l) => ({
      id: l.id,
      name: l.name,
      meta: t.home.assignedBy(l.profiles.name, l.due_date),
      count: l.list_items[0]?.count ?? 0,
    })),
    ...(owned ?? []).map((l) => ({
      id: l.id,
      name: l.name,
      meta: t.visibility[l.visibility as "private"],
      count: l.list_items[0]?.count ?? 0,
    })),
  ].slice(0, 5);

  const contestDays = daysToContest(me.contest_date);
  const a = active as unknown as {
    problem_id: string;
    list_id: string | null;
    found: Record<string, string>;
    problems: { title: string; key_points: KeyPoint[]; ideas: ProblemIdea[] };
  } | null;
  const tasks = [
    queue.identify.length > 0 && { icon: <Eye size={18} />, color: "bg-accent-soft text-accent-dark", title: t.home.taskIdentify(queue.identify.length), sub: t.home.taskIdentifySub },
    queue.recall.length > 0 && { icon: <Cycle size={18} />, color: "bg-warn-soft text-warn", title: t.home.taskRecall(queue.recall.length), sub: t.home.taskRecallSub },
    queue.templates.length > 0 && {
      icon: <Pen size={18} />,
      color: "bg-[#F0EAFB] text-[#4C1D95]",
      title: t.home.taskTemplate(queue.templates.length),
      sub: queue.templates.map((x) => ideaName(x.slug, lang)).join("、"),
    },
  ].filter(Boolean) as { icon: React.ReactNode; color: string; title: string; sub: string }[];

  return (
    <main className="mx-auto flex max-w-[1200px] flex-col gap-4 px-5 pb-10 pt-5">
      <section className="card flex flex-col gap-3 px-5 py-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="font-display text-[22px] font-bold">{t.home.pasteTitle}</h1>
          <span className="text-sm text-muted">{t.home.luoguOnly}</span>
        </div>
        <HomeImport />
      </section>

      <div className="flex flex-wrap items-stretch gap-4">
        <section className="flex min-w-0 flex-[999_1_520px] flex-col gap-4 rounded-[14px] bg-card p-5">
          <span className="font-semibold text-muted">{t.home.continue}</span>
          {a ? (
            <>
              <div className="flex flex-col gap-0.5">
                <h2 className="font-display text-[28px] font-bold">{a.problems.title}</h2>
                <span className="text-sm text-muted">{a.problems.ideas.map((i) => ideaName(i.slug, lang)).join(" · ")}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {a.problems.key_points.map((k) =>
                  a.found[k.id] ? (
                    <span key={k.id} className="flex items-center gap-1.5 rounded-md border border-line px-2 py-1 text-xs font-semibold">
                      <TypeTag type={k.type} lang={lang} />
                      {k.name}
                    </span>
                  ) : (
                    <span key={k.id} className="rounded-md border border-dashed border-[#A9AEBB] px-2.5 py-1 text-xs font-semibold text-muted">
                      {t.pointType[k.type]}
                    </span>
                  ),
                )}
              </div>
              <div className="mt-auto flex flex-wrap items-center gap-3.5">
                <Link href={`/practice/${a.problem_id}${a.list_id ? `?list=${a.list_id}` : ""}`} className="btn-primary">
                  {t.home.continue}
                </Link>
                <span className="text-sm text-muted">{t.home.foundOf(Object.keys(a.found).length, a.problems.key_points.length)}</span>
              </div>
            </>
          ) : (
            <p className="text-muted">{t.home.noActive}</p>
          )}
        </section>

        <section className="card flex min-w-0 flex-[1_1_340px] flex-col gap-3.5 px-5 py-4">
          <h2 className="font-semibold">{t.home.tasks}</h2>
          {tasks.length ? (
            <ul className="flex flex-col gap-3">
              {tasks.map((task) => (
                <li key={task.title} className="flex items-start gap-3">
                  <span className={`flex h-9 w-9 flex-none items-center justify-center rounded-[10px] ${task.color}`}>{task.icon}</span>
                  <span className="flex flex-col">
                    <span className="text-sm font-semibold">{task.title}</span>
                    <span className="text-[13px] text-muted">{task.sub}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">{t.home.noTasks}</p>
          )}
          {tasks.length > 0 && (
            <Link href="/review" className="btn-outline mt-auto">
              {t.home.startReview}
            </Link>
          )}
        </section>
      </div>

      <div className="flex flex-wrap items-start gap-4">
        <section className="card flex min-w-0 flex-[999_1_600px] flex-col gap-4 px-5 py-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2.5">
            <div className="flex flex-wrap items-baseline gap-3">
              <h2 className="font-semibold">{t.nav.ideas}</h2>
              {contestDays !== null && (
                <span className="text-[13px] text-muted">{t.home.contestIn(me.contest_name ?? t.home.contest, contestDays)}</span>
              )}
            </div>
            <Link href="/ideas" className="link text-sm">
              {t.home.allIdeas}
            </Link>
          </div>
          {tiles.length ? (
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(180px,100%),1fr))] gap-2.5">
              {tiles.map((x) => (
                <Link
                  key={x.idea.slug}
                  href={`/ideas/${x.idea.slug}`}
                  className={`flex min-h-[76px] flex-col gap-0.5 rounded-xl border px-3.5 py-3 hover:border-ink ${
                    x.done === x.total ? "border-[#BFE0CC] bg-[#F3FAF5]" : "border-line"
                  }`}
                >
                  <span className="text-sm font-semibold">{lang === "zh" ? x.idea.zh : x.idea.en}</span>
                  <span className="text-[13px] text-muted">{t.category[x.idea.cat]}</span>
                  <span className="mt-auto flex flex-wrap items-center gap-2 pt-2">
                    <span className={`flex items-center gap-1 text-[13px] ${x.done === x.total ? "font-medium text-good" : "text-ink-2"}`}>
                      {x.done === x.total && <Check size={13} />}
                      {t.home.doneOf(x.done, x.total)}
                    </span>
                    {x.due && <span className="rounded-md bg-warn-soft px-2 py-px text-[11px] font-semibold text-warn">{t.home.reviewDue}</span>}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">{t.home.noIdeas}</p>
          )}
        </section>

        <section className="card flex min-w-0 flex-[1_1_340px] flex-col gap-1 px-5 py-4">
          <div className="mb-1.5 flex items-baseline justify-between">
            <h2 className="font-semibold">{t.nav.lists}</h2>
            <Link href="/lists" className="link text-sm">
              {t.common.all}
            </Link>
          </div>
          {listRows.length ? (
            listRows.map((l) => (
              <Link key={l.id} href={`/lists/${l.id}`} className="flex min-h-12 items-center justify-between gap-2.5 border-t border-line-soft py-1.5">
                <span className="flex min-w-0 flex-col">
                  <span className="text-sm font-semibold">{l.name}</span>
                  <span className="text-xs text-muted">{l.meta}</span>
                </span>
                <span className="flex-none font-display text-sm font-bold">{t.lists.count(l.count)}</span>
              </Link>
            ))
          ) : (
            <p className="text-sm text-muted">{t.home.noLists}</p>
          )}
        </section>
      </div>
    </main>
  );
}
