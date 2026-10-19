"use client";
import { useMemo, useState } from "react";
import { useT } from "./i18n";
import { Spinner } from "./ui";

type Result = { score: number; feedback: string };

// Lines worth blanking: skip braces, blank lines and one-token lines.
function blankLines(code: string) {
  const lines = code.split("\n");
  const candidates = lines.map((l, i) => ({ l: l.trim(), i })).filter(({ l }) => l.length > 3 && !/^[{}();\s]*$/.test(l));
  const picked = new Set(candidates.filter((_, k) => k % 2 === 1 || candidates.length <= 2).map((c) => c.i));
  return { lines, picked };
}

export default function TemplateDrill({
  slug,
  reference,
  mastery,
  onDone,
}: {
  slug: string;
  reference: string;
  mastery: number;
  onDone?: (r: Result) => void;
}) {
  const { t } = useT();
  const [mode, setMode] = useState<"memory" | "blanks">(mastery < 0.3 ? "blanks" : "memory");
  const [code, setCode] = useState("");
  const [fills, setFills] = useState<Record<number, string>>({});
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const { lines, picked } = useMemo(() => blankLines(reference), [reference]);

  const assembled =
    mode === "memory"
      ? code
      : lines.map((l, i) => (picked.has(i) ? l.match(/^\s*/)![0] + (fills[i] ?? "") : l)).join("\n");
  const ready = mode === "memory" ? code.trim().length > 0 : [...picked].some((i) => fills[i]?.trim());

  async function submit() {
    setBusy(true);
    setFailed(false);
    const res = await fetch("/api/grade/template", { method: "POST", body: JSON.stringify({ slug, code: assembled }) });
    setBusy(false);
    if (!res.ok) return setFailed(true);
    const r = (await res.json()) as Result;
    setResult(r);
    onDone?.(r);
  }

  return (
    <div className="flex flex-col gap-3">
      {!result && (
        <div className="flex gap-1 self-start rounded-[10px] bg-hover p-1">
          {(["memory", "blanks"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`min-h-9 rounded-lg px-3.5 text-sm ${mode === m ? "bg-card font-semibold shadow-sm" : "text-muted"}`}
            >
              {m === "memory" ? t.drill.memory : t.drill.blanks}
            </button>
          ))}
        </div>
      )}
      {mode === "memory" ? (
        <>
          <label htmlFor={`tmpl-${slug}`} className="sr-only">
            {t.drill.yourCode}
          </label>
          <textarea
            id={`tmpl-${slug}`}
            rows={8}
            value={code}
            disabled={!!result}
            onChange={(e) => setCode(e.target.value)}
            spellCheck={false}
            placeholder={t.drill.memoryPlaceholder}
            className="field resize-y font-mono text-[13.5px] leading-[1.7]"
          />
        </>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-ink py-3 font-mono text-[13.5px] leading-[1.85] text-[#E7E9EE]">
          {lines.map((l, i) =>
            picked.has(i) ? (
              <div key={i} className="flex whitespace-pre px-4">
                <span>{l.match(/^\s*/)![0]}</span>
                <input
                  value={fills[i] ?? ""}
                  disabled={!!result}
                  onChange={(e) => setFills({ ...fills, [i]: e.target.value })}
                  aria-label={t.drill.lineLabel(i + 1)}
                  spellCheck={false}
                  className="h-6 min-w-0 flex-1 rounded border border-dashed border-[#8FB6F0] bg-[#1E2A3D] px-1.5 text-white outline-none focus:border-solid"
                />
              </div>
            ) : (
              <div key={i} className="whitespace-pre px-4">
                {l || " "}
              </div>
            ),
          )}
        </div>
      )}
      {!result ? (
        <div className="flex items-center gap-3">
          <button type="button" disabled={!ready || busy} onClick={submit} className="btn-dark">
            {busy && <Spinner light />}
            {t.drill.grade}
          </button>
          {failed && <span className="text-sm text-bad">{t.common.failed}</span>}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className={`flex items-start gap-3 rounded-xl px-4 py-3 ${result.score >= 80 ? "bg-good-soft" : result.score >= 50 ? "bg-soft" : "bg-warn-soft"}`}>
            <span className="font-display text-2xl font-bold">{result.score}</span>
            <span className="text-sm">{result.feedback}</span>
          </div>
          <span className="text-sm font-semibold">{t.drill.reference}</span>
          <pre className="overflow-x-auto rounded-xl bg-soft px-4 py-3 font-mono text-[13.5px] leading-[1.7]">{reference}</pre>
        </div>
      )}
    </div>
  );
}
