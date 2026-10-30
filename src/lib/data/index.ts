import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { isDemoMode } from "@/lib/env";
import { demoSource } from "./demo";
import { supabaseSource } from "./supabase";
import type { ContentSource } from "./source";

/**
 * Cached public content. Every read is tagged so publishing can invalidate
 * exactly what changed (item 50); pages also fall back to hourly revalidation,
 * which bounds how stale a page can get if a revalidation is missed (item 35).
 */

const source: ContentSource = isDemoMode ? demoSource : supabaseSource;

export const TAGS = {
  settings: "settings",
  flags: "flags",
  categories: "categories",
  board: "board",
  pages: "pages",
  cfp: "cfp",
  issues: "issues",
  articles: "articles",
  issue: (volume: number, number: number) => `issue:${volume}:${number}`,
  article: (slug: string) => `article:${slug}`,
} as const;

export async function getSettings() {
  "use cache";
  cacheTag(TAGS.settings);
  cacheLife("hours");
  return source.settings();
}

export async function getFlags() {
  "use cache";
  cacheTag(TAGS.flags);
  cacheLife("hours");
  return source.flags();
}

export async function getCategories() {
  "use cache";
  cacheTag(TAGS.categories);
  cacheLife("hours");
  return source.categories();
}

export async function getBoard() {
  "use cache";
  cacheTag(TAGS.board);
  cacheLife("hours");
  return source.board();
}

export async function getPages(kind: "page" | "policy") {
  "use cache";
  cacheTag(TAGS.pages);
  cacheLife("hours");
  return source.pages(kind);
}

export async function getPage(kind: "page" | "policy", slug: string) {
  "use cache";
  cacheTag(TAGS.pages);
  cacheLife("hours");
  return source.page(kind, slug);
}

export async function getCallForPapers() {
  "use cache";
  cacheTag(TAGS.cfp);
  cacheLife("hours");
  return source.callForPapers();
}

export async function getIssues() {
  "use cache";
  cacheTag(TAGS.issues);
  cacheLife("hours");
  return source.issues();
}

export async function getIssue(volume: number, number: number) {
  "use cache";
  cacheTag(TAGS.issues, TAGS.issue(volume, number));
  cacheLife("hours");
  return source.issue(volume, number);
}

export async function getCurrentIssue() {
  "use cache";
  cacheTag(TAGS.issues);
  cacheLife("hours");
  const [latest] = await source.issues();
  return latest ? source.issue(latest.volume, latest.number) : null;
}

export async function getInPress() {
  "use cache";
  cacheTag(TAGS.articles);
  cacheLife("hours");
  return source.inPress();
}

export async function getArticle(slug: string) {
  "use cache";
  cacheTag(TAGS.articles, TAGS.article(slug));
  cacheLife("hours");
  return source.article(slug);
}

export async function getArticles() {
  "use cache";
  cacheTag(TAGS.articles);
  cacheLife("hours");
  return source.articles();
}

export async function getSlugRedirect(entity: "article" | "category" | "page", slug: string) {
  "use cache";
  cacheTag(TAGS.articles, TAGS.pages, TAGS.categories);
  cacheLife("hours");
  return source.slugRedirect(entity, slug);
}
