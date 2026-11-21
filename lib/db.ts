import fs from "fs";
import path from "path";
import { DatabaseSync } from "node:sqlite";
import { cairoToday } from "./time";

const dataDir = path.join(process.cwd(), "data");
const dbPath = path.join(dataDir, "clinic.sqlite");

const globalForDb = globalThis as unknown as { clinicDb?: DatabaseSync };

function migrate(database: DatabaseSync) {
  database.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS clinic (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      name TEXT NOT NULL,
      governorate TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS doctors (
      id INTEGER PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      is_owner INTEGER NOT NULL DEFAULT 0,
      language TEXT NOT NULL DEFAULT 'en',
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS invites (
      token TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used_at TEXT
    );
    CREATE TABLE IF NOT EXISTS password_resets (
      token TEXT PRIMARY KEY,
      doctor_id INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used_at TEXT
    );
    CREATE TABLE IF NOT EXISTS patients (
      id INTEGER PRIMARY KEY,
      full_name TEXT NOT NULL,
      dob TEXT NOT NULL,
      sex TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL UNIQUE,
      city TEXT NOT NULL DEFAULT '',
      address TEXT NOT NULL DEFAULT '',
      inactive INTEGER NOT NULL DEFAULT 0,
      consent_doctor_id INTEGER NOT NULL,
      consent_doctor_name TEXT NOT NULL,
      consent_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS patient_history (
      id INTEGER PRIMARY KEY,
      patient_id INTEGER NOT NULL,
      doctor_id INTEGER NOT NULL,
      doctor_name TEXT NOT NULL,
      at TEXT NOT NULL,
      full_name TEXT NOT NULL,
      dob TEXT NOT NULL,
      sex TEXT NOT NULL,
      phone TEXT NOT NULL,
      city TEXT NOT NULL,
      address TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS visits (
      id INTEGER PRIMARY KEY,
      patient_id INTEGER NOT NULL,
      author_id INTEGER NOT NULL,
      author_name TEXT NOT NULL,
      saved_at TEXT NOT NULL,
      why TEXT NOT NULL,
      findings TEXT NOT NULL,
      assessment TEXT NOT NULL,
      plan TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS visit_history (
      id INTEGER PRIMARY KEY,
      visit_id INTEGER NOT NULL,
      doctor_id INTEGER NOT NULL,
      doctor_name TEXT NOT NULL,
      at TEXT NOT NULL,
      why TEXT NOT NULL,
      findings TEXT NOT NULL,
      assessment TEXT NOT NULL,
      plan TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS centers (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      closed INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS rooms (
      id INTEGER PRIMARY KEY,
      center_id INTEGER NOT NULL,
      number TEXT NOT NULL,
      closed INTEGER NOT NULL DEFAULT 0,
      UNIQUE(center_id, number)
    );
    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY,
      patient_id INTEGER NOT NULL,
      center_id INTEGER,
      room_id INTEGER,
      center_name TEXT NOT NULL,
      room_number TEXT NOT NULL,
      start_at TEXT NOT NULL,
      minutes INTEGER NOT NULL,
      reserving_doctor_id INTEGER NOT NULL,
      reserving_doctor_name TEXT NOT NULL,
      is_surgery INTEGER NOT NULL DEFAULT 0,
      surgery_text TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'scheduled',
      cancelled_by_id INTEGER,
      cancelled_by_name TEXT,
      cancelled_at TEXT
    );
    CREATE TABLE IF NOT EXISTS appointment_history (
      id INTEGER PRIMARY KEY,
      appointment_id INTEGER NOT NULL,
      doctor_id INTEGER NOT NULL,
      doctor_name TEXT NOT NULL,
      at TEXT NOT NULL,
      center_name TEXT NOT NULL,
      room_number TEXT NOT NULL,
      start_at TEXT NOT NULL,
      minutes INTEGER NOT NULL,
      surgery_text TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS outbox (
      id INTEGER PRIMARY KEY,
      to_email TEXT NOT NULL,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
}

function backup(database: DatabaseSync) {
  const dir = path.join(dataDir, "backups");
  fs.mkdirSync(dir, { recursive: true });
  const dest = path.join(dir, `${cairoToday()}.sqlite`);
  if (!fs.existsSync(dest)) {
    database.exec("PRAGMA wal_checkpoint(TRUNCATE)");
    fs.copyFileSync(dbPath, dest);
  }
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  for (const name of fs.readdirSync(dir)) {
    const file = path.join(dir, name);
    if (fs.statSync(file).mtimeMs < cutoff) fs.unlinkSync(file);
  }
}

export function db() {
  if (!globalForDb.clinicDb) {
    fs.mkdirSync(dataDir, { recursive: true });
    const database = new DatabaseSync(dbPath);
    migrate(database);
    backup(database);
    globalForDb.clinicDb = database;
  }
  return globalForDb.clinicDb;
}

export type Doctor = {
  id: number;
  email: string;
  password_hash: string;
  name: string;
  is_owner: number;
  language: string;
  active: number;
  created_at: string;
};

export type Clinic = { id: number; name: string; governorate: string };

export type Patient = {
  id: number;
  full_name: string;
  dob: string;
  sex: string;
  phone: string;
  city: string;
  address: string;
  inactive: number;
  consent_doctor_id: number;
  consent_doctor_name: string;
  consent_at: string;
  created_at: string;
};

export type Visit = {
  id: number;
  patient_id: number;
  author_id: number;
  author_name: string;
  saved_at: string;
  why: string;
  findings: string;
  assessment: string;
  plan: string;
};

export type Appointment = {
  id: number;
  patient_id: number;
  center_id: number | null;
  room_id: number | null;
  center_name: string;
  room_number: string;
  start_at: string;
  minutes: number;
  reserving_doctor_id: number;
  reserving_doctor_name: string;
  is_surgery: number;
  surgery_text: string;
  status: string;
  cancelled_by_id: number | null;
  cancelled_by_name: string | null;
  cancelled_at: string | null;
};

export function clinicRow() {
  return db().prepare("SELECT * FROM clinic WHERE id = 1").get() as Clinic | undefined;
}

export function doctorCount() {
  const row = db().prepare("SELECT COUNT(*) AS n FROM doctors").get() as { n: number };
  return row.n;
}
