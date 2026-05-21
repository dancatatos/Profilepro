import { getThemeConfig, type ThemeConfig } from "@/lib/themes";
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

/** Tailwind classes for a public-profile CTA button.
 *  CTA buttons have their own accent/style; theme overrides via CSS vars. */
export function ctaButtonClasses(button: CTAButton): string {
  if (button.style === "outline") {
    return "border border-white/20 bg-white/[0.04] text-white";
  }
  if (button.style === "gradient") {
    switch (button.accent) {
      case "jade":
        return "bg-jade-gradient text-ink-950";
      case "gold":
        return "bg-linear-to-r from-gold-300 to-gold-500 text-ink-950";
      case "white":
        return "bg-white text-ink-950";
      default:
        return "bg-brand-gradient text-white";
    }
  }
  // solid
  switch (button.accent) {
    case "jade":
      return "bg-jade-500 text-ink-950";
    case "gold":
      return "bg-gold-400 text-ink-950";
    case "white":
      return "bg-white text-ink-950";
    default:
      return "bg-electric-500 text-white";
  }
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
