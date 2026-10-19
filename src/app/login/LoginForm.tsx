"use client";
import { useActionState, useState } from "react";
import { useT } from "@/components/i18n";
import { Spinner } from "@/components/ui";
import { signIn, signUp } from "./actions";

export default function LoginForm({ next }: { next: string }) {
  const { t } = useT();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [inState, inAction, inPending] = useActionState(signIn, undefined);
  const [upState, upAction, upPending] = useActionState(signUp, undefined);
  const state = mode === "in" ? inState : upState;
  const pending = mode === "in" ? inPending : upPending;

  const field = (name: string, label: string, type = "text", extra: Record<string, unknown> = {}) => (
    <label className="flex flex-col gap-1.5 text-sm font-semibold">
      {label}
      <input name={name} type={type} required className="field min-h-10 font-normal" {...extra} />
    </label>
  );

  return (
    <div className="card w-full max-w-sm p-5">
      <div className="mb-5 grid grid-cols-2 gap-1 rounded-[10px] bg-soft p-1">
        {(["in", "up"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`min-h-10 rounded-lg text-sm font-semibold ${mode === m ? "bg-card shadow-sm" : "text-muted"}`}
          >
            {m === "in" ? t.login.signIn : t.login.signUp}
          </button>
        ))}
      </div>
      <form action={mode === "in" ? inAction : upAction} className="flex flex-col gap-4" key={mode}>
        <input type="hidden" name="next" value={next} />
        {mode === "up" && field("name", t.login.name, "text", { autoComplete: "nickname" })}
        {field("email", t.login.email, "email", { autoComplete: "email" })}
        {field("password", t.login.password, "password", {
          autoComplete: mode === "in" ? "current-password" : "new-password",
          minLength: 6,
        })}
        {mode === "up" && (
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            {t.login.invite}
            <input name="code" className="field min-h-10 font-mono font-normal uppercase" />
            <span className="text-xs font-normal text-muted">{t.login.inviteNote}</span>
          </label>
        )}
        {state?.error && <p className="text-sm text-bad">{state.error}</p>}
        <button type="submit" disabled={pending} className="btn-primary mt-1">
          {pending && <Spinner light />}
          {mode === "in" ? t.login.signIn : t.login.signUp}
        </button>
      </form>
    </div>
  );
}
