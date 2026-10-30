"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import clsx from "clsx";
import { useToast } from "@/components/ui/Toaster";
import { browserClient } from "@/lib/supabase/browser";
import { getNotifications, markNotificationsSeen, type StaffNotification } from "@/app/admin/system-actions";

/** How often to poll when Realtime isn't available (item 23: the documented fallback). */
const POLL_MS = 60_000;

/**
 * Live notifications for staff (item 16): new paid submissions, revised
 * manuscripts, reviews, payment problems and contact messages. Supabase
 * Realtime pushes new rows (RLS decides who receives which); if the socket
 * can't connect, the bell polls instead.
 */
export function NotificationBell() {
  const [items, setItems] = useState<StaffNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [live, setLive] = useState<"connecting" | "live" | "polling">("connecting");
  const toast = useToast();

  const load = useCallback(async () => {
    const r = await getNotifications().catch(() => null);
    if (!r) return;
    setItems(r.items);
    setUnread(r.unread);
  }, []);

  useEffect(() => {
    const first = setTimeout(() => void load(), 0);
    const supabase = browserClient();
    let poll: ReturnType<typeof setInterval> | null = null;
    const startPolling = () => {
      setLive("polling");
      poll ??= setInterval(() => void load(), POLL_MS);
    };
    const fallback = setTimeout(startPolling, 10_000);
    const channel = supabase
      .channel("staff-notifications")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "staff_notifications" }, (payload) => {
        const n = payload.new as StaffNotification;
        setItems((prev) => [n, ...prev.filter((x) => x.id !== n.id)].slice(0, 15));
        setUnread((u) => u + 1);
        toast(n.title);
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          clearTimeout(fallback);
          setLive("live");
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          clearTimeout(fallback);
          startPolling();
        }
      });
    return () => {
      clearTimeout(first);
      clearTimeout(fallback);
      if (poll) clearInterval(poll);
      void supabase.removeChannel(channel);
    };
  }, [load, toast]);

  return (
    <Dialog.Root
      onOpenChange={(open) => {
        if (open && unread) {
          setUnread(0);
          void markNotificationsSeen();
        }
      }}
    >
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="text-muted hover:text-fg relative rounded-sm p-2"
          aria-label={unread ? `Notifications, ${unread} new` : "Notifications"}
          title={
            live === "live"
              ? "Notifications (live)"
              : live === "polling"
                ? "Notifications (checked every minute)"
                : "Notifications"
          }
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden="true"
          >
            <path d="M6 9a6 6 0 1 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9Z" strokeLinejoin="round" />
            <path d="M10 20a2.2 2.2 0 0 0 4 0" strokeLinecap="round" />
          </svg>
          {unread > 0 && (
            <span className="bg-accent text-paper tabular absolute -top-0.5 -right-0.5 min-w-4 rounded-full px-1 text-center text-[0.62rem] leading-4">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[90] bg-[rgb(21_19_15/0.25)]" />
        <Dialog.Content className="border-rule bg-surface fixed top-16 left-1/2 z-[91] w-[min(26rem,calc(100vw-2rem))] -translate-x-1/2 rounded-[3px] border shadow-[0_24px_48px_-24px_rgb(21_19_15/0.5)] lg:left-72 lg:translate-x-0">
          <div className="border-rule flex items-baseline justify-between border-b px-4 py-3">
            <Dialog.Title className="font-display text-[1.1rem]">Notifications</Dialog.Title>
            <span className="text-muted text-[0.74rem]">
              {live === "live" ? "Live" : live === "polling" ? "Updated every minute" : "Connecting…"}
            </span>
          </div>
          <Dialog.Description className="sr-only">Recent events in the editorial office.</Dialog.Description>
          {!items.length ? (
            <p className="text-muted px-4 py-8 text-center text-[0.9rem]">Nothing new.</p>
          ) : (
            <ul className="divide-rule max-h-[60vh] divide-y overflow-y-auto">
              {items.map((n) => (
                <li key={n.id}>
                  <Dialog.Close asChild>
                    <Link href={n.href} className="hover:bg-bg block px-4 py-3">
                      <span className="flex items-center gap-2 text-[0.9rem] font-medium">
                        <span
                          aria-hidden="true"
                          className={clsx("inline-block size-1.5 rotate-45", KIND_TONE[n.kind] ?? "bg-thread")}
                        />
                        {n.title}
                      </span>
                      {n.body && <span className="text-muted mt-0.5 block truncate text-[0.82rem]">{n.body}</span>}
                      <span className="tabular text-muted mt-0.5 block text-[0.74rem]">{when(n.created_at)}</span>
                    </Link>
                  </Dialog.Close>
                </li>
              ))}
            </ul>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

const KIND_TONE: Record<string, string> = { payment: "bg-accent", reconciliation: "bg-accent", message: "bg-info" };

function when(iso: string): string {
  const mins = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h} h ago`;
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(new Date(iso));
}
