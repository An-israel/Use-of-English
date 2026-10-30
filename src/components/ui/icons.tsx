import type { SVGProps } from "react";

/** A deliberately small icon set: fine 1.5px strokes that match the weave. */
type P = SVGProps<SVGSVGElement>;

const base = (p: P): P => ({
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
  focusable: false,
  ...p,
});

export const SearchIcon = (p: P) => (
  <svg {...base(p)}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4.5 4.5" />
  </svg>
);

export const MenuIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 8h16M4 16h16" />
  </svg>
);

export const CloseIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="m6 6 12 12M18 6 6 18" />
  </svg>
);

export const ArrowRightIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 12h15m-5-5 5 5-5 5" />
  </svg>
);

export const ChevronDownIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="m7 10 5 5 5-5" />
  </svg>
);

/** A lozenge: the journal's mark, used for bullets and the theme toggle. */
export const LozengeIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 3 21 12 12 21 3 12Z" />
    <path d="M12 8 16 12 12 16 8 12Z" />
  </svg>
);

export const SunIcon = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5v2M12 19.5v2M4.5 12h-2M21.5 12h-2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" />
  </svg>
);

export const MoonIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
  </svg>
);

export const OrcidIcon = (p: P) => (
  <svg width={16} height={16} viewBox="0 0 24 24" aria-hidden focusable={false} {...p}>
    <circle cx="12" cy="12" r="11" fill="#A6CE39" />
    <path
      fill="#fff"
      d="M8.2 7.1a.9.9 0 1 1 0-1.8.9.9 0 0 1 0 1.8ZM7.5 8.6h1.4v8.6H7.5zM10.7 8.6h3.6c3.4 0 4.9 2.4 4.9 4.3 0 2.1-1.6 4.3-4.9 4.3h-3.6V8.6Zm1.4 7.3h2.1c3 0 3.6-2.2 3.6-3 0-1.3-.8-3-3.6-3h-2.1v6Z"
    />
  </svg>
);
