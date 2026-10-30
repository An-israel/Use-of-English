"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useState } from "react";
import clsx from "clsx";
import { SearchIcon } from "@/components/ui/icons";

export type QuickAction = { label: string; href: string; group: "Go to" | "Create"; keywords?: string };

export const OPEN_ADMIN_COMMAND = "jhts:admin-command";

/** Cmd/Ctrl + K: jump to any admin section or start common tasks. */
export function AdminCommand({ actions }: { actions: QuickAction[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const router = useRouter();
  const uid = useId();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const show = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_ADMIN_COMMAND, show);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_ADMIN_COMMAND, show);
    };
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? actions.filter((a) => `${a.label} ${a.keywords ?? ""}`.toLowerCase().includes(q))
      : actions.slice();
    if (q.length >= 2) {
      list.push({
        group: "Go to",
        label: `Search submissions for “${query.trim()}”`,
        href: `/admin/submissions?q=${encodeURIComponent(query.trim())}`,
      });
      list.push({
        group: "Go to",
        label: `Search articles for “${query.trim()}”`,
        href: `/admin/articles?q=${encodeURIComponent(query.trim())}`,
      });
    }
    return list;
  }, [actions, query]);

  const go = (href: string) => {
    setOpen(false);
    setQuery("");
    setCursor(0);
    router.push(href);
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          setQuery("");
          setCursor(0);
        }
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[90] bg-[rgb(21_19_15/0.4)]" />
        <Dialog.Content
          className="border-rule bg-surface fixed top-[12vh] left-1/2 z-[91] w-[min(36rem,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden rounded-[3px] border shadow-[0_32px_64px_-24px_rgb(21_19_15/0.5)]"
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setCursor((c) => Math.min(c + 1, results.length - 1));
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setCursor((c) => Math.max(c - 1, 0));
            }
            if (e.key === "Enter" && results[cursor]) {
              e.preventDefault();
              go(results[cursor].href);
            }
          }}
        >
          <Dialog.Title className="sr-only">Quick actions</Dialog.Title>
          <Dialog.Description className="sr-only">
            Type to filter, use the arrow keys and press Enter.
          </Dialog.Description>
          <div className="border-rule flex items-center gap-3 border-b px-4">
            <SearchIcon className="text-muted size-4" />
            <input
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setCursor(0);
              }}
              placeholder="Go to a section, create something, or search…"
              role="combobox"
              aria-expanded="true"
              aria-controls={`${uid}-list`}
              aria-activedescendant={results[cursor] ? `${uid}-${cursor}` : undefined}
              className="w-full bg-transparent py-3.5 text-[0.95rem] outline-none"
            />
          </div>
          <ul id={`${uid}-list`} role="listbox" aria-label="Quick actions" className="max-h-[50vh] overflow-y-auto p-2">
            {results.map((a, i) => (
              <li
                key={`${a.href}-${a.label}`}
                id={`${uid}-${i}`}
                role="option"
                aria-selected={i === cursor}
                onMouseEnter={() => setCursor(i)}
                onClick={() => go(a.href)}
                className={clsx(
                  "flex cursor-pointer items-center justify-between gap-3 rounded-[2px] px-3 py-2 text-[0.92rem]",
                  i === cursor ? "bg-bg" : "",
                )}
              >
                <span>{a.label}</span>
                <span className="smallcaps text-muted text-[0.72rem]">{a.group}</span>
              </li>
            ))}
            {!results.length && <li className="text-muted px-3 py-6 text-center text-[0.9rem]">Nothing matches.</li>}
          </ul>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
