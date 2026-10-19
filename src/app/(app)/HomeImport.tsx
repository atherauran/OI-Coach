"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useT } from "@/components/i18n";

export default function HomeImport({ listId }: { listId?: string }) {
  const { t } = useT();
  const router = useRouter();
  const [text, setText] = useState("");
  const links = text.split(/\s+/).filter(Boolean);
  const rows = Math.min(5, Math.max(3, text.split("\n").length));
  const go = () => {
    if (!links.length) return;
    router.push(`/import?links=${encodeURIComponent(links.join("\n"))}${listId ? `&list=${listId}` : ""}`);
  };
  return (
    <div className="flex flex-wrap items-stretch gap-2.5">
      <label htmlFor="links" className="sr-only">
        {t.home.linksLabel}
      </label>
      <textarea
        id="links"
        rows={rows}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) go();
        }}
        placeholder={listId ? t.lists.addPlaceholder : t.home.linksPlaceholder}
        className="field min-w-0 flex-[1_1_420px] resize-none"
      />
      <button type="button" onClick={go} disabled={!links.length} className="btn-primary flex-none px-6">
        {t.home.import}
      </button>
    </div>
  );
}
