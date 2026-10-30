import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { safeNext } from "@/lib/auth";
import { userClient } from "@/lib/supabase/clients";

const TYPES: EmailOtpType[] = ["email", "signup", "invite", "recovery", "email_change", "magiclink"];

/**
 * Email links (confirmation, invitation, password reset, email change) land
 * here with a one-time token hash. Verifying it on the server sets the session
 * cookie, then we continue to `next`.
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const next = safeNext(url.searchParams.get("next"));

  if (tokenHash && type && TYPES.includes(type)) {
    const supabase = await userClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  }
  return NextResponse.redirect(new URL("/login?error=link", url.origin));
}
