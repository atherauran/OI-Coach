"use client";
import Link from "next/link";
import { useState } from "react";
import { useT } from "@/components/i18n";
import { Check } from "@/components/icons";
import { TypeTag } from "@/components/ui";
import TemplateDrill from "@/components/TemplateDrill";
import { ideaName } from "@/lib/ideas";
import type { IdentifyQ, RecallQ, TemplateQ } from "@/lib/review";
import { answerRecall, logIdentify } from "./actions";

type Step =
  | { kind: "identify" }
  | { kind: "recall"; item: RecallQ }
  | { kind: "template"; item: TemplateQ & { reference: string } };

export default function DailyReview({
  identify,
  recall,
  templates,
}: {
  identify: IdentifyQ[];
  recall: RecallQ[];
  templates: (TemplateQ & { reference: string })[];
}) {
  const { t, lang } = useT();
  const steps: Step[] = [
    ...(identify.length ? [{ kind: "identify" as const }] : []),
    ...recall.map((item) => ({ kind: "recall" as const, item })),
    ...templates.map((item) => ({ kind: "template" as const, item })),
  ];
  const [at, setAt] = useState(0);
  const [results, setResults] = useState<string[]>([]);
  const advance = (summary: string) => {
    setResults([...results, summary]);
    setAt(at + 1);
  };

  const queueTitle = (s: Step) =>
    s.kind === "identify" ? t.review.identify : s.kind === "recall" ? t.review.recall : t.review.template;
  const queueSub = (s: Step) =>
    s.kind === "identify" ? t.review.identifySub(identify.length) : s.kind === "recall" ? s.item.title : ideaName(s.item.slug, lang);

  const cur = steps[at];
  return (
    <div className="flex flex-wrap items-start gap-4">
      <section className="flex min-w-0 flex-[999_1_560px] flex-col">
        {!steps.length ? (
          <div className="card flex flex-col gap-3 p-5">
            <h1 className="font-display text-2xl font-bold">{t.review.nothingDue}</h1>
            <p className="text-sm text-muted">{t.review.nothingDueSub}</p>
          </div>
        ) : !cur ? (
          <div className="flex flex-col gap-4 rounded-[14px] border-[1.5px] border-ink bg-card p-5">
            <h1 className="font-display text-2xl font-bold">{t.review.allDone}</h1>
            <ul className="flex flex-col gap-2">
              {steps.map((s, i) => (
                <li key={i} className="flex justify-between rounded-[10px] bg-soft px-4 py-2.5 text-sm">
                  <span className="font-semibold">{queueTitle(s)}</span>
                  <span className="text-muted">{results[i]}</span>
                </li>
              ))}
            </ul>
            <p className="text-sm text-muted">{t.review.allDoneNote}</p>
            <div>
              <Link href="/" className="btn-primary">
                {t.nav.home}
              </Link>
            </div>
          </div>
        ) : cur.kind === "identify" ? (
          <Identify key="identify" qs={identify} onDone={(score) => advance(`${score} / ${identify.length}`)} />
        ) : cur.kind === "recall" ? (
          <Recall key={cur.item.problemId} item={cur.item} onDone={(ok) => advance(ok ? t.review.remembered : t.review.forgot)} />
        ) : (
          <div key={cur.item.slug} className="card flex flex-col gap-4 p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h1 className="font-display text-2xl font-bold">{t.review.template}</h1>
              <span className="text-sm text-muted">{ideaName(cur.item.slug, lang)}</span>
            </div>
            <p className="text-[17px] font-medium">{t.review.templatePrompt(ideaName(cur.item.slug, lang))}</p>
            <TemplateDrill
              slug={cur.item.slug}
              reference={cur.item.reference}
              mastery={cur.item.mastery}
              onDone={(r) => setResults([...results, t.review.score(r.score)])}
            />
            {results.length > at && (
              <div>
                <button type="button" onClick={() => setAt(at + 1)} className="btn-dark">
                  {t.common.next}
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {steps.length > 0 && (
        <aside className="card flex min-w-0 max-w-[400px] flex-[1_1_300px] flex-col gap-3 px-5 py-4">
          <h2 className="font-semibold">{t.review.queue}</h2>
          <ol className="flex flex-col gap-1">
            {steps.map((s, i) => (
              <li key={i} className={`flex items-center gap-3 rounded-[10px] px-3 py-2.5 ${i === at ? "bg-hover" : ""}`}>
                <span
                  className={`flex h-[26px] w-[26px] flex-none items-center justify-center rounded-full text-xs font-semibold ${
                    i < at ? "bg-ink text-white" : i === at ? "bg-accent text-white" : "border border-field text-muted"
                  }`}
                >
                  {i < at ? <Check size={12} /> : i + 1}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="text-sm font-semibold">{queueTitle(s)}</span>
                  <span className="truncate text-xs text-muted">{queueSub(s)}</span>
                </span>
              </li>
            ))}
          </ol>
        </aside>
      )}
    </div>
  );
}

function Identify({ qs, onDone }: { qs: IdentifyQ[]; onDone: (score: number) => void }) {
  const { t, lang } = useT();
  const [qi, setQi] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const q = qs[qi];
  const answered = picked !== null;
  const right = picked === q.correct;

  const pick = (i: number) => {
    if (answered) return;
    setPicked(i);
    if (i === q.correct) setScore(score + 1);
    logIdentify(q.problemId, i === q.correct);
  };
  const next = () => {
    if (qi + 1 >= qs.length) return onDone(score);
    setQi(qi + 1);
    setPicked(null);
  };

  return (
    <div className="card flex flex-col gap-4 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-display text-2xl font-bold">{t.review.identify}</h1>
        <span className="text-sm text-muted">{t.review.questionOf(qi + 1, qs.length)}</span>
      </div>
      <div className="rounded-xl bg-soft px-5 py-4 text-base leading-relaxed">{q.brief}</div>
      <div className="flex flex-col gap-2.5">
        <span className="text-sm font-semibold">{t.review.whichIdea}</span>
        <div role="group" className="flex flex-col gap-2">
          {q.options.map((slug, i) => {
            const isCorrect = answered && i === q.correct;
            const isWrong = answered && i === picked && !right;
            return (
              <button
                key={slug}
                type="button"
                onClick={() => pick(i)}
                className={`flex min-h-[52px] w-full items-center gap-3 rounded-[10px] px-3.5 py-2 text-left ${
                  isCorrect ? "border-[1.5px] border-good bg-[#EEF8F2]" : isWrong ? "border-[1.5px] border-bad bg-[#FDF1EF]" : "border border-field bg-card hover:border-ink"
                } ${answered ? "cursor-default" : ""}`}
              >
                <span className="flex h-[26px] w-[26px] flex-none items-center justify-center rounded-full border border-field text-xs font-semibold text-ink-2">
                  {"ABCD"[i]}
                </span>
                <span>{ideaName(slug, lang)}</span>
                {isCorrect && <span className="ml-auto rounded-md bg-good-soft px-2 py-0.5 text-xs font-semibold text-good">{t.review.correctAnswer}</span>}
                {isWrong && <span className="ml-auto rounded-md bg-bad-soft px-2 py-0.5 text-xs font-semibold text-bad">{t.review.yourPick}</span>}
              </button>
            );
          })}
        </div>
      </div>
      {answered && (
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className={`flex flex-[1_1_300px] flex-col gap-1.5 rounded-xl px-4 py-3.5 ${right ? "bg-[#EEF8F2]" : "bg-soft"}`}>
            <span className="font-semibold">{right ? t.review.right : t.review.answerIs(ideaName(q.options[q.correct], lang))}</span>
            <span className="text-sm">{q.why}</span>
            <Link href={`/ideas/${q.options[q.correct]}`} className="link text-sm">
              {t.review.seeIdea}
            </Link>
          </div>
          <button type="button" onClick={next} className="btn-dark">
            {qi + 1 >= qs.length ? t.review.finishSet : t.common.next}
          </button>
        </div>
      )}
    </div>
  );
}

function Recall({ item, onDone }: { item: RecallQ; onDone: (ok: boolean) => void }) {
  const { t, lang } = useT();
  const [answer, setAnswer] = useState("");
  const [shown, setShown] = useState(false);
  const respond = (ok: boolean) => {
    answerRecall(item.problemId, ok);
    onDone(ok);
  };
  return (
    <div className="card flex flex-col gap-4 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-display text-2xl font-bold">{t.review.recall}</h1>
        <span className="text-sm text-muted">{t.review.solvedAgo(item.title, item.solvedAgo)}</span>
      </div>
      <p className="text-[17px] font-medium">{t.review.recallPrompt(t.pointType[item.point.type])}</p>
      <label htmlFor="recall" className="sr-only">
        {t.review.yourAnswer}
      </label>
      <textarea
        id="recall"
        rows={2}
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        disabled={shown}
        placeholder={t.review.yourAnswer}
        className="field resize-none"
      />
      {!shown ? (
        <div>
          <button type="button" onClick={() => setShown(true)} className="btn-dark">
            {t.review.showAnswer}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5 rounded-xl border border-line px-4 py-3.5">
            <div className="flex items-center gap-2">
              <TypeTag type={item.point.type} lang={lang} />
              <span className="font-semibold">{item.point.name}</span>
            </div>
            <span className="text-sm text-ink-2">{item.point.detail}</span>
          </div>
          <span className="text-sm text-muted">{t.review.didYouRemember}</span>
          <div className="flex flex-wrap gap-2.5">
            <button type="button" onClick={() => respond(true)} className="btn-dark">
              {t.review.remembered}
            </button>
            <button type="button" onClick={() => respond(false)} className="btn-quiet">
              {t.review.forgot}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
