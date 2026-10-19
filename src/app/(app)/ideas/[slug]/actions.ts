"use server";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";
import { db } from "@/lib/supabase/server";

export async function addTemplate(slug: string) {
  const uid = await requireUserId();
  await db()
    .from("templates")
    .upsert({ user_id: uid, slug, last_reviewed_at: new Date().toISOString() }, { onConflict: "user_id,slug", ignoreDuplicates: true });
  revalidatePath(`/ideas/${slug}`);
  revalidatePath("/review/templates");
}
