"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUserId } from "@/lib/auth";
import { db } from "@/lib/supabase/server";
import type { Visibility } from "@/lib/types";

async function ownList(listId: string) {
  const uid = await requireUserId();
  const { data } = await db().from("lists").select("id").eq("id", listId).eq("owner", uid).maybeSingle();
  if (!data) throw new Error("not your list");
  return uid;
}

async function append(listId: string, pids: string[]) {
  const sb = db();
  const { data } = await sb.from("list_items").select("problem_id, position").eq("list_id", listId);
  const have = new Set((data ?? []).map((r) => r.problem_id));
  let pos = Math.max(0, ...(data ?? []).map((r) => r.position));
  const rows = [...new Set(pids)].filter((p) => !have.has(p)).map((p) => ({ list_id: listId, problem_id: p, position: ++pos }));
  if (rows.length) await sb.from("list_items").insert(rows);
}

export async function createList(name: string, pids: string[]) {
  const uid = await requireUserId();
  const { data, error } = await db().from("lists").insert({ owner: uid, name: name.trim() }).select("id").single();
  if (error) throw error;
  await append(data.id, pids);
  redirect(`/lists/${data.id}`);
}

export async function createEmptyList(form: FormData) {
  await createList(String(form.get("name")) || "New list", []);
}

export async function addToList(listId: string, pids: string[]) {
  await ownList(listId);
  await append(listId, pids);
  redirect(`/lists/${listId}`);
}

export async function renameList(listId: string, name: string) {
  await ownList(listId);
  if (name.trim()) await db().from("lists").update({ name: name.trim() }).eq("id", listId);
  revalidatePath(`/lists/${listId}`);
}

export async function setVisibility(listId: string, visibility: Visibility) {
  await ownList(listId);
  await db().from("lists").update({ visibility }).eq("id", listId);
  revalidatePath(`/lists/${listId}`);
}

export async function setDueDate(listId: string, due: string) {
  await ownList(listId);
  await db().from("lists").update({ due_date: due || null }).eq("id", listId);
  revalidatePath(`/lists/${listId}`);
}

export async function setMember(listId: string, userId: string, on: boolean) {
  await ownList(listId);
  const sb = db();
  if (on) await sb.from("list_members").upsert({ list_id: listId, user_id: userId, assigned: true });
  else await sb.from("list_members").delete().eq("list_id", listId).eq("user_id", userId);
  revalidatePath(`/lists/${listId}`);
}

export async function reorder(listId: string, pids: string[]) {
  await ownList(listId);
  const sb = db();
  await Promise.all(pids.map((p, i) => sb.from("list_items").update({ position: i + 1 }).eq("list_id", listId).eq("problem_id", p)));
  revalidatePath(`/lists/${listId}`);
}

export async function removeItem(listId: string, pid: string) {
  await ownList(listId);
  await db().from("list_items").delete().eq("list_id", listId).eq("problem_id", pid);
  revalidatePath(`/lists/${listId}`);
}

export async function deleteList(listId: string) {
  await ownList(listId);
  await db().from("lists").delete().eq("id", listId);
  redirect("/lists");
}

export async function leaveList(listId: string) {
  const uid = await requireUserId();
  await db().from("list_members").delete().eq("list_id", listId).eq("user_id", uid);
  redirect("/lists");
}
