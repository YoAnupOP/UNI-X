// components/Logo.tsx
// UNI-X Brand Logo — Final Version
// Usage:
//   <Logo />                  → full lockup (mark + wordmark), default size
//   <Logo variant="mark" />   → square mark only (sidebar collapsed, favicon)
//   <Logo size="sm" />        → small (navbar)
//   <Logo size="lg" />        → large (landing hero, auth pages)
//   <Logo light />            → for light backgrounds

import React from "react";

type LogoProps = {
  variant?: "full" | "mark";
  size?: "sm" | "md" | "lg";
  light?: boolean;
  className?: string;
};

const sizes = {
  sm: { mark: 34, fontSize: 20, gap: 10, pillW: 8, pillH: 3.5, pillR: 1.5, pillOffsetY: 11, xUnderW: 12, xUnderH: 2.5, xUnderR: 1.25, xUnderOffsetY: 22 },
  md: { mark: 44, fontSize: 26, gap: 12, pillW: 10, pillH: 4, pillR: 2, pillOffsetY: 14, xUnderW: 15, xUnderH: 3, xUnderR: 1.5, xUnderOffsetY: 28 },
  lg: { mark: 60, fontSize: 38, gap: 16, pillW: 13, pillH: 5, pillR: 2.5, pillOffsetY: 21, xUnderW: 22, xUnderH: 4, xUnderR: 2, xUnderOffsetY: 42 },
};

export function Logo({ variant = "full", size = "md", light = false, className = "" }: LogoProps) {
  const s = sizes[size];
  const textColor = light ? "#09090B" : "#F4F4F5";
  const purple = "#8B5CF6";

  const Mark = () => (
    <svg
      width={s.mark}
      height={s.mark}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <rect width="48" height="48" rx="12" fill={purple} />
      {/* U arc */}
      <path
        d="M13 12 L13 27 Q13 36 24 36 Q35 36 35 27 L35 12"
        fill="none"
        stroke="white"
        strokeWidth="3.8"
        strokeLinecap="round"
      />
      {/* Slash */}
      <line
        x1="17" y1="15" x2="29" y2="28"
        stroke="white"
        strokeWidth="3.8"
        strokeLinecap="round"
        opacity="0.65"
      />
      {/* Two nodes — left white, right white (both people) */}
      <circle cx="13" cy="11" r="2.8" fill="white" />
      <circle cx="35" cy="11" r="2.8" fill="white" />
    </svg>
  );

  if (variant === "mark") {
    return (
      <span className={className} aria-label="UNI-X">
        <Mark />
      </span>
    );
  }

  return (
    <span
      className={className}
      style={{ display: "inline-flex", alignItems: "center", gap: s.gap, userSelect: "none" }}
      aria-label="UNI-X University Xplore"
    >
      <Mark />
      {/* Wordmark */}
      <span style={{ display: "inline-flex", alignItems: "center", lineHeight: 1, position: "relative" }}>
        {/* UNI */}
        <span
          style={{
            fontFamily: "'Syne', system-ui, sans-serif",
            fontWeight: 900,
            fontSize: s.fontSize,
            letterSpacing: "-0.05em",
            color: textColor,
            lineHeight: 1,
          }}
        >
          UNI
        </span>

        {/* Hyphen pill */}
        <span
          style={{
            display: "inline-block",
            width: s.pillW,
            height: s.pillH,
            borderRadius: s.pillR,
            background: purple,
            margin: `0 ${Math.round(s.gap * 0.35)}px`,
            flexShrink: 0,
            alignSelf: "center",
            marginBottom: Math.round(s.fontSize * 0.08),
          }}
          aria-hidden="true"
        />

        {/* X + underline */}
        <span style={{ position: "relative", display: "inline-block" }}>
          <span
            style={{
              fontFamily: "'Syne', system-ui, sans-serif",
              fontWeight: 900,
              fontSize: s.fontSize,
              letterSpacing: "-0.05em",
              color: textColor,
              lineHeight: 1,
            }}
          >
            X
          </span>
          <span
            style={{
              position: "absolute",
              bottom: -Math.round(s.fontSize * 0.12),
              left: 0,
              right: 0,
              height: s.xUnderH,
              background: purple,
              borderRadius: s.xUnderR,
            }}
            aria-hidden="true"
          />
        </span>
      </span>
    </span>
  );
}

export default Logo;
