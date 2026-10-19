"use client";
import { createContext, useContext } from "react";
import { dict } from "@/lib/dict";
import type { Lang } from "@/lib/types";

const LangContext = createContext<Lang>("zh");

export function I18nProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return <LangContext.Provider value={lang}>{children}</LangContext.Provider>;
}

export function useT() {
  const lang = useContext(LangContext);
  return { lang, t: dict[lang] };
}
