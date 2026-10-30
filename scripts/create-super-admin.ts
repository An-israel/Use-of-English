/**
 * Creates the first Super Admin from environment variables (brief section 6).
 *   SUPER_ADMIN_EMAIL, SUPER_ADMIN_NAME, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Sends an invitation email so the person sets their own password.
 */
import { createClient } from "@supabase/supabase-js";

const {
  SUPER_ADMIN_EMAIL: email,
  SUPER_ADMIN_NAME: name,
  NEXT_PUBLIC_SUPABASE_URL: url,
  SUPABASE_SERVICE_ROLE_KEY: key,
  NEXT_PUBLIC_SITE_URL: site,
} = process.env;
if (!email || !url || !key) {
  console.error("Set SUPER_ADMIN_EMAIL, NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const supabase = createClient(url, key, { auth: { persistSession: false } });

const { data: existing } = await supabase.from("profiles").select("id").eq("email", email).maybeSingle();
if (existing) {
  const { error } = await supabase
    .from("profiles")
    .update({ role: "super_admin", is_active: true })
    .eq("id", existing.id);
  if (error) throw error;
  console.log(`${email} is now a Super Admin.`);
} else {
  const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
    data: { full_name: name ?? "" },
    redirectTo: `${site ?? "http://localhost:3000"}/auth/callback?next=/admin`,
  });
  if (error) throw error;
  // app_metadata can only be set by the service role, so a user can never grant themselves a role
  await supabase.auth.admin.updateUserById(data.user.id, { app_metadata: { jhts_role: "super_admin" } });
  const { error: pErr } = await supabase.from("profiles").update({ role: "super_admin" }).eq("id", data.user.id);
  if (pErr) throw pErr;
  console.log(`Invitation sent to ${email}; they will be a Super Admin when they accept.`);
}
