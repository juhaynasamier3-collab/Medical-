import { CityForm, PasswordChangeForm, ProfileForm } from "@/components/Forms";
import { clinicRow } from "@/lib/db";
import { text, viewer } from "@/lib/guard";

export default async function AccountPage() {
  const { doctor, lang } = await viewer();
  const t = text(lang);
  const clinic = clinicRow();
  return (
    <main className="stack">
      <h1>{t.account}</h1>
      <p className="note">{doctor.email}</p>
      <ProfileForm t={t} name={doctor.name} />
      <PasswordChangeForm t={t} />
      {doctor.is_owner && clinic ? <CityForm t={t} lang={lang} value={clinic.governorate} /> : null}
      {doctor.is_owner ? <a className="button" href="/api/download">{t.download}</a> : null}
    </main>
  );
}
