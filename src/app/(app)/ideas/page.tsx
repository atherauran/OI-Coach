import Link from "next/link";
import { requireUserId } from "@/lib/auth";
import { CATEGORIES, IDEAS } from "@/lib/ideas";
import { getT } from "@/lib/lang";
import { problemProgress } from "@/lib/progress";
import { db } from "@/lib/supabase/server";
import { Check } from "@/components/icons";
import { PageTitle } from "@/components/ui";
import type { ProblemIdea } from "@/lib/types";

export default async function IdeasPage() {
  const uid = await requireUserId();
  const [{ t, lang }, { data }, progress] = await Promise.all([
    getT(),
    db().from("problems").select("id, ideas").eq("stage", "ready"),
    problemProgress(uid),
  ]);
  const problems = (data ?? []) as { id: string; ideas: ProblemIdea[] }[];

  return (
    <main className="mx-auto flex max-w-[1200px] flex-col gap-4 px-5 pb-10 pt-5">
      <PageTitle>{t.nav.ideas}</PageTitle>
      {CATEGORIES.map((cat) => (
        <section key={cat} className="flex flex-col gap-3">
          <h2 className="font-semibold text-muted">{t.category[cat]}</h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(200px,100%),1fr))] gap-2.5">
            {IDEAS.filter((i) => i.cat === cat).map((idea) => {
              const ps = problems.filter((p) => p.ideas.some((i) => i.slug === idea.slug));
              const done = ps.filter((p) => progress.get(p.id)?.done).length;
              const complete = ps.length > 0 && done === ps.length;
              return (
                <Link
                  key={idea.slug}
                  href={`/ideas/${idea.slug}`}
                  className={`flex min-h-[68px] flex-col justify-between rounded-xl border px-3.5 py-3 ${
                    complete
                      ? "border-[#BFE0CC] bg-[#F3FAF5] hover:border-ink"
                      : ps.length
                        ? "border-line bg-card hover:border-ink"
                        : "border-dashed border-field text-muted"
                  }`}
                >
                  <span className="text-sm font-semibold">{lang === "zh" ? idea.zh : idea.en}</span>
                  <span className={`flex items-center gap-1 text-[13px] ${complete ? "font-medium text-good" : "text-muted"}`}>
                    {complete && <Check size={13} />}
                    {ps.length ? t.home.doneOf(done, ps.length) : t.ideas.noProblems}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </main>
  );
}
