import { ActionButton } from "@/components/admin/ActionButton";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AssetUpload } from "@/components/admin/AssetUpload";
import { OrderList } from "@/components/admin/OrderList";
import { requireRole } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { userClient } from "@/lib/supabase/clients";
import { BOARD_GROUP_LABEL, BOARD_GROUP_ORDER, type BoardGroup } from "@/lib/types";
import { removeBoardMember, reorder } from "../journal-actions";
import { MemberForm } from "./MemberForm";

export const metadata = { title: "Editorial board" };

type Row = {
  id: string;
  version: number;
  group: BoardGroup;
  name: string;
  title: string | null;
  affiliation: string | null;
  orcid: string | null;
  profile_url: string | null;
  photo_path: string | null;
  term_start: string | null;
  term_end: string | null;
  deleted_at: string | null;
};

export default async function BoardAdmin({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireRole(["super_admin", "editor"], "/admin/board");
  const sp = await searchParams;
  const { data } = await (
    await userClient()
  )
    .from("editorial_board_members")
    .select(
      "id, version, group, name, title, affiliation, orcid, profile_url, photo_path, term_start, term_end, deleted_at",
    )
    .order("sort_order")
    .returns<Row[]>();
  const rows = data ?? [];
  const removed = rows.filter((r) => r.deleted_at);
  return (
    <>
      <AdminPageHeader
        crumbs={[{ href: "/admin", label: "Admin" }]}
        title="Editorial board"
        description="Groups and order as shown on the Editorial Board page. Terms are shown publicly only when Settings → Show board terms is on."
      />
      <div className="grid grid-cols-12 gap-6 px-5 py-8 lg:px-10">
        <div className="col-span-12 space-y-8 xl:col-span-8">
          {BOARD_GROUP_ORDER.map((g) => {
            const members = rows.filter((r) => r.group === g && !r.deleted_at);
            return (
              <section key={g} aria-labelledby={`g-${g}`}>
                <h2 id={`g-${g}`} className="font-display mb-3 text-[1.2rem]">
                  {BOARD_GROUP_LABEL[g]} <span className="text-muted font-sans text-[0.85rem]">({members.length})</span>
                </h2>
                {!members.length ? (
                  <p className="text-muted text-[0.9rem]">Nobody in this group yet.</p>
                ) : (
                  <OrderList
                    save={reorder.bind(null, "board")}
                    items={members.map((m) => ({
                      id: m.id,
                      label: m.name,
                      content: (
                        <details>
                          <summary className="cursor-pointer list-none">
                            <span className="font-medium">
                              {m.title ? `${m.title} ` : ""}
                              {m.name}
                            </span>
                            <span className="text-muted block text-[0.84rem]">
                              {m.affiliation}
                              {m.term_start
                                ? ` · ${formatDate(m.term_start)} – ${m.term_end ? formatDate(m.term_end) : "present"}`
                                : ""}
                            </span>
                          </summary>
                          <div className="mt-4 space-y-4">
                            <MemberForm
                              values={{
                                id: m.id,
                                version: m.version,
                                group: m.group,
                                name: m.name,
                                title: m.title ?? "",
                                affiliation: m.affiliation ?? "",
                                orcid: m.orcid ?? "",
                                profile_url: m.profile_url ?? "",
                                term_start: m.term_start ?? "",
                                term_end: m.term_end ?? "",
                              }}
                            />
                            <AssetUpload
                              slot="board:photo"
                              id={m.id}
                              current={m.photo_path}
                              preview
                              clearLabel="Remove photo"
                            />
                            <ActionButton
                              variant="quiet"
                              run={removeBoardMember.bind(null, m.id, false)}
                              confirm={{
                                title: `Remove ${m.name} from the board?`,
                                description:
                                  "They disappear from the public page. You can restore them below the list.",
                                confirmLabel: "Remove",
                                tone: "danger",
                              }}
                            >
                              Remove from the board
                            </ActionButton>
                          </div>
                        </details>
                      ),
                    }))}
                  />
                )}
              </section>
            );
          })}
          {removed.length > 0 && (
            <section aria-labelledby="rm">
              <h2 id="rm" className="font-display text-[1.1rem]">
                Removed
              </h2>
              <ul className="mt-2 space-y-1 text-[0.9rem]">
                {removed.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-3">
                    <span className="text-muted">
                      {m.name} · {BOARD_GROUP_LABEL[m.group]}
                    </span>
                    <ActionButton variant="quiet" run={removeBoardMember.bind(null, m.id, true)}>
                      Restore
                    </ActionButton>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
        <aside className="col-span-12 xl:col-span-4">
          <details className="admin-box" open={sp.new === "1"}>
            <summary className="font-display cursor-pointer text-[1.1rem]">Add a board member</summary>
            <div className="mt-4">
              <MemberForm />
            </div>
          </details>
        </aside>
      </div>
    </>
  );
}
