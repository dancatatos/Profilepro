/* ============================================================
   Credibly — Advanced Theme Engine
   50 themes: 20 free + 30 premium
   Each theme injects CSS custom properties onto the profile wrapper.
   ============================================================ */

import type React from "react";
import type { ThemeId } from "@/types";

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  description: string;
  tier: "free" | "premium";
  categories: string[];
  colorScheme: "dark" | "light";
  background: string; // CSS background for the page
  fontFamily: string;
  effects: ThemeEffect[];
  previewGradient: string; // simplified swatch bg for picker
  vars: ThemeVars;
  // Legacy compat for CTAButton colour logic
  accent: "blue" | "jade" | "gold" | "white";
}

export type ThemeEffect =
  | "animated-gradient"
  | "glassmorphism"
  | "glow"
  | "neon"
  | "shimmer"
  | "aurora"
  | "particles"
  | "grain";

export interface ThemeVars {
  card: string;        // card/section background
  border: string;      // card border colour
  text: string;        // primary text
  text2: string;       // secondary text
  text3: string;       // muted text
  accent: string;      // headline / accent text colour
  btn: string;         // button background (CSS background shorthand)
  btnText: string;     // button label colour
  btnRadius: string;   // button border-radius
  btnBorder: string;   // button border (for outline/glass buttons)
  cardRadius: string;  // card border-radius
  marker: string;      // section title accent bar colour
  socialBg: string;    // social icon button background
  socialBorder: string;// social icon button border
  inputBg: string;     // form input background
  inputBorder: string; // form input border
  avatarRing: string;  // avatar ring / border colour
  shadow: string;      // card box-shadow
  successBg: string;   // lead form success banner bg
  successText: string; // lead form success text
  statCard: string;    // social proof stat card bg
  statBorder: string;  // social proof stat card border
}

/* ─────────────────────────────────────────────────────────────
   Shared defaults helpers
───────────────────────────────────────────────────────────── */

const DARK_BASE: ThemeVars = {
  card: "rgba(255,255,255,0.03)",
  border: "rgba(255,255,255,0.07)",
  text: "rgba(255,255,255,1)",
  text2: "rgba(255,255,255,0.65)",
  text3: "rgba(255,255,255,0.38)",
  accent: "#8fb0ff",
  btn: "linear-gradient(135deg,#2e6bff 0%,#1a52e0 100%)",
  btnText: "#ffffff",
  btnRadius: "0.875rem",
  btnBorder: "transparent",
  cardRadius: "1rem",
  marker: "#2e6bff",
  socialBg: "rgba(255,255,255,0.06)",
  socialBorder: "rgba(255,255,255,0.10)",
  inputBg: "rgba(255,255,255,0.04)",
  inputBorder: "rgba(255,255,255,0.10)",
  avatarRing: "rgba(255,255,255,0.15)",
  shadow: "0 4px 24px rgba(0,0,0,0.40)",
  successBg: "rgba(16,185,129,0.10)",
  successText: "#6ff2c6",
  statCard: "rgba(255,255,255,0.03)",
  statBorder: "rgba(255,255,255,0.07)",
};

const LIGHT_BASE: ThemeVars = {
  card: "rgba(255,255,255,0.85)",
  border: "rgba(0,0,0,0.08)",
  text: "rgba(15,23,42,1)",
  text2: "rgba(51,65,85,0.90)",
  text3: "rgba(100,116,139,0.80)",
  accent: "#2e6bff",
  btn: "linear-gradient(135deg,#2e6bff 0%,#1a52e0 100%)",
  btnText: "#ffffff",
  btnRadius: "0.875rem",
  btnBorder: "transparent",
  cardRadius: "1rem",
  marker: "#2e6bff",
  socialBg: "#f8fafc",
  socialBorder: "rgba(203,213,225,1)",
  inputBg: "#f8fafc",
  inputBorder: "rgba(203,213,225,1)",
  avatarRing: "rgba(46,107,255,0.25)",
  shadow: "0 1px 16px rgba(0,0,0,0.08)",
  successBg: "rgba(16,185,129,0.08)",
  successText: "#059669",
  statCard: "rgba(248,250,252,1)",
  statBorder: "rgba(226,232,240,1)",
};

const SANS = "ui-sans-serif, system-ui, -apple-system, sans-serif";
const MONO = "'SF Mono', 'Fira Code', 'Cascadia Code', monospace";
const ELEGANT = "'Cormorant Garamond', Georgia, 'Times New Roman', serif";

/* ─────────────────────────────────────────────────────────────
   THEME DEFINITIONS
───────────────────────────────────────────────────────────── */

