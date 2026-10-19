"use server";
import { redirect } from "next/navigation";
import { authClient, db } from "@/lib/supabase/server";
import { getT } from "@/lib/lang";

export type AuthState = { error?: string } | undefined;

const safeNext = (next: FormDataEntryValue | null) => {
  const s = String(next ?? "");
  return s.startsWith("/") && !s.startsWith("//") ? s : "/";
};

export async function signIn(_: AuthState, form: FormData): Promise<AuthState> {
  const { t } = await getT();
  const { error } = await (await authClient()).auth.signInWithPassword({
    email: String(form.get("email")).trim(),
    password: String(form.get("password")),
  });
  if (error) return { error: t.login.badLogin };
  redirect(safeNext(form.get("next")));
}

export async function signUp(_: AuthState, form: FormData): Promise<AuthState> {
  const { t } = await getT();
  const name = String(form.get("name")).trim();
  const email = String(form.get("email")).trim();
  const password = String(form.get("password"));
  const code = String(form.get("code") ?? "").trim().toUpperCase();
  if (!name || !email || password.length < 6) return { error: t.login.fillAll };

  const admin = db();
  const [{ count }, { data: invite }] = await Promise.all([
    admin.from("profiles").select("*", { count: "exact", head: true }),
    admin.from("invites").select("used_by").eq("code", code).maybeSingle(),
  ]);
  const firstUser = count === 0;
  if (!firstUser && (!invite || invite.used_by)) return { error: t.login.badInvite };

  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) return { error: error?.message ?? t.login.failed };
  // invites.used_by references profiles, so the profile must exist before the invite is claimed.
  await admin.from("profiles").insert({ id: data.user.id, name });
  if (!firstUser) {
    await admin.from("invites").update({ used_by: data.user.id, used_at: new Date().toISOString() }).eq("code", code);
  }

  await (await authClient()).auth.signInWithPassword({ email, password });
  redirect("/");
}
