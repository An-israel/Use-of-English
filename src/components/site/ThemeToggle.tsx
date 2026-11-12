"use client";

import { useSyncExternalStore } from "react";
import clsx from "clsx";
import { MoonIcon, SunIcon } from "@/components/ui/icons";

const KEY = "jhts-theme";

type Theme = "light" | "dark";

function read(): Theme {
  const attr = document.documentElement.dataset.theme;
  // Light unless the reader has chosen dark; the device setting is not followed.
  return attr === "dark" ? "dark" : "light";
}

const listeners = new Set<() => void>();
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function setTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    // storage unavailable (private mode): the choice lasts for this page only
  }
  listeners.forEach((l) => l());
}

export function ThemeToggle({ className }: { className?: string }) {
  const theme = useSyncExternalStore(subscribe, read, () => "light" as Theme);
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      className={clsx("text-muted hover:text-fg items-center rounded-sm p-2 transition-colors", className ?? "flex")}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
    >
      {theme === "dark" ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}

/** Inline script that applies the saved theme before first paint (no flash). */
export const themeScript = `(function(){try{var t=localStorage.getItem("${KEY}");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}})();`;
