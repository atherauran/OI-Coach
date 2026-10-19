"use client";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useT } from "@/components/i18n";
import { Check, Cross } from "@/components/icons";
import { PageTitle, Spinner } from "@/components/ui";
import { addToList, createList } from "../lists/actions";

type Stage = "new" | "fetched" | "solved" | "ready";
type Row = {
  line: string;
  pid: string | null;
  title: string | null;
  stage: Stage;
  status: "waiting" | "running" | "done" | "failed";
  failedAt?: "fetch" | "build";
  instant?: boolean;
};

const STEP_INDEX: Record<Stage, number> = { new: 0, fetched: 1, solved: 2, ready: 3 };

async function call(pid: string, step: string, statement?: string) {
  const res = await fetch("/api/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pid, step, statement }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json as { stage: Stage; title?: string | null };
}

export default function Importer({
  items,
  target,
}: {
  items: { line: string; pid: string | null }[];
  target: { id: string; name: string } | null;
}) {
  const { t } = useT();
  const [rows, setRows] = useState<Row[]>(() =>
    items.map((i) => ({ ...i, title: null, stage: "new", status: i.pid ? "waiting" : "failed" })),
  );
  const [pasted, setPasted] = useState<Record<string, string>>({});
  const [listName, setListName] = useState("");
  const [saving, startSaving] = useTransition();
  const started = useRef(false);

  const patch = (pid: string, p: Partial<Row>) => setRows((rs) => rs.map((r) => (r.pid === pid ? { ...r, ...p } : r)));

  async function run(pid: string, statement?: string) {
    patch(pid, { status: "running", failedAt: undefined });
    let stage: Stage;
    try {
      const r = await call(pid, "fetch", statement);
      stage = r.stage;
      patch(pid, { stage, title: r.title ?? null, instant: stage === "ready" && !statement });
    } catch {
      patch(pid, { status: "failed", failedAt: "fetch" });
      return;
    }
    try {
      while (stage !== "ready") {
        stage = (await call(pid, stage === "fetched" ? "solve" : "points")).stage;
        patch(pid, { stage });
      }
      patch(pid, { status: "done" });
    } catch {
      patch(pid, { status: "failed", failedAt: "build" });
    }
  }

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const queue = items.flatMap((i) => (i.pid ? [i.pid] : []));
    const worker = async () => {
      for (let pid = queue.shift(); pid; pid = queue.shift()) await run(pid);
    };
    Promise.all([worker(), worker(), worker()]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const valid = rows.filter((r) => r.pid);
  const done = rows.filter((r) => r.status === "done");
  const running = rows.some((r) => r.status === "running" || r.status === "waiting");
  const multi = valid.length > 1;
  const donePids = done.map((r) => r.pid!);
  const stepLabels = [t.import.fetching, t.import.solving, t.import.pointing, t.import.done];

  return (
    <main className="mx-auto flex max-w-[1000px] flex-col gap-4 px-5 pb-10 pt-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageTitle sub={target ? t.import.addingTo(target.name) : t.import.sub}>{t.import.title}</PageTitle>
        {valid.length > 0 && (
          <div className="flex min-w-[220px] items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
              <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${(done.length / valid.length) * 100}%` }} />
            </div>
            <span className="font-display font-bold">
              {done.length} / {valid.length}
            </span>
          </div>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="card p-5 text-muted">
          {t.import.empty}{" "}
          <Link href="/" className="link">
            {t.nav.home}
          </Link>
        </div>
      ) : (
        <section className="card px-5 py-1.5">
          <ul>
            {rows.map((r, idx) => {
              const step = STEP_INDEX[r.stage];
              const failed = r.status === "failed";
              const stageText = !r.pid
                ? t.import.notLuogu
                : failed
                  ? r.failedAt === "fetch"
                    ? t.import.fetchFailed
                    : t.import.buildFailed
                  : r.status === "done" && r.instant
                    ? t.import.inLibrary
                    : r.status === "waiting"
                      ? t.import.waiting
                      : stepLabels[step];
              return (
                <li key={r.pid ?? `bad-${idx}`} className="flex flex-col gap-3 border-b border-line-soft py-4 last:border-b-0">
                  <div className="flex flex-wrap items-center gap-3.5">
                    <div className="flex h-7 w-7 flex-none items-center justify-center">
                      {r.status === "done" ? (
                        <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-ink text-white">
                          <Check size={14} />
                        </span>
                      ) : failed ? (
                        <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full border border-[#B8432F] bg-bad-soft text-bad">
                          <Cross size={14} />
                        </span>
                      ) : (
                        <Spinner />
                      )}
                    </div>
                    <div className="flex min-w-0 flex-[1_1_220px] flex-col">
                      <span className={`font-semibold ${r.title ? "" : "text-muted"}`}>{r.title ?? (r.pid ? t.import.untitled : r.line)}</span>
                      <span className="font-mono text-xs text-faint">{r.pid ?? ""}</span>
                    </div>
                    <div className="flex min-w-[180px] flex-[0_1_260px] flex-col gap-1.5">
                      <div className="flex gap-1" aria-hidden>
                        {[0, 1, 2].map((k) => (
                          <span
                            key={k}
                            className={`h-[5px] flex-1 rounded-full ${
                              failed ? "bg-[#E7B7AE]" : k < step ? (r.status === "done" ? "bg-ink" : "bg-accent") : "bg-line"
                            }`}
                          />
                        ))}
                      </div>
                      <span className={`text-[13px] ${failed ? "text-bad" : "text-muted"}`}>{stageText}</span>
                    </div>
                    <div className="flex min-w-[84px] flex-none justify-end">
                      {r.status === "done" && (
                        <Link href={`/practice/${r.pid}`} className="link flex min-h-10 items-center px-3.5 text-sm font-semibold">
                          {t.import.practice}
                        </Link>
                      )}
                      {failed && r.pid && (
                        <button type="button" onClick={() => run(r.pid!)} className="btn-outline text-sm">
                          {t.common.retry}
                        </button>
                      )}
                    </div>
                  </div>
                  {failed && r.failedAt === "fetch" && r.pid && (
                    <div className="flex flex-col gap-2 sm:ml-[42px]">
                      <label htmlFor={`paste-${r.pid}`} className="text-[13px] font-semibold">
                        {t.import.pasteLabel}
                      </label>
                      <textarea
                        id={`paste-${r.pid}`}
                        rows={4}
                        value={pasted[r.pid] ?? ""}
                        onChange={(e) => setPasted({ ...pasted, [r.pid!]: e.target.value })}
                        placeholder={t.import.pastePlaceholder}
                        className="field resize-y"
                      />
                      <div>
                        <button
                          type="button"
                          disabled={!pasted[r.pid]?.trim()}
                          onClick={() => run(r.pid!, pasted[r.pid!])}
                          className="btn-dark text-sm"
                        >
                          {t.import.usePasted}
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {target ? (
        <section className="card flex flex-wrap items-center justify-between gap-3.5 p-5">
          <span className="text-sm text-muted">{t.import.addingTo(target.name)}</span>
          <button
            type="button"
            disabled={running || !done.length || saving}
            onClick={() => startSaving(() => addToList(target.id, donePids))}
            className="btn-primary"
          >
            {saving && <Spinner light />}
            {t.import.addToList(done.length)}
          </button>
        </section>
      ) : (
        multi && (
          <section className="card flex flex-wrap items-end gap-3.5 p-5">
            <label className="flex flex-[1_1_280px] flex-col gap-1.5 text-sm font-semibold">
              {t.import.listName}
              <input value={listName} onChange={(e) => setListName(e.target.value)} className="field min-h-10 font-normal" />
            </label>
            <button
              type="button"
              disabled={running || !done.length || !listName.trim() || saving}
              onClick={() => startSaving(() => createList(listName, donePids))}
              className="btn-primary"
            >
              {saving && <Spinner light />}
              {t.import.createList}
            </button>
          </section>
        )
      )}
    </main>
  );
}
