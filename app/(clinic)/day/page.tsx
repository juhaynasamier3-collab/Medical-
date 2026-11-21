import Link from "next/link";
import { db } from "@/lib/db";
import { text, viewer } from "@/lib/guard";
import { cairoDateKey, cairoToday, formatWhen } from "@/lib/time";

export default async function DayPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const { lang } = await viewer();
  const t = text(lang);
  const query = await searchParams;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(query.date || "") ? query.date! : cairoToday();
  const rows = db()
    .prepare(
      `SELECT appointments.*, patients.full_name
       FROM appointments JOIN patients ON patients.id = appointments.patient_id
       ORDER BY appointments.start_at`,
    )
    .all() as {
    id: number;
    patient_id: number;
    full_name: string;
    center_name: string;
    room_number: string;
    start_at: string;
    minutes: number;
    is_surgery: number;
    status: string;
  }[];
  const list = rows.filter((row) => cairoDateKey(row.start_at) === date);
  return (
    <main className="stack">
      <div className="split">
        <h1>{t.day}</h1>
        <form className="row">
          <label>
            {t.date}
            <input type="date" name="date" defaultValue={date} />
          </label>
          <button>{t.showDay}</button>
        </form>
      </div>
      {list.length === 0 ? <p className="note">{t.noAppointments}</p> : null}
      <table>
        <thead>
          <tr>
            <th>{t.time}</th>
            <th>{t.patient}</th>
            <th>{t.center}</th>
            <th>{t.room}</th>
            <th>{t.minutes}</th>
            <th>{t.surgery}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {list.map((row) => (
            <tr key={row.id}>
              <td>{formatWhen(row.start_at, lang)}</td>
              <td>{row.full_name}</td>
              <td>{row.center_name}</td>
              <td>{row.room_number}</td>
              <td>{row.minutes}</td>
              <td>{row.is_surgery ? t.surgery : ""}</td>
              <td>
                {row.status === "cancelled" ? t.cancelled : ""} <Link href={`/patients/${row.patient_id}`}>{t.open}</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
