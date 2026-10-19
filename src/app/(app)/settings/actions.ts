"use server";
import { revalidatePath } from "next/cache";
import { requireUser, requireUserId } from "@/lib/auth";
import { db } from "@/lib/supabase/server";

export async function saveProfile(form: FormData) {
  const me = await requireUser();
  await db()
    .from("profiles")
    .update({
      name: String(form.get("name")).trim() || me.name,
      contest_name: String(form.get("contest_name")).trim() || null,
      contest_date: String(form.get("contest_date")) || null,
    })
    .eq("id", me.id);
  revalidatePath("/", "layout");
}

export async function createInvite() {
  const uid = await requireUserId();
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const code = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
  await db().from("invites").insert({ code, created_by: uid });
  revalidatePath("/settings");
}
