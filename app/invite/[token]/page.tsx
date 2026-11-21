import { LanguageSwitch } from "@/components/LanguageSwitch";
import { PasswordForm } from "@/components/Forms";
import { publicLang, text } from "@/lib/guard";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const lang = await publicLang();
  const t = text(lang);
  return (
    <main className="shell stack">
      <div className="split">
        <h1>{t.inviteTitle}</h1>
        <LanguageSwitch lang={lang} next={`/invite/${token}`} />
      </div>
      <PasswordForm t={t} token={token} mode="invite" />
    </main>
  );
}
