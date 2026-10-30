import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/journal/Breadcrumbs";
import { PageSkeleton } from "@/components/journal/Skeleton";
import { requireViewer } from "@/lib/auth";
import { getCategories, getFlags, getSettings } from "@/lib/data";
import { isDemoMode } from "@/lib/env";
import { userClient } from "@/lib/supabase/clients";
import type { UploadKind } from "@/lib/submission";
import { Wizard } from "./Wizard";

export const metadata: Metadata = { title: "Submit a manuscript", robots: { index: false } };

export default function DraftPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Draft params={params} />
    </Suspense>
  );
}

async function Draft({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await requireViewer(`/submit/${id}`);
  const supabase = await userClient();
  const { data: s } = await supabase
    .from("submissions")
    .select("id, author_id, status, title, type, category_id, abstract, keywords, citation_style, declarations")
    .eq("id", id)
    .maybeSingle();
  if (!s || s.author_id !== viewer.id) notFound();
  if (s.status !== "draft") redirect(`/account/submissions/${id}`);

  const [{ data: authors }, { data: files }, categories, settings, flags] = await Promise.all([
    supabase
      .from("submission_authors")
      .select("name, affiliation, email, orcid, is_corresponding")
      .eq("submission_id", id)
      .order("position"),
    supabase
      .from("submission_files")
      .select("kind, original_name, size_bytes, version")
      .eq("submission_id", id)
      .order("version"),
    getCategories(),
    getSettings(),
    getFlags(),
  ]);
  const latest: Partial<Record<UploadKind, { name: string; size: number }>> = {};
  for (const f of files ?? []) latest[f.kind as UploadKind] = { name: f.original_name, size: f.size_bytes };
  const declarations = Object.entries((s.declarations as Record<string, boolean>) ?? {})
    .filter(([k, v]) => v && k !== "all")
    .map(([k]) => k);

  return (
    <div className="max-w-page mx-auto px-4 py-10 sm:px-6 lg:px-10 lg:py-14">
      <Breadcrumbs
        items={[
          { label: "My account", href: "/account" },
          { label: "Submit a manuscript", href: "/submit" },
          { label: s.title || "Draft" },
        ]}
      />
      <h1 className="font-display mt-6 mb-10 text-[clamp(2rem,1.6rem+1.6vw,2.8rem)] leading-tight">
        {s.title || "New submission"}
      </h1>
      <Wizard
        id={s.id}
        details={{
          title: s.title,
          type: s.type,
          categoryId: s.category_id ?? "",
          abstract: s.abstract,
          keywords: s.keywords ?? [],
          citationStyle: s.citation_style ?? "",
        }}
        authors={(authors ?? []).map((a) => ({
          name: a.name,
          affiliation: a.affiliation ?? "",
          email: a.email,
          orcid: a.orcid ?? "",
          isCorresponding: a.is_corresponding,
        }))}
        files={latest}
        declarations={declarations}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        fees={{ enabled: settings.fees.enabled && flags.fees_enabled, reviewKobo: settings.fees.reviewKobo }}
        supabaseReady={!isDemoMode}
      />
    </div>
  );
}