export const THEME_CONFIGS: ThemeConfig[] = [

  /* ══════════════════════════════════════════════════════
     FREE DARK THEMES (existing IDs kept for compat)
  ══════════════════════════════════════════════════════ */

  {
    id: "midnight",
    name: "Midnight",
    description: "Elegant near-black. The classic.",
    tier: "free",
    categories: ["Dark Mode", "Minimal", "Professional"],
    colorScheme: "dark",
    background: "radial-gradient(120% 80% at 50% 0%,#16161d 0%,#0a0a0c 55%,#050507 100%)",
    fontFamily: SANS,
    effects: [],
    previewGradient: "radial-gradient(circle at 50% 0%,#16161d,#050507)",
    accent: "blue",
    vars: { ...DARK_BASE },
  },

  {
    id: "navy-glass",
    name: "Navy Glass",
    description: "Deep navy with a sharp, trust-building feel.",
    tier: "free",
    categories: ["Dark Mode", "Professional", "Corporate"],
    colorScheme: "dark",
    background: "radial-gradient(120% 80% at 50% 0%,#16294a 0%,#0a1322 55%,#060b16 100%)",
    fontFamily: SANS,
    effects: [],
    previewGradient: "radial-gradient(circle at 50% 0%,#16294a,#060b16)",
    accent: "blue",
    vars: {
      ...DARK_BASE,
      btn: "#2e6bff",
      btnRadius: "0.625rem",
      marker: "#5b8cff",
    },
  },

  {
    id: "emerald-lux",
    name: "Emerald Lux",
    description: "Organic luxury. Premium wellness vibes.",
    tier: "free",
    categories: ["Dark Mode", "Luxury", "Coach"],
    colorScheme: "dark",
    background: "radial-gradient(120% 80% at 50% 0%,#0b3b30 0%,#07140f 55%,#050707 100%)",
    fontFamily: SANS,
    effects: [],
    previewGradient: "radial-gradient(circle at 50% 0%,#0b3b30,#050707)",
    accent: "jade",
    vars: {
      ...DARK_BASE,
      accent: "#6ff2c6",
      btn: "linear-gradient(135deg,#2ee6a6 0%,#0b9468 100%)",
      btnText: "#050507",
      marker: "#10b981",
      avatarRing: "rgba(46,230,166,0.20)",
      successText: "#2ee6a6",
    },
  },

  {
    id: "gold-elite",
    name: "Gold Elite",
    description: "Wealth energy. Built for high earners.",
    tier: "free",
    categories: ["Dark Mode", "Luxury", "Business & Sales", "Network Marketing"],
    colorScheme: "dark",
    background: "radial-gradient(120% 80% at 50% 0%,#2a2418 0%,#14110a 55%,#080706 100%)",
    fontFamily: SANS,
    effects: [],
    previewGradient: "radial-gradient(circle at 50% 0%,#2a2418,#080706)",
    accent: "gold",
    vars: {
      ...DARK_BASE,
      accent: "#e3c081",
      btn: "linear-gradient(135deg,#e3c081 0%,#cda45e 100%)",
      btnText: "#080706",
      btnRadius: "0.625rem",
      marker: "#cda45e",
      avatarRing: "rgba(227,192,129,0.25)",
      border: "rgba(227,192,129,0.10)",
    },
  },

  {
    id: "pure-mono",
    name: "Pure Mono",
    description: "Zero distraction. Maximum credibility.",
    tier: "free",
    categories: ["Dark Mode", "Minimal", "Professional"],
    colorScheme: "dark",
    background: "radial-gradient(120% 80% at 50% 0%,#1c1c23 0%,#0f0f13 55%,#050507 100%)",
    fontFamily: SANS,
    effects: [],
    previewGradient: "radial-gradient(circle at 50% 0%,#1c1c23,#050507)",
    accent: "white",
    vars: {
      ...DARK_BASE,
      accent: "#e8eaf0",
      btn: "#ffffff",
      btnText: "#050507",
      btnRadius: "0.5rem",
      marker: "rgba(255,255,255,0.50)",
    },
  },

  {
    id: "vivid-purple",
    name: "Vivid Purple",
    description: "Bold. Confident. Built to stand out.",
    tier: "free",
    categories: ["Vibrant", "Influencer", "Creator"],
    colorScheme: "dark",
    background: "linear-gradient(180deg,#7c3aed 0%,#5b21b6 50%,#3b0764 100%)",
    fontFamily: SANS,
    effects: [],
    previewGradient: "linear-gradient(180deg,#7c3aed,#3b0764)",
    accent: "white",
    vars: {
      ...DARK_BASE,
      accent: "#e9d5ff",
      btn: "rgba(255,255,255,0.20)",
      btnBorder: "rgba(255,255,255,0.35)",
      btnRadius: "999px",
      marker: "#c084fc",
      socialBg: "rgba(255,255,255,0.12)",
      socialBorder: "rgba(255,255,255,0.20)",
      border: "rgba(255,255,255,0.12)",
      card: "rgba(255,255,255,0.08)",
    },
  },

  {
    id: "rose-vibe",
    name: "Rose Vibe",
    description: "Warm, confident, magnetic feminine energy.",
    tier: "free",
    categories: ["Vibrant", "Feminine", "Influencer", "Creator"],
    colorScheme: "dark",
    background: "linear-gradient(180deg,#ec4899 0%,#db2777 45%,#9d174d 100%)",
    fontFamily: SANS,
    effects: [],
    previewGradient: "linear-gradient(180deg,#ec4899,#9d174d)",
    accent: "white",
    vars: {
      ...DARK_BASE,
      accent: "#fce7f3",
      btn: "rgba(255,255,255,0.20)",
      btnBorder: "rgba(255,255,255,0.35)",
      btnRadius: "999px",
      marker: "#f9a8d4",
      socialBg: "rgba(255,255,255,0.12)",
      socialBorder: "rgba(255,255,255,0.20)",
      border: "rgba(255,255,255,0.12)",
      card: "rgba(255,255,255,0.08)",
    },
  },

  {
    id: "deep-red",
    name: "Deep Red",
    description: "Powerful energy. Recruiter's weapon.",
    tier: "free",
    categories: ["Vibrant", "Network Marketing", "Masculine"],
    colorScheme: "dark",
    background: "linear-gradient(180deg,#dc2626 0%,#991b1b 50%,#450a0a 100%)",
    fontFamily: SANS,
    effects: [],
    previewGradient: "linear-gradient(180deg,#dc2626,#450a0a)",
    accent: "gold",
    vars: {
      ...DARK_BASE,
      accent: "#fca5a5",
      btn: "rgba(255,255,255,0.15)",
      btnBorder: "rgba(255,255,255,0.30)",
      btnRadius: "0.75rem",
      marker: "#f87171",
      border: "rgba(255,255,255,0.10)",
      card: "rgba(255,255,255,0.06)",
    },
  },

  {
    id: "sky-blue",
    name: "Sky Blue",
    description: "Trustworthy. Professional. Open.",
    tier: "free",
    categories: ["Vibrant", "Professional", "Coach"],
    colorScheme: "dark",
    background: "linear-gradient(180deg,#0ea5e9 0%,#0284c7 50%,#0c4a6e 100%)",
    fontFamily: SANS,
    effects: [],
    previewGradient: "linear-gradient(180deg,#0ea5e9,#0c4a6e)",
    accent: "white",
    vars: {
      ...DARK_BASE,
      accent: "#e0f2fe",
      btn: "rgba(255,255,255,0.20)",
      btnBorder: "rgba(255,255,255,0.35)",
      btnRadius: "999px",
      marker: "#7dd3fc",
      socialBg: "rgba(255,255,255,0.12)",
      socialBorder: "rgba(255,255,255,0.20)",
      border: "rgba(255,255,255,0.12)",
      card: "rgba(255,255,255,0.08)",
    },
  },

  {
    id: "warm-coral",
    name: "Warm Coral",
    description: "Energetic warmth. Creator economy energy.",
    tier: "free",
    categories: ["Vibrant", "Creator", "Influencer"],
    colorScheme: "dark",
    background: "linear-gradient(180deg,#f97316 0%,#ea580c 50%,#7c2d12 100%)",
    fontFamily: SANS,
    effects: [],
    previewGradient: "linear-gradient(180deg,#f97316,#7c2d12)",
    accent: "white",
    vars: {
      ...DARK_BASE,
      accent: "#ffedd5",
      btn: "rgba(255,255,255,0.20)",
      btnBorder: "rgba(255,255,255,0.30)",
      btnRadius: "999px",
      marker: "#fdba74",
      border: "rgba(255,255,255,0.10)",
      card: "rgba(255,255,255,0.07)",
    },
  },

  {
    id: "purple-dusk",
    name: "Purple Dusk",
    description: "Mystical authority. Premium influencer.",
    tier: "free",
    categories: ["Dark Mode", "Luxury", "Influencer"],
    colorScheme: "dark",
    background: "radial-gradient(120% 80% at 50% 0%,#4c1d95 0%,#2e1065 55%,#0f0a1a 100%)",
    fontFamily: SANS,
    effects: [],
    previewGradient: "radial-gradient(circle at 50% 0%,#4c1d95,#0f0a1a)",
    accent: "white",
    vars: {
      ...DARK_BASE,
      accent: "#ddd6fe",
      btn: "rgba(255,255,255,0.12)",
      btnBorder: "rgba(167,139,250,0.40)",
      btnRadius: "0.875rem",
      marker: "#a78bfa",
      border: "rgba(167,139,250,0.12)",
    },
  },

  /* ══════════════════════════════════════════════════════
     NEW FREE DARK THEMES
  ══════════════════════════════════════════════════════ */

  {
    id: "neon-dark",
    name: "Neon Dark",
    description: "Night city energy. Maximum visual impact.",
    tier: "free",
    categories: ["Dark Mode", "Vibrant", "Creator", "Gaming"],
    colorScheme: "dark",
    background: "radial-gradient(120% 80% at 50% 0%,#0d001f 0%,#050011 55%,#020009 100%)",
    fontFamily: SANS,
    effects: ["glow"],
    previewGradient: "radial-gradient(circle at 50% 0%,#0d001f,#020009)",
    accent: "white",
    vars: {
      ...DARK_BASE,
      accent: "#d946ef",
      btn: "linear-gradient(135deg,#d946ef 0%,#7c3aed 100%)",
      btnText: "#ffffff",
      btnRadius: "999px",
      marker: "#d946ef",
      border: "rgba(217,70,239,0.15)",
      card: "rgba(217,70,239,0.05)",
      avatarRing: "rgba(217,70,239,0.30)",
      socialBg: "rgba(217,70,239,0.08)",
      socialBorder: "rgba(217,70,239,0.20)",
      shadow: "0 4px 32px rgba(217,70,239,0.15)",
    },
  },

  {
    id: "carbon-pro",
    name: "Carbon Pro",
    description: "Charcoal fintech. Executive presence.",
    tier: "free",
    categories: ["Dark Mode", "Professional", "Corporate", "Masculine"],
    colorScheme: "dark",
    background: "linear-gradient(180deg,#1c1c1e 0%,#111111 55%,#0a0a0a 100%)",
    fontFamily: "'SF Pro Display', " + SANS,
    effects: [],
    previewGradient: "linear-gradient(180deg,#1c1c1e,#0a0a0a)",
    accent: "white",
    vars: {
      ...DARK_BASE,
      accent: "#e5e5e5",
      btn: "linear-gradient(135deg,#3a3a3c 0%,#2c2c2e 100%)",
      btnBorder: "rgba(255,255,255,0.12)",
      btnRadius: "0.5rem",
      cardRadius: "0.75rem",
      border: "rgba(255,255,255,0.06)",
      card: "rgba(255,255,255,0.04)",
      marker: "rgba(255,255,255,0.40)",
    },
  },

  {
    id: "tropical-pop",
    name: "Tropical Pop",
    description: "Vibrant energy. Party-starter aesthetic.",
    tier: "free",
    categories: ["Vibrant", "Creator", "Influencer"],
    colorScheme: "dark",
    background: "linear-gradient(135deg,#7c3aed 0%,#db2777 35%,#f97316 65%,#eab308 100%)",
    fontFamily: SANS,
    effects: [],
    previewGradient: "linear-gradient(135deg,#7c3aed,#db2777,#f97316)",
    accent: "white",
    vars: {
      ...DARK_BASE,
      accent: "#ffffff",
      btn: "rgba(255,255,255,0.20)",
      btnBorder: "rgba(255,255,255,0.40)",
      btnRadius: "999px",
      marker: "#ffffff",
      border: "rgba(255,255,255,0.15)",
      card: "rgba(255,255,255,0.10)",
      socialBg: "rgba(255,255,255,0.15)",
      socialBorder: "rgba(255,255,255,0.25)",
    },
  },

  {
    id: "aqua-energy",
    name: "Aqua Energy",
    description: "Fresh teal. Wellness and health brands.",
    tier: "free",
    categories: ["Vibrant", "Coach", "Affiliate"],
    colorScheme: "dark",
    background: "linear-gradient(180deg,#0891b2 0%,#0e7490 45%,#164e63 100%)",
    fontFamily: SANS,
    effects: [],
    previewGradient: "linear-gradient(180deg,#0891b2,#164e63)",
    accent: "white",
    vars: {
      ...DARK_BASE,
      accent: "#cffafe",
      btn: "rgba(255,255,255,0.20)",
      btnBorder: "rgba(255,255,255,0.30)",
      btnRadius: "999px",
      marker: "#67e8f9",
      border: "rgba(255,255,255,0.10)",
      card: "rgba(255,255,255,0.08)",
    },
  },

  {
    id: "candy-ui",
    name: "Candy UI",
    description: "Gen Z certified. Sweet and punchy.",
    tier: "free",
    categories: ["Vibrant", "Creator", "Influencer", "Aesthetic"],
    colorScheme: "dark",
    background: "linear-gradient(135deg,#f472b6 0%,#a855f7 50%,#3b82f6 100%)",
    fontFamily: SANS,
    effects: [],
    previewGradient: "linear-gradient(135deg,#f472b6,#a855f7,#3b82f6)",
    accent: "white",
    vars: {
      ...DARK_BASE,
      accent: "#fdf4ff",
      btn: "rgba(255,255,255,0.25)",
      btnBorder: "rgba(255,255,255,0.45)",
      btnRadius: "999px",
      marker: "#e879f9",
      border: "rgba(255,255,255,0.15)",
      card: "rgba(255,255,255,0.12)",
      socialBg: "rgba(255,255,255,0.15)",
      socialBorder: "rgba(255,255,255,0.25)",
    },
  },

  /* ══════════════════════════════════════════════════════
     FREE LIGHT THEMES
  ══════════════════════════════════════════════════════ */

  {
    id: "minimal-white",
    name: "Minimal White",
    description: "Apple-clean. Pure, polished credibility.",
    tier: "free",
    categories: ["Minimal", "Professional", "Aesthetic"],
    colorScheme: "light",
    background: "linear-gradient(180deg,#ffffff 0%,#f8fafc 100%)",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', " + SANS,
    effects: [],
    previewGradient: "linear-gradient(180deg,#ffffff,#f0f4f8)",
    accent: "blue",
    vars: {
      ...LIGHT_BASE,
      shadow: "0 2px 20px rgba(0,0,0,0.07)",
      cardRadius: "1.25rem",
      btn: "linear-gradient(135deg,#2e6bff 0%,#1a52e0 100%)",
    },
  },

  {
    id: "soft-gray-pro",
    name: "Soft Gray Pro",
    description: "LinkedIn polished. Trusted professional.",
    tier: "free",
    categories: ["Minimal", "Professional", "Corporate"],
    colorScheme: "light",
    background: "linear-gradient(180deg,#f1f5f9 0%,#e2e8f0 100%)",
    fontFamily: SANS,
    effects: [],
    previewGradient: "linear-gradient(180deg,#f1f5f9,#e2e8f0)",
    accent: "blue",
    vars: {
      ...LIGHT_BASE,
      card: "rgba(255,255,255,0.90)",
      border: "rgba(148,163,184,0.35)",
      btn: "#0f172a",
      btnRadius: "0.625rem",
      cardRadius: "0.875rem",
      marker: "#475569",
      socialBorder: "rgba(148,163,184,0.40)",
    },
  },

  {
    id: "mint-fresh",
    name: "Mint Fresh",
    description: "Clean SaaS energy. Startup founder look.",
    tier: "free",
    categories: ["Minimal", "Professional", "Aesthetic"],
    colorScheme: "light",
    background: "linear-gradient(180deg,#f0fdf4 0%,#dcfce7 100%)",
    fontFamily: SANS,
    effects: [],
    previewGradient: "linear-gradient(180deg,#f0fdf4,#d1fae5)",
    accent: "jade",
    vars: {
      ...LIGHT_BASE,
      text: "rgba(6,78,59,1)",
      text2: "rgba(6,95,70,0.85)",
      text3: "rgba(20,83,45,0.65)",
      accent: "#059669",
      btn: "linear-gradient(135deg,#10b981 0%,#059669 100%)",
      marker: "#10b981",
      avatarRing: "rgba(16,185,129,0.30)",
      card: "rgba(255,255,255,0.80)",
      border: "rgba(16,185,129,0.15)",
      inputBorder: "rgba(16,185,129,0.20)",
    },
  },

  {
    id: "cream-beige",
    name: "Cream Beige",
    description: "Lifestyle warmth. Influencer aesthetic.",
    tier: "free",
    categories: ["Aesthetic", "Feminine", "Creator", "Influencer"],
    colorScheme: "light",
    background: "linear-gradient(180deg,#fdf8f2 0%,#f5efe4 100%)",
    fontFamily: ELEGANT,
    effects: [],
    previewGradient: "linear-gradient(180deg,#fdf8f2,#f0e8d8)",
    accent: "gold",
    vars: {
      ...LIGHT_BASE,
      text: "rgba(92,72,45,1)",
      text2: "rgba(115,90,55,0.85)",
      text3: "rgba(150,120,80,0.70)",
      accent: "#92400e",
      btn: "linear-gradient(135deg,#d97706 0%,#92400e 100%)",
      marker: "#d97706",
      card: "rgba(255,253,248,0.90)",
      border: "rgba(217,119,6,0.12)",
      inputBg: "rgba(255,253,248,0.90)",
      inputBorder: "rgba(217,119,6,0.15)",
      avatarRing: "rgba(217,119,6,0.25)",
      socialBg: "#fdf8f2",
      socialBorder: "rgba(217,119,6,0.15)",
    },
  },

  {
    id: "pastel-dream",
    name: "Pastel Dream",
    description: "Soft, sweet, irresistibly aesthetic.",
    tier: "free",
    categories: ["Aesthetic", "Feminine", "Creator"],
    colorScheme: "light",
    background: "linear-gradient(135deg,#fce7f3 0%,#fdf4ff 50%,#ede9fe 100%)",
    fontFamily: SANS,
    effects: [],
    previewGradient: "linear-gradient(135deg,#fce7f3,#fdf4ff,#ede9fe)",
    accent: "white",
    vars: {
      ...LIGHT_BASE,
      text: "rgba(88,28,135,1)",
      text2: "rgba(107,33,168,0.80)",
      text3: "rgba(126,34,206,0.60)",
      accent: "#9333ea",
      btn: "linear-gradient(135deg,#ec4899 0%,#a855f7 100%)",
      btnText: "#ffffff",
      marker: "#ec4899",
      card: "rgba(255,255,255,0.70)",
      border: "rgba(236,72,153,0.12)",
      inputBg: "rgba(255,255,255,0.80)",
      inputBorder: "rgba(236,72,153,0.15)",
      avatarRing: "rgba(236,72,153,0.25)",
      socialBg: "rgba(255,255,255,0.70)",
      socialBorder: "rgba(168,85,247,0.15)",
    },
  },

  {
    id: "lavender-mood",
    name: "Lavender Mood",
    description: "Calming, soulful, intentional presence.",
    tier: "free",
    categories: ["Aesthetic", "Feminine", "Coach"],
    colorScheme: "light",
    background: "linear-gradient(180deg,#f5f3ff 0%,#ede9fe 100%)",
    fontFamily: SANS,
    effects: [],
    previewGradient: "linear-gradient(180deg,#f5f3ff,#ddd6fe)",
    accent: "white",
    vars: {
      ...LIGHT_BASE,
      text: "rgba(76,29,149,1)",
      text2: "rgba(91,33,182,0.80)",
      text3: "rgba(109,40,217,0.60)",
      accent: "#7c3aed",
      btn: "linear-gradient(135deg,#7c3aed 0%,#5b21b6 100%)",
      btnText: "#ffffff",
      marker: "#a78bfa",
      card: "rgba(255,255,255,0.75)",
      border: "rgba(124,58,237,0.10)",
      inputBg: "rgba(255,255,255,0.80)",
      inputBorder: "rgba(124,58,237,0.15)",
      avatarRing: "rgba(124,58,237,0.25)",
      socialBg: "rgba(245,243,255,0.90)",
      socialBorder: "rgba(124,58,237,0.15)",
    },
  },

  {
    id: "peach-soft",
    name: "Peach Soft",
    description: "Warm, approachable, elegant creator brand.",
    tier: "free",
    categories: ["Aesthetic", "Feminine", "Creator"],
    colorScheme: "light",
    background: "linear-gradient(180deg,#fff7ed 0%,#ffedd5 100%)",
    fontFamily: SANS,
    effects: [],
    previewGradient: "linear-gradient(180deg,#fff7ed,#fed7aa)",
    accent: "white",
    vars: {
      ...LIGHT_BASE,
      text: "rgba(154,52,18,1)",
      text2: "rgba(180,64,22,0.80)",
      text3: "rgba(194,65,12,0.60)",
      accent: "#ea580c",
      btn: "linear-gradient(135deg,#f97316 0%,#ea580c 100%)",
      btnText: "#ffffff",
      marker: "#fb923c",
      card: "rgba(255,255,255,0.75)",
      border: "rgba(249,115,22,0.12)",
      inputBg: "rgba(255,255,255,0.80)",
      inputBorder: "rgba(249,115,22,0.15)",
      avatarRing: "rgba(249,115,22,0.25)",
      socialBg: "#fff7ed",
      socialBorder: "rgba(249,115,22,0.15)",
    },
  },

  {
    id: "cloud-white",
    name: "Cloud White",
    description: "Ultra-luxury whitespace. Silence is premium.",
    tier: "free",
    categories: ["Minimal", "Luxury", "Professional"],
    colorScheme: "light",
    background: "#ffffff",
    fontFamily: ELEGANT,
    effects: [],
    previewGradient: "linear-gradient(180deg,#ffffff,#f9fafb)",
    accent: "white",
    vars: {
      ...LIGHT_BASE,
      text: "rgba(0,0,0,0.90)",
      text2: "rgba(0,0,0,0.60)",
      text3: "rgba(0,0,0,0.35)",
      accent: "#000000",
      btn: "#000000",
      btnText: "#ffffff",
      btnRadius: "0.375rem",
      cardRadius: "0.5rem",
      border: "rgba(0,0,0,0.07)",
      card: "rgba(249,250,251,1)",
      marker: "#000000",
      socialBg: "#f9fafb",
      socialBorder: "rgba(0,0,0,0.08)",
      shadow: "0 1px 8px rgba(0,0,0,0.05)",
    },
  },

  /* ══════════════════════════════════════════════════════
     PREMIUM THEMES (30)
  ══════════════════════════════════════════════════════ */

  {
    id: "black-gold-empire",
    name: "Black Gold Empire",
    description: "Billionaire branding. Luxury fintech power.",
    tier: "premium",
    categories: ["Luxury", "Dark Mode", "Network Marketing", "Business & Sales", "Masculine"],
    colorScheme: "dark",
    background: "radial-gradient(135% 80% at 50% 0%,#1f1800 0%,#0d0c00 40%,#050507 100%)",
    fontFamily: SANS,
    effects: ["animated-gradient", "glow", "shimmer"],
    previewGradient: "radial-gradient(circle at 50% 0%,#2a2000,#050507)",
    accent: "gold",
    vars: {
      ...DARK_BASE,
      accent: "#f0d9a8",
      btn: "linear-gradient(135deg,#e3c081 0%,#cda45e 50%,#e3c081 100%)",
      btnText: "#050507",
      btnRadius: "0.5rem",
      marker: "#cda45e",
      border: "rgba(227,192,129,0.12)",
      card: "rgba(227,192,129,0.04)",
      avatarRing: "rgba(227,192,129,0.30)",
      socialBg: "rgba(227,192,129,0.06)",
      socialBorder: "rgba(227,192,129,0.15)",
      shadow: "0 4px 32px rgba(205,164,94,0.12)",
    },
  },

  {
    id: "platinum-elite",
    name: "Platinum Elite",
    description: "Chrome silver. Futuristic authority.",
    tier: "premium",
    categories: ["Luxury", "Dark Mode", "Professional", "Corporate"],
    colorScheme: "dark",
    background: "radial-gradient(120% 80% at 50% 0%,#1a1a2e 0%,#0f0f1a 55%,#080809 100%)",
    fontFamily: SANS,
    effects: ["shimmer", "glow"],
    previewGradient: "radial-gradient(circle at 50% 0%,#1a1a2e,#080809)",
    accent: "white",
    vars: {
      ...DARK_BASE,
      accent: "#e2e8f0",
      btn: "linear-gradient(135deg,#94a3b8 0%,#64748b 100%)",
      btnText: "#0f0f1a",
      btnRadius: "0.625rem",
      marker: "#94a3b8",
      border: "rgba(148,163,184,0.12)",
      card: "rgba(148,163,184,0.05)",
      avatarRing: "rgba(148,163,184,0.25)",
      shadow: "0 4px 32px rgba(148,163,184,0.10)",
    },
  },

  {
    id: "royal-emerald",
    name: "Royal Emerald",
    description: "Emerald prestige. Wealth meets elegance.",
    tier: "premium",
    categories: ["Luxury", "Dark Mode", "Business & Sales"],
    colorScheme: "dark",
    background: "radial-gradient(120% 80% at 50% 0%,#064e3b 0%,#022c22 55%,#010f0c 100%)",
    fontFamily: SANS,
    effects: ["glow", "shimmer"],
    previewGradient: "radial-gradient(circle at 50% 0%,#064e3b,#010f0c)",
    accent: "jade",
    vars: {
      ...DARK_BASE,
      accent: "#6ff2c6",
      btn: "linear-gradient(135deg,#2ee6a6 0%,#0b9468 100%)",
      btnText: "#010f0c",
      marker: "#10b981",
      border: "rgba(46,230,166,0.12)",
      card: "rgba(46,230,166,0.04)",
      avatarRing: "rgba(46,230,166,0.25)",
      shadow: "0 4px 32px rgba(16,185,129,0.12)",
    },
  },

  {
    id: "diamond-glass",
    name: "Diamond Glass",
    description: "Glassmorphism perfected. Crystal-clear luxury.",
    tier: "premium",
    categories: ["Luxury", "Dark Mode", "Aesthetic"],
    colorScheme: "dark",
    background: "radial-gradient(120% 80% at 50% 0%,#1e1b4b 0%,#0f0e29 55%,#06060e 100%)",
    fontFamily: SANS,
    effects: ["glassmorphism", "shimmer", "glow"],
    previewGradient: "radial-gradient(circle at 50% 0%,#1e1b4b,#06060e)",
    accent: "white",
    vars: {
      ...DARK_BASE,
      accent: "#c7d2fe",
      btn: "rgba(255,255,255,0.12)",
      btnBorder: "rgba(255,255,255,0.25)",
      btnRadius: "999px",
      marker: "#818cf8",
      border: "rgba(255,255,255,0.10)",
      card: "rgba(255,255,255,0.06)",
      shadow: "0 8px 32px rgba(0,0,0,0.50)",
    },
  },

  {
    id: "executive-noir",
    name: "Executive Noir",
    description: "Matte black. Power without words.",
    tier: "premium",
    categories: ["Luxury", "Dark Mode", "Corporate", "Masculine"],
    colorScheme: "dark",
    background: "#0a0a0a",
    fontFamily: "'SF Pro Display', " + SANS,
    effects: [],
    previewGradient: "linear-gradient(180deg,#141414,#0a0a0a)",
    accent: "white",
    vars: {
      ...DARK_BASE,
      accent: "#f5f5f5",
      btn: "rgba(255,255,255,0.08)",
      btnBorder: "rgba(255,255,255,0.18)",
      btnRadius: "0.375rem",
      cardRadius: "0.5rem",
      marker: "rgba(255,255,255,0.35)",
      border: "rgba(255,255,255,0.07)",
      card: "rgba(255,255,255,0.03)",
    },
  },

  {
    id: "neon-cyber",
    name: "Neon Cyber",
    description: "Cyberpunk grit. Unstoppable digital energy.",
    tier: "premium",
    categories: ["Dark Mode", "Vibrant", "Gaming", "AI Futuristic"],
    colorScheme: "dark",
    background: "radial-gradient(120% 80% at 50% 0%,#001a0f 0%,#000c06 55%,#020202 100%)",
    fontFamily: MONO,
    effects: ["neon", "glow"],
    previewGradient: "radial-gradient(circle at 50% 0%,#001a0f,#020202)",
    accent: "jade",
    vars: {
      ...DARK_BASE,
      accent: "#00ffd5",
      btn: "transparent",
      btnBorder: "#00ffd5",
      btnText: "#00ffd5",
      btnRadius: "0.25rem",
      cardRadius: "0.25rem",
      marker: "#00ffd5",
      border: "rgba(0,255,213,0.15)",
      card: "rgba(0,255,213,0.03)",
      avatarRing: "rgba(0,255,213,0.30)",
      socialBg: "rgba(0,255,213,0.05)",
      socialBorder: "rgba(0,255,213,0.20)",
      shadow: "0 0 24px rgba(0,255,213,0.12)",
    },
  },

  {
    id: "ai-matrix",
    name: "AI Matrix",
    description: "Green-on-black matrix. AI identity.",
    tier: "premium",
    categories: ["AI Futuristic", "Dark Mode", "Gaming"],
    colorScheme: "dark",
    background: "radial-gradient(120% 80% at 50% 0%,#001a0a 0%,#000d05 55%,#000000 100%)",
    fontFamily: MONO,
    effects: ["neon", "glow", "particles"],
    previewGradient: "radial-gradient(circle at 50% 0%,#001a0a,#000000)",
    accent: "jade",
    vars: {
      ...DARK_BASE,
      accent: "#00ff41",
      btn: "transparent",
      btnBorder: "#00ff41",
      btnText: "#00ff41",
      btnRadius: "0.125rem",
      cardRadius: "0.25rem",
      marker: "#00ff41",
      border: "rgba(0,255,65,0.15)",
      card: "rgba(0,255,65,0.03)",
      avatarRing: "rgba(0,255,65,0.25)",
      socialBg: "rgba(0,255,65,0.04)",
      socialBorder: "rgba(0,255,65,0.18)",
      shadow: "0 0 28px rgba(0,255,65,0.10)",
    },
  },

  {
    id: "hologram-pro",
    name: "Hologram Pro",
    description: "Floating iridescent cards. Sci-fi luxury.",
    tier: "premium",
    categories: ["AI Futuristic", "Dark Mode", "Luxury"],
    colorScheme: "dark",
    background: "linear-gradient(135deg,#0a0020 0%,#050010 50%,#030008 100%)",
    fontFamily: SANS,
    effects: ["glassmorphism", "animated-gradient", "glow"],
    previewGradient: "linear-gradient(135deg,#0a0020,#030008)",
    accent: "white",
    vars: {
      ...DARK_BASE,
      accent: "#e879f9",
      btn: "linear-gradient(135deg,rgba(232,121,249,0.25) 0%,rgba(129,140,248,0.25) 100%)",
      btnBorder: "rgba(232,121,249,0.40)",
      btnRadius: "999px",
      marker: "#c084fc",
      border: "rgba(232,121,249,0.15)",
      card: "rgba(232,121,249,0.05)",
      avatarRing: "rgba(192,132,252,0.30)",
      shadow: "0 8px 40px rgba(192,132,252,0.15)",
    },
  },

  {
    id: "quantum-ui",
    name: "Quantum UI",
    description: "AI startup premium. Silicon Valley credentials.",
    tier: "premium",
    categories: ["AI Futuristic", "Professional", "Business & Sales"],
    colorScheme: "dark",
    background: "radial-gradient(120% 80% at 50% 0%,#0c1445 0%,#060a25 55%,#020408 100%)",
    fontFamily: SANS,
    effects: ["glassmorphism", "glow"],
    previewGradient: "radial-gradient(circle at 50% 0%,#0c1445,#020408)",
    accent: "blue",
    vars: {
      ...DARK_BASE,
      accent: "#93c5fd",
      btn: "linear-gradient(135deg,#3b82f6 0%,#1d4ed8 100%)",
      btnRadius: "0.625rem",
      marker: "#60a5fa",
      border: "rgba(59,130,246,0.15)",
      card: "rgba(59,130,246,0.05)",
      avatarRing: "rgba(59,130,246,0.25)",
      shadow: "0 4px 32px rgba(59,130,246,0.12)",
    },
  },

  {
    id: "hyperflow",
    name: "HyperFlow",
    description: "Flowing animated gradients. Constant motion.",
    tier: "premium",
    categories: ["AI Futuristic", "Vibrant", "Creator"],
    colorScheme: "dark",
    background: "linear-gradient(135deg,#667eea 0%,#764ba2 25%,#f093fb 50%,#4facfe 75%,#43e97b 100%)",
    fontFamily: SANS,
    effects: ["animated-gradient"],
    previewGradient: "linear-gradient(135deg,#667eea,#f093fb,#43e97b)",
    accent: "white",
    vars: {
      ...DARK_BASE,
      accent: "#ffffff",
      btn: "rgba(255,255,255,0.22)",
      btnBorder: "rgba(255,255,255,0.45)",
      btnRadius: "999px",
      marker: "#ffffff",
      border: "rgba(255,255,255,0.15)",
      card: "rgba(255,255,255,0.12)",
    },
  },

  {
    id: "influencer-studio",
    name: "Influencer Studio",
    description: "Instagram creator HQ. Collab-ready.",
    tier: "premium",
    categories: ["Influencer", "Creator", "Dark Mode", "Feminine"],
    colorScheme: "dark",
    background: "radial-gradient(120% 80% at 50% 0%,#1a0f2e 0%,#0f0820 55%,#080614 100%)",
    fontFamily: SANS,
    effects: ["glassmorphism", "shimmer"],
    previewGradient: "radial-gradient(circle at 50% 0%,#1a0f2e,#080614)",
    accent: "white",
    vars: {
      ...DARK_BASE,
      accent: "#f9a8d4",
      btn: "linear-gradient(135deg,#ec4899 0%,#be185d 100%)",
      btnRadius: "999px",
      marker: "#f472b6",
      border: "rgba(244,114,182,0.12)",
      card: "rgba(244,114,182,0.05)",
      avatarRing: "rgba(244,114,182,0.25)",
      shadow: "0 4px 32px rgba(244,114,182,0.10)",
    },
  },

  {
    id: "viral-creator",
    name: "Viral Creator",
    description: "TikTok energy. Built to get views.",
    tier: "premium",
    categories: ["Creator", "Influencer", "Vibrant"],
    colorScheme: "dark",
    background: "radial-gradient(120% 80% at 50% 0%,#0d0d1a 0%,#080810 55%,#020205 100%)",
    fontFamily: SANS,
    effects: ["neon", "glow"],
    previewGradient: "radial-gradient(circle at 50% 0%,#0d0d1a,#020205)",
    accent: "white",
    vars: {
      ...DARK_BASE,
      accent: "#f0abfc",
      btn: "linear-gradient(135deg,#e879f9 0%,#7c3aed 100%)",
      btnRadius: "999px",
      marker: "#e879f9",
      border: "rgba(232,121,249,0.12)",
      card: "rgba(232,121,249,0.05)",
      avatarRing: "rgba(232,121,249,0.25)",
    },
  },

  {
    id: "podcast-pro",
    name: "Podcast Pro",
    description: "Microphone energy. Listen, subscribe, engage.",
    tier: "premium",
    categories: ["Creator", "Dark Mode", "Professional"],
    colorScheme: "dark",
    background: "radial-gradient(120% 80% at 50% 0%,#18181b 0%,#0e0e10 55%,#060607 100%)",
    fontFamily: SANS,
    effects: [],
    previewGradient: "radial-gradient(circle at 50% 0%,#18181b,#060607)",
    accent: "white",
    vars: {
      ...DARK_BASE,
      accent: "#fb923c",
      btn: "linear-gradient(135deg,#f97316 0%,#c2410c 100%)",
      marker: "#fb923c",
      border: "rgba(249,115,22,0.12)",
      card: "rgba(249,115,22,0.04)",
      avatarRing: "rgba(249,115,22,0.20)",
    },
  },

  {
    id: "video-funnel",
    name: "Video Funnel",
    description: "Watch. Click. Convert. Video-first CTA.",
    tier: "premium",
    categories: ["Creator", "Affiliate", "Business & Sales"],
    colorScheme: "dark",
    background: "radial-gradient(120% 80% at 50% 0%,#1c0000 0%,#0d0000 55%,#050000 100%)",
    fontFamily: SANS,
    effects: ["glow"],
    previewGradient: "radial-gradient(circle at 50% 0%,#1c0000,#050000)",
    accent: "white",
    vars: {
      ...DARK_BASE,
      accent: "#fca5a5",
      btn: "linear-gradient(135deg,#ef4444 0%,#b91c1c 100%)",
      marker: "#ef4444",
      border: "rgba(239,68,68,0.12)",
      card: "rgba(239,68,68,0.04)",
      avatarRing: "rgba(239,68,68,0.22)",
      shadow: "0 4px 32px rgba(239,68,68,0.10)",
    },
  },

  {
    id: "streamer-mode",
    name: "Streamer Mode",
    description: "GG. Stream live. Clips on repeat.",
    tier: "premium",
    categories: ["Gaming", "Creator", "Dark Mode"],
    colorScheme: "dark",
    background: "radial-gradient(120% 80% at 50% 0%,#0f0025 0%,#07001a 55%,#030010 100%)",
    fontFamily: MONO,
    effects: ["neon", "glow"],
    previewGradient: "radial-gradient(circle at 50% 0%,#0f0025,#030010)",
    accent: "white",
    vars: {
      ...DARK_BASE,
      accent: "#a78bfa",
      btn: "linear-gradient(135deg,#7c3aed 0%,#5b21b6 100%)",
      btnRadius: "0.375rem",
      marker: "#a78bfa",
      border: "rgba(167,139,250,0.15)",
      card: "rgba(167,139,250,0.05)",
      avatarRing: "rgba(167,139,250,0.25)",
      shadow: "0 0 32px rgba(124,58,237,0.15)",
    },
  },

  {
    id: "modern-ceo",
    name: "Modern CEO",
    description: "C-suite energy. Leadership at a glance.",
    tier: "premium",
    categories: ["Luxury", "Corporate", "Professional", "Masculine"],
    colorScheme: "dark",
    background: "radial-gradient(120% 80% at 50% 0%,#1e1e2e 0%,#12121a 55%,#08080e 100%)",
    fontFamily: "'SF Pro Display', " + SANS,
    effects: ["shimmer"],
    previewGradient: "radial-gradient(circle at 50% 0%,#1e1e2e,#08080e)",
    accent: "blue",
    vars: {
      ...DARK_BASE,
      accent: "#93c5fd",
      btn: "linear-gradient(135deg,#2563eb 0%,#1e40af 100%)",
      btnRadius: "0.5rem",
      marker: "#3b82f6",
      border: "rgba(37,99,235,0.12)",
      card: "rgba(37,99,235,0.04)",
    },
  },

  {
    id: "startup-pitch",
    name: "Startup Pitch",
    description: "Y Combinator energy. Invest in the founder.",
    tier: "premium",
    categories: ["Professional", "AI Futuristic", "Business & Sales"],
    colorScheme: "dark",
    background: "radial-gradient(120% 80% at 50% 0%,#fff7ed 0%,#f5f5f5 40%,#e5e5e5 100%)",
    fontFamily: SANS,
    effects: [],
    previewGradient: "radial-gradient(circle at 50% 0%,#fff7ed,#e5e5e5)",
    accent: "white",
    vars: {
      ...LIGHT_BASE,
      text: "rgba(12,10,9,1)",
      text2: "rgba(41,37,36,0.85)",
      text3: "rgba(87,83,78,0.70)",
      accent: "#f97316",
      btn: "linear-gradient(135deg,#f97316 0%,#ea580c 100%)",
      marker: "#f97316",
      card: "rgba(255,255,255,0.80)",
      border: "rgba(249,115,22,0.12)",
    },
  },

  {
    id: "consultant-elite",
    name: "Consultant Elite",
    description: "Premium consulting identity. Results-first.",
    tier: "premium",
    categories: ["Professional", "Corporate", "Luxury", "Coach"],
    colorScheme: "dark",
    background: "radial-gradient(120% 80% at 50% 0%,#1a1a1a 0%,#101010 55%,#080808 100%)",
    fontFamily: ELEGANT,
    effects: ["shimmer"],
    previewGradient: "radial-gradient(circle at 50% 0%,#1a1a1a,#080808)",
    accent: "gold",
    vars: {
      ...DARK_BASE,
      accent: "#e3c081",
      btn: "rgba(255,255,255,0.08)",
      btnBorder: "rgba(227,192,129,0.35)",
      btnText: "#e3c081",
      btnRadius: "0.25rem",
      cardRadius: "0.5rem",
      marker: "#cda45e",
      border: "rgba(227,192,129,0.10)",
      card: "rgba(227,192,129,0.03)",
    },
  },

  {
    id: "financial-pro",
    name: "Financial Pro",
    description: "Banking gravitas. Wealth, trust, stability.",
    tier: "premium",
    categories: ["Professional", "Corporate", "Masculine"],
    colorScheme: "dark",
    background: "radial-gradient(120% 80% at 50% 0%,#0a1628 0%,#060e1a 55%,#030810 100%)",
    fontFamily: "'SF Pro Display', " + SANS,
    effects: [],
    previewGradient: "radial-gradient(circle at 50% 0%,#0a1628,#030810)",
    accent: "blue",
    vars: {
      ...DARK_BASE,
      accent: "#93c5fd",
      btn: "#1e40af",
      btnRadius: "0.375rem",
      cardRadius: "0.625rem",
      marker: "#2563eb",
      border: "rgba(30,64,175,0.20)",
      card: "rgba(30,64,175,0.06)",
    },
  },

  {
    id: "realtor-luxe",
    name: "Realtor Luxe",
    description: "Luxury real estate. Premium property energy.",
    tier: "premium",
    categories: ["Luxury", "Professional", "Corporate"],
    colorScheme: "dark",
    background: "radial-gradient(120% 80% at 50% 0%,#1a140a 0%,#0d0c08 55%,#060504 100%)",
    fontFamily: ELEGANT,
    effects: ["shimmer"],
    previewGradient: "radial-gradient(circle at 50% 0%,#1a140a,#060504)",
    accent: "gold",
    vars: {
      ...DARK_BASE,
      accent: "#fde68a",
      btn: "linear-gradient(135deg,#d97706 0%,#92400e 100%)",
      btnRadius: "0.375rem",
      marker: "#f59e0b",
      border: "rgba(217,119,6,0.12)",
      card: "rgba(217,119,6,0.04)",
      avatarRing: "rgba(245,158,11,0.25)",
    },
  },

  {
    id: "soft-luxe",
    name: "Soft Luxe",
    description: "Feminine luxury that converts. Bougie energy.",
    tier: "premium",
    categories: ["Luxury", "Feminine", "Creator", "Aesthetic"],
    colorScheme: "light",
    background: "linear-gradient(135deg,#fdf2f8 0%,#fce7f3 50%,#fdf4ff 100%)",
    fontFamily: ELEGANT,
    effects: ["shimmer"],
    previewGradient: "linear-gradient(135deg,#fdf2f8,#fdf4ff)",
    accent: "white",
    vars: {
      ...LIGHT_BASE,
      text: "rgba(76,5,50,1)",
      text2: "rgba(112,26,80,0.85)",
      text3: "rgba(157,23,77,0.60)",
      accent: "#be185d",
      btn: "linear-gradient(135deg,#ec4899 0%,#be185d 100%)",
      btnText: "#ffffff",
      btnRadius: "999px",
      marker: "#f472b6",
      card: "rgba(255,255,255,0.85)",
      border: "rgba(236,72,153,0.12)",
      inputBg: "rgba(255,255,255,0.90)",
      inputBorder: "rgba(236,72,153,0.15)",
      avatarRing: "rgba(236,72,153,0.25)",
      socialBg: "#fdf2f8",
      socialBorder: "rgba(236,72,153,0.15)",
    },
  },

  {
    id: "tokyo-nights",
    name: "Tokyo Nights",
    description: "Neon sakura rain. Japan city aesthetic.",
    tier: "premium",
    categories: ["Dark Mode", "Vibrant", "Aesthetic", "Influencer"],
    colorScheme: "dark",
    background: "radial-gradient(120% 80% at 50% 0%,#1a003b 0%,#0d0020 55%,#060010 100%)",
    fontFamily: SANS,
    effects: ["neon", "glow"],
    previewGradient: "radial-gradient(circle at 50% 0%,#1a003b,#060010)",
    accent: "white",
    vars: {
      ...DARK_BASE,
      accent: "#f9a8d4",
      btn: "linear-gradient(135deg,#f472b6 0%,#c026d3 100%)",
      btnRadius: "999px",
      marker: "#f472b6",
      border: "rgba(244,114,182,0.15)",
      card: "rgba(244,114,182,0.06)",
      avatarRing: "rgba(244,114,182,0.30)",
      shadow: "0 0 36px rgba(244,114,182,0.15)",
    },
  },

  {
    id: "scandinavian",
    name: "Scandinavian",
    description: "Nordic precision. Less is always more.",
    tier: "premium",
    categories: ["Minimal", "Professional", "Aesthetic"],
    colorScheme: "light",
    background: "#f8f9fa",
    fontFamily: "'Helvetica Neue', " + SANS,
    effects: [],
    previewGradient: "linear-gradient(180deg,#f8f9fa,#e9ecef)",
    accent: "white",
    vars: {
      ...LIGHT_BASE,
      text: "rgba(0,0,0,0.88)",
      text2: "rgba(0,0,0,0.58)",
      text3: "rgba(0,0,0,0.35)",
      accent: "#1a1a1a",
      btn: "#1a1a1a",
      btnText: "#ffffff",
      btnRadius: "0.125rem",
      cardRadius: "0.25rem",
      border: "rgba(0,0,0,0.07)",
      card: "#ffffff",
      marker: "#1a1a1a",
      socialBg: "#f8f9fa",
      socialBorder: "rgba(0,0,0,0.10)",
      shadow: "0 1px 6px rgba(0,0,0,0.06)",
    },
  },

  {
    id: "monochrome-art",
    name: "Monochrome Art",
    description: "Artistic B&W. Gallery-worthy presence.",
    tier: "premium",
    categories: ["Minimal", "Aesthetic", "Dark Mode"],
    colorScheme: "dark",
    background: "linear-gradient(180deg,#1a1a1a 0%,#0d0d0d 100%)",
    fontFamily: ELEGANT,
    effects: [],
    previewGradient: "linear-gradient(180deg,#1a1a1a,#0d0d0d)",
    accent: "white",
    vars: {
      ...DARK_BASE,
      accent: "#e5e5e5",
      btn: "#e5e5e5",
      btnText: "#0d0d0d",
      btnRadius: "0px",
      cardRadius: "0px",
      border: "rgba(255,255,255,0.12)",
      card: "rgba(255,255,255,0.04)",
      marker: "#ffffff",
      socialBg: "rgba(255,255,255,0.06)",
      socialBorder: "rgba(255,255,255,0.12)",
    },
  },

  {
    id: "velvet-rose",
    name: "Velvet Rose",
    description: "Luxury feminine royalty. High-ticket brand.",
    tier: "premium",
    categories: ["Luxury", "Feminine", "Dark Mode"],
    colorScheme: "dark",
    background: "radial-gradient(120% 80% at 50% 0%,#4a0020 0%,#2d0015 55%,#14000a 100%)",
    fontFamily: ELEGANT,
    effects: ["shimmer", "glow"],
    previewGradient: "radial-gradient(circle at 50% 0%,#4a0020,#14000a)",
    accent: "white",
    vars: {
      ...DARK_BASE,
      accent: "#fda4af",
      btn: "linear-gradient(135deg,#f43f5e 0%,#9f1239 100%)",
      btnRadius: "0.25rem",
      marker: "#fb7185",
      border: "rgba(244,63,94,0.12)",
      card: "rgba(244,63,94,0.05)",
      avatarRing: "rgba(251,113,133,0.25)",
      shadow: "0 4px 32px rgba(244,63,94,0.12)",
    },
  },

  {
    id: "sales-funnel-pro",
    name: "Sales Funnel Pro",
    description: "Conversion machine. Every element sells.",
    tier: "premium",
    categories: ["Business & Sales", "Network Marketing", "Affiliate"],
    colorScheme: "dark",
    background: "radial-gradient(120% 80% at 50% 0%,#162032 0%,#0c1420 55%,#060c14 100%)",
    fontFamily: SANS,
    effects: ["glow"],
    previewGradient: "radial-gradient(circle at 50% 0%,#162032,#060c14)",
    accent: "blue",
    vars: {
      ...DARK_BASE,
      accent: "#6ee7b7",
      btn: "linear-gradient(135deg,#10b981 0%,#059669 100%)",
      btnRadius: "0.5rem",
      marker: "#34d399",
      border: "rgba(52,211,153,0.12)",
      card: "rgba(52,211,153,0.04)",
      shadow: "0 4px 32px rgba(16,185,129,0.10)",
    },
  },

  {
    id: "affiliate-machine",
    name: "Affiliate Machine",
    description: "Clicks, commissions, compounding income.",
    tier: "premium",
    categories: ["Affiliate", "Business & Sales", "Dark Mode"],
    colorScheme: "dark",
    background: "radial-gradient(120% 80% at 50% 0%,#1c1000 0%,#0f0900 55%,#060500 100%)",
    fontFamily: SANS,
    effects: ["glow"],
    previewGradient: "radial-gradient(circle at 50% 0%,#1c1000,#060500)",
    accent: "gold",
    vars: {
      ...DARK_BASE,
      accent: "#fcd34d",
      btn: "linear-gradient(135deg,#f59e0b 0%,#d97706 100%)",
      btnText: "#0f0900",
      btnRadius: "0.5rem",
      marker: "#fbbf24",
      border: "rgba(245,158,11,0.12)",
      card: "rgba(245,158,11,0.04)",
      avatarRing: "rgba(251,191,36,0.25)",
    },
  },

  {
    id: "webinar-launch",
    name: "Webinar Launch",
    description: "Register now. Join live. Convert at scale.",
    tier: "premium",
    categories: ["Business & Sales", "Coach", "Network Marketing"],
    colorScheme: "dark",
    background: "radial-gradient(120% 80% at 50% 0%,#0f1a38 0%,#070e20 55%,#030810 100%)",
    fontFamily: SANS,
    effects: ["glow"],
    previewGradient: "radial-gradient(circle at 50% 0%,#0f1a38,#030810)",
    accent: "blue",
    vars: {
      ...DARK_BASE,
      accent: "#93c5fd",
      btn: "linear-gradient(135deg,#3b82f6 0%,#1d4ed8 100%)",
      btnRadius: "0.625rem",
      marker: "#60a5fa",
      border: "rgba(59,130,246,0.15)",
      card: "rgba(59,130,246,0.05)",
      shadow: "0 4px 32px rgba(59,130,246,0.10)",
    },
  },

  {
    id: "mlm-authority",
    name: "MLM Authority",
    description: "Rank-earner energy. Credibility at scale.",
    tier: "premium",
    categories: ["Network Marketing", "Luxury", "Dark Mode"],
    colorScheme: "dark",
    background: "radial-gradient(120% 80% at 50% 0%,#14000a 0%,#0a0005 35%,#030507 65%,#0a0a00 100%)",
    fontFamily: SANS,
    effects: ["glow", "shimmer"],
    previewGradient: "radial-gradient(circle at 50% 0%,#14000a,#0a0a00)",
    accent: "gold",
    vars: {
      ...DARK_BASE,
      accent: "#fde68a",
      btn: "linear-gradient(135deg,#d97706 0%,#b45309 100%)",
      btnRadius: "0.5rem",
      marker: "#f59e0b",
      border: "rgba(245,158,11,0.10)",
      card: "rgba(245,158,11,0.03)",
      avatarRing: "rgba(245,158,11,0.25)",
    },
  },

  {
    id: "ai-personal-brand",
    name: "AI Personal Brand",
    description: "The AI entrepreneur identity. Future-proof.",
    tier: "premium",
    categories: ["AI Futuristic", "Professional", "Business & Sales"],
    colorScheme: "dark",
    background: "radial-gradient(120% 80% at 50% 0%,#070f1f 0%,#040814 55%,#020408 100%)",
    fontFamily: SANS,
    effects: ["aurora", "glow", "glassmorphism"],
    previewGradient: "radial-gradient(circle at 50% 0%,#070f1f,#020408)",
    accent: "blue",
    vars: {
      ...DARK_BASE,
      accent: "#a5f3fc",
      btn: "linear-gradient(135deg,#06b6d4 0%,#0891b2 100%)",
      btnRadius: "0.625rem",
      marker: "#22d3ee",
      border: "rgba(6,182,212,0.15)",
      card: "rgba(6,182,212,0.05)",
      avatarRing: "rgba(34,211,238,0.25)",
      shadow: "0 4px 32px rgba(6,182,212,0.12)",
    },
  },
];

