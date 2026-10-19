"use client";
import Link from "next/link";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, useTransition } from "react";
import { useT } from "@/components/i18n";
import { Bulb, Arrow, Check, Copy, External, Question } from "@/components/icons";
import { Markdown, RoleTag, Spinner, TYPE_COLORS, TypeTag } from "@/components/ui";
import { fillBlanks } from "@/lib/blanks";
import type { CoachMessage, WrapUp } from "@/lib/coach";
import { ideaName } from "@/lib/ideas";
import { HINTS_PER_PROBLEM, VERDICTS, type PointType, type Role } from "@/lib/types";
import { practiceAgain } from "./actions";

type Props = {
  attemptId: string;
  initialMessages: CoachMessage[];
  done: boolean;
  problem: {
    id: string;
    title: string;
    url: string;
    statement: string;
    samples: [string, string][];
    timeLimit: number | null;
    memoryLimit: number | null;
    ideas: { slug: string; role: Role }[];
    blanks: { code: string; placeholders: Record<number, string> } | null;
    points: { id: string; type: PointType }[];
  };
  list: { id: string; name: string; items: { id: string; title: string; done: boolean; current: boolean }[] } | null;
  next: { href: string; title: string } | null;
  listParam: string | null;
};

type Part = CoachMessage["parts"][number];

// Auto-continue only after the student answered a claim card (the only client-side tool).
function claimJustAnswered({ messages }: { messages: CoachMessage[] }) {
  const last = messages[messages.length - 1];
  if (last?.role !== "assistant") return false;
  const lastStep = last.parts.slice(last.parts.findLastIndex((p) => p.type === "step-start") + 1);
  const tools = lastStep.filter((p) => p.type.startsWith("tool-")) as Extract<Part, { state: string }>[];
  return tools.some((p) => p.type === "tool-claim_card") && tools.every((p) => p.state === "output-available");
}

const coachBubble = "max-w-[640px] rounded-[4px_14px_14px_14px] border border-line bg-card px-3.5 py-2.5";
const userBubble = "max-w-[560px] rounded-[14px_4px_14px_14px] bg-ink px-3.5 py-2.5 text-paper";

