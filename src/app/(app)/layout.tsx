import Link from "next/link";
import { requireUser, requireUserId } from "@/lib/auth";
import { getT } from "@/lib/lang";
import { db } from "@/lib/supabase/server";
import { Logo, Star } from "@/components/icons";
import { LangMenu, NavLinks, UserMenu } from "@/components/HeaderMenus";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const uid = await requireUserId();
  const [me, { t }, { count }] = await Promise.all([
    requireUser(),
    getT(),
    db().from("trap_cards").select("*", { count: "exact", head: true }).eq("user_id", uid),
  ]);
  return (
    <div className="flex min-h-screen flex-col lg:h-dvh">
      <header className="relative z-10 flex flex-none flex-wrap items-center justify-between gap-3 border-b border-line bg-card px-4 py-2 sm:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/" className="flex min-h-10 items-center gap-2.5">
            <Logo />
            <span className="font-display text-lg font-bold tracking-tight">OI Coach</span>
          </Link>
          <NavLinks />
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/review/traps"
            className="flex min-h-10 items-center gap-1.5 rounded-full border border-line px-3 text-[13px] text-muted hover:text-ink"
          >
            <Star size={14} className="text-[#B4470F]" />
            <span>{t.header.trapDeck(count ?? 0)}</span>
          </Link>
          <LangMenu />
          <UserMenu name={me.name} />
        </div>
      </header>
      <div className="lg:min-h-0 lg:flex-1">{children}</div>
    </div>
  );
}
