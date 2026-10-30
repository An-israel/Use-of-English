"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import clsx from "clsx";

type Toast = { id: number; message: string; tone: "info" | "error" };
const Ctx = createContext<(message: string, tone?: Toast["tone"]) => void>(() => {});

export const useToast = () => useContext(Ctx);

/** Small, polite toasts announced to screen readers through aria-live. */
export function Toaster({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((message: string, tone: Toast["tone"] = "info") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3600);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div
        aria-live="polite"
        role="status"
        className="pointer-events-none fixed inset-x-0 bottom-5 z-[80] flex flex-col items-center gap-2 px-4"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={clsx(
              "toast-in pointer-events-auto flex items-center gap-3 rounded-[3px] px-4 py-3 text-[0.92rem] shadow-[0_18px_40px_-20px_rgb(21_19_15/0.6)]",
              t.tone === "error" ? "bg-accent text-paper" : "bg-inverse text-inverse-fg",
            )}
          >
            <span aria-hidden="true" className="bg-ochre inline-block size-2 rotate-45" />
            {t.message}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
