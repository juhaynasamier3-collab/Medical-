"use client";

import { useActionState, useMemo, useState } from "react";
import {
  acceptInvite,
  acceptReset,
  addCenter,
  addRoom,
  addVisit,
  createClinic,
  createPatient,
  inviteDoctor,
  login,
  moveAppointment,
  renameCenter,
  requestReset,
  reserveAppointment,
  saveGovernorate,
  savePassword,
  saveProfile,
  updatePatient,
  updateSurgery,
  updateVisit,
  type ActionState,
} from "@/lib/actions";
import type { Dict, Lang } from "@/lib/i18n";
import { GOVERNORATES } from "@/lib/governorates";

const empty: ActionState = {};

function Errors({ state, t }: { state: ActionState; t: Dict }) {
  if (!state.error) return null;
  const message = t[state.error as keyof Dict] || state.error;
  return <p className="error">{message}</p>;
}

function Notice({ state, t }: { state: ActionState; t: Dict }) {
  if (!state.notice && !state.link) return null;
  return (
    <div className="stack">
      {state.notice ? <p className="note">{t[state.notice as keyof Dict]}</p> : null}
      {state.link ? (
        <p>
          {t.link}: <a href={state.link}>{state.link}</a>
        </p>
      ) : null}
    </div>
  );
}

function SexSelect({ t, name, defaultValue }: { t: Dict; name: string; defaultValue?: string }) {
  return (
    <label>
      {t.sex}
      <select name={name} defaultValue={defaultValue ?? ""}>
        <option value="">{t.blank}</option>
        <option value="female">{t.female}</option>
        <option value="male">{t.male}</option>
      </select>
    </label>
  );
}

function CitySelect({
  t,
  lang,
  name,
  defaultValue,
  allowEmpty,
}: {
  t: Dict;
  lang: Lang;
  name: string;
  defaultValue?: string;
  allowEmpty?: boolean;
}) {
  return (
    <label>
      {t.city}
      <select name={name} defaultValue={defaultValue ?? ""}>
        {allowEmpty ? <option value="">{t.choose}</option> : null}
        {GOVERNORATES.map((item) => (
          <option key={item.en} value={item.en}>
            {lang === "ar" ? item.ar : item.en}
          </option>
        ))}
      </select>
    </label>
  );
}

export function SetupForm({ t }: { t: Dict }) {
  const [state, action, pending] = useActionState(createClinic, empty);
  return (
    <form action={action} className="stack card">
      <Errors state={state} t={t} />
      <label>{t.clinicName}<input name="clinicName" required /></label>
      <label>{t.yourName}<input name="name" required /></label>
      <label>{t.email}<input name="email" type="email" required /></label>
      <label>{t.password}<input name="password" type="password" minLength={8} required /></label>
      <p className="note">{t.passwordRule}</p>
      <button disabled={pending}>{t.createClinic}</button>
    </form>
  );
}

export function LoginForm({ t }: { t: Dict }) {
  const [state, action, pending] = useActionState(login, empty);
  return (
    <form action={action} className="stack card">
      <Errors state={state} t={t} />
      <label>{t.email}<input name="email" type="email" required /></label>
      <label>{t.password}<input name="password" type="password" required /></label>
      <button disabled={pending}>{t.signIn}</button>
    </form>
  );
}

export function ResetRequestForm({ t }: { t: Dict }) {
  const [state, action, pending] = useActionState(requestReset, empty);
  return (
    <form action={action} className="stack card">
      <Errors state={state} t={t} />
      <Notice state={state} t={t} />
      <label>{t.email}<input name="email" type="email" required /></label>
      <button disabled={pending}>{t.resetTitle}</button>
    </form>
  );
}

