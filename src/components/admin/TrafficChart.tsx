"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type TrafficPoint = { day: string; views: number; downloads: number };

const H = 240;
const PAD = { top: 16, right: 56, bottom: 28, left: 44 };

/** 0, 5, 10… style ticks with a clean top. */
function niceTicks(max: number, count = 4): number[] {
  if (max <= 0) return [0, 1];
  const raw = max / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const top = Math.ceil(max / step) * step;
  return Array.from({ length: Math.round(top / step) + 1 }, (_, i) => Math.round(i * step * 100) / 100);
}

const fmtDay = (d: string, long = false) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: long ? "long" : "short",
    ...(long ? { year: "numeric" } : {}),
    timeZone: "UTC",
  }).format(new Date(`${d}T12:00:00Z`));
const fmtN = (n: number) => new Intl.NumberFormat("en-GB").format(n);

/**
 * Views (line) and downloads (columns) over time on one count axis. Shape is
 * the second encoding beside colour; a legend and end labels name the series,
 * the crosshair tooltip reads both at any day (pointer or arrow keys), and
 * the page offers the same numbers as a table.
 */
export function TrafficChart({ points }: { points: TrafficPoint[] }) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(720);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(300, e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const geo = useMemo(() => {
    const max = Math.max(1, ...points.map((p) => Math.max(p.views, p.downloads)));
    const ticks = niceTicks(max);
    const top = ticks.at(-1)!;
    const innerW = width - PAD.left - PAD.right;
    const innerH = H - PAD.top - PAD.bottom;
    const band = innerW / Math.max(1, points.length);
    const x = (i: number) => PAD.left + band * i + band / 2;
    const y = (v: number) => PAD.top + innerH - (v / top) * innerH;
    const barW = Math.max(2, Math.min(24, band - 2));
    const line = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.views).toFixed(1)}`).join("");
    return { ticks, x, y, band, barW, line, innerW };
  }, [points, width]);

  if (!points.length)
    return <p className="text-muted py-10 text-center text-[0.9rem]">No views or downloads in this period yet.</p>;

  const last = points.length - 1;
  const labelEvery = Math.ceil(points.length / Math.max(2, Math.floor(geo.innerW / 90)));
  const h = hover != null ? points[hover] : null;
  const bar = (i: number, v: number) => {
    if (v <= 0) return null;
    const x0 = geo.x(i) - geo.barW / 2;
    const y0 = geo.y(v);
    const base = geo.y(0);
    const r = Math.min(4, geo.barW / 2, base - y0);
    // Rounded data end, square at the baseline.
    return `M${x0},${base}V${y0 + r}Q${x0},${y0} ${x0 + r},${y0}H${x0 + geo.barW - r}Q${x0 + geo.barW},${y0} ${x0 + geo.barW},${y0 + r}V${base}Z`;
  };

  return (
    <div>
      <ul className="mb-3 flex flex-wrap gap-5 text-[0.84rem]" aria-label="Legend">
        <li className="flex items-center gap-2">
          <svg width="18" height="8" aria-hidden="true">
            <line x1="1" y1="4" x2="17" y2="4" stroke="var(--chart-views)" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Views
        </li>
        <li className="flex items-center gap-2">
          <svg width="10" height="12" aria-hidden="true">
            <rect x="1" y="1" width="8" height="11" rx="2" fill="var(--chart-downloads)" />
          </svg>
          Downloads
        </li>
      </ul>
      <div ref={box} className="relative">
        <svg
          width={width}
          height={H}
          role="img"
          aria-label={`Views and downloads per day, ${fmtDay(points[0].day, true)} to ${fmtDay(points[last].day, true)}. The table below lists every value.`}
          tabIndex={0}
          className="focus-visible:outline-thread block outline-none focus-visible:outline-2"
          onPointerMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            const i = Math.round((e.clientX - r.left - PAD.left - geo.band / 2) / geo.band);
            setHover(Math.min(last, Math.max(0, i)));
          }}
          onPointerLeave={() => setHover(null)}
          onBlur={() => setHover(null)}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") setHover((v) => Math.min(last, (v ?? -1) + 1));
            else if (e.key === "ArrowLeft") setHover((v) => Math.max(0, (v ?? last + 1) - 1));
            else if (e.key === "Escape") setHover(null);
            else return;
            e.preventDefault();
          }}
        >
          {geo.ticks.map((t) => (
            <g key={t}>
              <line
                x1={PAD.left}
                x2={width - PAD.right}
                y1={geo.y(t)}
                y2={geo.y(t)}
                stroke="var(--rule)"
                strokeWidth="1"
              />
              <text
                x={PAD.left - 8}
                y={geo.y(t)}
                dy="0.32em"
                textAnchor="end"
                fontSize="11"
                fill="var(--fg-muted)"
                className="tabular"
              >
                {fmtN(t)}
              </text>
            </g>
          ))}
          {points.map((p, i) => (
            <path
              key={p.day}
              d={bar(i, p.downloads) ?? ""}
              fill="var(--chart-downloads)"
              opacity={hover == null || hover === i ? 1 : 0.55}
            />
          ))}
          <path
            d={geo.line}
            fill="none"
            stroke="var(--chart-views)"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <circle
            cx={geo.x(last)}
            cy={geo.y(points[last].views)}
            r="4"
            fill="var(--chart-views)"
            stroke="var(--surface)"
            strokeWidth="2"
          />
          <text
            x={geo.x(last) + 8}
            y={geo.y(points[last].views)}
            dy="0.32em"
            fontSize="11.5"
            fill="var(--fg)"
            className="tabular"
          >
            {fmtN(points[last].views)}
          </text>
          {points.map((p, i) =>
            i % labelEvery === 0 || i === last ? (
              <text
                key={`x${p.day}`}
                x={geo.x(i)}
                y={H - 8}
                textAnchor={i === 0 ? "start" : i === last ? "end" : "middle"}
                fontSize="11"
                fill="var(--fg-muted)"
              >
                {fmtDay(p.day)}
              </text>
            ) : null,
          )}
          {h && hover != null && (
            <g pointerEvents="none">
              <line
                x1={geo.x(hover)}
                x2={geo.x(hover)}
                y1={PAD.top}
                y2={geo.y(0)}
                stroke="var(--fg-muted)"
                strokeWidth="1"
              />
              <circle
                cx={geo.x(hover)}
                cy={geo.y(h.views)}
                r="4"
                fill="var(--chart-views)"
                stroke="var(--surface)"
                strokeWidth="2"
              />
            </g>
          )}
        </svg>
        {h && hover != null && (
          <div
            role="status"
            className="border-rule bg-surface pointer-events-none absolute top-2 z-10 min-w-[9.5rem] rounded-[3px] border px-3 py-2 text-[0.82rem] shadow-[0_12px_28px_-18px_rgb(21_19_15/0.6)]"
            style={geo.x(hover) > width / 2 ? { right: width - geo.x(hover) + 12 } : { left: geo.x(hover) + 12 }}
          >
            <p className="text-muted">{fmtDay(h.day, true)}</p>
            {(
              [
                ["Views", h.views, "var(--chart-views)"],
                ["Downloads", h.downloads, "var(--chart-downloads)"],
              ] as const
            ).map(([label, v, c]) => (
              <p key={label} className="mt-1 flex items-center gap-2">
                <span aria-hidden="true" className="inline-block h-0.5 w-3 rounded" style={{ background: c }} />
                <strong className="tabular font-semibold">{fmtN(v)}</strong>
                <span className="text-muted">{label}</span>
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
