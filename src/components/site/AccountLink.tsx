"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

// Supabase keeps the session in "sb-<project>-auth-token" cookies. Checking for one
// lets the statically generated header say "My account" without a network request.
const hasSession = () => /(?:^|;\s*)sb-[^=]+-auth-token(?:\.0)?=/.test(document.cookie);
const subscribe = () => () => {};

export function AccountLink({ className }: { className?: string }) {
  const signedIn = useSyncExternalStore(subscribe, hasSession, () => false);
  return (
    <Link href={signedIn ? "/account" : "/login"} className={className}>
      {signedIn ? "My account" : "Sign in"}
    </Link>
  );
}
