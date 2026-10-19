import Link from "next/link";
import { requireUserId } from "@/lib/auth";
import { getT } from "@/lib/lang";
import { db } from "@/lib/supabase/server";
import { PageTitle } from "@/components/ui";
import { createEmptyList } from "./actions";
import SubmitButton from "@/components/SubmitButton";

type Row = { id: string; name: string; visibility: string; due_date: string | null; profiles?: { name: string }; list_items: { count: number }[] };

export default async function ListsPage() {
  const uid = await requireUserId();
  const sb = db();
  const [{ t }, { data: owned }, { data: joined }] = await Promise.all([
    getT(),
    sb.from("lists").select("id, name, visibility, due_date, list_items(count)").eq("owner", uid).order("created_at", { ascending: false }),
    sb
      .from("list_members")
      .select("assigned, lists(id, name, visibility, due_date, profiles!lists_owner_fkey(name), list_items(count))")
      .eq("user_id", uid),
  ]);
  const j = (joined ?? []) as unknown as { assigned: boolean; lists: Row }[];
  const sections = [
    { title: t.lists.assignedToMe, rows: j.filter((x) => x.assigned).map((x) => x.lists) },
    { title: t.lists.mine, rows: (owned ?? []) as Row[] },
    { title: t.lists.saved, rows: j.filter((x) => !x.assigned).map((x) => x.lists) },
  ];

  return (
    <main className="mx-auto flex max-w-[900px] flex-col gap-4 px-5 pb-10 pt-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageTitle>{t.nav.lists}</PageTitle>
        <form action={createEmptyList} className="flex gap-2">
          <label htmlFor="newlist" className="sr-only">
            {t.lists.newName}
          </label>
          <input id="newlist" name="name" required placeholder={t.lists.newName} className="field min-h-10 w-56" />
          <SubmitButton light className="btn-dark">
            {t.lists.create}
          </SubmitButton>
        </form>
      </div>
      {sections.map(
        (s) =>
          (s.rows.length > 0 || s.title === t.lists.mine) && (
            <section key={s.title} className="card flex flex-col px-5 py-4">
              <h2 className="mb-2 font-semibold">{s.title}</h2>
              {s.rows.length ? (
                s.rows.map((l) => (
                  <Link key={l.id} href={`/lists/${l.id}`} className="flex min-h-12 items-center justify-between gap-3 border-t border-line-soft py-2 hover:text-accent">
                    <span className="flex min-w-0 flex-col">
                      <span className="font-semibold">{l.name}</span>
                      <span className="text-xs text-muted">
                        {l.profiles ? `${l.profiles.name} · ` : ""}
                        {t.visibility[l.visibility as "private"]}
                        {l.due_date ? ` · ${t.lists.due(l.due_date)}` : ""}
                      </span>
                    </span>
                    <span className="font-display text-sm font-bold">{t.lists.count(l.list_items[0]?.count ?? 0)}</span>
                  </Link>
                ))
              ) : (
                <p className="text-sm text-muted">{t.lists.none}</p>
              )}
            </section>
          ),
      )}
    </main>
  );
}
