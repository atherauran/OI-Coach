import Link from "next/link";
import { requireUserId } from "@/lib/auth";
import { getT } from "@/lib/lang";
import { db } from "@/lib/supabase/server";
import { TypeTag } from "@/components/ui";
import type { PointType } from "@/lib/types";
import { removeTrap } from "../actions";
import SubmitButton from "@/components/SubmitButton";

export default async function TrapsPage() {
  const uid = await requireUserId();
  const [{ t, lang }, { data }] = await Promise.all([
    getT(),
    db()
      .from("trap_cards")
      .select("id, problem_id, type, name, detail, reason, created_at, problems(title)")
      .eq("user_id", uid)
      .order("created_at", { ascending: false }),
  ]);
  const cards = (data ?? []) as unknown as {
    id: string;
    problem_id: string;
    type: PointType;
    name: string;
    detail: string;
    reason: "missed" | "hinted";
    problems: { title: string };
  }[];
  return (
    <>
      <p className="text-sm text-muted">{t.review.trapsSub}</p>
      {cards.length ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(320px,100%),1fr))] gap-3">
          {cards.map((c) => (
            <article key={c.id} className="card flex flex-col gap-2 px-5 py-4">
              <div className="flex items-center gap-2">
                <TypeTag type={c.type} lang={lang} />
                <span className="font-semibold">{c.name}</span>
                <span className={`ml-auto text-xs ${c.reason === "missed" ? "text-bad" : "text-[#8A4B0B]"}`}>
                  {c.reason === "missed" ? t.review.missed : t.review.hinted}
                </span>
              </div>
              <p className="text-sm text-ink-2">{c.detail}</p>
              <div className="mt-auto flex items-center justify-between pt-1 text-[13px]">
                <Link href={`/practice/${c.problem_id}`} className="link">
                  {c.problems.title}
                </Link>
                <form action={removeTrap.bind(null, c.id)}>
                  <SubmitButton small className="inline-flex min-h-9 items-center gap-1.5 text-muted hover:text-ink">
                    {t.review.mastered}
                  </SubmitButton>
                </form>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="card p-5 text-sm text-muted">{t.review.noTraps}</div>
      )}
    </>
  );
}
