import { useId } from "react";

/**
 * The JHTS emblem, redrawn from the journal's flyer: a carved mask between
 * patterned leaves over an open book, a quill rising through a forest-green
 * ring with a gold sweep. `wordmark` adds "JHTS" inside the ring (omit it at
 * favicon sizes). Colours are fixed brand colours on a cream disc, so the
 * emblem reads the same on light pages, dark pages and green bands.
 */
export function Emblem({
  className,
  wordmark = true,
  title = "JHTS emblem",
}: {
  className?: string;
  wordmark?: boolean;
  /** Accessible name; pass "" when a visible name sits beside it. */
  title?: string;
}) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const u = (n: string) => `${n}-${id}`;
  return (
    <svg
      viewBox="0 0 240 240"
      className={className}
      role={title ? "img" : undefined}
      aria-label={title || undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      <defs>
        <linearGradient id={u("wood")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5a3a24" />
          <stop offset="0.55" stopColor="#3a2416" />
          <stop offset="1" stopColor="#24160d" />
        </linearGradient>
        <linearGradient id={u("gold")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f0cf5a" />
          <stop offset="1" stopColor="#c6981c" />
        </linearGradient>
        <linearGradient id={u("bronze")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8b5a2b" />
          <stop offset="1" stopColor="#5e3a1c" />
        </linearGradient>
        {/* The carving on the leaves: rows of gold chevrons and lozenges */}
        <pattern id={u("carving")} width="9" height="9" patternUnits="userSpaceOnUse">
          <rect width="9" height="9" fill={`url(#${u("bronze")})`} />
          <path d="M0 4.5 L4.5 1 L9 4.5" fill="none" stroke="#e1b521" strokeWidth="1" />
          <path d="M4.5 6 L6.3 7.8 L4.5 9.6 L2.7 7.8Z" fill="#e1b521" />
        </pattern>
        <clipPath id={u("disc")}>
          <circle cx="120" cy="118" r="95" />
        </clipPath>
      </defs>

      <circle cx="120" cy="118" r="102" fill="#faf7ee" />
      <path d="M97 16 A102 102 0 1 0 143 16" fill="none" stroke="#14452f" strokeWidth="13" strokeLinecap="round" />
      <path
        d="M222 128 A112 112 0 0 1 150 226"
        fill="none"
        stroke={`url(#${u("gold")})`}
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <path d="M18 128 A112 112 0 0 0 52 204" fill="none" stroke="#e1b521" strokeWidth="2" strokeLinecap="round" />

      <g clipPath={`url(#${u("disc")})`}>
        <path
          d="M114 62 C98 54 78 56 72 70 C66 86 68 116 78 140 L114 146Z"
          fill={`url(#${u("carving")})`}
          stroke="#3a2416"
          strokeWidth="1.4"
        />
        <path
          d="M126 62 C142 54 162 56 168 70 C174 86 172 116 162 140 L126 146Z"
          fill={`url(#${u("carving")})`}
          stroke="#3a2416"
          strokeWidth="1.4"
        />
        <path
          d="M56 144 C82 134 104 137 120 150 C136 137 158 134 184 144 L184 155 C158 146 136 149 120 162 C104 149 82 146 56 155Z"
          fill="#14452f"
        />
        <path d="M62 142 C84 134 104 137 120 148 L120 155 C104 145 84 143 62 150Z" fill="#faf7ee" />
        <path d="M178 142 C156 134 136 137 120 148 L120 155 C136 145 156 143 178 150Z" fill="#faf7ee" />
        <path
          d="M120 54 C105 54 98 67 98 86 C98 110 105 131 120 144 C135 131 142 110 142 86 C142 67 135 54 120 54Z"
          fill={`url(#${u("wood")})`}
          stroke="#1d120a"
          strokeWidth="1.2"
        />
        <path d="M103 84 C110 79 130 79 137 84" fill="none" stroke="#e1b521" strokeWidth="1.5" />
        <path d="M104 92 C109 88 114 88 117 92 C114 95 109 95 104 92Z" fill="#e1b521" />
        <path d="M136 92 C131 88 126 88 123 92 C126 95 131 95 136 92Z" fill="#e1b521" />
        <path d="M120 66 L120 112" stroke={`url(#${u("gold")})`} strokeWidth="2.8" strokeLinecap="round" />
        <path d="M115.5 112 C117.5 115.5 122.5 115.5 124.5 112" fill="none" stroke="#e1b521" strokeWidth="1.5" />
        <path d="M114 124 C117.5 121.5 122.5 121.5 126 124 C122.5 127 117.5 127 114 124Z" fill="#e1b521" />
        <path
          d="M105 102 L105 111 M109 104 L109 113 M135 102 L135 111 M131 104 L131 113"
          stroke="#8b5a2b"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      </g>

      <path
        d="M120 4 C129 20 129 40 120 58 C111 40 111 20 120 4Z"
        fill={`url(#${u("gold")})`}
        stroke="#8b5a2b"
        strokeWidth="1"
      />
      <path d="M120 8 L120 56" stroke="#5e3a1c" strokeWidth="1.1" />

      {wordmark && (
        <text
          x="120"
          y="190"
          textAnchor="middle"
          fontWeight="800"
          fontSize="29"
          fill="#14452f"
          letterSpacing="1.5"
          style={{ fontFamily: "var(--font-display), Georgia, serif" }}
        >
          JHTS
        </text>
      )}
    </svg>
  );
}
