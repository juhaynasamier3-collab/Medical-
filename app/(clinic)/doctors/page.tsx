import { InviteForm } from "@/components/Forms";
import { removeDoctor, transferOwner } from "@/lib/actions";
import { db, type Doctor } from "@/lib/db";
import { requireOwner, text } from "@/lib/guard";

export default async function DoctorsPage() {
  const { doctor, lang } = await requireOwner();
  const t = text(lang);
  const doctors = db().prepare("SELECT * FROM doctors WHERE active = 1 ORDER BY name").all() as Doctor[];
  return (
    <main className="stack">
      <h1>{t.doctors}</h1>
      <p className="note">{t.ownerNote}</p>
      <InviteForm t={t} />
      <table>
        <tbody>
          {doctors.map((item) => (
            <tr key={item.id}>
              <td>{item.name} {item.id === doctor.id ? `(${t.you})` : ""}</td>
              <td>{item.email}</td>
              <td>{item.is_owner ? t.owner : ""}</td>
              <td>
                {item.is_owner ? null : (
                  <form action={transferOwner}>
                    <input type="hidden" name="doctorId" value={item.id} />
                    <button className="quiet" type="submit">{t.transfer}</button>
                  </form>
                )}
              </td>
              <td>
                {item.is_owner ? null : (
                  <form action={removeDoctor}>
                    <input type="hidden" name="doctorId" value={item.id} />
                    <button className="warn" type="submit">{t.removeDoctor}</button>
                  </form>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
