import type { Metadata } from "next";
import "./globals.css";
import { publicLang } from "@/lib/guard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Clinic record" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await publicLang();
  return (
    <html lang={lang} dir={lang === "ar" ? "rtl" : "ltr"}>
      <body>{children}</body>
    </html>
  );
}
