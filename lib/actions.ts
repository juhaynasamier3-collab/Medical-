"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db, doctorCount } from "./db";
import { inviteLetter, newToken, resetLetter, storeEmail } from "./email";
import { isGovernorate } from "./governorates";
import { clearSession, currentDoctor, languageCookie, setLanguageCookie, startSession } from "./session";
import { cairoLocalToUtc } from "./time";
import { clean, isEgyptianMobile, isEmail, isSex } from "./validators";

export type ActionState = { error?: string; link?: string; notice?: string };

function origin() {
  return process.env.APP_ORIGIN || "http://localhost:3000";
}

async function doctor() {
  const current = await currentDoctor();
  if (!current) redirect("/login");
  return current;
}

export async function setLanguage(formData: FormData) {
  const lang = clean(formData.get("lang")) === "ar" ? "ar" : "en";
  await setLanguageCookie(lang);
  const current = await currentDoctor();
  if (current) {
    db().prepare("UPDATE doctors SET language = ? WHERE id = ?").run(lang, current.id);
  }
  redirect(clean(formData.get("next")) || "/day");
}

export async function signOut() {
  await clearSession();
  redirect("/login");
}

export async function createClinic(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (doctorCount() > 0) return { error: "setupClosed" };
  const clinicName = clean(formData.get("clinicName"));
  const name = clean(formData.get("name"));
  const email = clean(formData.get("email")).toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!clinicName || !name || !email || !password) return { error: "required" };
  if (!isEmail(email)) return { error: "invalidEmail" };
  if (password.length < 8) return { error: "invalidPassword" };
  const now = new Date().toISOString();
  const hash = bcrypt.hashSync(password, 10);
  const lang = await languageCookie();
  const database = db();
  const insert = database.prepare(
    "INSERT INTO doctors (email, password_hash, name, is_owner, language, active, created_at) VALUES (?, ?, ?, 1, ?, 1, ?)",
  );
  database.exec("BEGIN");
  try {
    database.prepare("INSERT INTO clinic (id, name, governorate) VALUES (1, ?, 'Aswan')").run(clinicName);
    const result = insert.run(email, hash, name, lang, now);
    database.exec("COMMIT");
    await startSession(Number(result.lastInsertRowid));
  } catch {
    database.exec("ROLLBACK");
    return { error: "invalidEmail" };
  }
  redirect("/day");
}

export async function login(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = clean(formData.get("email")).toLowerCase();
  const password = String(formData.get("password") ?? "");
  const row = db()
    .prepare("SELECT * FROM doctors WHERE email = ? AND active = 1")
    .get(email) as { id: number; password_hash: string } | undefined;
  if (!row || !bcrypt.compareSync(password, row.password_hash)) return { error: "wrongPassword" };
  await startSession(row.id);
  redirect("/day");
}

export async function requestReset(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = clean(formData.get("email")).toLowerCase();
  const row = db()
    .prepare("SELECT id, email FROM doctors WHERE email = ? AND active = 1")
    .get(email) as { id: number; email: string } | undefined;
  if (!row) return { notice: "mailNote" };
  const token = newToken();
  const now = new Date();
  db()
    .prepare(
      "INSERT INTO password_resets (token, doctor_id, created_at, expires_at, used_at) VALUES (?, ?, ?, ?, NULL)",
    )
    .run(token, row.id, now.toISOString(), new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString());
  const link = `${origin()}/reset/${token}`;
  const letter = resetLetter(row.email, link);
  storeEmail(row.email, letter.subject, letter.body);
  return { notice: "mailNote", link };
}

export async function acceptReset(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const token = clean(formData.get("token"));
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { error: "invalidPassword" };
  const row = db()
    .prepare("SELECT * FROM password_resets WHERE token = ? AND used_at IS NULL")
    .get(token) as { doctor_id: number; expires_at: string } | undefined;
  if (!row || new Date(row.expires_at).getTime() < Date.now()) return { error: "resetUsed" };
  db().prepare("UPDATE doctors SET password_hash = ? WHERE id = ?").run(bcrypt.hashSync(password, 10), row.doctor_id);
  db().prepare("UPDATE password_resets SET used_at = ? WHERE token = ?").run(new Date().toISOString(), token);
  redirect("/login");
}

