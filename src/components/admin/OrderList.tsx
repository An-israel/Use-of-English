"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { useToast } from "@/components/ui/Toaster";
import type { ActionResult } from "@/lib/admin/server";

/** A list whose order editors change with ↑/↓ and then save in one go. */
export type OrderItem = { id: string; label: string; content: ReactNode };

export function OrderList({ items, save }: { items: OrderItem[]; save: (ids: string[]) => Promise<ActionResult> }) {
  const [order, setOrder] = useState(items);
  const [base, setBase] = useState(items);
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  if (items !== base) {
    setBase(items);
    setOrder(items);
  }
  const changed = order.map((i) => i.id).join() !== items.map((i) => i.id).join();
  const move = (i: number, d: -1 | 1) => {
    const next = order.slice();
    [next[i], next[i + d]] = [next[i + d], next[i]];
    setOrder(next);
  };
  return (
    <div>
      <ol className="divide-rule border-rule bg-surface divide-y rounded-[3px] border">
        {order.map((item, i) => (
          <li key={item.id} className="flex items-start gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">{item.content}</div>
            <div className="flex shrink-0">
              <button
                type="button"
                className="btn-quiet px-2"
                aria-label={`Move ${item.label} up`}
                disabled={i === 0}
                onClick={() => move(i, -1)}
              >
                ↑
              </button>
              <button
                type="button"
                className="btn-quiet px-2"
                aria-label={`Move ${item.label} down`}
                disabled={i === order.length - 1}
                onClick={() => move(i, 1)}
              >
                ↓
              </button>
            </div>
          </li>
        ))}
      </ol>
      {changed && (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            className="btn-primary"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await save(order.map((i) => i.id));
                toast(r.message, r.ok ? "info" : "error");
                if (r.ok) router.refresh();
              })
            }
          >
            Save order
          </button>
          <button type="button" className="btn-quiet" onClick={() => setOrder(items)}>
            Undo
          </button>
        </div>
      )}
    </div>
  );
}
