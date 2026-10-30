import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { OrderList } from "@/components/admin/OrderList";
import { StatusPill } from "@/components/admin/StatusPill";
import { requireRole } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { userClient } from "@/lib/supabase/clients";
import { reorder } from "../journal-actions";
import { NewPageForm } from "./NewPageForm";

export const metadata = { title: "Pages and policies" };

export default async function PagesAdmin() {
  await requireRole(["super_admin", "editor"], "/admin/pages");
  const { data } = await (
    await userClient()
  )
    .from("pages")
    .select("id, kind, slug, title, is_published, updated_at, version")
    .is("deleted_at", null)
    .order("sort_order");
  const rows = data ?? [];
  const item = (p: (typeof rows)[number]) => ({
    id: p.id,
    label: p.title,
    content: (
      <div className="flex flex-wrap items-center gap-3">
        <Link href={`/admin/pages/${p.id}`} className="font-medium hover:underline hover:underline-offset-4">
          {p.title}
        </Link>
        <StatusPill status={p.is_published ? "published" : "draft"} />
        <span className="text-muted text-[0.82rem]">
          v{p.version} · {formatDate(p.updated_at)}
        </span>
      </div>
    ),
  });
  return (
    <>
      <AdminPageHeader
        crumbs={[{ href: "/admin", label: "Admin" }]}
        title="Pages and policies"
        description="About, Aims and Scope, Author Guidelines and the journal’s policies. Every save is versioned."
      />
      <div className="grid grid-cols-12 gap-6 px-5 py-8 lg:px-10">
        <div className="col-span-12 space-y-8 xl:col-span-8">
          <section aria-labelledby="pg">
            <h2 id="pg" className="font-display mb-3 text-[1.2rem]">
              Pages
            </h2>
            <OrderList items={rows.filter((p) => p.kind === "page").map(item)} save={reorder.bind(null, "pages")} />
          </section>
          <section aria-labelledby="po">
            <h2 id="po" className="font-display mb-3 text-[1.2rem]">
              Policies
            </h2>
            <OrderList items={rows.filter((p) => p.kind === "policy").map(item)} save={reorder.bind(null, "pages")} />
          </section>
        </div>
        <aside className="col-span-12 xl:col-span-4">
          <div className="admin-box">
            <h2 className="font-display mb-4 text-[1.1rem]">New page or policy</h2>
            <NewPageForm />
          </div>
        </aside>
      </div>
    </>
  );
}
