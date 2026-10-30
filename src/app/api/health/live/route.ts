import { NextResponse, connection } from "next/server";

/** Liveness: the app process is up. No dependency checks. */
export async function GET() {
  await connection();
  return NextResponse.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
}