export async function acceptInvite(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const token = clean(formData.get("token"));
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { error: "invalidPassword" };
  const invite = db()
    .prepare("SELECT * FROM invites WHERE token = ? AND used_at IS NULL")
    .get(token) as { email: string; name: string; expires_at: string } | undefined;
  if (!invite || new Date(invite.expires_at).getTime() < Date.now()) return { error: "inviteUsed" };
  const hash = bcrypt.hashSync(password, 10);
  const now = new Date().toISOString();
  const existing = db().prepare("SELECT id FROM doctors WHERE email = ?").get(invite.email) as
    | { id: number }
    | undefined;
  const database = db();
  database.exec("BEGIN");
  try {
    if (existing) {
      database
        .prepare("UPDATE doctors SET password_hash = ?, name = ?, active = 1 WHERE id = ?")
        .run(hash, invite.name, existing.id);
    } else {
      database
        .prepare(
          "INSERT INTO doctors (email, password_hash, name, is_owner, language, active, created_at) VALUES (?, ?, ?, 0, 'en', 1, ?)",
        )
        .run(invite.email, hash, invite.name, now);
    }
    database.prepare("UPDATE invites SET used_at = ? WHERE token = ?").run(now, token);
    database.exec("COMMIT");
  } catch {
    database.exec("ROLLBACK");
    return { error: "inviteUsed" };
  }
  redirect("/login");
}

export async function saveProfile(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const current = await doctor();
  const name = clean(formData.get("name"));
  if (!name) return { error: "required" };
  db().prepare("UPDATE doctors SET name = ? WHERE id = ?").run(name, current.id);
  return { notice: "saved" };
}

export async function savePassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const current = await doctor();
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const password = String(formData.get("password") ?? "");
  if (!bcrypt.compareSync(currentPassword, current.password_hash)) return { error: "currentWrong" };
  if (password.length < 8) return { error: "invalidPassword" };
  db().prepare("UPDATE doctors SET password_hash = ? WHERE id = ?").run(bcrypt.hashSync(password, 10), current.id);
  return { notice: "saved" };
}

export async function saveGovernorate(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const current = await doctor();
  if (!current.is_owner) return { error: "authorOnly" };
  const city = clean(formData.get("governorate"));
  if (!isGovernorate(city)) return { error: "required" };
  db().prepare("UPDATE clinic SET governorate = ? WHERE id = 1").run(city);
  return { notice: "saved" };
}

export async function inviteDoctor(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const current = await doctor();
  if (!current.is_owner) return { error: "authorOnly" };
  const name = clean(formData.get("name"));
  const email = clean(formData.get("email")).toLowerCase();
  if (!name || !email) return { error: "required" };
  if (!isEmail(email)) return { error: "invalidEmail" };
  const existing = db().prepare("SELECT id, active, is_owner FROM doctors WHERE email = ?").get(email) as
    | { id: number; active: number; is_owner: number }
    | undefined;
  if (existing?.active && existing.is_owner) return { error: "invalidEmail" };
  if (existing?.active) return { error: "invalidEmail" };
  const token = newToken();
  const now = new Date();
  db()
    .prepare("INSERT INTO invites (token, email, name, created_at, expires_at, used_at) VALUES (?, ?, ?, ?, ?, NULL)")
    .run(token, email, name, now.toISOString(), new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString());
  const clinic = db().prepare("SELECT name FROM clinic WHERE id = 1").get() as { name: string };
  const link = `${origin()}/invite/${token}`;
  const letter = inviteLetter(clinic.name, name, link);
  storeEmail(email, letter.subject, letter.body);
  return { notice: "mailNote", link };
}

export async function transferOwner(formData: FormData) {
  const current = await doctor();
  if (!current.is_owner) redirect("/day");
  const nextId = Number(formData.get("doctorId"));
  const next = db()
    .prepare("SELECT id FROM doctors WHERE id = ? AND active = 1 AND is_owner = 0")
    .get(nextId) as { id: number } | undefined;
  if (!next) redirect("/doctors");
  const database = db();
  database.exec("BEGIN");
  database.prepare("UPDATE doctors SET is_owner = 0 WHERE id = ?").run(current.id);
  database.prepare("UPDATE doctors SET is_owner = 1 WHERE id = ?").run(next.id);
  database.exec("COMMIT");
  redirect("/doctors");
}

