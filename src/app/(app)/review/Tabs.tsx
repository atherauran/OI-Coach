"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "@/components/i18n";

export default function Tabs() {
  const { t } = useT();
  const path = usePathname();
  const tabs = [
    { href: "/review", label: t.review.today },
    { href: "/review/traps", label: t.review.traps },
    { href: "/review/templates", label: t.review.templates },
  ];
  return (
    <nav className="flex gap-1 rounded-[12px] bg-hover p-1 self-start">
      {tabs.map((tab) => {
        const on = tab.href === "/review" ? path === "/review" : path.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex min-h-10 items-center rounded-[9px] px-4 text-sm ${on ? "bg-card font-semibold shadow-sm" : "text-muted hover:text-ink"}`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
