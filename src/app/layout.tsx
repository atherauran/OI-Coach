import type { Metadata } from "next";
import "katex/dist/katex.min.css";
import "./globals.css";
import { getLang } from "@/lib/lang";
import { I18nProvider } from "@/components/i18n";

export const metadata: Metadata = {
  title: "OI Coach",
  description: "Practice OI problems by talking them through with a coach.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await getLang();
  return (
    <html lang={lang === "zh" ? "zh-CN" : "en"}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=IBM+Plex+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;600&family=Noto+Sans+SC:wght@400;500;700&display=swap"
        />
      </head>
      <body className="min-h-screen">
        <I18nProvider lang={lang}>{children}</I18nProvider>
      </body>
    </html>
  );
}