export async function removeDoctor(formData: FormData) {
  const current = await doctor();
  if (!current.is_owner) redirect("/day");
  const id = Number(formData.get("doctorId"));
  if (id === current.id) redirect("/doctors");
  const target = db().prepare("SELECT id, is_owner FROM doctors WHERE id = ? AND active = 1").get(id) as
    | { id: number; is_owner: number }
    | undefined;
  if (!target || target.is_owner) redirect("/doctors");
  db().prepare("UPDATE doctors SET active = 0 WHERE id = ?").run(id);
  redirect("/doctors");
}

export async function createPatient(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const current = await doctor();
  const fullName = clean(formData.get("fullName"));
  const dob = clean(formData.get("dob"));
  const sex = clean(formData.get("sex"));
  const phone = clean(formData.get("phone"));
  const city = clean(formData.get("city"));
  const address = clean(formData.get("address"));
  if (!fullName || !dob || !phone) return { error: "required" };
  if (!isSex(sex) || (city && !isGovernorate(city))) return { error: "required" };
  if (!isEgyptianMobile(phone)) return { error: "phoneInvalid" };
  const taken = db().prepare("SELECT id FROM patients WHERE phone = ?").get(phone);
  if (taken) return { error: "phoneTaken" };
  const now = new Date().toISOString();
  const result = db()
    .prepare(
      `INSERT INTO patients
        (full_name, dob, sex, phone, city, address, inactive, consent_doctor_id, consent_doctor_name, consent_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)`,
    )
    .run(fullName, dob, sex, phone, city, address, current.id, current.name, now, now);
  redirect(`/patients/${Number(result.lastInsertRowid)}`);
}

