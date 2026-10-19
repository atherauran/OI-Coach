import { cookies } from "next/headers";
import { dict } from "./dict";
import type { Lang } from "./types";

export async function getLang(): Promise<Lang> {
  return (await cookies()).get("lang")?.value === "en" ? "en" : "zh";
}

export async function getT() {
  const lang = await getLang();
  return { lang, t: dict[lang] };
}
