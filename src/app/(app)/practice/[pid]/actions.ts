"use server";
import { redirect } from "next/navigation";
import { createAttempt } from "@/lib/attempts";
import { requireUserId } from "@/lib/auth";

export async function practiceAgain(pid: string, listId: string | null) {
  const uid = await requireUserId();
  await createAttempt(uid, pid, listId);
  redirect(`/practice/${pid}${listId ? `?list=${listId}` : ""}`);
}
