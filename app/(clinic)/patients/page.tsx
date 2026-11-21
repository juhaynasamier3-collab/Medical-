import Link from "next/link";
import { redirect } from "next/navigation";
import { db, type Patient } from "@/lib/db";
import { text, viewer } from "@/lib/guard";
import { governorateLabel } from "@/lib/governorates";
import { isEgyptianMobile } from "@/lib/validators";

export default async function PatientsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { lang } = await viewer();
  const t = text(lang);
  const q = (await searchParams).q?.trim() || "";
  let rows: Patient[] = [];
  let empty = false;
  if (!q) {
    rows = db().prepare("SELECT * FROM patients WHERE inactive = 0 ORDER BY id DESC LIMIT 20").all() as Patient[];
  } else if (isEgyptianMobile(q)) {
    const match = db().prepare("SELECT * FROM patients WHERE phone = ?").get(q) as Patient | undefined;
    if (match) redirect(`/patients/${match.id}`);
    empty = true;
  } else {
    rows = db()
      .prepare("SELECT * FROM patients WHERE inactive = 0 AND full_name LIKE '%' || ? || '%' ORDER BY full_name")
      .all(q) as Patient[];
    empty = rows.length === 0;
  }
  return (
    <main className="stack">
      <h1>{t.patients}</h1>
      <form className="row">
        <label>
          {t.search}
          <input name="q" defaultValue={q} placeholder={t.searchPlaceholder} />
        </label>
        <button>{t.search}</button>
        <Link href={`/patients/new?name=${encodeURIComponent(isEgyptianMobile(q) ? "" : q)}&phone=${encodeURIComponent(isEgyptianMobile(q) ? q : "")}`}>
          {t.createPatient}
        </Link>
      </form>
      {empty ? <p className="note">{t.noMatches}</p> : null}
      {!q ? <h2>{t.recent}</h2> : null}
      <table>
        <thead>
          <tr>
            <th>{t.fullName}</th>
            <th>{t.phone}</th>
            <th>{t.dob}</th>
            <th>{t.city}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.full_name}</td>
              <td>{row.phone}</td>
              <td>{row.dob}</td>
              <td>{governorateLabel(row.city, lang)}</td>
              <td><Link href={`/patients/${row.id}`}>{t.open}</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
