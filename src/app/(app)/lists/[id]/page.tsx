import { notFound } from "next/navigation";
import { requireUserId } from "@/lib/auth";
import { loadList } from "@/lib/lists";
import { problemProgress } from "@/lib/progress";
import { db } from "@/lib/supabase/server";
import type { Visibility } from "@/lib/types";
import ListView from "./ListView";

export default async function ListPage({ params }: { params: Promise<{ id: string }> }) {
  const uid = await requireUserId();
  const { id } = await params;
  const sb = db();
  const [loaded, mine, { data: members }, { data: people }] = await Promise.all([
    loadList(id, uid),
    problemProgress(uid),
    sb.from("list_members").select("user_id, profiles(name)").eq("list_id", id).eq("assigned", true),
    sb.from("profiles").select("id, name").neq("id", uid).order("name"),
  ]);
  if (!loaded) notFound();
  const { list, member: membership, items } = loaded;
  const isOwner = list.owner === uid;
  if (!isOwner && !membership) await sb.from("list_members").insert({ list_id: id, user_id: uid, assigned: false });

  const pids = items.map((i) => i.id);
  const rows = items.map((p) => {
    const pr = mine.get(p.id);
    return {
      id: p.id,
      title: p.title ?? p.id,
      ideas: p.ideas.map((i) => i.slug),
      role: p.ideas[0]?.role ?? null,
      why: p.ideas[0]?.why ?? "",
      total: p.key_points?.length ?? 0,
      done: !!pr?.done,
      rating: pr?.rating ?? null,
      activeFound: pr?.activeFound ?? null,
    };
  });

  let owner = null;
  if (isOwner) {
    const ms = (members ?? []) as unknown as { user_id: string; profiles: { name: string } }[];
    const memberIds = ms.map((m) => m.user_id);
    // One query for every member's attempts on these problems: progress and hint counts both come from it.
    const { data: atts } =
      memberIds.length && pids.length
        ? await sb.from("attempts").select("user_id, problem_id, status, hinted").in("problem_id", pids).in("user_id", memberIds)
        : { data: [] };
    const progress = ms.map((m) => ({
      id: m.user_id,
      name: m.profiles.name,
      done: new Set((atts ?? []).filter((a) => a.user_id === m.user_id && a.status === "done").map((a) => a.problem_id)).size,
    }));
    // Which key points members most often needed a hint for.
    const counts = new Map<string, { name: string; users: Set<string> }>();
    for (const a of atts ?? [])
      for (const pointId of a.hinted as string[]) {
        const point = items.find((i) => i.id === a.problem_id)?.key_points?.find((k) => k.id === pointId);
        if (!point) continue;
        const key = `${a.problem_id}:${pointId}`;
        const c = counts.get(key) ?? { name: point.name, users: new Set() };
        c.users.add(a.user_id);
        counts.set(key, c);
      }
    owner = {
      members: progress,
      people: people ?? [],
      hinted: [...counts.values()].map((c) => ({ name: c.name, count: c.users.size })).sort((a, b) => b.count - a.count).slice(0, 5),
    };
  }

  return (
    <ListView
      list={{
        id: list.id,
        name: list.name,
        visibility: list.visibility as Visibility,
        due: list.due_date,
        ownerName: list.ownerName,
      }}
      rows={rows}
      owner={owner}
      assignedToMe={!!membership?.assigned}
    />
  );
}
