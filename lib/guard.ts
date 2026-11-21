import { redirect } from "next/navigation";
import { clinicRow, doctorCount, type Doctor } from "./db";
import { dictionary, type Lang } from "./i18n";
import { currentDoctor, languageCookie } from "./session";

export async function viewer(): Promise<{ doctor: Doctor; lang: Lang }> {
  const doctor = await currentDoctor();
  if (!doctor) redirect("/login");
  const lang: Lang = doctor.language === "ar" ? "ar" : "en";
  return { doctor, lang };
}

export async function publicLang() {
  const doctor = await currentDoctor();
  if (doctor) return (doctor.language === "ar" ? "ar" : "en") as Lang;
  return languageCookie();
}

export async function requireOwner() {
  const session = await viewer();
  if (!session.doctor.is_owner) redirect("/day");
  return session;
}

export function text(lang: Lang) {
  return dictionary(lang);
}

export function clinicOrSetup() {
  if (doctorCount() === 0) redirect("/setup");
  return clinicRow();
}
