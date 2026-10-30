"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type Ctx = { version: number; setVersion: (v: number) => void };
const RowVersionContext = createContext<Ctx | null>(null);

export const useRowVersion = () => useContext(RowVersionContext);

/**
 * Several forms editing one row (an article's details and its full text)
 * share the row's version. A save updates it at once from the server's
 * answer, so the next save from another form isn't a false conflict while
 * the page data is still refreshing.
 */
export function RowVersion({ version, children }: { version: number; children: ReactNode }) {
  const [current, setCurrent] = useState(version);
  const [seen, setSeen] = useState(version);
  if (version !== seen) {
    setSeen(version);
    setCurrent((c) => Math.max(c, version));
  }
  return (
    <RowVersionContext.Provider value={{ version: current, setVersion: setCurrent }}>
      {children}
    </RowVersionContext.Provider>
  );
}