/* ─────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────── */

export function getThemeConfig(id: ThemeId): ThemeConfig {
  return THEME_CONFIGS.find((t) => t.id === id) ?? THEME_CONFIGS[0];
}

export const THEME_CATEGORIES = [
  "All",
  "Minimal",
  "Professional",
  "Corporate",
  "Luxury",
  "Dark Mode",
  "Vibrant",
  "Aesthetic",
  "Feminine",
  "Masculine",
  "Creator",
  "Influencer",
  "AI Futuristic",
  "Network Marketing",
  "Affiliate",
  "Business & Sales",
  "Coach",
  "Gaming",
];


/** Build the full inline style object for the profile wrapper. */
export function buildThemeStyle(id: ThemeId): React.CSSProperties {
  const tc = getThemeConfig(id);
  return {
    "--tp-card": tc.vars.card,
    "--tp-border": tc.vars.border,
    "--tp-text": tc.vars.text,
    "--tp-text2": tc.vars.text2,
    "--tp-text3": tc.vars.text3,
    "--tp-accent": tc.vars.accent,
    "--tp-btn": tc.vars.btn,
    "--tp-btn-text": tc.vars.btnText,
    "--tp-btn-radius": tc.vars.btnRadius,
    "--tp-btn-border": tc.vars.btnBorder,
    "--tp-card-radius": tc.vars.cardRadius,
    "--tp-marker": tc.vars.marker,
    "--tp-social-bg": tc.vars.socialBg,
    "--tp-social-border": tc.vars.socialBorder,
    "--tp-input-bg": tc.vars.inputBg,
    "--tp-input-border": tc.vars.inputBorder,
    "--tp-avatar-ring": tc.vars.avatarRing,
    "--tp-shadow": tc.vars.shadow,
    "--tp-success-bg": tc.vars.successBg,
    "--tp-success-text": tc.vars.successText,
    "--tp-stat-card": tc.vars.statCard,
    "--tp-stat-border": tc.vars.statBorder,
    "--tp-font": tc.fontFamily,
    background: tc.background,
  } as React.CSSProperties;
}

