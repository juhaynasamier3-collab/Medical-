import { redirect } from "next/navigation";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { SetupForm } from "@/components/Forms";
import { doctorCount } from "@/lib/db";
import { publicLang, text } from "@/lib/guard";

export default async function SetupPage() {
  if (doctorCount() > 0) redirect("/login");
  const lang = await publicLang();
  const t = text(lang);
  return (
    <main className="shell stack">
      <div className="split">
        <h1>{t.setupTitle}</h1>
        <LanguageSwitch lang={lang} next="/setup" />
      </div>
      <p className="note">{t.setupOnce}</p>
      <SetupForm t={t} />
    </main>
  );
}
