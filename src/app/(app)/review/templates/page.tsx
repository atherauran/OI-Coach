import Link from "next/link";
import { requireUser, requireUserId } from "@/lib/auth";
import { daysToContest } from "@/lib/dates";
import { ideaName } from "@/lib/ideas";
import { getT } from "@/lib/lang";
import { contestPressure, mastery } from "@/lib/review";
import { db } from "@/lib/supabase/server";
import { Bar } from "@/components/ui";

export default async function TemplatesPage() {
  const uid = await requireUserId();
  const [me, { t, lang }, { data }] = await Promise.all([
    requireUser(),
    getT(),
    db().from("templates").select("slug, halflife, last_reviewed_at, last_score").eq("user_id", uid),
  ]);
  const { threshold } = contestPressure(me);
  const rows = (data ?? [])
    .map((r) => ({ ...r, m: mastery(r.halflife, r.last_reviewed_at) }))
    .sort((a, b) => a.m - b.m);
  const days = daysToContest(me.contest_date);

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p className="text-sm text-muted">{t.review.templatesSub}</p>
        <Link href="/settings" className="link text-sm">
          {days !== null ? t.home.contestIn(me.contest_name ?? t.home.contest, days) : t.review.setContest}
        </Link>
      </div>
      {rows.length ? (
        <div className="card flex flex-col px-5 py-2">
          {rows.map((r) => (
            <Link key={r.slug} href={`/review/templates/${r.slug}`} className="flex min-h-14 items-center gap-4 border-t border-line-soft py-2 first:border-t-0">
              <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                <span className="flex items-center gap-2">
                  <span className="font-semibold">{ideaName(r.slug, lang)}</span>
                  {r.m < threshold && <span className="rounded-md bg-warn-soft px-2 py-px text-[11px] font-semibold text-warn">{t.review.due}</span>}
                </span>
                <Bar value={r.m} className="max-w-[320px]" />
              </span>
              <span className="text-[13px] text-muted">{t.review.mastery(Math.round(r.m * 100))}</span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="card p-5 text-sm text-muted">{t.review.noTemplates}</div>
      )}
    </>
  );
}
