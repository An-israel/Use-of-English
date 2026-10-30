"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { ArrowRightIcon, SearchIcon } from "@/components/ui/icons";
import { OPEN_PALETTE_EVENT } from "./command-palette-events";

export type PaletteItem = {
  group: "Articles" | "Issues" | "Authors" | "Pages";
  title: string;
  hint?: string;
  href: string;
  /** extra text to match against (authors, keywords) */
  terms?: string;
};

const normalise = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function score(item: PaletteItem, tokens: string[]): number {
  const title = normalise(item.title);
  const rest = normalise(`${item.hint ?? ""} ${item.terms ?? ""}`);
  let s = 0;
  for (const t of tokens) {
    if (title.startsWith(t)) s += 6;
    else if (title.includes(` ${t}`)) s += 4;
    else if (title.includes(t)) s += 3;
    else if (rest.includes(t)) s += 1;
    else return 0;
  }
  return s;
}

const GROUP_ORDER: PaletteItem["group"][] = ["Articles", "Issues", "Authors", "Pages"];

export function CommandPalette({ items }: { items: PaletteItem[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const restoreFocus = useRef<HTMLElement | null>(null);
  const uid = useId();

  useEffect(() => {
    const show = () => {
      restoreFocus.current = document.activeElement as HTMLElement | null;
      setOpen(true);
    };
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        show();
      }
    };
    window.addEventListener(OPEN_PALETTE_EVENT, show);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener(OPEN_PALETTE_EVENT, show);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
      document.documentElement.style.overflow = "hidden";
    } else {
      document.documentElement.style.overflow = "";
    }
  }, [open]);

  const results = useMemo(() => {
    const tokens = normalise(query).split(/\s+/).filter(Boolean);
    if (tokens.length === 0) {
      return items.filter((i) => i.group === "Pages" || i.group === "Issues").slice(0, 8);
    }
    return items
      .map((item) => ({ item, s: score(item, tokens) }))
      .filter((r) => r.s > 0)
      .sort((a, b) => b.s - a.s || GROUP_ORDER.indexOf(a.item.group) - GROUP_ORDER.indexOf(b.item.group))
      .slice(0, 12)
      .map((r) => r.item);
  }, [items, query]);

  const grouped = useMemo(
    () =>
      GROUP_ORDER.map((g) => ({ group: g, items: results.filter((r) => r.group === g) })).filter((g) => g.items.length),
    [results],
  );
  const flat = grouped.flatMap((g) => g.items);

  const close = () => {
    setOpen(false);
    setQuery("");
    setCursor(0);
    restoreFocus.current?.focus();
  };

  const go = (href: string) => {
    close();
    router.push(href);
  };

  if (!open) return null;

  const optionId = (i: number) => `${uid}-opt-${i}`;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[12vh]" role="presentation">
      <button
        type="button"
        aria-label="Close search"
        tabIndex={-1}
        className="bg-ink/40 absolute inset-0"
        onClick={close}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search the journal"
        className="border-rule bg-surface relative w-full max-w-[40rem] overflow-hidden rounded-[4px] border shadow-[0_32px_64px_-24px_rgb(21_19_15/0.45)]"
        onKeyDown={(e) => {
          if (e.key === "Escape") close();
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setCursor((c) => Math.min(c + 1, flat.length - 1));
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            setCursor((c) => Math.max(c - 1, 0));
          }
          if (e.key === "Enter" && flat[cursor]) {
            e.preventDefault();
            go(flat[cursor].href);
          }
          if (e.key === "Tab") e.preventDefault(); // keep focus in the dialog
        }}
      >
        <div className="border-rule flex items-center gap-3 border-b px-5">
          <SearchIcon className="text-muted shrink-0" />
          <input
            ref={inputRef}
            role="combobox"
            aria-expanded="true"
            aria-controls={`${uid}-list`}
            aria-activedescendant={flat[cursor] ? optionId(cursor) : undefined}
            aria-autocomplete="list"
            placeholder="Search articles, issues, authors and pages"
            className="text-fg placeholder:text-muted h-16 w-full bg-transparent font-sans text-[1.05rem] outline-none"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setCursor(0);
            }}
          />
          <kbd className="border-rule text-muted rounded-[3px] border px-1.5 py-0.5 text-[0.7rem]">Esc</kbd>
        </div>
        <div id={`${uid}-list`} role="listbox" aria-label="Results" className="max-h-[60vh] overflow-y-auto py-2">
          {flat.length === 0 && (
            <p className="text-muted px-5 py-8 text-center">
              No matches for “{query}”.{" "}
              <button
                type="button"
                className="text-brand underline"
                onClick={() => go(`/search?q=${encodeURIComponent(query)}`)}
              >
                Try a full search
              </button>
            </p>
          )}
          {grouped.map((g) => (
            <div key={g.group} role="group" aria-label={g.group}>
              <p className="smallcaps text-muted px-5 pt-3 pb-1 text-[0.78rem]">{g.group}</p>
              {g.items.map((item) => {
                const i = flat.indexOf(item);
                return (
                  <div
                    key={item.href + item.title}
                    id={optionId(i)}
                    role="option"
                    aria-selected={i === cursor}
                    onMouseMove={() => setCursor(i)}
                    onClick={() => go(item.href)}
                    className={clsx(
                      "flex cursor-pointer items-center gap-4 px-5 py-2.5",
                      i === cursor ? "bg-bg" : "bg-transparent",
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="font-display text-fg block truncate text-[1.05rem]">{item.title}</span>
                      {item.hint && <span className="text-muted block truncate text-[0.85rem]">{item.hint}</span>}
                    </span>
                    <ArrowRightIcon
                      width={16}
                      height={16}
                      className={clsx("text-thread shrink-0", i === cursor ? "opacity-100" : "opacity-0")}
                    />
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        {query && (
          <div className="border-rule text-muted border-t px-5 py-3 text-[0.85rem]">
            <button
              type="button"
              className="hover:text-fg"
              onClick={() => go(`/search?q=${encodeURIComponent(query)}`)}
            >
              See all results for “{query}” →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
