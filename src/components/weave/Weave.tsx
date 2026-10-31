import { useId, type CSSProperties } from "react";
import clsx from "clsx";
import { diamondPath, weaveGeometry, weaveMaskFile } from "@/lib/weave";

const DENSITY = { loose: 72, regular: 48, dense: 28 } as const;

export type WeaveProps = {
  /** Lattice spacing */
  density?: keyof typeof DENSITY;
  /** Thread colours; CSS colours or var() references. First is the main warp. */
  colours?: string[];
  /** 0–1. The brief asks for 6–12% behind content. */
  opacity?: number;
  /** Draw the threads once on load (~1.2s). Respects reduced motion. */
  animate?: boolean;
  /** Add nested lozenges in some cells */
  lozenges?: number;
  /** Intrinsic size of the drawing in user units */
  width?: number;
  height?: number;
  strokeWidth?: number;
  seed?: number;
  className?: string;
  /** Fade the pattern out towards an edge */
  fade?: "none" | "bottom" | "left" | "right" | "radial";
  /** Draw the paths inline (for OG images); otherwise static weaves use cached mask files */
  inline?: boolean;
};

/**
 * The JHTS weave: an interlaced diamond lattice after Akwete cloth.
 * Decorative only, so it is hidden from assistive technology.
 */
export function Weave({
  density = "regular",
  colours = ["var(--thread)"],
  opacity = 0.1,
  animate = false,
  lozenges = 0,
  width = 1440,
  height = 720,
  strokeWidth = 1,
  seed = 7,
  className,
  fade = "none",
  inline = false,
}: WeaveProps) {
  const uid = useId().replace(/:/g, "");
  if (!animate && !inline) {
    // Each colour is a plain rectangle masked by a cached file of its threads, so the page doesn't carry
    // hundreds of paths twice (HTML and React payload) and colours still follow the theme.
    const fadeId = `wf-${uid}`;
    return (
      <svg
        aria-hidden="true"
        focusable="false"
        className={clsx("pointer-events-none select-none", className)}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid slice"
        style={{ opacity }}
      >
        <defs>
          {fade !== "none" && (
            <>
              <FadeGradient id={`${fadeId}-g`} fade={fade} />
              <mask id={fadeId} maskUnits="userSpaceOnUse" x="0" y="0" width={width} height={height}>
                <rect width={width} height={height} fill={`url(#${fadeId}-g)`} />
              </mask>
            </>
          )}
          {colours.map((_, ci) => (
            <mask key={ci} id={`${fadeId}-${ci}`} maskUnits="userSpaceOnUse" x="0" y="0" width={width} height={height}>
              <image
                href={`/weave/${weaveMaskFile({ width, height, cell: DENSITY[density], colours: colours.length, lozenges, strokeWidth, seed, colour: ci })}`}
                width={width}
                height={height}
              />
            </mask>
          ))}
        </defs>
        <g mask={fade !== "none" ? `url(#${fadeId})` : undefined}>
          {colours.map((colour, ci) => (
            <rect key={ci} width={width} height={height} fill={colour} mask={`url(#${fadeId}-${ci})`} />
          ))}
        </g>
      </svg>
    );
  }

  const geo = weaveGeometry({
    width,
    height,
    cell: DENSITY[density],
    colours: colours.length,
    lozengeDensity: lozenges,
    seed,
  });
  const fadeId = `wf-${uid}`;
  const total = geo.lines.length;

  const mask = fade !== "none";

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className={clsx("pointer-events-none select-none", className)}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid slice"
      style={{ opacity }}
    >
      {mask && (
        <defs>
          <FadeGradient id={`${fadeId}-g`} fade={fade} />
          <mask id={fadeId} maskUnits="userSpaceOnUse" x="0" y="0" width={width} height={height}>
            <rect width={width} height={height} fill={`url(#${fadeId}-g)`} />
          </mask>
        </defs>
      )}
      <g mask={fade !== "none" ? `url(#${fadeId})` : undefined}>
        <g>
          {colours.map((colour, ci) => (
            <g key={ci} stroke={colour} strokeWidth={strokeWidth} fill="none" strokeLinecap="butt">
              {geo.lines
                .map((l, i) => ({ l, i }))
                .filter(({ l }) => l.colour === ci)
                .map(({ l, i }) =>
                  animate ? (
                    // Draws as a solid thread, then settles into its over/under rhythm.
                    <path
                      key={i}
                      d={l.d}
                      strokeDasharray={l.dash}
                      className="weave-thread"
                      style={
                        {
                          "--len": l.length,
                          "--dash": l.dash,
                          animationDelay: `${Math.round((i / total) * 500)}ms`,
                        } as CSSProperties
                      }
                    />
                  ) : (
                    <path key={i} d={l.d} strokeDasharray={l.dash} />
                  ),
                )}
            </g>
          ))}
        </g>
        {geo.lozenges.length > 0 && (
          <g fill="none" strokeWidth={strokeWidth} className={animate ? "weave-fade-in" : undefined}>
            {geo.lozenges.map((z, i) => (
              <g key={i} stroke={colours[z.colour] ?? colours[0]}>
                {Array.from({ length: z.rings }, (_, r) => (
                  <path key={r} d={diamondPath(z.cx, z.cy, z.r * (1 - r * 0.45))} />
                ))}
              </g>
            ))}
          </g>
        )}
      </g>
    </svg>
  );
}

function FadeGradient({ id, fade }: { id: string; fade: NonNullable<WeaveProps["fade"]> }) {
  if (fade === "radial") {
    return (
      <radialGradient id={id} cx="0.7" cy="0.4" r="0.75">
        <stop offset="0" stopColor="#fff" />
        <stop offset="1" stopColor="#fff" stopOpacity="0" />
      </radialGradient>
    );
  }
  const dirs = {
    bottom: { x1: 0, y1: 0, x2: 0, y2: 1 },
    left: { x1: 1, y1: 0, x2: 0, y2: 0 },
    right: { x1: 0, y1: 0, x2: 1, y2: 0 },
    none: { x1: 0, y1: 0, x2: 0, y2: 1 },
  }[fade];
  return (
    <linearGradient id={id} {...dirs}>
      <stop offset="0" stopColor="#fff" />
      <stop offset="1" stopColor="#fff" stopOpacity="0" />
    </linearGradient>
  );
}
