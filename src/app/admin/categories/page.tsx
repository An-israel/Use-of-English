import { ActionButton } from "@/components/admin/ActionButton";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { OrderList } from "@/components/admin/OrderList";
import { requireRole } from "@/lib/auth";
import { userClient } from "@/lib/supabase/clients";
import { archiveCategory, reorder } from "../journal-actions";
import { CategoryForm, type CategoryValues } from "./CategoryForm";

export const metadata = { title: "Categories" };

type Row = CategoryValues & { sort_order: number; is_archived: boolean; articles: { count: number }[] };

export default async function CategoriesPage() {
  await requireRole(["super_admin", "editor"], "/admin/categories");
  const { data } = await (
    await userClient()
  )
    .from("categories")
    .select("id, name, slug, short_description, description, thread_color, sort_order, is_archived, articles ( count )")
    .order("sort_order")
    .returns<Row[]>();
  const active = (data ?? []).filter((c) => !c.is_archived);
  const archived = (data ?? []).filter((c) => c.is_archived);
  return (
    <>
      <AdminPageHeader
        crumbs={[{ href: "/admin", label: "Admin" }]}
        title="Categories"
        description="Subject areas. Each has a thread colour used on article cards and chips. Archived categories disappear from the site but their articles keep them."
      />
      <div className="grid grid-cols-12 gap-6 px-5 py-8 lg:px-10">
        <div className="col-span-12 space-y-6 xl:col-span-8">
          <OrderList
            save={reorder.bind(null, "categories")}
            items={active.map((c) => ({
              id: c.id,
              label: c.name,
              content: (
                <details>
                  <summary className="flex cursor-pointer list-none items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="inline-block size-3 rotate-45"
                      style={{
                        background: c.thread_color.startsWith("--") ? `var(${c.thread_color})` : c.thread_color,
                      }}
                    />
                    <span className="font-medium">{c.name}</span>
                    <span className="text-muted text-[0.82rem]">
                      /subjects/{c.slug} · {c.articles[0]?.count ?? 0} articles
                    </span>
                    <span className="text-thread-text ml-auto text-[0.82rem]">Edit</span>
                  </summary>
                  <div className="mt-4 space-y-4">
                    <CategoryForm values={c} />
                    <ActionButton
                      variant="quiet"
                      run={archiveCategory.bind(null, c.id, true)}
                      confirm={{
                        title: `Archive “${c.name}”?`,
                        description: "It disappears from menus and the subjects page. Its articles stay published.",
                        confirmLabel: "Archive",
                      }}
                    >
                      Archive this category
                    </ActionButton>
                  </div>
                </details>
              ),
            }))}
          />
          {archived.length > 0 && (
            <section aria-labelledby="arch">
              <h2 id="arch" className="font-display text-[1.1rem]">
                Archived
              </h2>
              <ul className="mt-2 space-y-1 text-[0.9rem]">
                {archived.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3">
                    <span className="text-muted">{c.name}</span>
                    <ActionButton variant="quiet" run={archiveCategory.bind(null, c.id, false)}>
                      Restore
                    </ActionButton>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
        <aside className="col-span-12 xl:col-span-4">
          <div className="admin-box">
            <h2 className="font-display mb-4 text-[1.1rem]">Add a category</h2>
            <CategoryForm />
          </div>
        </aside>
      </div>
    </>
  );
}