export function PasswordForm({ t, token, mode }: { t: Dict; token: string; mode: "reset" | "invite" }) {
  const fn = mode === "reset" ? acceptReset : acceptInvite;
  const [state, action, pending] = useActionState(fn, empty);
  return (
    <form action={action} className="stack card">
      <Errors state={state} t={t} />
      <input type="hidden" name="token" value={token} />
      <label>{t.newPassword}<input name="password" type="password" minLength={8} required /></label>
      <button disabled={pending}>{t.setPassword}</button>
    </form>
  );
}

export function PatientCreateForm({ t, lang, name, phone }: { t: Dict; lang: Lang; name?: string; phone?: string }) {
  const [state, action, pending] = useActionState(createPatient, empty);
  return (
    <form action={action} className="stack card">
      <Errors state={state} t={t} />
      <p className="note">{t.agreement}</p>
      <div className="grid">
        <label>{t.fullName}<input name="fullName" defaultValue={name} required /></label>
        <label>{t.dob}<input name="dob" type="date" required /></label>
        <label>{t.phone}<input name="phone" defaultValue={phone} required /></label>
        <SexSelect t={t} name="sex" />
        <CitySelect t={t} lang={lang} name="city" allowEmpty />
        <label>{t.address}<input name="address" /></label>
      </div>
      <button disabled={pending}>{t.save}</button>
    </form>
  );
}

export function PatientEditForm({
  t,
  lang,
  patient,
}: {
  t: Dict;
  lang: Lang;
  patient: { id: number; full_name: string; dob: string; sex: string; phone: string; city: string; address: string };
}) {
  const [state, action, pending] = useActionState(updatePatient, empty);
  return (
    <form action={action} className="stack">
      <Errors state={state} t={t} />
      <Notice state={state} t={t} />
      <input type="hidden" name="patientId" value={patient.id} />
      <div className="grid">
        <label>{t.fullName}<input name="fullName" defaultValue={patient.full_name} required /></label>
        <label>{t.dob}<input name="dob" type="date" defaultValue={patient.dob} required /></label>
        <label>{t.phone}<input name="phone" defaultValue={patient.phone} required /></label>
        <SexSelect t={t} name="sex" defaultValue={patient.sex} />
        <CitySelect t={t} lang={lang} name="city" defaultValue={patient.city} allowEmpty />
        <label>{t.address}<input name="address" defaultValue={patient.address} /></label>
      </div>
      <button disabled={pending}>{t.save}</button>
    </form>
  );
}

function VisitFields({
  t,
  initial,
}: {
  t: Dict;
  initial?: { why: string; findings: string; assessment: string; plan: string };
}) {
  const [why, setWhy] = useState(initial?.why ?? "");
  const [findings, setFindings] = useState(initial?.findings ?? "");
  const [assessment, setAssessment] = useState(initial?.assessment ?? "");
  const [plan, setPlan] = useState(initial?.plan ?? "");
  return (
    <>
      <label>{t.why}<textarea name="why" value={why} onChange={(event) => setWhy(event.target.value)} /></label>
      <label>{t.findings}<textarea name="findings" value={findings} onChange={(event) => setFindings(event.target.value)} /></label>
      <label>{t.assessment}<textarea name="assessment" value={assessment} onChange={(event) => setAssessment(event.target.value)} /></label>
      <label>{t.plan}<textarea name="plan" value={plan} onChange={(event) => setPlan(event.target.value)} /></label>
    </>
  );
}

export function VisitCreateForm({ t, patientId }: { t: Dict; patientId: number }) {
  const [state, action, pending] = useActionState(addVisit, empty);
  return (
    <form action={action} className="stack">
      <Errors state={state} t={t} />
      <input type="hidden" name="patientId" value={patientId} />
      <VisitFields t={t} />
      <button disabled={pending}>{t.save}</button>
    </form>
  );
}

