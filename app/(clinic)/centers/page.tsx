import { CenterCreateForm, RenameForm, RoomForm } from "@/components/Forms";
import { closeCenter, closeRoom, removeCenter, removeRoom } from "@/lib/actions";
import { db } from "@/lib/db";
import { text, viewer } from "@/lib/guard";

export default async function CentersPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { lang } = await viewer();
  const t = text(lang);
  const error = (await searchParams).error;
  const centers = db().prepare("SELECT * FROM centers ORDER BY name").all() as {
    id: number;
    name: string;
    closed: number;
  }[];
  const rooms = db().prepare("SELECT * FROM rooms ORDER BY number").all() as {
    id: number;
    center_id: number;
    number: string;
    closed: number;
  }[];
  return (
    <main className="stack">
      <h1>{t.centers}</h1>
      {error === "hasAppointments" ? <p className="error">{t.hasAppointments}</p> : null}
      <CenterCreateForm t={t} />
      {centers.length === 0 ? <p className="note">{t.noCenters}</p> : null}
      {centers.map((center) => (
        <section key={center.id} className="card stack">
          <div className="split">
            <h2>{center.name} {center.closed ? `· ${t.closed}` : ""}</h2>
          </div>
          <RenameForm t={t} centerId={center.id} name={center.name} />
          <h3>{t.rooms}</h3>
          <ul>
            {rooms.filter((room) => room.center_id === center.id).map((room) => (
              <li key={room.id} className="row">
                <span>{room.number} {room.closed ? `· ${t.closed}` : ""}</span>
                <form action={closeRoom}>
                  <input type="hidden" name="roomId" value={room.id} />
                  <button className="quiet" type="submit">{t.closeRoom}</button>
                </form>
                <form action={removeRoom}>
                  <input type="hidden" name="roomId" value={room.id} />
                  <button className="quiet" type="submit">{t.remove}</button>
                </form>
              </li>
            ))}
          </ul>
          {center.closed ? null : <RoomForm t={t} centerId={center.id} />}
          <div className="row">
            {center.closed ? null : (
              <form action={closeCenter}>
                <input type="hidden" name="centerId" value={center.id} />
                <button className="quiet" type="submit">{t.closeCenter}</button>
              </form>
            )}
            <form action={removeCenter}>
              <input type="hidden" name="centerId" value={center.id} />
              <button className="quiet" type="submit">{t.remove}</button>
            </form>
          </div>
        </section>
      ))}
    </main>
  );
}
