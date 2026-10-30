import { NextResponse, type NextRequest } from "next/server";
import { safeNext } from "@/lib/auth";
import { userClient } from "@/lib/supabase/clients";

/** OAuth and PKCE email flows return here with a code to exchange for a session. */
export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const code = url.searchParams.get("code");
  const next = safeNext(url.searchParams.get("next"));
  if (code) {
    const supabase = await userClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  }
  return NextResponse.redirect(new URL("/login?error=link", url.origin));
}