export default function Practice({ attemptId, initialMessages, done: initiallyDone, problem, list, next, listParam }: Props) {
  const { t, lang } = useT();
  const [input, setInput] = useState("");
  const [stmtOpen, setStmtOpen] = useState(false);
  const [restarting, startRestart] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { messages, sendMessage, addToolOutput, status, error, regenerate } = useChat<CoachMessage>({
    id: attemptId,
    messages: initialMessages,
    transport: new DefaultChatTransport({ api: "/api/coach", body: { attemptId } }),
    sendAutomaticallyWhen: claimJustAnswered,
  });

  const [fills, setFills] = useState<Record<number, string>>({});
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFills(JSON.parse(localStorage.getItem(`fills:${attemptId}`) ?? "{}"));
    } catch {}
  }, [attemptId]);
  const setFill = (id: number, v: string) => {
    const nextFills = { ...fills, [id]: v };
    setFills(nextFills);
    try {
      localStorage.setItem(`fills:${attemptId}`, JSON.stringify(nextFills));
    } catch {}
  };

  const map = useMemo(() => {
    const found = new Map<string, string>();
    const hinted = new Set<string>();
    let wrap: WrapUp | null = null;
    let claimPending = false;
    let verdicts = 0;
    let accepted = false;
    for (const m of messages) {
      if (m.metadata?.verdict) {
        verdicts++;
        if (m.metadata.verdict === "AC") accepted = true;
      }
      for (const p of m.parts) {
        if (p.type === "tool-reveal_point" && p.state === "output-available") found.set(p.output.id, p.output.name);
        if (p.type === "tool-give_hint" && p.state === "output-available") hinted.add(p.output.id);
        if (p.type === "tool-wrap_up" && p.state === "output-available") wrap = p.output;
        if (p.type === "tool-claim_card" && p.state === "input-available") claimPending = true;
      }
    }
    return { found, hinted, wrap: wrap as WrapUp | null, claimPending, verdicts, accepted };
  }, [messages]);

  const done = initiallyDone || !!map.wrap;
  const busy = status === "submitted" || status === "streaming";
  const hintsLeft = HINTS_PER_PROBLEM - map.hinted.size;
  const total = problem.points.length;
  const foundCount = map.wrap ? map.wrap.points.filter((p) => p.found).length : map.found.size;

  // Grow the reply box with its content; max-h caps it at 4 lines, then it scrolls.
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [input]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messages.length, status]);

  const send = () => {
    const text = input.trim();
    if (!text || busy || map.claimPending) return;
    sendMessage({ text });
    setInput("");
  };
  const askHint = () => sendMessage({ text: t.practice.hintRequest, metadata: { hint: true } });
  const report = (v: string) => sendMessage({ text: t.practice.verdictText(v), metadata: { verdict: v, fills } });

  function renderPart(p: Part, key: string) {
    switch (p.type) {
      case "text":
        return p.text.trim() ? (
          <div key={key} className={coachBubble}>
            <Markdown>{p.text}</Markdown>
          </div>
        ) : null;
      case "tool-reveal_point":
        if (p.state !== "output-available") return null;
        return (
          <div key={key} className="flex justify-center">
            <span className={`flip-in flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[13px] font-medium ${TYPE_COLORS[p.output.type]}`}>
              <Check size={14} />
              {t.pointType[p.output.type]}：{p.output.name}
            </span>
          </div>
        );
      case "tool-give_hint":
        if (p.state !== "output-available") return null;
        return (
          <div key={key} className="flex max-w-[640px] flex-col gap-2">
            <span className="self-start rounded-md bg-warn-soft px-2.5 py-0.5 text-xs font-semibold text-warn">{t.practice.hint}</span>
            <div className={coachBubble}>
              <Markdown>{p.output.hint}</Markdown>
            </div>
          </div>
        );
      case "tool-claim_card": {
        if (p.state === "input-streaming") return null;
        const answered = p.state === "output-available" ? p.output : null;
        return (
          <div key={key} className="flex max-w-[640px] flex-col gap-3 rounded-[14px] border-[1.5px] border-ink bg-card px-[18px] py-4">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-muted">
              <Question size={14} />
              {t.practice.doYouAgree}
            </div>
            <div className="text-[17px] font-medium">
              <Markdown>{`“${p.input?.claim ?? ""}”`}</Markdown>
            </div>
            {answered ? (
              <div className="text-sm text-muted">{answered === "agree" ? t.practice.youAgreed : t.practice.youRefuted}</div>
            ) : (
              <div className="flex flex-wrap gap-2.5">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => addToolOutput({ tool: "claim_card", toolCallId: p.toolCallId, output: "agree" })}
                  className="btn-quiet"
                >
                  {t.practice.agree}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => addToolOutput({ tool: "claim_card", toolCallId: p.toolCallId, output: "refute" })}
                  className="btn-dark font-medium"
                >
                  {t.practice.refute}
                </button>
              </div>
            )}
          </div>
        );
      }
      case "tool-show_code":
        if (p.state !== "output-available" || !problem.blanks) return null;
        return (
          <CodeCard
            key={key}
            blanks={problem.blanks}
            url={problem.url}
            fills={fills}
            setFill={setFill}
            canReport={!done && !map.accepted && !busy}
            reported={map.verdicts}
            onReport={report}
          />
        );
      case "tool-wrap_up":
        if (p.state !== "output-available") return null;
        return <WrapCard key={key} wrap={p.output} next={next} problemIdeas={problem.ideas} />;
      default:
        return null;
    }
  }

  return (
    <div className="flex flex-col lg:h-full">
      <div className="mx-auto w-full max-w-[1360px] flex-none px-4 pt-3.5">
        <nav className="flex flex-wrap items-center gap-2 text-sm text-muted">
          {list ? (
            <>
              <Link href="/lists" className="hover:text-ink">
                {t.nav.lists}
              </Link>
              <span aria-hidden>/</span>
              <Link href={`/lists/${list.id}`} className="hover:text-ink">
                {list.name}
              </Link>
            </>
          ) : (
            <Link href="/" className="hover:text-ink">
              {t.nav.home}
            </Link>
          )}
          <span aria-hidden>/</span>
          <span className="font-medium text-ink">{problem.title}</span>
        </nav>
      </div>

      <main className="mx-auto flex w-full max-w-[1360px] flex-wrap items-start gap-4 px-4 pb-10 pt-4 lg:min-h-0 lg:flex-1 lg:flex-nowrap lg:items-stretch lg:pb-4">
        <section className="flex min-h-[calc(100vh-150px)] min-w-0 flex-[999_1_560px] flex-col gap-4 lg:min-h-0">
          <div className="flex flex-col gap-4 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
            {messages.map((m) =>
              m.role === "user" ? (
                <div key={m.id} className="flex justify-end">
                  {m.metadata?.verdict ? (
                    <div className={`${userBubble} flex flex-wrap items-center gap-2.5`}>
                      <span>{t.practice.reported}</span>
                      <VerdictPill v={m.metadata.verdict} />
                    </div>
                  ) : m.metadata?.hint ? (
                    <div className="rounded-full border border-line bg-card px-3.5 py-1.5 text-[13px] text-muted">{t.practice.hintRequest}</div>
                  ) : (
                    <div className={`${userBubble} whitespace-pre-wrap`}>
                      {m.parts.map((p) => (p.type === "text" ? p.text : "")).join("")}
                    </div>
                  )}
                </div>
              ) : (
                <div key={m.id} className="flex flex-col gap-2.5">
                  {m.parts.map((p, i) => renderPart(p, `${m.id}-${i}`))}
                </div>
              ),
            )}
            {status === "submitted" && (
              <div className={`${coachBubble} flex w-16 gap-1`} aria-label={t.practice.thinking}>
                {[0, 1, 2].map((i) => (
                  <span key={i} className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted" style={{ animationDelay: `${i * 150}ms` }} />
                ))}
              </div>
            )}
            {error && (
              <div className="flex items-center gap-3 text-sm text-bad">
                {t.practice.error}
                <button type="button" onClick={() => regenerate()} className="btn-quiet text-sm">
                  {t.common.retry}
                </button>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="sticky bottom-4 z-[4] mt-auto flex flex-wrap items-end gap-2.5 rounded-[14px] border border-field bg-card py-2.5 pl-4 pr-2.5 shadow-[0_-8px_16px_#F3F4F1]"
          >
            <label htmlFor="reply" className="sr-only">
              {t.practice.reply}
            </label>
            <textarea
              id="reply"
              ref={inputRef}
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && e.nativeEvent.keyCode !== 229) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder={map.claimPending ? t.practice.answerClaimFirst : t.practice.reply}
              disabled={map.claimPending}
              className="max-h-[108px] min-w-0 flex-[1_1_260px] resize-none overflow-y-auto bg-transparent py-1.5 outline-none"
            />
            <div className="flex gap-2">
              {!done && (
                <button
                  type="button"
                  onClick={askHint}
                  disabled={busy || hintsLeft <= 0 || map.claimPending}
                  className="btn-quiet px-3.5 text-sm font-normal"
                >
                  <Bulb size={15} />
                  {t.practice.hintsLeft(hintsLeft)}
                </button>
              )}
              <button
                type="submit"
                aria-label={t.practice.send}
                disabled={busy || !input.trim()}
                className="btn-dark min-w-11 px-0 disabled:opacity-50"
              >
                <Arrow size={18} />
              </button>
            </div>
          </form>
        </section>

        <aside className="flex min-w-0 max-w-[440px] flex-[1_1_340px] flex-col gap-4 lg:min-h-0 lg:overflow-y-auto">
          <div className="card flex flex-col gap-2.5 px-5 py-4">
            <div className="flex items-baseline justify-between gap-2">
              <h1 className="font-display text-xl font-bold">{problem.title}</h1>
              <span className="flex-none font-mono text-[13px] text-muted">
                {problem.timeLimit ? `${problem.timeLimit / 1000}s` : ""}
                {problem.memoryLimit ? `，${problem.memoryLimit}MB` : ""}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {problem.ideas.map((i) => (
                <Link
                  key={i.slug}
                  href={`/ideas/${i.slug}`}
                  className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold text-accent-dark"
                >
                  {ideaName(i.slug, lang)}
                </Link>
              ))}
              {problem.ideas[0] && <RoleTag role={problem.ideas[0].role} lang={lang} />}
            </div>
            <div className={`relative overflow-hidden ${stmtOpen ? "" : "max-h-56"}`}>
              <Markdown className="text-sm text-ink-2">{problem.statement}</Markdown>
              {stmtOpen &&
                problem.samples.map(([i, o], k) => (
                  <div key={k} className="mt-3 grid gap-2 text-[13px] sm:grid-cols-2">
                    <div>
                      <div className="mb-1 font-semibold">{t.practice.sampleIn(k + 1)}</div>
                      <pre className="overflow-x-auto rounded-lg bg-paper px-3 py-2 font-mono">{i}</pre>
                    </div>
                    <div>
                      <div className="mb-1 font-semibold">{t.practice.sampleOut(k + 1)}</div>
                      <pre className="overflow-x-auto rounded-lg bg-paper px-3 py-2 font-mono">{o}</pre>
                    </div>
                  </div>
                ))}
              {!stmtOpen && <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-card" />}
            </div>
            <div className="flex flex-wrap gap-3.5">
              <button type="button" aria-expanded={stmtOpen} onClick={() => setStmtOpen(!stmtOpen)} className="link min-h-10 text-sm">
                {stmtOpen ? t.practice.collapse : t.practice.expand}
              </button>
              <a href={problem.url} target="_blank" rel="noreferrer" className="link flex min-h-10 items-center gap-1 text-sm">
                {t.practice.openOriginal}
                <External size={13} />
              </a>
            </div>
          </div>

          <div className="card flex flex-col gap-3.5 px-5 py-4">
            <div className="flex items-baseline justify-between">
              <h2 className="text-[15px] font-semibold">{t.practice.map}</h2>
              <span className="font-display text-[15px] font-bold">
                {foundCount} <span className="font-medium text-muted">/ {total}</span>
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-line-soft">
              <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${(foundCount / Math.max(total, 1)) * 100}%` }} />
            </div>
            <div className="flex flex-col gap-2">
              {problem.points.map((pt) => {
                const wp = map.wrap?.points.find((x) => x.id === pt.id);
                const name = wp?.name ?? map.found.get(pt.id);
                const isFound = wp ? wp.found : map.found.has(pt.id);
                const hinted = wp ? wp.hinted : map.hinted.has(pt.id);
                return (
                  <div
                    key={`${pt.id}-${name ? "open" : "fog"}`}
                    className={`flex flex-col gap-1 rounded-[10px] px-3 py-2.5 ${
                      name ? `flip-in border bg-card ${isFound ? "border-line" : "border-dashed border-[#E7B7AE]"}` : "border border-dashed border-field bg-soft"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <TypeTag type={pt.type} lang={lang} />
                      <span className={name ? "text-sm font-medium" : "text-sm tracking-[0.1em] text-faint"}>{name ?? "？？？"}</span>
                      {hinted && <span className="ml-auto text-xs text-[#8A4B0B]">{t.practice.usedHint}</span>}
                      {wp && !wp.found && <span className="ml-auto text-xs text-bad">{t.practice.missed}</span>}
                    </div>
                    {wp && <p className="text-[13px] text-muted">{wp.detail}</p>}
                  </div>
                );
              })}
            </div>
            {done && (
              <button
                type="button"
                disabled={restarting}
                onClick={() => startRestart(() => practiceAgain(problem.id, listParam))}
                className="btn-quiet text-sm"
              >
                {restarting && <Spinner />}
                {t.practice.again}
              </button>
            )}
          </div>

          {list && (
            <div className="card flex flex-col gap-3 px-5 py-4">
              <div className="flex items-baseline justify-between">
                <Link href={`/lists/${list.id}`} className="text-[15px] font-semibold hover:text-accent">
                  {list.name}
                </Link>
                <span className="text-[13px] text-muted">
                  {list.items.filter((i) => i.done).length} / {list.items.length}
                </span>
              </div>
              <ol className="flex flex-col gap-1.5">
                {list.items.map((it, i) => (
                  <li key={it.id}>
                    <Link
                      href={`/practice/${it.id}?list=${list.id}`}
                      className={`flex items-center gap-2.5 rounded-[10px] px-2.5 py-2 ${it.current ? "bg-hover" : "hover:bg-soft"}`}
                    >
                      <span
                        className={`flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full text-xs font-semibold ${
                          it.done ? "bg-ink text-white" : "border border-field text-muted"
                        }`}
                      >
                        {it.done ? <Check size={12} /> : i + 1}
                      </span>
                      <span className={`text-sm ${it.current ? "font-semibold" : "text-ink-2"}`}>{it.title}</span>
                    </Link>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}

function VerdictPill({ v }: { v: string }) {
  return (
    <span
      className={`rounded-md px-2.5 py-0.5 font-mono text-[13px] font-semibold ${
        v === "AC" ? "bg-good-soft text-good" : "bg-bad-soft text-bad"
      }`}
    >
      {v}
    </span>
  );
}

function CodeCard({
  blanks,
  url,
  fills,
  setFill,
  canReport,
  reported,
  onReport,
}: {
  blanks: { code: string; placeholders: Record<number, string> };
  url: string;
  fills: Record<number, string>;
  setFill: (id: number, v: string) => void;
  canReport: boolean;
  reported: number;
  onReport: (v: string) => void;
}) {
  const { t } = useT();
  const [copied, setCopied] = useState(false);
  const lines = blanks.code.split("\n");
  const count = (blanks.code.match(/⟦\d+⟧/g) ?? []).length;
  const copy = async () => {
    await navigator.clipboard.writeText(fillBlanks(blanks.code, fills));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="max-w-[680px] overflow-hidden rounded-[14px] bg-ink">
      <div className="flex items-center justify-between border-b border-[#2A2D35] px-4 py-2.5 text-[13px] text-[#A9AEBB]">
        <span className="font-mono">solution.cpp</span>
        <span>{t.practice.blanksCount(count)}</span>
      </div>
      <div className="overflow-x-auto py-3.5 font-mono text-[13.5px] leading-[1.85] text-[#E7E9EE]">
        {lines.map((line, i) => (
          <div key={i} className="flex items-center whitespace-pre px-4">
            <span className="w-8 flex-none select-none text-[#8A90A0]">{i + 1}</span>
            {line.split(/(⟦\d+⟧)/).map((seg, j) => {
              const m = seg.match(/^⟦(\d+)⟧$/);
              if (!m) return <span key={j}>{seg}</span>;
              const id = Number(m[1]);
              const ph = blanks.placeholders[id] ?? "?";
              return (
                // The hidden copy of the text sets the cell width, so the box fits Chinese and code alike.
                <span key={j} className="inline-grid">
                  <span aria-hidden className="invisible col-start-1 row-start-1 h-6 whitespace-pre border px-1.5 pr-2">
                    {fills[id] || ph}
                  </span>
                  <input
                    value={fills[id] ?? ""}
                    onChange={(e) => setFill(id, e.target.value)}
                    placeholder={ph}
                    aria-label={t.practice.blankLabel(id, ph)}
                    spellCheck={false}
                    size={1}
                    className="col-start-1 row-start-1 h-6 w-full min-w-0 rounded border border-dashed border-[#8FB6F0] bg-[#1E2A3D] px-1.5 text-white outline-none placeholder:text-[#7D8597] focus:border-solid"
                  />
                </span>
              );
            })}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2.5 border-t border-[#2A2D35] px-4 py-3">
        <button type="button" onClick={copy} className="btn-primary">
          <Copy size={15} />
          {copied ? t.practice.copied : t.practice.copyCode}
        </button>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="btn border border-[#3A3E48] text-sm font-medium text-paper"
        >
          {t.practice.submitOnJudge}
          <External size={14} />
        </a>
      </div>
      {canReport && (
        <div className="flex flex-col gap-2.5 border-t border-[#2A2D35] px-4 pb-4 pt-3">
          <div className="text-[13px] text-[#A9AEBB]">{reported ? t.practice.reportAgain : t.practice.reportFirst}</div>
          <div role="group" className="flex flex-wrap gap-2">
            {VERDICTS.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => onReport(v)}
                className="min-h-10 min-w-16 rounded-[10px] border border-[#3A3E48] bg-[#20242C] px-4 font-mono text-sm font-semibold text-paper hover:border-[#8FB6F0]"
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function WrapCard({ wrap, next, problemIdeas }: { wrap: WrapUp; next: Props["next"]; problemIdeas: Props["problem"]["ideas"] }) {
  const { t } = useT();
  return (
    <div className="flex flex-col gap-4 rounded-[14px] border-[1.5px] border-ink bg-card px-5 py-4">
      <div className="flex flex-wrap items-center gap-4">
        <div
          role="img"
          aria-label={t.practice.ratingLabel(wrap.rating)}
          className="flex h-[72px] w-[72px] flex-none items-center justify-center rounded-[14px] bg-ink font-display text-[40px] font-bold text-white"
        >
          {wrap.rating}
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-xl font-semibold">{t.practice.unaided(wrap.unaided, wrap.total)}</span>
          <span className="text-sm text-muted">{t.practice.ratingNote}</span>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1 rounded-[10px] bg-soft px-3.5 py-3">
          <span className="text-[13px] font-semibold">{t.practice.toTrapDeck}</span>
          <span className="text-sm text-ink-2">{wrap.traps.length ? wrap.traps.join("、") : t.practice.noNewTraps}</span>
        </div>
        <div className="flex flex-col gap-1 rounded-[10px] bg-soft px-3.5 py-3">
          <span className="text-[13px] font-semibold">{t.practice.recallScheduled}</span>
          <span className="text-sm text-ink-2">{t.practice.recallNote}</span>
        </div>
      </div>
      <div className="flex flex-col gap-3 border-t border-line pt-4">
        <span className="text-[13px] font-semibold text-muted">{t.practice.followUp}</span>
        <div className="text-base font-medium">
          <Markdown>{wrap.question}</Markdown>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {next && (
            <Link href={next.href} className="btn-primary">
              {t.practice.next(next.title)}
            </Link>
          )}
          {problemIdeas[0] && (
            <Link href={`/ideas/${problemIdeas[0].slug}`} className="btn-quiet">
              {t.practice.toIdea}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
