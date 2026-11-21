import { currentDoctor, touchSession } from "@/lib/session";

export async function POST() {
  const doctor = await currentDoctor();
  if (!doctor) return new Response(null, { status: 401 });
  await touchSession();
  return new Response(null, { status: 204 });
}
