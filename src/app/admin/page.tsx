import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { EmptyState } from "@/components/journal/EmptyState";

export default function AdminHome() {
  return (
    <>
      <AdminPageHeader
        title="Overview"
        description="Statistics, “needs attention” items and recent activity arrive with the full dashboard (milestone 6)."
      />
      <div className="px-5 py-10 lg:px-10">
        <EmptyState title="The editorial office is being set up">
          Invite your editors and reviewers from Users and roles.
        </EmptyState>
      </div>
    </>
  );
}
