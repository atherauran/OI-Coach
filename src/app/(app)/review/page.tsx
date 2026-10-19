import { requireUser, requireUserId } from "@/lib/auth";
import { dailyQueue } from "@/lib/review";
import { db } from "@/lib/supabase/server";
import DailyReview from "./DailyReview";

export default async function ReviewPage() {
  const uid = await requireUserId();
  const [queue, { data: details }] = await Promise.all([
    dailyQueue(uid, requireUser()),
    db().from("idea_details").select("slug, template"),
  ]);
  const reference = new Map((details ?? []).map((d) => [d.slug, d.template as string]));
  const templates = queue.templates.map((x) => ({ ...x, reference: reference.get(x.slug) ?? "" }));
  return <DailyReview identify={queue.identify} recall={queue.recall} templates={templates.filter((x) => x.reference)} />;
}
