import { getThemeConfig } from "@/lib/themes";
import type { CTAButton, ProfileTheme, ThemeId } from "@/types";

/** Get full ThemeConfig for the new engine */
export { getThemeConfig } from "@/lib/themes";

/** Legacy: get a ProfileTheme-shaped object for backward compat */
export function getTheme(id: ThemeId): ProfileTheme {
  const tc = getThemeConfig(id);
  return {
    id: tc.id,
    name: tc.name,
    background: tc.background,
    accent: tc.accent,
    buttonStyle: tc.vars.btnBorder === "transparent" ? "solid" : "outline",
  };
}

/* Per-accent colour map. Each entry returns the raw bg + text for
   the "solid" base of that colour. Used by ctaButtonClasses below
   to compose solid + ghost + outline + pressed variants from one
   source of truth. */
const ACCENT_SOLID: Record<NonNullable<CTAButton["accent"]>, string> = {
  blue: "bg-electric-500 text-white",
  jade: "bg-jade-500 text-ink-950",
  gold: "bg-gold-400 text-ink-950",
  white: "bg-white text-ink-950",
  purple: "bg-[#8B5CF6] text-white",
  pink: "bg-[#EC4899] text-white",
  mint: "bg-[#10B981] text-white",
  coral: "bg-[#FF6B6B] text-white",
  navy: "bg-[#1E3A5F] text-white",
  charcoal: "bg-[#1F1F1F] text-white",
};

/* Per-accent gradient pairs for the "gradient" style. */
const ACCENT_GRADIENT: Record<NonNullable<CTAButton["accent"]>, string> = {
  blue: "bg-brand-gradient text-white",
  jade: "bg-jade-gradient text-ink-950",
  gold: "bg-linear-to-r from-gold-300 to-gold-500 text-ink-950",
  white: "bg-white text-ink-950",
  purple: "bg-[linear-gradient(135deg,#A855F7_0%,#6B46C1_100%)] text-white",
  pink: "bg-[linear-gradient(135deg,#F472B6_0%,#DB2777_100%)] text-white",
  mint: "bg-[linear-gradient(135deg,#34D399_0%,#059669_100%)] text-white",
  coral: "bg-[linear-gradient(135deg,#FF8E8E_0%,#E84A5F_100%)] text-white",
  navy: "bg-[linear-gradient(135deg,#3B5C8F_0%,#1E3A5F_100%)] text-white",
  charcoal: "bg-[linear-gradient(135deg,#374151_0%,#0A0A0A_100%)] text-white",
};

/* Per-accent border colour for the "outline" + "ghost" styles. */
const ACCENT_BORDER: Record<NonNullable<CTAButton["accent"]>, string> = {
  blue: "border-electric-500 text-electric-300",
  jade: "border-jade-500 text-jade-300",
  gold: "border-gold-400 text-gold-300",
  white: "border-white text-white",
  purple: "border-[#8B5CF6] text-[#A855F7]",
  pink: "border-[#EC4899] text-[#F472B6]",
  mint: "border-[#10B981] text-[#34D399]",
  coral: "border-[#FF6B6B] text-[#FF6B6B]",
  navy: "border-[#1E3A5F] text-[#3B5C8F]",
  charcoal: "border-[#1F1F1F] text-[#374151]",
};

/* Hover-effect classes layered on top of the style/colour base. */
const HOVER_EFFECT: Record<NonNullable<CTAButton["hoverEffect"]>, string> = {
  none: "",
  glow: "hover:shadow-[0_0_30px_rgba(255,255,255,0.35)]",
  shimmer:
    "relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:bg-[linear-gradient(110deg,transparent_25%,rgba(255,255,255,0.45)_50%,transparent_75%)] hover:before:translate-x-full before:transition-transform before:duration-700",
  lift: "hover:-translate-y-0.5 hover:shadow-lg transition-transform",
};

/** Tailwind classes for a public-profile CTA button.
 *  CTA buttons have their own accent/style; theme overrides via CSS vars.
 *  Returns the FULL composed class string (base style + hover effect). */
export function ctaButtonClasses(button: CTAButton): string {
  const accent = button.accent ?? "blue";
  const style = button.style ?? "solid";
  const hover = button.hoverEffect ?? "none";
  const hoverCls = HOVER_EFFECT[hover];

  /* Compose the visual base from the style. Each branch returns the
     colour + shape classes; hover is appended at the end. */
  let base = "";
  switch (style) {
    case "outline":
      base = `border bg-transparent ${ACCENT_BORDER[accent]}`;
      break;
    case "gradient":
      base = ACCENT_GRADIENT[accent];
      break;
    case "pill":
      /* Tall rounded-full pill with a softer shadow. */
      base = `${ACCENT_SOLID[accent]} rounded-full shadow-md`;
      break;
    case "sharp":
      /* Zero-radius brutalist with a hard shadow. */
      base = `${ACCENT_SOLID[accent]} !rounded-none border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,1)]`;
      break;
    case "pressed":
      /* Inset 3D-pressed look via inset box-shadow. */
      base = `${ACCENT_SOLID[accent]} shadow-[inset_0_-3px_0_rgba(0,0,0,0.25),0_2px_0_rgba(255,255,255,0.10)]`;
      break;
    case "ghost":
      /* Transparent fill, accent-tinted hover. */
      base = `bg-transparent ${ACCENT_BORDER[accent]} hover:bg-white/10`;
      break;
    case "soft":
      /* Low-saturation soft chip — accent at 15% alpha. */
      base = `${ACCENT_BORDER[accent].replace("border-", "bg-").replace(" text-", "/15 text-")} border-none`;
      break;
    case "solid":
    default:
      base = ACCENT_SOLID[accent];
      break;
  }

  return `${base} ${hoverCls}`.trim();
}

/** Accent text colour for headings on the public profile. */
export function accentText(accent: ProfileTheme["accent"]): string {
  switch (accent) {
    case "jade":
      return "text-jade-400";
    case "gold":
      return "text-gold-300";
    case "white":
      return "text-white";
    default:
      return "text-electric-400";
  }
}
