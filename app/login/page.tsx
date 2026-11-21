import Link from "next/link";
import { redirect } from "next/navigation";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { LoginForm } from "@/components/Forms";
import { doctorCount } from "@/lib/db";
import { text, publicLang } from "@/lib/guard";
import { currentDoctor } from "@/lib/session";

export default async function LoginPage() {
  if (doctorCount() === 0) redirect("/setup");
  if (await currentDoctor()) redirect("/day");
  const lang = await publicLang();
  const t = text(lang);
  return (
    <main className="shell stack">
      <div className="split">
        <h1>{t.signInTitle}</h1>
        <LanguageSwitch lang={lang} next="/login" />
      </div>
      <LoginForm t={t} />
      <Link href="/forgot">{t.forgot}</Link>
    </main>
  );
}
