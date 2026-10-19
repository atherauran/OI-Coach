"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useT } from "@/components/i18n";
import { Check } from "@/components/icons";
import { Bar, Spinner } from "@/components/ui";
import { ideaName } from "@/lib/ideas";
import type { Role, Visibility } from "@/lib/types";
import HomeImport from "../../HomeImport";
import { deleteList, leaveList, removeItem, renameList, reorder, setDueDate, setMember, setVisibility } from "../actions";

type Row = {
  id: string;
  title: string;
  ideas: string[];
  role: Role | null;
  why: string;
  total: number;
  done: boolean;
  rating: string | null;
  activeFound: number | null;
};

export default function ListView({
  list,
  rows,
  owner,
  assignedToMe,
}: {
  list: { id: string; name: string; visibility: Visibility; due: string | null; ownerName: string };
  rows: Row[];
  owner: {
    members: { id: string; name: string; done: number }[];
    people: { id: string; name: string }[];
    hinted: { name: string; count: number }[];
  } | null;
  assignedToMe: boolean;
}) {
  const { t, lang } = useT();
  const [open, setOpen] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [name, setName] = useState(list.name);
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const run = (key: string, action: () => Promise<void>) => {
    setBusy(key);
    start(action);
  };
  const spin = (key: string) => (pending && busy === key ? <Spinner small /> : null);
  const isOwner = !!owner;
  const total = rows.length;
  const doneCount = rows.filter((r) => r.done).length;
  const memberIds = new Set(owner?.members.map((m) => m.id));

  const move = (idx: number, d: number) => {
    const ids = rows.map((r) => r.id);
    [ids[idx], ids[idx + d]] = [ids[idx + d], ids[idx]];
    run(`move:${rows[idx].id}:${d}`, () => reorder(list.id, ids));
  };
  const status = (r: Row) =>
    r.done ? t.lists.doneRating(r.rating) : r.activeFound !== null ? t.lists.inProgress(r.activeFound, r.total) : t.lists.notStarted;

  const meta = t.lists.assignedMeta(owner?.members.length ?? 0, list.due);

  return (
    <main className="mx-auto flex max-w-[1200px] flex-col gap-4 px-5 pb-10 pt-5">
      <div className="flex flex-col gap-1.5">
        {isOwner ? (
          <div className="flex items-center gap-3">
            <input
              aria-label={t.lists.listName}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => name.trim() !== list.name && run("name", () => renameList(list.id, name))}
              className="-ml-1 min-w-0 flex-1 rounded-lg bg-transparent px-1 font-display text-[28px] font-bold outline-none focus:bg-card"
            />
            {spin("name")}
          </div>
        ) : (
          <h1 className="font-display text-[28px] font-bold">{list.name}</h1>
        )}
        <div className="flex flex-wrap items-center gap-2.5 text-sm text-muted">
          <span className="rounded-md bg-hover px-2 py-0.5 text-xs font-semibold text-ink-2">{t.visibility[list.visibility]}</span>
          {isOwner ? list.visibility === "assigned" && <span>{meta}</span> : <span>{t.lists.byOwner(list.ownerName, assignedToMe ? list.due : null)}</span>}
        </div>
      </div>

      <div className="flex flex-wrap items-start gap-4">
        <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-4">
          <section className="card px-5 py-3">
            <h2 className="py-2 font-semibold">{t.lists.count(total)}</h2>
            {total === 0 && <p className="pb-3 text-sm text-muted">{t.lists.empty}</p>}
            <ol>
              {rows.map((r, idx) => (
                <li key={r.id} className="border-t border-line-soft">
                  <button
                    type="button"
                    aria-expanded={open === r.id}
                    onClick={() => setOpen(open === r.id ? null : r.id)}
                    className="flex min-h-14 w-full items-center gap-3.5 py-2 text-left"
                  >
                    <span
                      className={`flex h-7 w-7 flex-none items-center justify-center rounded-full text-[13px] font-semibold ${
                        r.done ? "bg-ink text-white" : "border border-field text-muted"
                      }`}
                    >
                      {r.done ? <Check size={13} /> : idx + 1}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="font-semibold">{r.title}</span>
                      <span className="text-[13px] text-muted">{r.ideas.map((s) => ideaName(s, lang)).join("、")}</span>
                    </span>
                    {r.role && <span className="hidden text-[13px] text-muted sm:block">{t.role[r.role]}</span>}
                    <span className={`min-w-[92px] text-right text-[13px] font-semibold ${r.activeFound !== null && !r.done ? "text-accent-dark" : "text-muted"}`}>
                      {status(r)}
                    </span>
                  </button>
                  {open === r.id && (
                    <div className="flex flex-col gap-3 pb-4 sm:pl-[42px]">
                      {r.why && <span className="text-sm text-ink-2">{r.why}</span>}
                      <div className="flex flex-wrap gap-2">
                        <Link href={`/practice/${r.id}?list=${list.id}`} className="btn-primary min-h-8! px-3.5! text-sm">
                          {r.activeFound !== null ? t.lists.continue : r.done ? t.lists.review : t.lists.start}
                        </Link>
                        {isOwner && (
                          <>
                            <button type="button" disabled={idx === 0 || pending} onClick={() => move(idx, -1)} className="btn-quiet min-h-8! px-3.5! text-sm disabled:opacity-40">
                              {spin(`move:${r.id}:-1`)}
                              {t.lists.up}
                            </button>
                            <button type="button" disabled={idx === total - 1 || pending} onClick={() => move(idx, 1)} className="btn-quiet min-h-8! px-3.5! text-sm disabled:opacity-40">
                              {spin(`move:${r.id}:1`)}
                              {t.lists.down}
                            </button>
                            <button type="button" disabled={pending} onClick={() => run(`rm:${r.id}`, () => removeItem(list.id, r.id))} className="btn-quiet min-h-8! px-3.5! text-sm">
                              {spin(`rm:${r.id}`)}
                              {t.lists.remove}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ol>
          </section>

          {isOwner && (
            <section className="card flex flex-col gap-3 px-5 py-4">
              <h2 className="font-semibold">{t.lists.addProblems}</h2>
              <HomeImport listId={list.id} />
            </section>
          )}
        </div>

        <aside className="flex min-w-0 max-w-[420px] flex-[1_1_320px] flex-col gap-4">
          <section className="card flex flex-col gap-3 px-5 py-4">
            <h2 className="font-semibold">{t.lists.myProgress}</h2>
            <div className="flex items-baseline gap-1.5">
              <span className="font-display text-[28px] font-bold">{doneCount}</span>
              <span className="text-muted">{t.lists.ofDone(total)}</span>
            </div>
            <Bar value={total ? doneCount / total : 0} />
          </section>

          {isOwner ? (
            <>
              <section className="card flex flex-col gap-3 px-5 py-4">
                <label htmlFor="vis" className="flex items-center gap-2 font-semibold">
                  {t.lists.visibility}
                  {spin("vis")}
                </label>
                <select
                  id="vis"
                  value={list.visibility}
                  disabled={pending}
                  onChange={(e) => run("vis", () => setVisibility(list.id, e.target.value as Visibility))}
                  className="field min-h-10"
                >
                  <option value="private">{t.lists.visPrivate}</option>
                  <option value="shared">{t.lists.visShared}</option>
                  <option value="assigned">{t.lists.visAssigned}</option>
                </select>
                {list.visibility !== "private" && (
                  <button
                    type="button"
                    onClick={async () => {
                      await navigator.clipboard.writeText(window.location.href);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="btn-quiet"
                  >
                    {copied ? t.lists.linkCopied : t.lists.copyLink}
                  </button>
                )}
                {list.visibility === "assigned" && (
                  <label className="flex flex-col gap-1.5 text-sm font-semibold">
                    <span className="flex items-center gap-2">
                      {t.lists.dueDate}
                      {spin("due")}
                    </span>
                    <input
                      type="date"
                      defaultValue={list.due ?? ""}
                      onChange={(e) => run("due", () => setDueDate(list.id, e.target.value))}
                      className="field min-h-10 font-normal"
                    />
                  </label>
                )}
              </section>

              {list.visibility === "assigned" && (
                <>
                  <section className="card flex flex-col gap-3 px-5 py-4">
                    <h2 className="font-semibold">{t.lists.members}</h2>
                    {owner.people.length ? (
                      <ul className="flex flex-col gap-3">
                        {owner.people.map((p) => {
                          const m = owner.members.find((x) => x.id === p.id);
                          return (
                            <li key={p.id} className="flex flex-col gap-1.5">
                              <label className="flex items-center gap-2.5 text-sm">
                                <input
                                  type="checkbox"
                                  checked={memberIds.has(p.id)}
                                  disabled={pending}
                                  onChange={(e) => run(`member:${p.id}`, () => setMember(list.id, p.id, e.target.checked))}
                                  className="h-4 w-4 accent-ink"
                                />
                                <span className="font-semibold">{p.name}</span>
                                {spin(`member:${p.id}`)}
                                {m && (
                                  <span className="ml-auto text-[13px] text-muted">
                                    {m.done} / {total}
                                  </span>
                                )}
                              </label>
                              {m && <Bar value={total ? m.done / total : 0} className="ml-[26px]" />}
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted">{t.lists.noPeople}</p>
                    )}
                  </section>
                  {owner.hinted.length > 0 && (
                    <section className="card flex flex-col gap-2 px-5 py-4">
                      <h2 className="font-semibold">{t.lists.mostHinted}</h2>
                      <ul className="flex flex-col">
                        {owner.hinted.map((h) => (
                          <li key={h.name} className="flex justify-between border-t border-line-soft py-2 text-sm">
                            <span>{h.name}</span>
                            <span className="text-muted">{t.lists.people(h.count)}</span>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}
                </>
              )}
              <button
                type="button"
                onClick={() => confirm(t.lists.confirmDelete) && run("delete", () => deleteList(list.id))}
                disabled={pending}
                className="flex items-center gap-1.5 self-center text-sm text-bad hover:underline"
              >
                {spin("delete")}
                {t.lists.delete}
              </button>
            </>
          ) : (
            !assignedToMe && (
              <button
                type="button"
                disabled={pending}
                onClick={() => run("leave", () => leaveList(list.id))}
                className="flex items-center gap-1.5 self-center text-sm text-muted hover:underline"
              >
                {spin("leave")}
                {t.lists.leave}
              </button>
            )
          )}
        </aside>
      </div>
    </main>
  );
}
