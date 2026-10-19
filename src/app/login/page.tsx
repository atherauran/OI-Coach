import { redirect } from "next/navigation";
import { getUserId } from "@/lib/auth";
import { Logo } from "@/components/icons";
import { LangMenu } from "@/components/HeaderMenus";
import LoginForm from "./LoginForm";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await getUserId()) redirect("/");
  const { next } = await searchParams;
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 py-10">
      <div className="absolute right-4 top-3">
        <LangMenu />
      </div>
      <div className="flex items-center gap-3">
        <Logo />
        <span className="font-display text-2xl font-bold tracking-tight">OI Coach</span>
      </div>
      <LoginForm next={next ?? "/"} />
    </main>
  );
}
