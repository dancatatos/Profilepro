/**
 * Shared card templates — used by both the on-screen digital business card
 * preview and the print-ready canvas card so the two always match.
 */

/**
 * Layout variant for the printable business card.
 *   classic       — original layout: avatar top-left, identity right of it,
 *                    divider, contact rows, QR panel on the right
 *   minimal-mono  — type-only editorial: huge name, thin rule, tiny contacts,
 *                    tiny QR in the corner
 *   photo-forward — left half is the avatar (full-bleed), right half is
 *                    identity + contacts + QR stacked
 *   holographic   — classic layout but the background gets an iridescent
 *                    multi-stop gradient for a chrome/holo look
 */
export type CardLayout =
  | "classic"
  | "minimal-mono"
  | "photo-forward"
  | "holographic";

export interface CardTemplate {
  id: string;
  name: string;
  scheme: "dark" | "light";
  /** Background gradient [top, bottom]. */
  bg: [string, string];
  /** Corner glow [inner, transparent edge]. */
  glow: [string, string];
  nameColor: string;
  headlineColor: string;
  companyColor: string;
  contactColor: string;
  /** Bullets + small details. */
  accent: string;
  divider: string;
  scanLabel: string;
  avatarRing: string;
  avatarBg: string;
  avatarText: string;
  /** Optional layout. Defaults to "classic" for back-compat — every
   *  existing template renders identically until they opt into a
   *  different layout. */
  layout?: CardLayout;
}

