import { db } from "@/lib/db";
import { requireOwner, text } from "@/lib/guard";
import { formatWhen } from "@/lib/time";

export default async function OutboxPage() {
  const { lang } = await requireOwner();
  const t = text(lang);
  const rows = db()
    .prepare("SELECT * FROM outbox ORDER BY id DESC")
    .all() as { id: number; to_email: string; subject: string; body: string; created_at: string }[];
  return (
    <main className="stack">
      <h1>{t.outbox}</h1>
      <p className="note">{t.mailNote}</p>
      {rows.length === 0 ? <p className="note">{t.noMail}</p> : null}
      {rows.map((row) => (
        <article key={row.id} className="card stack">
          <p>{formatWhen(row.created_at, lang)}</p>
          <p>{t.to}: {row.to_email}</p>
          <p>{t.subject}: {row.subject}</p>
          <p className="visit">{row.body}</p>
        </article>
      ))}
    </main>
  );
}
