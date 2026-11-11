"use client";

import { useSyncExternalStore } from "react";
import clsx from "clsx";

const KEY = "jhts-reading";
const SIZES = ["0.94", "1", "1.1", "1.22"] as const;
const THEMES = ["paper", "sepia", "night"] as const;
type Prefs = { size: number; theme: (typeof THEMES)[number] };
const DEFAULTS: Prefs = { size: 1, theme: "paper" };

const listeners = new Set<() => void>();
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
function readRaw(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}
let memory: string | null = null; // fallback when storage is blocked

function parse(raw: string | null): Prefs {
  try {
    const p = JSON.parse(raw ?? "null");
    if (p && Number.isInteger(p.size) && p.size >= 0 && p.size < SIZES.length && THEMES.includes(p.theme)) return p;
  } catch {
    // unavailable or corrupt: fall back to defaults
  }
  return DEFAULTS;
}

/**
 * Reading-comfort control for full text: text size and a paper, sepia or
 * night reading theme, remembered in this browser only.
 */
export function ReadingSurface({ html }: { html: string }) {
  const raw = useSyncExternalStore(
    subscribe,
    () => readRaw() ?? memory,
    () => null,
  );
  const prefs = parse(raw);
  const update = (p: Partial<Prefs>) => {
    memory = JSON.stringify({ ...prefs, ...p });
    try {
      localStorage.setItem(KEY, memory);
    } catch {
      // private mode: keep the choice for this visit only
    }
    listeners.forEach((l) => l());
  };

  return (
    <div data-reading-theme={prefs.theme} className="reading-surface rounded-[3px]">
      <div
        className="border-rule sticky top-16 z-10 flex flex-wrap items-center justify-between gap-3 border-b bg-[var(--rs-bg)] px-1 py-3 print:hidden"
        role="toolbar"
        aria-label="Reading comfort"
      >
        <span className="smallcaps text-[0.78rem] text-[var(--rs-muted)]">Full text</span>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1" role="group" aria-label="Text size">
            <button
              type="button"
              aria-label="Smaller text"
              disabled={prefs.size === 0}
              onClick={() => update({ size: prefs.size - 1 })}
              className="rounded-sm px-2 py-1 text-[0.85rem] disabled:opacity-35"
            >
              A−
            </button>
            <button
              type="button"
              aria-label="Larger text"
              disabled={prefs.size === SIZES.length - 1}
              onClick={() => update({ size: prefs.size + 1 })}
              className="rounded-sm px-2 py-1 text-[1.05rem] disabled:opacity-35"
            >
              A+
            </button>
          </div>
          <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Reading theme">
            {THEMES.map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={prefs.theme === t}
                aria-label={`${t[0].toUpperCase()}${t.slice(1)} theme`}
                onClick={() => update({ theme: t })}
                className={clsx(
                  "size-6 rounded-full border",
                  prefs.theme === t ? "ring-thread ring-2 ring-offset-2 ring-offset-[var(--rs-bg)]" : "",
                )}
                style={{
                  background: t === "paper" ? "#FFFDF7" : t === "sepia" ? "#F3E7CF" : "#1B1915",
                  borderColor: "#CFC5B3",
                }}
              />
            ))}
          </div>
        </div>
      </div>
      <div
        className="prose-jhts reading pt-8 pb-6"
        style={{ fontSize: `calc(clamp(1.125rem, 1.05rem + 0.25vw, 1.1875rem) * ${SIZES[prefs.size]})` }}
        // already sanitised on the server by sanitizeWithToc
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
