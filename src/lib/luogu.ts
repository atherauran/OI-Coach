const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

// Accepts full links (luogu.com.cn/problem/P1001, with query or trailing slash) or a bare pid (P1001, p1001).
export function parsePid(input: string): string | null {
  const s = input.trim();
  const link = s.match(/luogu\.com(?:\.cn)?\/problem\/([A-Za-z0-9_]+)/);
  if (link) return link[1];
  const bare = s.match(/^[A-Za-z][A-Za-z0-9_]*\d[A-Za-z0-9_]*$/);
  // Underscore ids (AT_abc300_a) have meaningful lowercase; plain ones (p1001, cf1a) are uppercase.
  return bare ? (s.includes("_") ? s : s.toUpperCase()) : null;
}

export const problemUrl = (pid: string) => `https://www.luogu.com.cn/problem/${pid}`;

export type Fetched = {
  title: string;
  statement: string;
  samples: [string, string][];
  timeLimit: number | null;
  memoryLimit: number | null;
};

type LuoguProblem = {
  name: string;
  content?: { background?: string; description?: string; formatI?: string; formatO?: string; hint?: string };
  samples?: [string, string][];
  limits?: { time?: number[]; memory?: number[] };
};

async function get(url: string, cookie = "") {
  return fetch(url, { headers: { "User-Agent": UA, Cookie: cookie }, redirect: "manual" });
}

export async function fetchLuogu(pid: string): Promise<Fetched> {
  const url = problemUrl(pid);
  let res = await get(url);
  // Luogu answers the first request with a 302 that sets an anti-bot cookie; retry once with it.
  if (res.status === 302) {
    const cookie = (res.headers.get("set-cookie") ?? "").split(";")[0];
    res = await get(url, cookie);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  const m = html.match(/<script id="lentille-context" type="application\/json">([\s\S]*?)<\/script>/);
  if (!m) throw new Error("no problem data");
  const p: LuoguProblem | undefined = JSON.parse(m[1])?.data?.problem;
  if (!p?.content?.description) throw new Error("no problem data");

  const c = p.content;
  const parts: string[] = [];
  if (c.background) parts.push(`## 题目背景\n\n${c.background}`);
  parts.push(`## 题目描述\n\n${c.description}`);
  if (c.formatI) parts.push(`## 输入格式\n\n${c.formatI}`);
  if (c.formatO) parts.push(`## 输出格式\n\n${c.formatO}`);
  if (c.hint) parts.push(`## 说明/提示\n\n${c.hint}`);

  const time = p.limits?.time?.length ? Math.max(...p.limits.time) : null;
  const mem = p.limits?.memory?.length ? Math.max(...p.limits.memory) : null;
  return {
    title: p.name,
    statement: parts.join("\n\n"),
    samples: p.samples ?? [],
    timeLimit: time,
    memoryLimit: mem ? Math.round(mem / 1024) : null,
  };
}
