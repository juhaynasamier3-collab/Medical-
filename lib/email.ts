import crypto from "crypto";
import { db } from "./db";

export function newToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export function storeEmail(to: string, subject: string, body: string) {
  db()
    .prepare("INSERT INTO outbox (to_email, subject, body, created_at) VALUES (?, ?, ?, ?)")
    .run(to, subject, body, new Date().toISOString());
}

export function inviteLetter(clinicName: string, doctorName: string, link: string) {
  return {
    subject: `Invitation to ${clinicName}`,
    body: `You have been invited to ${clinicName} as a doctor.\n\nYour name: ${doctorName}\nSet your password: ${link}\n\nThis invitation expires in 7 days.`,
  };
}

export function resetLetter(email: string, link: string) {
  return {
    subject: "Password reset",
    body: `Set a new password for ${email}:\n${link}\n\nThis link expires in 2 hours.`,
  };
}
