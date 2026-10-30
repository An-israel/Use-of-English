import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { requireRole } from "@/lib/auth";
import { userClient } from "@/lib/supabase/clients";
import { invitableRoles } from "@/lib/workflow";
import { InviteForm, UsersTable, type UserRow } from "./UsersClient";

export const metadata = { title: "Users and roles" };

export default async function UsersPage() {
  const viewer = await requireRole(["super_admin", "editor", "book_review_editor"], "/admin/users");
  const superAdmin = viewer.role === "super_admin";
  const supabase = await userClient();
  let query = supabase
    .from("profiles")
    .select("id, email, full_name, role, affiliation, is_active, created_at")
    .order("full_name");
  if (!superAdmin) query = query.eq("role", "reviewer");
  const { data: users } = await query.returns<UserRow[]>();

  return (
    <>
      <AdminPageHeader
        title={superAdmin ? "Users and roles" : "Reviewers"}
        description={
          superAdmin
            ? "Invite editors, finance officers and reviewers, change roles and deactivate accounts. Authors register themselves."
            : "Invite reviewers to the journal. They review manuscripts without seeing author names."
        }
      />
      <div className="space-y-10 px-5 py-8 lg:px-10">
        <section aria-labelledby="invite" className="border-rule bg-surface rounded-[3px] border p-6">
          <h2 id="invite" className="font-display text-[1.3rem]">
            Invite someone
          </h2>
          <p className="text-muted mt-1 mb-5 text-[0.9rem]">
            They receive an email to accept the invitation and choose a password.
          </p>
          <InviteForm roles={invitableRoles(viewer.role)} />
        </section>
        <section aria-labelledby="list">
          <h2 id="list" className="sr-only">
            People
          </h2>
          <UsersTable users={users ?? []} canManage={superAdmin} viewerId={viewer.id} />
        </section>
      </div>
    </>
  );
}
