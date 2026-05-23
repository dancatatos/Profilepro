/**
 * Shared QR templates — control the panel styling, label and optional
 * avatar overlay around the QR. The QR modules themselves stay
 * dark-on-white in every template so they remain universally scannable.
 */

export type QRDotsType =
  | "square"
  | "rounded"
  | "dots"
  | "classy"
  | "classy-rounded"
  | "extra-rounded";
export type QRCornersSquareType = "square" | "dot" | "extra-rounded";
export type QRCornersDotType = "square" | "dot";

export interface QRTemplate {
  id: string;
  name: string;
  scheme: "dark" | "light";
  /** Outer panel background — solid color or CSS gradient. */
  panelBg: string;
  /** Outer panel border colour. */
  panelBorder: string;
  /** Outer panel shadow. */
  panelShadow: string;
  /** Border on the inner white QR card. */
  qrCardBorder: string;
  /** Label shown below the QR — set to "" to hide it. */
  label: string;
  /** Label text colour. */
  labelColor: string;
  /** Embed the user's avatar in the centre of the QR. */
  includeAvatar: boolean;
  /** Module / dot style — defaults to "square". */
  dotsType?: QRDotsType;
  /** Three large position markers — defaults to "square". */
  cornersSquareType?: QRCornersSquareType;
  /** Inner dot of each position marker — defaults to "square". */
  cornersDotType?: QRCornersDotType;
  /** Optional gradient applied to the QR modules. */
  dotsGradient?: { angle: number; from: string; to: string };
}

export const QR_TEMPLATES: QRTemplate[] = [
  {
    id: "classic",
    name: "Classic",
    scheme: "light",
    panelBg: "#ffffff",
    panelBorder: "rgba(0,0,0,0.08)",
    panelShadow: "0 4px 24px rgba(0,0,0,0.10)",
    qrCardBorder: "transparent",
    label: "",
    labelColor: "#0a0a0c",
    includeAvatar: false,
    dotsType: "square",
    cornersSquareType: "square",
    cornersDotType: "square",
  },
  {
    id: "midnight",
    name: "Midnight",
    scheme: "dark",
    panelBg: "linear-gradient(160deg, #15151f, #0a0a10)",
    panelBorder: "rgba(255,255,255,0.10)",
    panelShadow: "0 8px 32px rgba(0,0,0,0.45)",
    qrCardBorder: "transparent",
    label: "SCAN ME",
    labelColor: "#5b8cff",
    includeAvatar: true,
    dotsType: "rounded",
    cornersSquareType: "extra-rounded",
    cornersDotType: "dot",
  },
  {
    id: "gold-elite",
    name: "Gold Elite",
    scheme: "dark",
    panelBg: "#0a0a0c",
    panelBorder: "rgba(205,164,94,0.40)",
    panelShadow: "0 0 30px rgba(205,164,94,0.25)",
    qrCardBorder: "rgba(205,164,94,0.30)",
    label: "SCAN ME",
    labelColor: "#e3c081",
    includeAvatar: true,
    dotsType: "classy",
    cornersSquareType: "extra-rounded",
    cornersDotType: "dot",
  },
  {
    id: "glass",
    name: "Glass",
    scheme: "dark",
    panelBg: "rgba(20,20,25,0.62)",
    panelBorder: "rgba(255,255,255,0.09)",
    panelShadow: "0 8px 32px rgba(0,0,0,0.45)",
    qrCardBorder: "transparent",
    label: "SCAN TO VIEW",
    labelColor: "rgba(255,255,255,0.65)",
    includeAvatar: true,
    dotsType: "dots",
    cornersSquareType: "dot",
    cornersDotType: "dot",
  },
  {
    id: "brand-bold",
    name: "Brand Bold",
    scheme: "dark",
    panelBg: "linear-gradient(135deg, #2e6bff, #1a52e0)",
    panelBorder: "rgba(255,255,255,0.20)",
    panelShadow: "0 8px 32px rgba(46,107,255,0.30)",
    qrCardBorder: "transparent",
    label: "SCAN ME",
    labelColor: "#ffffff",
    includeAvatar: true,
    dotsType: "extra-rounded",
    cornersSquareType: "extra-rounded",
    cornersDotType: "dot",
    dotsGradient: { angle: 45, from: "#0a0a0c", to: "#2e6bff" },
  },
  {
    id: "plum",
    name: "Plum Royal",
    scheme: "dark",
    panelBg: "linear-gradient(160deg, #2c1838, #160b1d)",
    panelBorder: "rgba(192,132,252,0.30)",
    panelShadow: "0 8px 32px rgba(192,132,252,0.20)",
    qrCardBorder: "transparent",
    label: "SCAN ME",
    labelColor: "#d6aefc",
    includeAvatar: true,
    dotsType: "classy-rounded",
    cornersSquareType: "extra-rounded",
    cornersDotType: "dot",
    dotsGradient: { angle: 135, from: "#160b1d", to: "#7c3aed" },
  },
  {
    id: "ivory",
    name: "Ivory",
    scheme: "light",
    panelBg: "linear-gradient(160deg, #fbf9f3, #efebe0)",
    panelBorder: "rgba(0,0,0,0.10)",
    panelShadow: "0 4px 24px rgba(0,0,0,0.10)",
    qrCardBorder: "rgba(0,0,0,0.06)",
    label: "SCAN ME",
    labelColor: "#3b5b9a",
    includeAvatar: false,
    dotsType: "rounded",
    cornersSquareType: "extra-rounded",
    cornersDotType: "dot",
  },
  {
    id: "mint",
    name: "Mint Fresh",
    scheme: "light",
    panelBg: "linear-gradient(160deg, #eef9f1, #dcf1e3)",
    panelBorder: "rgba(52,165,116,0.30)",
    panelShadow: "0 4px 24px rgba(52,165,116,0.15)",
    qrCardBorder: "rgba(0,0,0,0.06)",
    label: "SCAN ME",
    labelColor: "#2f9466",
    includeAvatar: false,
    dotsType: "rounded",
    cornersSquareType: "extra-rounded",
    cornersDotType: "dot",
  },
];

/** localStorage key for the user's last-picked QR style. */
export const QR_TEMPLATE_STORAGE_KEY = "credibly:qr-template";

/** Resolve a template id to a template, falling back to the first one. */
export function getQRTemplate(id: string | null | undefined): QRTemplate {
  return QR_TEMPLATES.find((t) => t.id === id) ?? QR_TEMPLATES[0];
}
