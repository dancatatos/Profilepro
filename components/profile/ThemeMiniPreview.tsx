"use client";

import type { ThemeConfig } from "@/lib/themes";

/**
 * Faithful miniature render of a theme. Instead of a flat colour swatch,
 * this draws the real background, font, button shape, card style and
 * accent colours — so the picker previews exactly what a theme looks
 * like when applied to a live profile.
 */
export function ThemeMiniPreview({ theme }: { theme: ThemeConfig }) {
  const v = theme.vars;
  const hasBtnBorder = !!v.btnBorder && v.btnBorder !== "transparent";
  const glowy =
    theme.effects.includes("glow") ||
    theme.effects.includes("neon") ||
    theme.effects.includes("aurora");

  return (
    <div
      className="absolute inset-0 flex flex-col items-center"
      style={{
        background: theme.background,
        fontFamily: theme.fontFamily,
        padding: "12% 14% 0",
      }}
    >
      {/* Avatar */}
      <div
        style={{
          height: "17%",
          aspectRatio: "1 / 1",
          borderRadius: "999px",
          background: v.accent,
          flexShrink: 0,
          boxShadow: glowy
            ? `0 0 0 2.5px ${v.avatarRing}, 0 0 13px 1px ${v.accent}`
            : `0 0 0 2.5px ${v.avatarRing}`,
        }}
      />

      {/* Display name */}
      <div
        style={{
          marginTop: "7%",
          height: "5%",
          width: "60%",
          borderRadius: "999px",
          background: v.text,
          flexShrink: 0,
        }}
      />

      {/* Headline / accent line */}
      <div
        style={{
          marginTop: "3.5%",
          height: "3.2%",
          width: "44%",
          borderRadius: "999px",
          background: v.accent,
          flexShrink: 0,
          boxShadow: theme.effects.includes("neon")
            ? `0 0 8px ${v.accent}`
            : "none",
        }}
      />

      {/* Buttons — the most theme-distinctive element */}
      {[0, 1].map((i) => (
        <div
          key={i}
          style={{
            marginTop: i === 0 ? "9%" : "4.5%",
            height: "10%",
            width: "100%",
            background: v.btn,
            borderRadius: v.btnRadius,
            border: hasBtnBorder ? `1.5px solid ${v.btnBorder}` : "none",
            flexShrink: 0,
          }}
        />
      ))}

      {/* Section card */}
      <div
        style={{
          marginTop: "4.5%",
          height: "13%",
          width: "100%",
          background: v.card,
          border: `1px solid ${v.border}`,
          borderRadius: v.cardRadius,
          flexShrink: 0,
        }}
      />
    </div>
  );
}
