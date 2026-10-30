import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { requireRole } from "@/lib/auth";
import { ARTICLE_TYPE_LABEL } from "@/lib/types";
import { NewArticleForm } from "./NewArticleForm";

export const metadata = { title: "New article" };

export default async function NewArticlePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const viewer = await requireRole(["super_admin", "editor", "book_review_editor"], "/admin/articles/new");
  const sp = await searchParams;
  const bookOnly = viewer.role === "book_review_editor";
  const types = Object.entries(ARTICLE_TYPE_LABEL)
    .filter(([k]) => !bookOnly || k === "book_review")
    .map(([value, label]) => ({ value, label }));
  const defaultType = bookOnly || sp.type === "book_review" ? "book_review" : "research_article";
  return (
    <>
      <AdminPageHeader
        crumbs={[
          { href: "/admin", label: "Admin" },
          { href: bookOnly ? "/admin/book-reviews" : "/admin/articles", label: bookOnly ? "Book reviews" : "Articles" },
        ]}
        title={defaultType === "book_review" ? "New book review" : "New article"}
        description="Start with the type and title; everything else is on the next page. Accepted submissions can become articles directly from their submission page."
      />
      <div className="max-w-[36rem] px-5 py-8 lg:px-10">
        <div className="admin-box">
          <NewArticleForm types={types} defaultType={defaultType} />
        </div>
      </div>
    </>
  );
}
