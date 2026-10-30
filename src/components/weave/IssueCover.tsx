import Image from "next/image";
import clsx from "clsx";
import { coverDesign, diamondPath, seasonFor, weaveGeometry } from "@/lib/weave";
import { monthName } from "@/lib/issues";

export type IssueCoverProps = {
  volume: number;
  issue: number;
  month: number;
  year: number;
  /** Uploaded cover; when present it replaces the generated design */
  coverUrl?: string | null;
  className?: string;
  priority?: boolean;
  /** Width hint for the uploaded image */
  sizes?: string;
};

const W = 600;
const H = 800;

/**
 * A generated, on-brand cover for each issue. The weave is seeded by volume and
 * issue so every cover is unique and stable; the ground colour follows the
 * issue's season.
 */
export function IssueCover({ volume, issue, month, year, coverUrl, className, priority, sizes }: IssueCoverProps) {
  const label = `Cover of Volume ${volume}, Issue ${issue} (${monthName(month)} ${year})`;

  if (coverUrl) {
    return (
      <div className={clsx("bg-surface relative aspect-[3/4] overflow-hidden", className)}>
        <Image
          src={coverUrl}
          alt={label}
          fill
          priority={priority}
          sizes={sizes ?? "(min-width: 1024px) 400px, 80vw"}
          className="object-cover"
        />
      </div>
    );
  }

  const season = seasonFor(month);
  const design = coverDesign(volume, issue);
  const geo = weaveGeometry({
    width: W,
    height: H,
    cell: design.cell,
    colours: 2,
    lozengeDensity: 0.08,
    seed: design.seed,
  });
  const mx = W * design.motifX;
  const my = H * design.motifY;
  const mr = W * design.motifR;
  const band = H * design.bandY;
  const display = { fontFamily: "var(--font-display)" };
  const sans = { fontFamily: "var(--font-sans)" };
  const threadColours = [season.thread, season.accent];

  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${W} ${H}`}
      className={clsx("block aspect-[3/4] h-auto w-full", className)}
    >
      <title>{label}</title>
      <rect width={W} height={H} fill={season.ground} />

      {/* Lattice field */}
      <g opacity={0.42} fill="none" strokeWidth={1.25}>
        {threadColours.map((c, ci) => (
          <g key={ci} stroke={c} opacity={ci === 0 ? 1 : 0.55}>
            {geo.lines
              .filter((l) => l.colour === ci)
              .map((l, i) => (
                <path key={i} d={l.d} strokeDasharray={l.dash} />
              ))}
          </g>
        ))}
        {geo.lozenges.map((z, i) => (
          <path key={i} d={diamondPath(z.cx, z.cy, z.r)} stroke={season.accent} opacity={0.7} />
        ))}
      </g>

      {/* Quiet masthead field */}
      <rect width={W} height={168} fill={season.ground} />
      <line x1={48} x2={W - 48} y1={168} y2={168} stroke={season.thread} strokeWidth={1} />

      {/* Central motif: concentric lozenges */}
      <g fill="none">
        <path d={diamondPath(mx, my, mr + 14)} fill={season.ground} />
        {Array.from({ length: design.motifRings }, (_, r) => (
          <path
            key={r}
            d={diamondPath(mx, my, mr * (1 - r / (design.motifRings + 0.5)))}
            stroke={r % 2 === 0 ? season.thread : season.accent}
            strokeWidth={r === 0 ? 2 : 1.25}
          />
        ))}
        <path d={diamondPath(mx, my, mr * 0.12)} fill={season.thread} />
      </g>

      {/* Issue panel */}
      <rect y={band} width={W} height={H - band} fill={season.ground} />
      <line x1={48} x2={W - 48} y1={band} y2={band} stroke={season.thread} strokeWidth={1} />

      <text x={48} y={86} fill={season.accent} style={display} fontSize={60} fontWeight={600} letterSpacing={-1}>
        JHTS
      </text>
      <text x={48} y={124} fill={season.accent} style={sans} fontSize={14} letterSpacing={2.4} opacity={0.85}>
        JOURNAL OF HUMANITIES
      </text>
      <text x={48} y={144} fill={season.accent} style={sans} fontSize={14} letterSpacing={2.4} opacity={0.85}>
        AND TRANSCULTURAL STUDIES
      </text>

      <text x={48} y={band + 92} fill={season.accent} style={display} fontSize={76} fontWeight={500} letterSpacing={-2}>
        Vol. {volume}
        <tspan fill={season.thread}> No. {issue}</tspan>
      </text>
      <text x={48} y={band + 140} fill={season.accent} style={sans} fontSize={17} letterSpacing={3}>
        {monthName(month).toUpperCase()} {year}
      </text>
      <rect
        x={0.75}
        y={0.75}
        width={W - 1.5}
        height={H - 1.5}
        fill="none"
        stroke={season.thread}
        strokeOpacity={0.35}
        strokeWidth={1.5}
      />
      <text
        x={W - 48}
        y={H - 40}
        fill={season.accent}
        style={sans}
        fontSize={12}
        letterSpacing={2}
        textAnchor="end"
        opacity={0.7}
      >
        UNIVERSITY OF NIGERIA, NSUKKA
      </text>
    </svg>
  );
}
