"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authClient } from "@/lib/supabase/server";

export async function setLang(lang: "zh" | "en") {
  (await cookies()).set("lang", lang, { path: "/", maxAge: 60 * 60 * 24 * 365 });
}

export async function signOut() {
  await (await authClient()).auth.signOut();
  redirect("/login");
}
