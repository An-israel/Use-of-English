import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionButton } from "@/components/admin/ActionButton";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { StatusPill } from "@/components/admin/StatusPill";
import { requireRole } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { userClient } from "@/lib/supabase/clients";
import { restorePageVersion } from "../../journal-actions";
import { PageEditor } from "./PageEditor";

export const metadata = { title: "Page" };

const PUBLIC_PATH: Record<string, string> = {
  about: "/about",
  "aims-and-scope": "/aims-and-scope",
  "use-of-english-unit": "/use-of-english-unit",
  "author-guidelines": "/author-guidelines",
};

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(["super_admin", "editor"], "/admin/pages");
  const { id } = await params;
  const db = await userClient();
  const { data: p } = await db
    .from("pages")
    .select("id, kind, slug, title, summary, body_html, is_published, version, updated_at")
    .eq("id", id)
    .maybeSingle();
  if (!p) notFound();
  const { data: versions } = await db
    .from("page_versions")
    .select("id, version, title, saved_at, saved_by:profiles ( full_name )")
    .eq("page_id", id)
    .order("version", { ascending: false })
    .limit(30);
  const href = p.kind === "policy" ? `/policies/${p.slug}` : (PUBLIC_PATH[p.slug] ?? `/${p.slug}`);
  return (
    <>
      <AdminPageHeader
        crumbs={[
          { href: "/admin", label: "Admin" },
          { href: "/admin/pages", label: "Pages and policies" },
        ]}
        title={p.title}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusPill status={p.is_published ? "published" : "draft"} />
            {p.kind === "policy" ? "Policy" : "Page"} · {href} · version {p.version}, saved {formatDate(p.updated_at)}
          </span>
        }
        actions={
          p.is_published ? (
            <Link href={href} target="_blank" className="btn-line">
              View on site ↗
            </Link>
          ) : null
        }
      />
      <div className="space-y-8 px-5 py-8 lg:px-10">
        <PageEditor
          id={p.id}
          version={p.version}
          title={p.title}
          summary={p.summary ?? ""}
          html={p.body_html}
          published={p.is_published}
        />
        <section className="admin-box max-w-[48rem]" aria-labelledby="hist">
          <h2 id="hist" className="font-display text-[1.15rem]">
            Version history
          </h2>
          <p className="text-muted mt-1 text-[0.86rem]">
            Every save keeps the text it replaced. Restoring keeps the current text too.
          </p>
          {!versions?.length ? (
            <p className="text-muted mt-3 text-[0.9rem]">No earlier versions yet.</p>
          ) : (
            <ol className="divide-rule mt-3 divide-y text-[0.9rem]">
              {versions.map((v) => (
                <li key={v.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                  <span>
                    <span className="tabular">v{v.version}</span> · {v.title}
                    <span className="text-muted block text-[0.8rem]">
                      {formatDate(v.saved_at)}
                      {(v.saved_by as unknown as { full_name: string } | null)?.full_name
                        ? ` · ${(v.saved_by as unknown as { full_name: string }).full_name}`
                        : ""}
                    </span>
                  </span>
                  <ActionButton
                    variant="quiet"
                    reload
                    run={restorePageVersion.bind(null, p.id, v.id)}
                    confirm={{
                      title: `Restore version ${v.version}?`,
                      description: "The page goes back to this text. The current text is kept in the history.",
                      confirmLabel: "Restore",
                    }}
                  >
                    Restore
                  </ActionButton>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </>
  );
}
