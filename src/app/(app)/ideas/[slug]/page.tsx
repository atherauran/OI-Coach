import { notFound } from "next/navigation";
import { requireUserId } from "@/lib/auth";
import { loadDetails } from "@/lib/ideaDetails";
import { IDEA_BY_SLUG } from "@/lib/ideas";
import { getT } from "@/lib/lang";
import { problemProgress } from "@/lib/progress";
import { db } from "@/lib/supabase/server";
import { ROLES, type ProblemIdea } from "@/lib/types";
import IdeaView from "./IdeaView";

export default async function IdeaPage({ params }: { params: Promise<{ slug: string }> }) {
  const uid = await requireUserId();
  const { lang } = await getT();
  const { slug } = await params;
  const idea = IDEA_BY_SLUG.get(slug);
  if (!idea) notFound();
  const sb = db();
  const [{ data }, details, { data: summary }, { data: template }, progress] = await Promise.all([
    sb.from("problems").select("id, title, ideas, created_at").eq("stage", "ready").contains("ideas", JSON.stringify([{ slug }])),
    loadDetails(slug),
    sb.from("idea_summaries").select("text, feedback").eq("user_id", uid).eq("slug", slug).maybeSingle(),
    sb.from("templates").select("slug").eq("user_id", uid).eq("slug", slug).maybeSingle(),
    problemProgress(uid),
  ]);
  const problems = ((data ?? []) as { id: string; title: string; ideas: ProblemIdea[] }[])
    .map((p) => ({ ...p, tag: p.ideas.find((i) => i.slug === slug)! }))
    .sort((a, b) => ROLES.indexOf(a.tag.role) - ROLES.indexOf(b.tag.role));
  const track = problems.map((p) => {
    const pr = progress.get(p.id);
    return { id: p.id, title: p.title, role: p.tag.role, why: p.tag.why, done: !!pr?.done, rating: pr?.rating ?? null, active: pr?.activeFound != null };
  });

  return (
    <IdeaView
      slug={slug}
      name={lang === "zh" ? idea.zh : idea.en}
      category={idea.cat}
      track={track}
      details={details}
      summary={summary as { text: string; feedback: { score: number; got: string; missed: string } | null } | null}
      templateAdded={!!template}
    />
  );
}
