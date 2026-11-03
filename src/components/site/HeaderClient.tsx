"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import clsx from "clsx";
import type { NavGroup } from "@/lib/nav";
import { ArrowRightIcon, ChevronDownIcon, CloseIcon, MenuIcon, SearchIcon } from "@/components/ui/icons";
import { AccountLink } from "./AccountLink";
import { ThemeToggle } from "./ThemeToggle";
import { openCommandPalette } from "./command-palette-events";
import { Emblem } from "@/components/brand/Emblem";

type Props = {
  nav: NavGroup[];
  features: Partial<Record<NavGroup["id"], ReactNode>>;
  journalName: string;
  shortName: string;
  submissionsOpen: boolean;
};

export function HeaderClient({ nav, features, journalName, shortName, submissionsOpen }: Props) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState<NavGroup["id"] | null>(null);
  const [sheet, setSheet] = useState(false);
  const pathname = usePathname();
  const headerRef = useRef<HTMLElement>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const uid = useId();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close menus on navigation.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(null);
    setSheet(false);
  }

  const close = useCallback(() => setOpen(null), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        const trigger = document.getElementById(`${uid}-${open}-trigger`);
        close();
        trigger?.focus();
      }
    };
    const onPointer = (e: PointerEvent) => {
      if (!headerRef.current?.contains(e.target as Node)) close();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open, close, uid]);

  useEffect(() => {
    document.documentElement.style.overflow = sheet ? "hidden" : "";
    if (!sheet) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSheet(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [sheet]);

  const hoverOpen = (id: NavGroup["id"]) => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setOpen(id), 90);
  };
  const hoverClose = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setOpen(null), 160);
  };

  const active = (href: string) => pathname === href || (href !== "/" && pathname.startsWith(href + "/"));
  const groupActive = (g: NavGroup) => g.links.some((l) => active(l.href));

  return (
    <header
      ref={headerRef}
      className={clsx(
        "sticky top-0 z-40 transition-[background-color,box-shadow,border-color] duration-300",
        scrolled || open ? "border-rule bg-bg/95 border-b backdrop-blur-[2px]" : "bg-bg border-b border-transparent",
      )}
      onMouseLeave={hoverClose}
    >
      <div
        className={clsx(
          "max-w-page ease-weave mx-auto flex items-center gap-6 px-4 transition-[height] duration-300 sm:px-6 lg:px-10",
          scrolled ? "h-16" : "h-20 lg:h-24",
        )}
      >
        <Link href="/" className="group mr-auto flex items-center gap-3 leading-none">
          <Emblem
            title=""
            wordmark={false}
            className={clsx(
              "shrink-0 transition-[width,height] duration-300",
              scrolled ? "size-11" : "size-12 lg:size-16",
            )}
          />
          <span className="flex flex-col">
            <span
              className={clsx(
                "font-display text-brand font-extrabold tracking-[-0.01em] transition-[font-size] duration-300",
                scrolled ? "text-[1.5rem]" : "text-[1.7rem] lg:text-[1.95rem]",
              )}
            >
              {shortName}
            </span>
            <span
              className={clsx(
                "smallcaps text-muted mt-1 hidden max-w-[22rem] text-[0.78rem] transition-all duration-300 sm:block lg:max-w-[14rem] xl:max-w-[22rem]",
                scrolled ? "pointer-events-none -mt-1 h-0 opacity-0" : "opacity-100",
              )}
            >
              {" "}
              {journalName}
            </span>
          </span>
          <span className="sr-only"> (home)</span>
        </Link>

        <nav aria-label="Main" className="hidden lg:block">
          <ul className="flex items-center gap-0 xl:gap-1">
            {nav.map((g) => {
              const isOpen = open === g.id;
              return (
                <li key={g.id} onMouseEnter={() => hoverOpen(g.id)}>
                  <button
                    type="button"
                    id={`${uid}-${g.id}-trigger`}
                    aria-expanded={isOpen}
                    aria-controls={`${uid}-${g.id}-panel`}
                    onClick={() => setOpen(isOpen ? null : g.id)}
                    className={clsx(
                      "flex items-center gap-1 rounded-sm px-3 py-2 text-[0.95rem] transition-colors",
                      isOpen || groupActive(g) ? "text-fg" : "text-muted hover:text-fg",
                    )}
                  >
                    <span
                      className={clsx(
                        groupActive(g) && "decoration-thread underline decoration-1 underline-offset-[6px]",
                      )}
                    >
                      {g.label}
                    </span>
                    <ChevronDownIcon
                      width={14}
                      height={14}
                      className={clsx("transition-transform duration-200", isOpen && "rotate-180")}
                    />
                  </button>
                </li>
              );
            })}
            <li>
              <Link
                href="/contact"
                className={clsx(
                  "rounded-sm px-3 py-2 text-[0.95rem] transition-colors",
                  active("/contact")
                    ? "text-fg decoration-thread underline underline-offset-[6px]"
                    : "text-muted hover:text-fg",
                )}
              >
                Contact
              </Link>
            </li>
          </ul>
        </nav>

        <div className="flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={() => openCommandPalette()}
            className="text-muted hover:text-fg flex items-center gap-2 rounded-sm px-2 py-2 transition-colors"
            aria-keyshortcuts="Control+K Meta+K"
          >
            <SearchIcon />
            {/* The visible word starts the accessible name (WCAG 2.5.3, label in name). */}
            <span className="sr-only text-[0.9rem] xl:not-sr-only">Search</span>
            <span className="sr-only"> the journal</span>
            <kbd
              aria-hidden="true"
              className="border-rule text-muted hidden rounded-[3px] border px-1.5 py-0.5 font-sans text-[0.7rem] xl:inline"
            >
              Ctrl K
            </kbd>
          </button>
          <ThemeToggle className="hidden sm:flex" />
          <AccountLink className="text-muted hover:text-fg hidden px-2 py-2 text-[0.95rem] whitespace-nowrap transition-colors xl:block" />
          {submissionsOpen && (
            <Link
              href="/submit"
              className="bg-brand text-brand-fg hover:bg-brand-hover ml-1 hidden items-center gap-2 rounded-sm px-4 py-2.5 text-[0.92rem] font-medium whitespace-nowrap transition-colors md:inline-flex"
            >
              Submit a Manuscript
            </Link>
          )}
          <button
            type="button"
            className="text-fg flex items-center gap-2 rounded-sm px-2 py-2 lg:hidden"
            aria-expanded={sheet}
            aria-controls={`${uid}-sheet`}
            onClick={() => setSheet(true)}
          >
            <MenuIcon />
            <span className="text-[0.95rem]">Menu</span>
          </button>
        </div>
      </div>

      {/* Mega-menus */}
      {nav.map((g) => (
        <div
          key={g.id}
          id={`${uid}-${g.id}-panel`}
          role="region"
          aria-labelledby={`${uid}-${g.id}-trigger`}
          hidden={open !== g.id}
          onMouseEnter={() => hoverOpen(g.id)}
          className="border-rule bg-surface absolute inset-x-0 top-full hidden border-b shadow-[0_24px_48px_-32px_rgb(21_19_15/0.35)] lg:block"
        >
          <div className="max-w-page mx-auto grid grid-cols-12 gap-10 px-10 py-10">
            <div className="col-span-7">
              <p className="smallcaps text-muted mb-5 text-[0.82rem]">{g.label}</p>
              <ul className="grid grid-cols-2 gap-x-10 gap-y-1">
                {g.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="group block rounded-sm py-3 pr-4"
                      aria-current={active(l.href) ? "page" : undefined}
                    >
                      <span className="font-display text-fg flex items-center gap-2 text-[1.25rem]">
                        <span className="rule-thread">{l.label}</span>
                        <ArrowRightIcon
                          width={16}
                          height={16}
                          className="text-thread -translate-x-1 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100"
                        />
                      </span>
                      {l.description && <span className="text-muted mt-1 block text-[0.9rem]">{l.description}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div className="border-rule col-span-5 border-l pl-10">{features[g.id]}</div>
          </div>
        </div>
      ))}

      {/* Mobile full-screen sheet */}
      <div
        id={`${uid}-sheet`}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        hidden={!sheet}
        className="bg-bg fixed inset-0 z-50 overflow-y-auto lg:hidden"
      >
        <div className="flex h-20 items-center justify-between px-4 sm:px-6">
          <span className="font-display text-[1.85rem] font-semibold tracking-[-0.02em]">{shortName}</span>
          <button
            type="button"
            className="flex items-center gap-2 rounded-sm px-2 py-2"
            onClick={() => setSheet(false)}
            autoFocus
          >
            <CloseIcon />
            <span className="text-[0.95rem]">Close</span>
          </button>
        </div>
        <nav aria-label="Main" className="px-4 pb-16 sm:px-6">
          {nav.map((g) => (
            <section key={g.id} className="border-rule border-t py-6">
              <h2 className="smallcaps text-muted mb-3 font-sans text-[0.85rem] font-normal tracking-[0.08em]">
                {g.label}
              </h2>
              <ul>
                {g.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="font-display text-fg block py-2 text-[1.75rem] leading-tight"
                      aria-current={active(l.href) ? "page" : undefined}
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          <section className="border-rule border-t py-6">
            <Link href="/contact" className="font-display text-fg block py-2 text-[1.75rem]">
              Contact
            </Link>
            <AccountLink className="font-display text-fg block py-2 text-[1.75rem]" />
          </section>
          <div className="border-rule flex items-center justify-between gap-4 border-t pt-6">
            {submissionsOpen && (
              <Link
                href="/submit"
                className="bg-brand text-brand-fg inline-flex flex-1 items-center justify-center rounded-sm px-5 py-4 text-base font-medium"
              >
                Submit a Manuscript
              </Link>
            )}
            <ThemeToggle />
          </div>
        </nav>
      </div>
    </header>
  );
}
