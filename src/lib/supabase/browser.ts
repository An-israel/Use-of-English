"use client";

import { createBrowserClient } from "@supabase/ssr";

/** Browser client, used only for direct uploads with signed URLs. */
export function browserClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}
