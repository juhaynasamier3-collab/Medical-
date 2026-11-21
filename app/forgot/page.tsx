import Link from "next/link";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { ResetRequestForm } from "@/components/Forms";
import { publicLang, text } from "@/lib/guard";

export default async function ForgotPage() {
  const lang = await publicLang();
  const t = text(lang);
  return (
    <main className="shell stack">
      <div className="split">
        <h1>{t.forgot}</h1>
        <LanguageSwitch lang={lang} next="/forgot" />
      </div>
      <ResetRequestForm t={t} />
      <Link href="/login">{t.back}</Link>
    </main>
  );
}
