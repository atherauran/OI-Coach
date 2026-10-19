import { notFound } from "next/navigation";
import { requireUserId } from "@/lib/auth";
import { parsePid } from "@/lib/luogu";
import { db } from "@/lib/supabase/server";
import Importer from "./Importer";

export default async function ImportPage({ searchParams }: { searchParams: Promise<{ links?: string; list?: string }> }) {
  const uid = await requireUserId();
  const { links = "", list } = await searchParams;
  let target: { id: string; name: string } | null = null;
  if (list) {
    const { data } = await db().from("lists").select("id, name").eq("id", list).eq("owner", uid).maybeSingle();
    if (!data) notFound();
    target = data;
  }
  const lines = links.split(/\s+/).filter(Boolean);
  const items = lines.map((line) => ({ line, pid: parsePid(line) }));
  const seen = new Set<string>();
  const unique = items.filter((i) => !i.pid || (!seen.has(i.pid) && seen.add(i.pid)));
  return <Importer items={unique} target={target} />;
}
