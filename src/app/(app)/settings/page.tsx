import { requireUser, requireUserId } from "@/lib/auth";
import { getT } from "@/lib/lang";
import { db } from "@/lib/supabase/server";
import { PageTitle } from "@/components/ui";
import { createInvite } from "./actions";
import ProfileForm from "./ProfileForm";
import SubmitButton from "@/components/SubmitButton";

export default async function SettingsPage() {
  const uid = await requireUserId();
  const [me, { t }, { data: invites }] = await Promise.all([
    requireUser(),
    getT(),
    db()
      .from("invites")
      .select("code, used_by, profiles!invites_used_by_fkey(name)")
      .eq("created_by", uid)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <main className="mx-auto flex max-w-[720px] flex-col gap-4 px-5 pb-10 pt-5">
      <PageTitle>{t.settings.title}</PageTitle>
      <ProfileForm initial={{ name: me.name, contest_name: me.contest_name ?? "", contest_date: me.contest_date ?? "" }} />

      <section className="card flex flex-col gap-3 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">{t.settings.invites}</h2>
          <form action={createInvite}>
            <SubmitButton className="btn-quiet">{t.settings.newInvite}</SubmitButton>
          </form>
        </div>
        {invites?.length ? (
          <ul className="flex flex-col">
            {invites.map((i) => {
              const usedBy = (i.profiles as unknown as { name: string } | null)?.name;
              return (
                <li key={i.code} className="flex items-center justify-between border-t border-line-soft py-2.5">
                  <span className={`font-mono font-semibold ${usedBy ? "text-faint line-through" : ""}`}>{i.code}</span>
                  <span className="text-[13px] text-muted">{usedBy ? t.settings.usedBy(usedBy) : t.settings.unused}</span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted">{t.settings.noInvites}</p>
        )}
      </section>
    </main>
  );
}
