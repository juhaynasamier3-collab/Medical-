import Link from "next/link";
import { db, type Patient } from "@/lib/db";
import { text, viewer } from "@/lib/guard";

export default async function InactivePage() {
  const { lang } = await viewer();
  const t = text(lang);
  const rows = db().prepare("SELECT * FROM patients WHERE inactive = 1 ORDER BY full_name").all() as Patient[];
  return (
    <main className="stack">
      <h1>{t.inactive}</h1>
      {rows.length === 0 ? <p className="note">{t.noInactive}</p> : null}
      <table>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.full_name}</td>
              <td>{row.phone}</td>
              <td>{row.dob}</td>
              <td><Link href={`/patients/${row.id}`}>{t.open}</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
