import Link from "next/link";
import { notFound } from "next/navigation";
import { AppointmentForm, PatientEditForm, SurgeryForm, VisitCreateForm, VisitEditForm } from "@/components/Forms";
import { cancelAppointment, setInactive } from "@/lib/actions";
import { db, type Appointment, type Patient, type Visit } from "@/lib/db";
import { text, viewer } from "@/lib/guard";
import { governorateLabel } from "@/lib/governorates";
import { toPlain } from "@/lib/plain";
import { cairoParts, formatWhen } from "@/lib/time";

export default async function PatientPage({ params }: { params: Promise<{ id: string }> }) {
  const { doctor, lang } = await viewer();
  const t = text(lang);
  const id = Number((await params).id);
  const patient = db().prepare("SELECT * FROM patients WHERE id = ?").get(id) as Patient | undefined;
  if (!patient) notFound();
  const history = db()
    .prepare("SELECT * FROM patient_history WHERE patient_id = ? ORDER BY id DESC")
    .all(id) as {
    id: number;
    doctor_name: string;
    at: string;
    full_name: string;
    dob: string;
    sex: string;
    phone: string;
    city: string;
    address: string;
  }[];
  const visits = db().prepare("SELECT * FROM visits WHERE patient_id = ? ORDER BY saved_at DESC").all(id) as Visit[];
  const visitHistory = db()
    .prepare(
      `SELECT visit_history.* FROM visit_history
       JOIN visits ON visits.id = visit_history.visit_id
       WHERE visits.patient_id = ? ORDER BY visit_history.id DESC`,
    )
    .all(id) as {
    id: number;
    visit_id: number;
    doctor_name: string;
    at: string;
    why: string;
    findings: string;
    assessment: string;
    plan: string;
  }[];
  const appointments = db()
    .prepare("SELECT * FROM appointments WHERE patient_id = ? ORDER BY start_at DESC")
    .all(id) as Appointment[];
  const appointmentHistory = db()
    .prepare(
      `SELECT appointment_history.* FROM appointment_history
       JOIN appointments ON appointments.id = appointment_history.appointment_id
       WHERE appointments.patient_id = ? ORDER BY appointment_history.id DESC`,
    )
    .all(id) as {
    id: number;
    appointment_id: number;
    doctor_name: string;
    at: string;
    center_name: string;
    room_number: string;
    start_at: string;
    minutes: number;
    surgery_text: string;
  }[];
  const rooms = db()
    .prepare(
      `SELECT rooms.id, rooms.number, rooms.center_id, centers.name AS center_name
       FROM rooms JOIN centers ON centers.id = rooms.center_id
       WHERE rooms.closed = 0 AND centers.closed = 0
       ORDER BY centers.name, rooms.number`,
    )
    .all() as { id: number; number: string; center_id: number; center_name: string }[];
  const now = Date.now();
  const upcoming = appointments.filter((item) => item.status === "scheduled" && new Date(item.start_at).getTime() >= now);
  const past = appointments.filter((item) => item.status !== "scheduled" || new Date(item.start_at).getTime() < now);
  const sexLabel = patient.sex === "female" ? t.female : patient.sex === "male" ? t.male : t.blank;

  return (
    <main className="stack">
      <div className="split">
        <h1>{patient.full_name}</h1>
        <Link href="/patients">{t.back}</Link>
      </div>
      {patient.inactive ? <p className="banner">{t.inactiveBanner}</p> : null}
      <section className="card stack">
        <p>{patient.phone} · {patient.dob} · {sexLabel}</p>
        <p>{governorateLabel(patient.city, lang)} {patient.address}</p>
        <p className="note">
          {t.consentLine}: {patient.consent_doctor_name}, {formatWhen(patient.consent_at, lang)}
        </p>
        <form action={setInactive}>
          <input type="hidden" name="patientId" value={patient.id} />
          <input type="hidden" name="inactive" value={patient.inactive ? "0" : "1"} />
          <button className="quiet" type="submit">{patient.inactive ? t.activeMark : t.inactiveMark}</button>
        </form>
        <details>
          <summary>{t.editDetails}</summary>
          <PatientEditForm t={t} lang={lang} patient={toPlain(patient)} />
        </details>
        <details>
          <summary>{t.history}</summary>
          {history.length === 0 ? <p className="note">{t.history}</p> : null}
          {history.map((item) => (
            <p key={item.id}>
              {formatWhen(item.at, lang)} · {item.doctor_name}: {item.full_name}, {item.phone}, {item.dob}, {governorateLabel(item.city, lang)} {item.address}
            </p>
          ))}
        </details>
      </section>

      <section className="card stack">
        <h2>{t.appointments}</h2>
        <h3>{t.reserve}</h3>
        <AppointmentForm t={t} patientId={patient.id} rooms={toPlain(rooms)} />
        <h3>{t.upcoming}</h3>
        {upcoming.length === 0 ? <p className="note">{t.noAppointments}</p> : null}
        {upcoming.map((item) => {
          const parts = cairoParts(item.start_at);
          const mine = item.reserving_doctor_id === doctor.id;
          return (
            <article key={item.id} className="stack">
              <p>
                {formatWhen(item.start_at, lang)} · {item.minutes} {t.minutes} · {item.center_name} · {t.room} {item.room_number}
                {item.is_surgery ? ` · ${t.surgery}` : ""} · {item.reserving_doctor_name}
              </p>
              {item.surgery_text ? <p className="visit">{item.surgery_text}</p> : null}
              {mine ? (
                <details>
                  <summary>{t.move}</summary>
                  <AppointmentForm
                    t={t}
                    rooms={toPlain(rooms)}
                    appointment={{
                      id: item.id,
                      room_id: item.room_id,
                      minutes: item.minutes,
                      is_surgery: item.is_surgery,
                      surgery_text: item.surgery_text,
                      date: parts.date,
                      time: parts.time,
                    }}
                  />
                </details>
              ) : null}
              {mine && item.is_surgery ? (
                <details>
                  <summary>{t.editSurgery}</summary>
                  <SurgeryForm t={t} appointmentId={item.id} text={item.surgery_text} />
                </details>
              ) : null}
              {mine ? (
                <form action={cancelAppointment}>
                  <input type="hidden" name="appointmentId" value={item.id} />
                  <button className="warn" type="submit">{t.cancel}</button>
                </form>
              ) : null}
            </article>
          );
        })}
        <h3>{t.past}</h3>
        {past.map((item) => (
          <article key={item.id}>
            <p>
              {formatWhen(item.start_at, lang)} · {item.center_name} · {t.room} {item.room_number}
              {item.is_surgery ? ` · ${t.surgery}` : ""} · {item.status === "cancelled" ? t.cancelled : t.past}
            </p>
            {item.surgery_text ? <p className="visit">{item.surgery_text}</p> : null}
            {item.status === "cancelled" ? (
              <p className="note">{item.cancelled_by_name} · {item.cancelled_at ? formatWhen(item.cancelled_at, lang) : ""}</p>
            ) : null}
            <HistoryLines
              rows={appointmentHistory.filter((entry) => entry.appointment_id === item.id)}
              lang={lang}
              label={t.history}
            />
          </article>
        ))}
      </section>

      <section className="card stack">
        <h2>{t.visits}</h2>
        <h3>{t.newVisit}</h3>
        <VisitCreateForm t={t} patientId={patient.id} />
        {visits.length === 0 ? <p className="note">{t.noVisits}</p> : null}
        {visits.map((visit) => (
          <article key={visit.id} className="stack">
            <h3>{formatWhen(visit.saved_at, lang)} · {visit.author_name}</h3>
            <p className="visit">{t.why}: {visit.why}</p>
            <p className="visit">{t.findings}: {visit.findings}</p>
            <p className="visit">{t.assessment}: {visit.assessment}</p>
            <p className="visit">{t.plan}: {visit.plan}</p>
            {visit.author_id === doctor.id ? (
              <details>
                <summary>{t.editVisit}</summary>
                <VisitEditForm t={t} visit={toPlain(visit)} />
              </details>
            ) : null}
            <details>
              <summary>{t.history}</summary>
              {visitHistory.filter((entry) => entry.visit_id === visit.id).map((entry) => (
                <div key={entry.id}>
                  <p className="note">{formatWhen(entry.at, lang)} · {entry.doctor_name}</p>
                  <p className="visit">{entry.why}</p>
                  <p className="visit">{entry.findings}</p>
                  <p className="visit">{entry.assessment}</p>
                  <p className="visit">{entry.plan}</p>
                </div>
              ))}
            </details>
          </article>
        ))}
      </section>
    </main>
  );
}

function HistoryLines({
  rows,
  lang,
  label,
}: {
  rows: { id: number; at: string; doctor_name: string; center_name: string; room_number: string; start_at: string; minutes: number; surgery_text: string }[];
  lang: "en" | "ar";
  label: string;
}) {
  if (rows.length === 0) return null;
  return (
    <details>
      <summary>{label}</summary>
      {rows.map((entry) => (
        <p key={entry.id}>
          {formatWhen(entry.at, lang)} · {entry.doctor_name}: {entry.center_name} / {entry.room_number} · {formatWhen(entry.start_at, lang)} · {entry.minutes}
          {entry.surgery_text ? ` · ${entry.surgery_text}` : ""}
        </p>
      ))}
    </details>
  );
}
