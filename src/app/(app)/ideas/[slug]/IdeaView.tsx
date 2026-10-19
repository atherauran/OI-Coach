"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useT } from "@/components/i18n";
import { Check, Lock } from "@/components/icons";
import { Markdown, Spinner, TypeTag } from "@/components/ui";
import type { Category } from "@/lib/ideas";
import type { IdeaDetails, Role } from "@/lib/types";
import { addTemplate } from "./actions";

type Feedback = { score: number; got: string; missed: string };

export default function IdeaView(props: {
  slug: string;
  name: string;
  category: Category;
  track: { id: string; title: string; role: Role; why: string; done: boolean; rating: string | null; active: boolean }[];
  details: IdeaDetails | null;
  summary: { text: string; feedback: Feedback | null } | null;
  templateAdded: boolean;
}) {
  const { t, lang } = useT();
  const { slug, track } = props;
  const [details, setDetails] = useState(props.details);
  const [introOpen, setIntroOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [text, setText] = useState(props.summary?.text ?? "");
  const [feedback, setFeedback] = useState<Feedback | null>(props.summary?.feedback ?? null);
  const [grading, setGrading] = useState(false);
  const [adding, startAdding] = useTransition();

  const done = track.filter((p) => p.done).length;
  const unlocked = done > 0;
  const nextUp = track.find((p) => p.active) ?? track.find((p) => !p.done);

  async function loadDetails() {
    if (details) return details;
    setLoading(true);
    setFailed(false);
    const res = await fetch("/api/ideas", { method: "POST", body: JSON.stringify({ slug }) });
    setLoading(false);
    if (!res.ok) return setFailed(true), null;
    const d = (await res.json()) as IdeaDetails;
    setDetails(d);
    return d;
  }

  async function grade() {
    setGrading(true);
    setFailed(false);
    const res = await fetch("/api/grade/summary", { method: "POST", body: JSON.stringify({ slug, text }) });
    setGrading(false);
    if (!res.ok) return setFailed(true);
    const json = (await res.json()) as { feedback: Feedback; details: IdeaDetails };
    setFeedback(json.feedback);
    setDetails(json.details);
  }

  return (
    <main className="mx-auto flex max-w-[940px] flex-col gap-4 px-5 pb-12 pt-5">
      <section className="card flex flex-col gap-4 px-5 py-4">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-muted">{t.category[props.category]}</span>
          <h1 className="font-display text-[30px] font-bold">{props.name}</h1>
          <span className="text-sm text-muted">{t.home.doneOf(done, track.length)}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {nextUp && (
            <Link href={`/practice/${nextUp.id}`} className="btn-primary">
              {nextUp.active ? t.ideas.continueProblem(nextUp.title) : t.ideas.startProblem(nextUp.title)}
            </Link>
          )}
          <button
            type="button"
            aria-expanded={introOpen}
            onClick={() => {
              setIntroOpen(!introOpen);
              if (!introOpen) loadDetails();
            }}
            className="btn-outline text-sm"
          >
            {introOpen ? t.common.collapse : t.ideas.learn}
          </button>
        </div>
      </section>

      {introOpen && (
        <section className="card flex flex-col gap-4 px-5 py-4">
          <h2 className="text-lg font-semibold">{t.ideas.learn}</h2>
          {loading && (
            <div className="flex items-center gap-3 text-sm text-muted">
              <Spinner />
              {t.ideas.writing}
            </div>
          )}
          {failed && !details && <p className="text-sm text-bad">{t.common.failed}</p>}
          {details && (
            <>
              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold text-muted">{t.ideas.when}</h3>
                <ul className="flex list-disc flex-col gap-1 pl-5">
                  {details.intro.when.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-col gap-1 rounded-xl bg-soft px-4 py-3.5">
                <span className="text-[13px] font-semibold text-muted">{t.ideas.core}</span>
                <Markdown className="text-base font-medium">{details.intro.core}</Markdown>
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold text-muted">{t.ideas.example}</h3>
                <Markdown>{details.intro.example}</Markdown>
              </div>
            </>
          )}
        </section>
      )}

      <section className="card flex flex-col gap-4 px-5 py-4">
        <h2 className="text-lg font-semibold">{t.ideas.problems}</h2>
        {track.length ? (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(200px,100%),1fr))] gap-2.5">
            {track.map((p, i) => (
              <Link
                key={p.id}
                href={`/practice/${p.id}`}
                className={`flex flex-col gap-1.5 rounded-xl px-4 py-3.5 ${
                  p.active ? "border-[1.5px] border-ink bg-card" : "border border-line bg-soft hover:border-ink"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                      p.done ? "bg-ink text-white" : "border border-field text-muted"
                    }`}
                  >
                    {p.done ? <Check size={12} /> : i + 1}
                  </span>
                  <span className="text-xs font-semibold text-muted">{t.role[p.role]}</span>
                  {p.rating && <span className="ml-auto font-display text-sm font-bold">{p.rating}</span>}
                </div>
                <span className="font-semibold">{p.title}</span>
                <span className="text-[13px] text-muted">{p.why}</span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">{t.ideas.noProblemsLong}</p>
        )}
      </section>

      <section className="card flex flex-col gap-4 px-5 py-4">
        <h2 className="text-lg font-semibold">{t.ideas.summary}</h2>
        {!unlocked ? (
          <div className="flex items-center gap-3 rounded-xl border border-dashed border-field bg-soft px-4 py-4 text-sm text-muted">
            <Lock size={16} />
            {t.ideas.locked}
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              <label htmlFor="summary" className="text-sm font-semibold">
                {t.ideas.summaryPrompt}
              </label>
              <textarea id="summary" rows={4} value={text} onChange={(e) => setText(e.target.value)} className="field resize-y" />
              <div className="flex items-center gap-3">
                <button type="button" onClick={grade} disabled={!text.trim() || grading} className="btn-dark">
                  {grading ? <Spinner light /> : null}
                  {t.ideas.grade}
                </button>
                {failed && details && <span className="text-sm text-bad">{t.common.failed}</span>}
              </div>
            </div>
            {feedback && details && (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-1 rounded-xl bg-good-soft px-4 py-3">
                    <span className="text-[13px] font-semibold text-good">{t.ideas.got}</span>
                    <span className="text-sm">{feedback.got}</span>
                  </div>
                  {feedback.missed && (
                    <div className="flex flex-col gap-1 rounded-xl bg-warn-soft px-4 py-3">
                      <span className="text-[13px] font-semibold text-warn">{t.ideas.missed}</span>
                      <span className="text-sm">{feedback.missed}</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-semibold">{t.ideas.template}</h3>
                    <button
                      type="button"
                      disabled={props.templateAdded || adding}
                      onClick={() => startAdding(() => addTemplate(slug))}
                      className="btn-quiet text-sm"
                    >
                      {adding && <Spinner small />}
                      {props.templateAdded ? t.ideas.templateAdded : t.ideas.addTemplate}
                    </button>
                  </div>
                  <pre className="overflow-x-auto rounded-xl bg-ink px-4 py-3.5 font-mono text-[13.5px] leading-[1.8] text-[#E7E9EE]">
                    {details.template}
                  </pre>
                </div>
                <div className="flex flex-col gap-2">
                  <h3 className="font-semibold">{t.ideas.traps}</h3>
                  <ul className="flex flex-col gap-2">
                    {details.traps.map((tr) => (
                      <li key={tr.text} className="flex items-start gap-2.5">
                        <TypeTag type={tr.type} lang={lang} className="mt-0.5" />
                        <span className="text-sm">{tr.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </>
        )}
      </section>
    </main>
  );
}
