import crypto from "crypto";
import fs from "fs";
import path from "path";
import { cookies } from "next/headers";
import { db, type Doctor } from "./db";

const COOKIE = "clinic_session";
const IDLE_MS = 15 * 60 * 1000;

function secret() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  const file = path.join(process.cwd(), "data", "secret");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (!fs.existsSync(file)) fs.writeFileSync(file, crypto.randomBytes(32).toString("hex"));
  return fs.readFileSync(file, "utf8");
}

function sign(doctorId: number, last: number) {
  const body = Buffer.from(JSON.stringify({ doctorId, last })).toString("base64url");
  const mac = crypto.createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${mac}`;
}

function readToken(token: string | undefined) {
  if (!token) return null;
  const [body, mac] = token.split(".");
  if (!body || !mac) return null;
  const expected = crypto.createHmac("sha256", secret()).update(body).digest("base64url");
  const left = Buffer.from(mac);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString()) as {
      doctorId: number;
      last: number;
    };
    if (!parsed.doctorId || !parsed.last) return null;
    if (Date.now() - parsed.last > IDLE_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function currentDoctor() {
  const jar = await cookies();
  const parsed = readToken(jar.get(COOKIE)?.value);
  if (!parsed) return null;
  const doctor = db()
    .prepare("SELECT * FROM doctors WHERE id = ? AND active = 1")
    .get(parsed.doctorId) as Doctor | undefined;
  return doctor ?? null;
}

export async function touchSession() {
  const jar = await cookies();
  const parsed = readToken(jar.get(COOKIE)?.value);
  if (!parsed) return;
  jar.set(COOKIE, sign(parsed.doctorId, Date.now()), cookieOptions());
}

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  };
}

export async function startSession(doctorId: number) {
  const jar = await cookies();
  jar.set(COOKIE, sign(doctorId, Date.now()), cookieOptions());
}

export async function clearSession() {
  const jar = await cookies();
  jar.set(COOKIE, "", { ...cookieOptions(), maxAge: 0 });
}

export async function languageCookie() {
  const jar = await cookies();
  const value = jar.get("lang")?.value;
  return value === "ar" ? "ar" : "en";
}

export async function setLanguageCookie(lang: "en" | "ar") {
  const jar = await cookies();
  jar.set("lang", lang, { ...cookieOptions(), httpOnly: false });
}
