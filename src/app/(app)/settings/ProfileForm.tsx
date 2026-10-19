"use client";
import { useState, useTransition } from "react";
import { useT } from "@/components/i18n";
import { Spinner } from "@/components/ui";
import { saveProfile } from "./actions";

type Values = { name: string; contest_name: string; contest_date: string };

export default function ProfileForm({ initial }: { initial: Values }) {
  const { t } = useT();
  const [saved, setSaved] = useState(initial);
  const [values, setValues] = useState(initial);
  const [saving, start] = useTransition();
  const dirty = (Object.keys(values) as (keyof Values)[]).some((k) => values[k].trim() !== saved[k].trim());
  const set = (k: keyof Values) => (e: React.ChangeEvent<HTMLInputElement>) => setValues({ ...values, [k]: e.target.value });

  return (
    <form
      action={(form) =>
        start(async () => {
          await saveProfile(form);
          setSaved(values);
        })
      }
      className="card flex flex-col gap-4 p-5"
    >
      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        {t.settings.name}
        <input name="name" value={values.name} onChange={set("name")} className="field min-h-10 font-normal" />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          {t.settings.contestName}
          <input name="contest_name" value={values.contest_name} onChange={set("contest_name")} placeholder="CSP-S" className="field min-h-10 font-normal" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          {t.settings.contestDate}
          <input name="contest_date" type="date" value={values.contest_date} onChange={set("contest_date")} className="field min-h-10 font-normal" />
        </label>
      </div>
      <p className="text-[13px] text-muted">{t.settings.contestNote}</p>
      <div>
        <button disabled={!dirty || saving} className="btn-dark disabled:bg-[#8A8F9C] disabled:opacity-100">
          {saving && <Spinner light />}
          {t.common.save}
        </button>
      </div>
    </form>
  );
}
