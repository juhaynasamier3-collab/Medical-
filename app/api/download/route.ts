import { db } from "@/lib/db";
import { currentDoctor } from "@/lib/session";

export async function GET() {
  const doctor = await currentDoctor();
  if (!doctor?.is_owner) return new Response(null, { status: 401 });
  const database = db();
  const file = {
    clinic: database.prepare("SELECT * FROM clinic").all(),
    patients: database.prepare("SELECT * FROM patients").all(),
    patientHistory: database.prepare("SELECT * FROM patient_history").all(),
    visits: database.prepare("SELECT * FROM visits").all(),
    visitHistory: database.prepare("SELECT * FROM visit_history").all(),
    appointments: database.prepare("SELECT * FROM appointments").all(),
    appointmentHistory: database.prepare("SELECT * FROM appointment_history").all(),
  };
  return new Response(JSON.stringify(file, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": "attachment; filename=clinic-records.json",
    },
  });
}
