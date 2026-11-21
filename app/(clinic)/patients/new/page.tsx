import Link from "next/link";
import { PatientCreateForm } from "@/components/Forms";
import { text, viewer } from "@/lib/guard";

export default async function NewPatientPage({ searchParams }: { searchParams: Promise<{ name?: string; phone?: string }> }) {
  const { lang } = await viewer();
  const t = text(lang);
  const query = await searchParams;
  return (
    <main className="stack">
      <div className="split">
        <h1>{t.createPatient}</h1>
        <Link href="/patients">{t.back}</Link>
      </div>
      <PatientCreateForm t={t} lang={lang} name={query.name} phone={query.phone} />
    </main>
  );
}
