import Link from "next/link";
import { IdleGuard } from "@/components/IdleGuard";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { signOut } from "@/lib/actions";
import { clinicOrSetup, text, viewer } from "@/lib/guard";
import { governorateLabel } from "@/lib/governorates";

export default async function ClinicLayout({ children }: { children: React.ReactNode }) {
  clinicOrSetup();
  const { doctor, lang } = await viewer();
  const t = text(lang);
  const clinic = clinicOrSetup();
  return (
    <>
      <IdleGuard />
      <div className="shell">
        <header className="top">
          <div>
            <p className="brand">{clinic?.name}</p>
            <p className="sub">
              {doctor.name}
              {doctor.is_owner ? ` · ${t.owner}` : ""} · {governorateLabel(clinic?.governorate || "", lang)}
            </p>
          </div>
          <div className="stack">
            <nav>
              <Link href="/day">{t.day}</Link>
              <Link href="/patients">{t.patients}</Link>
              <Link href="/patients/inactive">{t.inactive}</Link>
              <Link href="/centers">{t.centers}</Link>
              {doctor.is_owner ? <Link href="/doctors">{t.doctors}</Link> : null}
              {doctor.is_owner ? <Link href="/outbox">{t.outbox}</Link> : null}
              <Link href="/account">{t.account}</Link>
              <form action={signOut}>
                <button className="quiet" type="submit">{t.signOut}</button>
              </form>
            </nav>
            <LanguageSwitch lang={lang} next="/day" />
          </div>
        </header>
        {children}
      </div>
    </>
  );
}
