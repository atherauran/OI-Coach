import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { dict } from "@/lib/dict";
import type { Lang, PointType, Role } from "@/lib/types";

export const TYPE_COLORS: Record<PointType, string> = {
  logic: "bg-accent-soft text-accent-dark",
  condition: "bg-[#E0F2EF] text-[#0B5A54]",
  trap: "bg-warn-soft text-warn",
  impl: "bg-[#F0EAFB] text-[#4C1D95]",
};

export function TypeTag({ type, lang, className = "" }: { type: PointType; lang: Lang; className?: string }) {
  return (
    <span className={`flex-none rounded-md px-2 py-0.5 text-xs font-semibold ${TYPE_COLORS[type]} ${className}`}>
      {dict[lang].pointType[type]}
    </span>
  );
}

export function RoleTag({ role, lang }: { role: Role; lang: Lang }) {
  return <span className="rounded-full bg-hover px-2.5 py-0.5 text-xs text-ink-2">{dict[lang].role[role]}</span>;
}

export function Markdown({ children, className = "" }: { children: string; className?: string }) {
  return (
    <div className={`md ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
        {children}
      </ReactMarkdown>
    </div>
  );
}

export function Spinner({ large, small, light, className = "" }: { large?: boolean; small?: boolean; light?: boolean; className?: string }) {
  const size = large ? "h-9 w-9 border-[3px]" : small ? "h-4 w-4 border-2" : "h-5 w-5 border-2";
  const color = light ? "border-white/40 border-t-white" : "border-line border-t-accent";
  return <span role="status" className={`spin inline-block flex-none rounded-full ${size} ${color} ${className}`} />;
}

export function PageLoading() {
  return (
    <div className="flex justify-center py-24">
      <Spinner large />
    </div>
  );
}

export function Bar({ value, className = "" }: { value: number; className?: string }) {
  return (
    <div className={`h-1.5 overflow-hidden rounded-full bg-line-soft ${className}`}>
      <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${Math.round(value * 100)}%` }} />
    </div>
  );
}

export function PageTitle({ children, sub }: { children: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <h1 className="font-display text-[26px] font-bold">{children}</h1>
      {sub && <p className="text-sm text-muted">{sub}</p>}
    </div>
  );
}