export function VisitEditForm({
  t,
  visit,
}: {
  t: Dict;
  visit: { id: number; why: string; findings: string; assessment: string; plan: string };
}) {
  const [state, action, pending] = useActionState(updateVisit, empty);
  return (
    <form action={action} className="stack">
      <Errors state={state} t={t} />
      <Notice state={state} t={t} />
      <input type="hidden" name="visitId" value={visit.id} />
      <VisitFields t={t} initial={visit} />
      <button disabled={pending}>{t.save}</button>
    </form>
  );
}

type RoomChoice = { id: number; number: string; center_id: number; center_name: string };

export function AppointmentForm({
  t,
  patientId,
  rooms,
  appointment,
}: {
  t: Dict;
  patientId?: number;
  rooms: RoomChoice[];
  appointment?: {
    id: number;
    room_id: number | null;
    minutes: number;
    is_surgery: number;
    surgery_text: string;
    date: string;
    time: string;
  };
}) {
  const actionFn = appointment ? moveAppointment : reserveAppointment;
  const [state, action, pending] = useActionState(actionFn, empty);
  const [centerId, setCenterId] = useState(() => {
    const room = rooms.find((item) => item.id === appointment?.room_id);
    return room ? String(room.center_id) : rooms[0] ? String(rooms[0].center_id) : "";
  });
  const [roomId, setRoomId] = useState(appointment?.room_id ? String(appointment.room_id) : "");
  const [surgery, setSurgery] = useState(appointment?.is_surgery === 1);
  const [minutes, setMinutes] = useState(String(appointment?.minutes ?? 30));
  const [surgeryText, setSurgeryText] = useState(appointment?.surgery_text ?? "");
  const centers = useMemo(() => {
    const map = new Map<number, string>();
    rooms.forEach((room) => map.set(room.center_id, room.center_name));
    return [...map.entries()];
  }, [rooms]);
  const visibleRooms = rooms.filter((room) => String(room.center_id) === centerId);
  if (rooms.length === 0) return <p className="note">{t.noneOpen}</p>;
  return (
    <form action={action} className="stack">
      <Errors state={state} t={t} />
      <Notice state={state} t={t} />
      {patientId ? <input type="hidden" name="patientId" value={patientId} /> : null}
      {appointment ? <input type="hidden" name="appointmentId" value={appointment.id} /> : null}
      <div className="grid">
        <label>
          {t.center}
          <select
            value={centerId}
            onChange={(event) => {
              setCenterId(event.target.value);
              const next = rooms.find((room) => String(room.center_id) === event.target.value);
              setRoomId(next ? String(next.id) : "");
            }}
          >
            {centers.map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
        </label>
        <label>
          {t.room}
          <select name="roomId" value={roomId || (visibleRooms[0] ? String(visibleRooms[0].id) : "")} onChange={(event) => setRoomId(event.target.value)}>
            {visibleRooms.map((room) => (
              <option key={room.id} value={room.id}>{room.number}</option>
            ))}
          </select>
        </label>
        <label>{t.date}<input name="date" type="date" defaultValue={appointment?.date} required /></label>
        <label>{t.time}<input name="time" type="time" defaultValue={appointment?.time} required /></label>
        <label>
          {t.minutes}
          <input name="minutes" type="number" min={1} max={1440} value={minutes} onChange={(event) => setMinutes(event.target.value)} required />
        </label>
        <label>
          {t.surgery}
          <input
            name="surgery"
            type="checkbox"
            checked={surgery}
            onChange={(event) => {
              const on = event.target.checked;
              setSurgery(on);
              if (on && minutes === "30") setMinutes("60");
              if (!on && minutes === "60") setMinutes("30");
            }}
          />
        </label>
      </div>
      {surgery ? (
        <label>
          {t.surgeryText}
          <textarea name="surgeryText" value={surgeryText} onChange={(event) => setSurgeryText(event.target.value)} />
        </label>
      ) : null}
      <button disabled={pending}>{appointment ? t.move : t.reserve}</button>
    </form>
  );
}

export function SurgeryForm({ t, appointmentId, text }: { t: Dict; appointmentId: number; text: string }) {
  const [state, action, pending] = useActionState(updateSurgery, empty);
  const [value, setValue] = useState(text);
  return (
    <form action={action} className="stack">
      <Errors state={state} t={t} />
      <input type="hidden" name="appointmentId" value={appointmentId} />
      <label>
        {t.surgeryText}
        <textarea name="surgeryText" value={value} onChange={(event) => setValue(event.target.value)} />
      </label>
      <button disabled={pending}>{t.save}</button>
    </form>
  );
}

export function CenterCreateForm({ t }: { t: Dict }) {
  const [state, action, pending] = useActionState(addCenter, empty);
  return (
    <form action={action} className="row">
      <Errors state={state} t={t} />
      <label>{t.centerName}<input name="name" required /></label>
      <label>{t.roomNumber}<input name="number" required /></label>
      <button disabled={pending}>{t.addCenter}</button>
    </form>
  );
}

export function RenameForm({ t, centerId, name }: { t: Dict; centerId: number; name: string }) {
  const [state, action, pending] = useActionState(renameCenter, empty);
  return (
    <form action={action} className="row">
      <Errors state={state} t={t} />
      <input type="hidden" name="centerId" value={centerId} />
      <input name="name" defaultValue={name} required />
      <button disabled={pending}>{t.rename}</button>
    </form>
  );
}

export function RoomForm({ t, centerId }: { t: Dict; centerId: number }) {
  const [state, action, pending] = useActionState(addRoom, empty);
  return (
    <form action={action} className="row">
      <Errors state={state} t={t} />
      <input type="hidden" name="centerId" value={centerId} />
      <input name="number" placeholder={t.roomNumber} required />
      <button disabled={pending}>{t.addRoom}</button>
    </form>
  );
}

export function InviteForm({ t }: { t: Dict }) {
  const [state, action, pending] = useActionState(inviteDoctor, empty);
  return (
    <form action={action} className="stack card">
      <h2>{t.invite}</h2>
      <Errors state={state} t={t} />
      <Notice state={state} t={t} />
      <div className="grid">
        <label>{t.doctorName}<input name="name" required /></label>
        <label>{t.email}<input name="email" type="email" required /></label>
      </div>
      <button disabled={pending}>{t.invite}</button>
    </form>
  );
}

export function ProfileForm({ t, name }: { t: Dict; name: string }) {
  const [state, action, pending] = useActionState(saveProfile, empty);
  return (
    <form action={action} className="stack card">
      <Errors state={state} t={t} />
      <Notice state={state} t={t} />
      <label>{t.displayName}<input name="name" defaultValue={name} required /></label>
      <button disabled={pending}>{t.changeName}</button>
    </form>
  );
}

export function PasswordChangeForm({ t }: { t: Dict }) {
  const [state, action, pending] = useActionState(savePassword, empty);
  return (
    <form action={action} className="stack card">
      <Errors state={state} t={t} />
      <Notice state={state} t={t} />
      <label>{t.currentPassword}<input name="currentPassword" type="password" required /></label>
      <label>{t.newPassword}<input name="password" type="password" minLength={8} required /></label>
      <button disabled={pending}>{t.changePassword}</button>
    </form>
  );
}

export function CityForm({ t, lang, value }: { t: Dict; lang: Lang; value: string }) {
  const [state, action, pending] = useActionState(saveGovernorate, empty);
  return (
    <form action={action} className="stack card">
      <Errors state={state} t={t} />
      <Notice state={state} t={t} />
      <label>
        {t.governorate}
        <select name="governorate" defaultValue={value}>
          {GOVERNORATES.map((item) => (
            <option key={item.en} value={item.en}>{lang === "ar" ? item.ar : item.en}</option>
          ))}
        </select>
      </label>
      <button disabled={pending}>{t.saveCity}</button>
    </form>
  );
}