/** Collect CSS class names for special effects */
export function buildThemeEffectClasses(id: ThemeId): string {
  const tc = getThemeConfig(id);
  const cls: string[] = ["public-profile"];
  if (tc.colorScheme === "light") cls.push("profile-light");
  if (tc.effects.includes("animated-gradient")) cls.push("effect-animated-bg");
  if (tc.effects.includes("glassmorphism")) cls.push("effect-glass");
  if (tc.effects.includes("neon")) cls.push("effect-neon");
  if (tc.effects.includes("glow")) cls.push("effect-glow");
  if (tc.effects.includes("aurora")) cls.push("effect-aurora");
  if (tc.effects.includes("grain")) cls.push("effect-grain");
  return cls.join(" ");
}

/** AI theme recommendation based on niche/personality match */
export function recommendTheme(opts: {
  niche: string;
  style: string;
  gender?: "any" | "feminine" | "masculine";
}): ThemeId[] {
  const n = opts.niche.toLowerCase();
  const s = opts.style.toLowerCase();
  const isFem = opts.gender === "feminine";
  const isMasc = opts.gender === "masculine";

  // Niche-based matches
  if (n.includes("mlm") || n.includes("network"))
    return ["black-gold-empire", "mlm-authority", "gold-elite", "sales-funnel-pro", "deep-red"];
  if (n.includes("coach") || n.includes("mentor"))
    return ["consultant-elite", "emerald-lux", "sky-blue", "modern-ceo", "webinar-launch"];
  if (n.includes("fitness") || n.includes("health") || n.includes("wellness"))
    return ["aqua-energy", "mint-fresh", "emerald-lux", "deep-red", "warm-coral"];
  if (n.includes("fashion") || n.includes("beauty") || n.includes("makeup"))
    return ["soft-luxe", "rose-vibe", "influencer-studio", "velvet-rose", "candy-ui"];
  if (n.includes("real estate") || n.includes("property") || n.includes("realtor"))
    return ["realtor-luxe", "gold-elite", "executive-noir", "navy-glass", "financial-pro"];
  if (n.includes("crypto") || n.includes("finance") || n.includes("invest"))
    return ["financial-pro", "carbon-pro", "quantum-ui", "black-gold-empire", "executive-noir"];
  if (n.includes("tech") || n.includes("saas") || n.includes("software"))
    return ["ai-personal-brand", "quantum-ui", "startup-pitch", "ai-matrix", "hyperflow"];
  if (n.includes("music") || n.includes("artist") || n.includes("band"))
    return ["neon-dark", "viral-creator", "streamer-mode", "tokyo-nights", "neon-cyber"];
  if (n.includes("food") || n.includes("restaurant") || n.includes("recipe"))
    return ["warm-coral", "peach-soft", "cream-beige", "aqua-energy", "tropical-pop"];
  if (n.includes("travel") || n.includes("lifestyle"))
    return ["sky-blue", "tropical-pop", "warm-coral", "candy-ui", "cloud-white"];
  if (n.includes("gaming") || n.includes("esports") || n.includes("stream"))
    return ["streamer-mode", "neon-cyber", "ai-matrix", "neon-dark", "viral-creator"];

  // Style-based fallback
  if (s.includes("luxury") || s.includes("premium"))
    return isFem
      ? ["velvet-rose", "soft-luxe", "diamond-glass", "royal-emerald", "hologram-pro"]
      : ["black-gold-empire", "executive-noir", "consultant-elite", "platinum-elite", "realtor-luxe"];
  if (s.includes("minimal") || s.includes("clean"))
    return ["minimal-white", "scandinavian", "cloud-white", "soft-gray-pro", "carbon-pro"];
  if (s.includes("vibrant") || s.includes("colorful") || s.includes("bold"))
    return ["tropical-pop", "candy-ui", "hyperflow", "neon-dark", "viral-creator"];
  if (s.includes("professional") || s.includes("corporate"))
    return ["navy-glass", "financial-pro", "soft-gray-pro", "modern-ceo", "carbon-pro"];
  if (isFem)
    return ["rose-vibe", "soft-luxe", "lavender-mood", "pastel-dream", "influencer-studio"];
  if (isMasc)
    return ["black-gold-empire", "carbon-pro", "executive-noir", "financial-pro", "navy-glass"];

  // Default recommended
  return ["midnight", "navy-glass", "gold-elite", "vivid-purple", "hyperflow"];
}
