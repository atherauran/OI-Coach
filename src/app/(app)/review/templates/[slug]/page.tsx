import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUserId } from "@/lib/auth";
import { getOrCreateDetails } from "@/lib/ideaDetails";
import { IDEA_BY_SLUG, ideaName } from "@/lib/ideas";
import { getT } from "@/lib/lang";
import { mastery } from "@/lib/review";
import { db } from "@/lib/supabase/server";
import TemplateDrill from "@/components/TemplateDrill";
import { removeTemplate } from "../../actions";
import SubmitButton from "@/components/SubmitButton";

export default async function TemplateDrillPage({ params }: { params: Promise<{ slug: string }> }) {
  const uid = await requireUserId();
  const { t, lang } = await getT();
  const { slug } = await params;
  if (!IDEA_BY_SLUG.has(slug)) notFound();
  const [{ data: row }, details] = await Promise.all([
    db().from("templates").select("halflife, last_reviewed_at").eq("user_id", uid).eq("slug", slug).maybeSingle(),
    getOrCreateDetails(slug),
  ]);
  if (!row) notFound();
  const name = ideaName(slug, lang);
  return (
    <div className="card flex max-w-[860px] flex-col gap-4 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-display text-2xl font-bold">{name}</h1>
        <Link href={`/ideas/${slug}`} className="link text-sm">
          {t.review.openIdea}
        </Link>
      </div>
      <p className="text-[17px] font-medium">{t.review.templatePrompt(name)}</p>
      <TemplateDrill slug={slug} reference={details.template} mastery={mastery(row.halflife, row.last_reviewed_at)} />
      <form action={removeTemplate.bind(null, slug)} className="border-t border-line-soft pt-3">
        <SubmitButton small className="inline-flex items-center gap-1.5 text-sm text-muted hover:underline">
          {t.review.removeTemplate}
        </SubmitButton>
      </form>
    </div>
  );
}