export const CARD_TEMPLATES: CardTemplate[] = [
  {
    id: "midnight",
    name: "Midnight",
    scheme: "dark",
    bg: ["#15151f", "#0a0a10"],
    glow: ["rgba(46,107,255,0.22)", "rgba(46,107,255,0)"],
    nameColor: "#ffffff",
    headlineColor: "#5b8cff",
    companyColor: "#9aa0ad",
    contactColor: "#e8eaf0",
    accent: "#5b8cff",
    divider: "rgba(255,255,255,0.10)",
    scanLabel: "#8b8f9c",
    avatarRing: "rgba(255,255,255,0.16)",
    avatarBg: "#1b2540",
    avatarText: "#8fb0ff",
  },
  {
    id: "graphite",
    name: "Graphite",
    scheme: "dark",
    bg: ["#21232a", "#101114"],
    glow: ["rgba(45,212,191,0.18)", "rgba(45,212,191,0)"],
    nameColor: "#f4f5f7",
    headlineColor: "#5fd6c8",
    companyColor: "#9aa0ad",
    contactColor: "#e3e5ea",
    accent: "#5fd6c8",
    divider: "rgba(255,255,255,0.10)",
    scanLabel: "#888d97",
    avatarRing: "rgba(255,255,255,0.16)",
    avatarBg: "#26333a",
    avatarText: "#8fe0d4",
  },
  {
    id: "plum",
    name: "Plum",
    scheme: "dark",
    bg: ["#2c1838", "#160b1d"],
    glow: ["rgba(192,132,252,0.24)", "rgba(192,132,252,0)"],
    nameColor: "#fbf4ff",
    headlineColor: "#d6aefc",
    companyColor: "#a895b3",
    contactColor: "#ece2f2",
    accent: "#c084fc",
    divider: "rgba(255,255,255,0.10)",
    scanLabel: "#9a8ba6",
    avatarRing: "rgba(255,255,255,0.18)",
    avatarBg: "#3c2249",
    avatarText: "#dcbcfa",
  },
  {
    id: "forest",
    name: "Forest",
    scheme: "dark",
    bg: ["#16271d", "#0a130d"],
    glow: ["rgba(234,179,8,0.16)", "rgba(234,179,8,0)"],
    nameColor: "#f3f6f1",
    headlineColor: "#e3bd63",
    companyColor: "#94a399",
    contactColor: "#e4e9e2",
    accent: "#e3bd63",
    divider: "rgba(255,255,255,0.10)",
    scanLabel: "#869187",
    avatarRing: "rgba(255,255,255,0.16)",
    avatarBg: "#1f3a2a",
    avatarText: "#cbe4d2",
  },
  {
    id: "wine",
    name: "Wine",
    scheme: "dark",
    bg: ["#2e1620", "#180b10"],
    glow: ["rgba(244,114,182,0.20)", "rgba(244,114,182,0)"],
    nameColor: "#fdf2f6",
    headlineColor: "#f6a8cb",
    companyColor: "#b394a0",
    contactColor: "#f0e2e8",
    accent: "#f472b6",
    divider: "rgba(255,255,255,0.10)",
    scanLabel: "#a58d96",
    avatarRing: "rgba(255,255,255,0.18)",
    avatarBg: "#46202f",
    avatarText: "#f8c2da",
  },
  {
    id: "ivory",
    name: "Ivory",
    scheme: "light",
    bg: ["#fbf9f3", "#efebe0"],
    glow: ["rgba(59,91,154,0.10)", "rgba(59,91,154,0)"],
    nameColor: "#1f2433",
    headlineColor: "#3b5b9a",
    companyColor: "#7a7568",
    contactColor: "#3a3f4a",
    accent: "#3b5b9a",
    divider: "rgba(0,0,0,0.10)",
    scanLabel: "#9b958a",
    avatarRing: "rgba(0,0,0,0.12)",
    avatarBg: "#e6e1d3",
    avatarText: "#3b5b9a",
  },
  {
    id: "rose",
    name: "Rose",
    scheme: "light",
    bg: ["#fdf3f5", "#f8e2e8"],
    glow: ["rgba(213,110,134,0.14)", "rgba(213,110,134,0)"],
    nameColor: "#43232c",
    headlineColor: "#c25671",
    companyColor: "#a3818b",
    contactColor: "#5d3d46",
    accent: "#d56e86",
    divider: "rgba(0,0,0,0.08)",
    scanLabel: "#b5969d",
    avatarRing: "rgba(0,0,0,0.10)",
    avatarBg: "#f4d4dd",
    avatarText: "#c25671",
  },
  {
    id: "mint",
    name: "Mint",
    scheme: "light",
    bg: ["#eef9f1", "#dcf1e3"],
    glow: ["rgba(52,165,116,0.14)", "rgba(52,165,116,0)"],
    nameColor: "#1e3a2c",
    headlineColor: "#2f9466",
    companyColor: "#7d9387",
    contactColor: "#33493e",
    accent: "#34a574",
    divider: "rgba(0,0,0,0.08)",
    scanLabel: "#93a89a",
    avatarRing: "rgba(0,0,0,0.10)",
    avatarBg: "#cdebd9",
    avatarText: "#2f9466",
  },
  {
    id: "sky",
    name: "Sky",
    scheme: "light",
    bg: ["#eef4fc", "#dbe8f8"],
    glow: ["rgba(74,143,208,0.14)", "rgba(74,143,208,0)"],
    nameColor: "#1e2f44",
    headlineColor: "#3f7fc4",
    companyColor: "#78889c",
    contactColor: "#33485f",
    accent: "#4a8fd0",
    divider: "rgba(0,0,0,0.08)",
    scanLabel: "#94a3b5",
    avatarRing: "rgba(0,0,0,0.10)",
    avatarBg: "#cfe0f3",
    avatarText: "#3f7fc4",
  },
  {
    id: "lavender",
    name: "Lavender",
    scheme: "light",
    bg: ["#f3effb", "#e6dcf6"],
    glow: ["rgba(157,111,214,0.14)", "rgba(157,111,214,0)"],
    nameColor: "#2c2440",
    headlineColor: "#8b5cca",
    companyColor: "#8a7f9c",
    contactColor: "#3f3656",
    accent: "#9d6fd6",
    divider: "rgba(0,0,0,0.08)",
    scanLabel: "#a89bb8",
    avatarRing: "rgba(0,0,0,0.10)",
    avatarBg: "#ddd0f1",
    avatarText: "#8b5cca",
  },

  /* ── New layout: minimal-mono ─────────────────────────
     Type-only editorial card. Pure paper with sumi-ink black
     text, a thin black hairline rule, tiny corner QR. For
     designers, art directors, premium consultants who want
     restraint over decoration. */
  {
    id: "mono-paper",
    name: "Mono Paper",
    scheme: "light",
    layout: "minimal-mono",
    bg: ["#F8F8F4", "#F4F4EE"],
    glow: ["rgba(0,0,0,0)", "rgba(0,0,0,0)"],
    nameColor: "#0A0A0A",
    headlineColor: "#3A3A3A",
    companyColor: "#6B6B6B",
    contactColor: "#0A0A0A",
    accent: "#0A0A0A",
    divider: "#0A0A0A",
    scanLabel: "#6B6B6B",
    avatarRing: "#0A0A0A",
    avatarBg: "#F0F0E8",
    avatarText: "#0A0A0A",
  },

  /* ── New layout: photo-forward ────────────────────────
     Left half of the card is the avatar (full-bleed); right
     half is identity, contacts, QR. For influencers, coaches,
     anyone whose face IS the brand. */
  {
    id: "portrait-noir",
    name: "Portrait Noir",
    scheme: "dark",
    layout: "photo-forward",
    bg: ["#0B0B12", "#03030A"],
    glow: ["rgba(255,215,0,0.18)", "rgba(255,215,0,0)"],
    nameColor: "#FFFFFF",
    headlineColor: "#FFD700",
    companyColor: "#9A9AA8",
    contactColor: "#E8E8F0",
    accent: "#FFD700",
    divider: "rgba(255,255,255,0.15)",
    scanLabel: "#8B8B98",
    avatarRing: "rgba(255,215,0,0.30)",
    avatarBg: "#1A1A24",
    avatarText: "#FFD700",
  },
  {
    id: "portrait-rose",
    name: "Portrait Rose",
    scheme: "light",
    layout: "photo-forward",
    bg: ["#FFF5F0", "#FFE2D6"],
    glow: ["rgba(244,114,182,0.18)", "rgba(244,114,182,0)"],
    nameColor: "#3D0A18",
    headlineColor: "#DB2777",
    companyColor: "#8B5A65",
    contactColor: "#3D0A18",
    accent: "#DB2777",
    divider: "rgba(219,39,119,0.15)",
    scanLabel: "#8B5A65",
    avatarRing: "rgba(219,39,119,0.30)",
    avatarBg: "#FFE0EB",
    avatarText: "#DB2777",
  },

  /* ── New layout: holographic ──────────────────────────
     Classic layout but with iridescent chrome gradient bg.
     Futuristic premium feel — tech founders, AI-forward
     personal brands, luxury affiliates. */
  {
    id: "holo-chrome",
    name: "Holo Chrome",
    scheme: "dark",
    layout: "holographic",
    bg: ["#1a0b33", "#0d1f3d"],
    glow: ["rgba(168,85,247,0.30)", "rgba(0,255,255,0)"],
    nameColor: "#FFFFFF",
    headlineColor: "#E9D5FF",
    companyColor: "#C4B5FD",
    contactColor: "#F3E8FF",
    accent: "#00FFFF",
    divider: "rgba(255,255,255,0.18)",
    scanLabel: "#C4B5FD",
    avatarRing: "rgba(0,255,255,0.40)",
    avatarBg: "#2A1B4A",
    avatarText: "#00FFFF",
  },
];

/** localStorage key for the user's last-picked card style. */
export const CARD_TEMPLATE_STORAGE_KEY = "credibly:card-template";

/** Resolve a template id to a template, falling back to the first one. */
export function getCardTemplate(id: string | null | undefined): CardTemplate {
  return CARD_TEMPLATES.find((t) => t.id === id) ?? CARD_TEMPLATES[0];
}
