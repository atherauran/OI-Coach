import { getUserId } from "@/lib/auth";
import { getOrCreateDetails } from "@/lib/ideaDetails";

export async function POST(req: Request) {
  if (!(await getUserId())) return new Response("unauthorized", { status: 401 });
  const { slug } = (await req.json()) as { slug: string };
  try {
    return Response.json(await getOrCreateDetails(slug));
  } catch (e) {
    console.error("idea details", slug, e);
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
