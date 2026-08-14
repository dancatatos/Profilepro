import type {
  TextAlign,
  TextColorToken,
  TextFontFamily,
  TextFontSize,
  TextFontWeight,
  TextLetterSpacing,
  TextLineHeight,
  TextStyle,
} from "@/types";
import type { CSSProperties } from "react";

/* ─────────────────────────────────────────────────────────────
   Typography resolver + CSS conversion
   ───────────────────────────────────────────────────────────────
   Two-layer merge: section-level default (SectionBase.textStyle)
   is the baseline; per-element override wins on each field where
   set. Unset values inherit from the theme (which the renderer
   controls via CSS custom properties).

   The renderer doesn't need to know about theme fallbacks — this
   module returns EITHER a concrete CSS value OR undefined, and
   undefined causes the element to inherit whatever the theme
   already set on it.
   ───────────────────────────────────────────────────────────── */

/**
 * Merge a section-level style with an optional per-element override.
 * Element wins per-field; unset fields fall through to the section
 * default; if both are unset for a field, that field ends up
 * undefined so the theme still wins downstream.
 */
export function resolveTextStyle(
  sectionStyle: TextStyle | undefined,
  elementStyle: TextStyle | undefined,
): TextStyle | undefined {
  if (!sectionStyle && !elementStyle) return undefined;
  return {
    ...(sectionStyle ?? {}),
    ...(elementStyle ?? {}),
    /* customColor is a paired field with color — carry it only when
       the winning `color` is "custom" so an override that switches to
       "accent" doesn't leak the section-level custom hex. */
    customColor:
      (elementStyle?.color ?? sectionStyle?.color) === "custom"
        ? elementStyle?.customColor ?? sectionStyle?.customColor
        : undefined,
  };
}

/* ─────────────────────────────────────────────────────────────
   Font family → CSS var mapping. Every entry maps to a value that
   works as a real font-family string; "theme" returns undefined so
   the element keeps whatever the theme set on it.
   ───────────────────────────────────────────────────────────── */
const FONT_FAMILY_CSS: Record<TextFontFamily, string | undefined> = {
  theme: undefined,
  inter: "var(--font-inter)",
  manrope: "var(--tp-font-manrope)",
  poppins: "var(--tp-font-poppins)",
  "space-grotesk": "var(--tp-font-space-grotesk)",
  playfair: "var(--tp-font-playfair)",
  "dm-serif": "var(--tp-font-dm-serif)",
  bebas: "var(--tp-font-bebas)",
  anton: "var(--tp-font-anton)",
};

/**
 * Font-size base varies per element role (a Hero headline "L" is
 * bigger than a Benefits item "L"). Callers pass their element's
 * base px value; the multiplier scales from there.
 */
const SIZE_MULT: Record<TextFontSize, number | undefined> = {
  theme: undefined,
  xs: 0.72,
  sm: 0.86,
  md: 1.0,
  lg: 1.18,
  xl: 1.4,
};

const WEIGHT_CSS: Record<TextFontWeight, number | undefined> = {
  theme: undefined,
  light: 300,
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  black: 900,
};

const ALIGN_CSS: Record<TextAlign, CSSProperties["textAlign"] | undefined> = {
  theme: undefined,
  left: "left",
  center: "center",
  right: "right",
};

const LETTER_CSS: Record<TextLetterSpacing, string | undefined> = {
  theme: undefined,
  tight: "-0.02em",
  normal: "0em",
  wide: "0.04em",
  wider: "0.08em",
};

const LINE_CSS: Record<TextLineHeight, number | string | undefined> = {
  theme: undefined,
  tight: 1.05,
  snug: 1.2,
  normal: 1.4,
  relaxed: 1.6,
};

/**
 * Map a semantic color token to the CSS var the profile theme
 * already exposes. `custom` returns the raw customColor string.
 * `theme` returns undefined so the element inherits whatever the
 * theme set (usually `var(--tp-text)` for primary text).
 */
function colorFor(
  token: TextColorToken | undefined,
  custom: string | undefined,
): string | undefined {
  if (!token || token === "theme") return undefined;
  switch (token) {
    case "primary":
      return "var(--tp-text)";
    case "secondary":
      return "var(--tp-text2)";
    case "muted":
      return "var(--tp-text3)";
    case "accent":
      return "var(--tp-accent)";
    case "white":
      return "#FFFFFF";
    case "black":
      return "#000000";
    case "custom":
      return custom || undefined;
  }
}

/**
 * Convert a resolved TextStyle into a React inline-style object the
 * renderer can spread onto its element. Fields that resolve to
 * undefined stay off the object so the element cleanly inherits
 * theme defaults.
 *
 * `baseFontSize` — the element's default size in px (e.g. a Hero
 * headline passes ~48). The size multiplier scales from this base so
 * the same "L" preset produces bigger text on a headline than on a
 * FAQ answer.
 */
export function textStyleToCss(
  style: TextStyle | undefined,
  baseFontSize?: number,
): CSSProperties | undefined {
  if (!style) return undefined;

  const out: CSSProperties = {};

  const family = style.fontFamily && FONT_FAMILY_CSS[style.fontFamily];
  if (family) out.fontFamily = family;

  if (style.fontSize && style.fontSize !== "theme" && baseFontSize) {
    const mult = SIZE_MULT[style.fontSize];
    if (mult) out.fontSize = `${Math.round(baseFontSize * mult)}px`;
  }

  const weight = style.fontWeight && WEIGHT_CSS[style.fontWeight];
  if (weight) out.fontWeight = weight;

  const color = colorFor(style.color, style.customColor);
  if (color) out.color = color;

  const align = style.align && ALIGN_CSS[style.align];
  if (align) out.textAlign = align;

  if (style.italic) out.fontStyle = "italic";
  if (style.underline) out.textDecoration = "underline";

  const letter = style.letterSpacing && LETTER_CSS[style.letterSpacing];
  if (letter) out.letterSpacing = letter;

  const line = style.lineHeight && LINE_CSS[style.lineHeight];
  if (line !== undefined) out.lineHeight = line;

  return Object.keys(out).length > 0 ? out : undefined;
}

/**
 * Human-readable labels for the font picker. Kept together with the
 * map so any font addition/removal is a single-file edit.
 */
export const FONT_FAMILY_OPTIONS: {
  value: TextFontFamily;
  label: string;
  category: "sans" | "serif" | "display";
}[] = [
  { value: "theme", label: "Theme default", category: "sans" },
  { value: "inter", label: "Inter", category: "sans" },
  { value: "manrope", label: "Manrope", category: "sans" },
  { value: "poppins", label: "Poppins", category: "sans" },
  { value: "space-grotesk", label: "Space Grotesk", category: "sans" },
  { value: "playfair", label: "Playfair Display", category: "serif" },
  { value: "dm-serif", label: "DM Serif Display", category: "serif" },
  { value: "bebas", label: "Bebas Neue", category: "display" },
  { value: "anton", label: "Anton", category: "display" },
];

/** Small helper for the font-family dropdown preview swatch. */
export function fontFamilyCssVar(
  family: TextFontFamily | undefined,
): string | undefined {
  return family ? FONT_FAMILY_CSS[family] : undefined;
}