export async function updatePatient(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const current = await doctor();
  const id = Number(formData.get("patientId"));
  const existing = db().prepare("SELECT * FROM patients WHERE id = ?").get(id) as
    | {
        full_name: string;
        dob: string;
        sex: string;
        phone: string;
        city: string;
        address: string;
      }
    | undefined;
  if (!existing) return { error: "notFound" };
  const fullName = clean(formData.get("fullName"));
  const dob = clean(formData.get("dob"));
  const sex = clean(formData.get("sex"));
  const phone = clean(formData.get("phone"));
  const city = clean(formData.get("city"));
  const address = clean(formData.get("address"));
  if (!fullName || !dob || !phone) return { error: "required" };
  if (!isSex(sex) || (city && !isGovernorate(city))) return { error: "required" };
  if (!isEgyptianMobile(phone)) return { error: "phoneInvalid" };
  const taken = db().prepare("SELECT id FROM patients WHERE phone = ? AND id != ?").get(phone, id);
  if (taken) return { error: "phoneTaken" };
  const now = new Date().toISOString();
  const database = db();
  database.exec("BEGIN");
  database
    .prepare(
      `INSERT INTO patient_history
        (patient_id, doctor_id, doctor_name, at, full_name, dob, sex, phone, city, address)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(id, current.id, current.name, now, existing.full_name, existing.dob, existing.sex, existing.phone, existing.city, existing.address);
  database
    .prepare("UPDATE patients SET full_name = ?, dob = ?, sex = ?, phone = ?, city = ?, address = ? WHERE id = ?")
    .run(fullName, dob, sex, phone, city, address, id);
  database.exec("COMMIT");
  return { notice: "saved" };
}

export async function setInactive(formData: FormData) {
  await doctor();
  const id = Number(formData.get("patientId"));
  const inactive = clean(formData.get("inactive")) === "1" ? 1 : 0;
  db().prepare("UPDATE patients SET inactive = ? WHERE id = ?").run(inactive, id);
  redirect(`/patients/${id}`);
}

export async function addVisit(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const current = await doctor();
  const patientId = Number(formData.get("patientId"));
  const why = String(formData.get("why") ?? "");
  const findings = String(formData.get("findings") ?? "");
  const assessment = String(formData.get("assessment") ?? "");
  const plan = String(formData.get("plan") ?? "");
  if (![why, findings, assessment, plan].some((item) => item.trim())) return { error: "needOneField" };
  const patient = db().prepare("SELECT id FROM patients WHERE id = ?").get(patientId);
  if (!patient) return { error: "notFound" };
  db()
    .prepare(
      `INSERT INTO visits (patient_id, author_id, author_name, saved_at, why, findings, assessment, plan)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(patientId, current.id, current.name, new Date().toISOString(), why, findings, assessment, plan);
  redirect(`/patients/${patientId}`);
}

export async function updateVisit(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const current = await doctor();
  const visitId = Number(formData.get("visitId"));
  const visit = db().prepare("SELECT * FROM visits WHERE id = ?").get(visitId) as
    | {
        id: number;
        patient_id: number;
        author_id: number;
        why: string;
        findings: string;
        assessment: string;
        plan: string;
      }
    | undefined;
  if (!visit) return { error: "notFound" };
  if (visit.author_id !== current.id) return { error: "authorOnly" };
  const why = String(formData.get("why") ?? "");
  const findings = String(formData.get("findings") ?? "");
  const assessment = String(formData.get("assessment") ?? "");
  const plan = String(formData.get("plan") ?? "");
  if (![why, findings, assessment, plan].some((item) => item.trim())) return { error: "needOneField" };
  const now = new Date().toISOString();
  const database = db();
  database.exec("BEGIN");
  database
    .prepare(
      `INSERT INTO visit_history (visit_id, doctor_id, doctor_name, at, why, findings, assessment, plan)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(visit.id, current.id, current.name, now, visit.why, visit.findings, visit.assessment, visit.plan);
  database
    .prepare("UPDATE visits SET why = ?, findings = ?, assessment = ?, plan = ? WHERE id = ?")
    .run(why, findings, assessment, plan, visit.id);
  database.exec("COMMIT");
  return { notice: "saved" };
}

function rangesOverlap(startA: string, minutesA: number, startB: string, minutesB: number) {
  const a0 = new Date(startA).getTime();
  const b0 = new Date(startB).getTime();
  return a0 < b0 + minutesB * 60_000 && b0 < a0 + minutesA * 60_000;
}

function roomConflict(roomId: number, start: string, minutes: number, ignoreId = 0) {
  const rows = db()
    .prepare(
      "SELECT id, start_at, minutes FROM appointments WHERE room_id = ? AND status = 'scheduled' AND id != ?",
    )
    .all(roomId, ignoreId) as { id: number; start_at: string; minutes: number }[];
  return rows.some((row) => rangesOverlap(start, minutes, row.start_at, row.minutes));
}

export async function addCenter(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await doctor();
  const name = clean(formData.get("name"));
  const number = clean(formData.get("number"));
  if (!name || !number) return { error: "required" };
  const database = db();
  database.exec("BEGIN");
  try {
    const center = database.prepare("INSERT INTO centers (name, closed) VALUES (?, 0)").run(name);
    database
      .prepare("INSERT INTO rooms (center_id, number, closed) VALUES (?, ?, 0)")
      .run(Number(center.lastInsertRowid), number);
    database.exec("COMMIT");
  } catch {
    database.exec("ROLLBACK");
    return { error: "roomTaken" };
  }
  redirect("/centers");
}

export async function renameCenter(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await doctor();
  const name = clean(formData.get("name"));
  const id = Number(formData.get("centerId"));
  if (!name) return { error: "required" };
  db().prepare("UPDATE centers SET name = ? WHERE id = ?").run(name, id);
  return { notice: "saved" };
}

export async function addRoom(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await doctor();
  const number = clean(formData.get("number"));
  const centerId = Number(formData.get("centerId"));
  if (!number) return { error: "required" };
  try {
    db().prepare("INSERT INTO rooms (center_id, number, closed) VALUES (?, ?, 0)").run(centerId, number);
  } catch {
    return { error: "roomTaken" };
  }
  return { notice: "saved" };
}

export async function removeCenter(formData: FormData) {
  await doctor();
  const id = Number(formData.get("centerId"));
  const used = db().prepare("SELECT COUNT(*) AS n FROM appointments WHERE center_id = ?").get(id) as { n: number };
  if (used.n > 0) redirect("/centers?error=hasAppointments");
  const database = db();
  database.exec("BEGIN");
  database.prepare("DELETE FROM rooms WHERE center_id = ?").run(id);
  database.prepare("DELETE FROM centers WHERE id = ?").run(id);
  database.exec("COMMIT");
  redirect("/centers");
}

export async function closeCenter(formData: FormData) {
  await doctor();
  db().prepare("UPDATE centers SET closed = 1 WHERE id = ?").run(Number(formData.get("centerId")));
  redirect("/centers");
}

export async function removeRoom(formData: FormData) {
  await doctor();
  const id = Number(formData.get("roomId"));
  const used = db().prepare("SELECT COUNT(*) AS n FROM appointments WHERE room_id = ?").get(id) as { n: number };
  if (used.n > 0) redirect("/centers?error=hasAppointments");
  db().prepare("DELETE FROM rooms WHERE id = ?").run(id);
  redirect("/centers");
}

export async function closeRoom(formData: FormData) {
  await doctor();
  db().prepare("UPDATE rooms SET closed = 1 WHERE id = ?").run(Number(formData.get("roomId")));
  redirect("/centers");
}

function readSlot(formData: FormData) {
  const roomId = Number(formData.get("roomId"));
  const date = clean(formData.get("date"));
  const time = clean(formData.get("time"));
  const minutes = Number(formData.get("minutes"));
  const surgery = formData.get("surgery") === "on" || formData.get("surgery") === "1";
  const surgeryText = String(formData.get("surgeryText") ?? "");
  const start = cairoLocalToUtc(date, time);
  return { roomId, minutes, surgery, surgeryText, start };
}

export async function reserveAppointment(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const current = await doctor();
  const patientId = Number(formData.get("patientId"));
  const patient = db().prepare("SELECT inactive FROM patients WHERE id = ?").get(patientId) as
    | { inactive: number }
    | undefined;
  if (!patient) return { error: "notFound" };
  if (patient.inactive) return { error: "inactiveBooking" };
  const slot = readSlot(formData);
  if (!slot.start || !Number.isInteger(slot.minutes) || slot.minutes < 1 || slot.minutes > 1440) {
    return { error: "required" };
  }
  if (slot.surgery && !slot.surgeryText.trim()) return { error: "surgeryRequired" };
  const room = db()
    .prepare(
      `SELECT rooms.id, rooms.number, rooms.closed AS room_closed, centers.id AS center_id, centers.name, centers.closed AS center_closed
       FROM rooms JOIN centers ON centers.id = rooms.center_id WHERE rooms.id = ?`,
    )
    .get(slot.roomId) as
    | {
        id: number;
        number: string;
        room_closed: number;
        center_id: number;
        name: string;
        center_closed: number;
      }
    | undefined;
  if (!room || room.room_closed || room.center_closed) return { error: "roomClosed" };
  const start = slot.start.toISOString();
  if (roomConflict(room.id, start, slot.minutes)) return { error: "overlap" };
  db()
    .prepare(
      `INSERT INTO appointments
        (patient_id, center_id, room_id, center_name, room_number, start_at, minutes, reserving_doctor_id, reserving_doctor_name, is_surgery, surgery_text, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled')`,
    )
    .run(
      patientId,
      room.center_id,
      room.id,
      room.name,
      room.number,
      start,
      slot.minutes,
      current.id,
      current.name,
      slot.surgery ? 1 : 0,
      slot.surgery ? slot.surgeryText : "",
    );
  redirect(`/patients/${patientId}`);
}

export async function moveAppointment(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const current = await doctor();
  const id = Number(formData.get("appointmentId"));
  const row = db().prepare("SELECT * FROM appointments WHERE id = ?").get(id) as
    | {
        id: number;
        patient_id: number;
        reserving_doctor_id: number;
        status: string;
        center_name: string;
        room_number: string;
        start_at: string;
        minutes: number;
        surgery_text: string;
        is_surgery: number;
      }
    | undefined;
  if (!row || row.status !== "scheduled") return { error: "notFound" };
  if (row.reserving_doctor_id !== current.id) return { error: "reservingOnly" };
  const slot = readSlot(formData);
  if (!slot.start || !Number.isInteger(slot.minutes) || slot.minutes < 1 || slot.minutes > 1440) {
    return { error: "required" };
  }
  if (slot.surgery && !slot.surgeryText.trim()) return { error: "surgeryRequired" };
  const room = db()
    .prepare(
      `SELECT rooms.id, rooms.number, rooms.closed AS room_closed, centers.id AS center_id, centers.name, centers.closed AS center_closed
       FROM rooms JOIN centers ON centers.id = rooms.center_id WHERE rooms.id = ?`,
    )
    .get(slot.roomId) as
    | {
        id: number;
        number: string;
        room_closed: number;
        center_id: number;
        name: string;
        center_closed: number;
      }
    | undefined;
  if (!room || room.room_closed || room.center_closed) return { error: "roomClosed" };
  const start = slot.start.toISOString();
  if (roomConflict(room.id, start, slot.minutes, row.id)) return { error: "overlap" };
  const now = new Date().toISOString();
  const database = db();
  database.exec("BEGIN");
  database
    .prepare(
      `INSERT INTO appointment_history
        (appointment_id, doctor_id, doctor_name, at, center_name, room_number, start_at, minutes, surgery_text)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(row.id, current.id, current.name, now, row.center_name, row.room_number, row.start_at, row.minutes, row.surgery_text);
  database
    .prepare(
      `UPDATE appointments
       SET center_id = ?, room_id = ?, center_name = ?, room_number = ?, start_at = ?, minutes = ?, is_surgery = ?, surgery_text = ?
       WHERE id = ?`,
    )
    .run(
      room.center_id,
      room.id,
      room.name,
      room.number,
      start,
      slot.minutes,
      slot.surgery ? 1 : 0,
      slot.surgery ? slot.surgeryText : "",
      row.id,
    );
  database.exec("COMMIT");
  return { notice: "saved" };
}

export async function updateSurgery(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const current = await doctor();
  const id = Number(formData.get("appointmentId"));
  const row = db().prepare("SELECT * FROM appointments WHERE id = ?").get(id) as
    | {
        id: number;
        reserving_doctor_id: number;
        center_name: string;
        room_number: string;
        start_at: string;
        minutes: number;
        surgery_text: string;
        is_surgery: number;
      }
    | undefined;
  if (!row || !row.is_surgery) return { error: "notFound" };
  if (row.reserving_doctor_id !== current.id) return { error: "reservingOnly" };
  const surgeryText = String(formData.get("surgeryText") ?? "");
  if (!surgeryText.trim()) return { error: "surgeryRequired" };
  const now = new Date().toISOString();
  const database = db();
  database.exec("BEGIN");
  database
    .prepare(
      `INSERT INTO appointment_history
        (appointment_id, doctor_id, doctor_name, at, center_name, room_number, start_at, minutes, surgery_text)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(row.id, current.id, current.name, now, row.center_name, row.room_number, row.start_at, row.minutes, row.surgery_text);
  database.prepare("UPDATE appointments SET surgery_text = ? WHERE id = ?").run(surgeryText, row.id);
  database.exec("COMMIT");
  return { notice: "saved" };
}

export async function cancelAppointment(formData: FormData) {
  const current = await doctor();
  const id = Number(formData.get("appointmentId"));
  const row = db().prepare("SELECT * FROM appointments WHERE id = ? AND status = 'scheduled'").get(id) as
    | { id: number; patient_id: number; reserving_doctor_id: number }
    | undefined;
  if (!row || row.reserving_doctor_id !== current.id) redirect("/day");
  db()
    .prepare(
      "UPDATE appointments SET status = 'cancelled', cancelled_by_id = ?, cancelled_by_name = ?, cancelled_at = ? WHERE id = ?",
    )
    .run(current.id, current.name, new Date().toISOString(), id);
  redirect(`/patients/${row.patient_id}`);
}
