/**
 * Shared card templates — used by both the on-screen digital business card
 * preview and the print-ready canvas card so the two always match.
 */

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
];

/** localStorage key for the user's last-picked card style. */
export const CARD_TEMPLATE_STORAGE_KEY = "credibly:card-template";

/** Resolve a template id to a template, falling back to the first one. */
export function getCardTemplate(id: string | null | undefined): CardTemplate {
  return CARD_TEMPLATES.find((t) => t.id === id) ?? CARD_TEMPLATES[0];
}
