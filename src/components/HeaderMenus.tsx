"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { setLang, signOut } from "@/app/actions";
import { useT } from "./i18n";
import { Chevron, Globe } from "./icons";
import SubmitButton from "./SubmitButton";
import { Spinner } from "./ui";

export function NavLinks() {
  const { t } = useT();
  const path = usePathname();
  const items = [
    { href: "/", label: t.nav.home },
    { href: "/ideas", label: t.nav.ideas },
    { href: "/lists", label: t.nav.lists },
    { href: "/review", label: t.nav.review },
  ];
  return (
    <nav className="flex flex-wrap gap-1">
      {items.map((i) => {
        const on = i.href === "/" ? path === "/" : path.startsWith(i.href);
        return (
          <Link
            key={i.href}
            href={i.href}
            aria-current={on ? "page" : undefined}
            className={`flex min-h-10 items-center rounded-[10px] px-3 text-sm ${
              on ? "bg-hover font-semibold text-ink" : "font-medium text-muted hover:text-ink"
            }`}
          >
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}

function useDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  return { open, setOpen, ref };
}

const itemClass = (on: boolean) =>
  `block min-h-10 w-full px-3.5 text-left text-sm ${on ? "bg-hover font-semibold" : "font-medium hover:bg-soft"}`;

export function LangMenu() {
  const { lang } = useT();
  const router = useRouter();
  const [switching, start] = useTransition();
  const { open, setOpen, ref } = useDropdown();
  const pick = (l: "zh" | "en") => {
    setOpen(false);
    start(async () => {
      await setLang(l);
      router.refresh();
    });
  };
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex min-h-10 items-center gap-1.5 rounded-[10px] border border-line bg-card px-3 text-[13px] text-ink-2"
      >
        {switching ? <Spinner small /> : <Globe />}
        <span>{lang === "zh" ? "简体中文" : "English"}</span>
        <Chevron size={12} />
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-20 min-w-[150px] overflow-hidden rounded-[10px] border border-line bg-card shadow-[0_8px_24px_rgba(21,23,28,0.12)]">
          <button type="button" className={itemClass(lang === "zh")} onClick={() => pick("zh")}>
            简体中文
          </button>
          <button type="button" className={itemClass(lang === "en")} onClick={() => pick("en")}>
            English
          </button>
        </div>
      )}
    </div>
  );
}

export function UserMenu({ name }: { name: string }) {
  const { t } = useT();
  const { open, setOpen, ref } = useDropdown();
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label={name}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex h-10 w-10 items-center justify-center"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#DDE6F5] text-sm font-semibold text-accent-dark">
          {name.slice(0, 1).toUpperCase()}
        </span>
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-20 min-w-[170px] overflow-hidden rounded-[10px] border border-line bg-card shadow-[0_8px_24px_rgba(21,23,28,0.12)]">
          <div className="border-b border-line-soft px-3.5 py-2 text-sm font-semibold">{name}</div>
          <Link href="/settings" onClick={() => setOpen(false)} className={`${itemClass(false)} flex items-center`}>
            {t.nav.settings}
          </Link>
          <form action={signOut}>
            <SubmitButton small className={`${itemClass(false)} flex items-center gap-2`}>
              {t.nav.signOut}
            </SubmitButton>
          </form>
        </div>
      )}
    </div>
  );
}
