import { getUserId } from "@/lib/auth";
import { fetchStage, pointsStage, solveStage } from "@/lib/pack";

export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { pid, step, statement } = (await req.json()) as { pid: string; step: "fetch" | "solve" | "points"; statement?: string };
  try {
    if (step === "fetch") return Response.json(await fetchStage(pid, userId, statement));
    if (step === "solve") return Response.json({ stage: await solveStage(pid) });
    return Response.json({ stage: await pointsStage(pid) });
  } catch (e) {
    console.error(`import ${pid} ${step}:`, e);
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
