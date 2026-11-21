import { redirect } from "next/navigation";
import { doctorCount } from "@/lib/db";
import { currentDoctor } from "@/lib/session";

export default async function Home() {
  if (doctorCount() === 0) redirect("/setup");
  const doctor = await currentDoctor();
  redirect(doctor ? "/day" : "/login");
}
