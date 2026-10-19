import Tabs from "./Tabs";

export default function ReviewLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex max-w-[1200px] flex-col gap-4 px-5 pb-10 pt-5">
      <Tabs />
      {children}
    </main>
  );
}
