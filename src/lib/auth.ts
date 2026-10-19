import { redirect } from "next/navigation";
import { cache } from "react";
import { authClient, db } from "./supabase/server";
import type { Profile } from "./types";

// Verified locally from the JWT (no network after the signing keys are cached).
export const getUserId = cache(async (): Promise<string | null> => {
  const { data } = await (await authClient()).auth.getClaims();
  return (data?.claims?.sub as string | undefined) ?? null;
});

export const requireUserId = cache(async (): Promise<string> => {
  const id = await getUserId();
  if (!id) redirect("/login");
  return id;
});

export const requireUser = cache(async (): Promise<Profile> => {
  const id = await requireUserId();
  const { data } = await db().from("profiles").select("*").eq("id", id).single();
  if (!data) redirect("/login");
  return data as Profile;
});
