import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { safeNext } from "@/lib/auth";
import { userClient } from "@/lib/supabase/clients";

/** OAuth and PKCE email flows return here with a code to exchange for a session. */
export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const q = z
    .object({ code: z.string().min(1).max(500).optional(), next: z.string().max(500).optional().catch(undefined) })
    .safeParse(Object.fromEntries(url.searchParams));
  const code = q.success ? q.data.code : undefined;
  const next = safeNext(q.success ? q.data.next : null);
  if (code) {
    const supabase = await userClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  }
  return NextResponse.redirect(new URL("/login?error=link", url.origin));
}
