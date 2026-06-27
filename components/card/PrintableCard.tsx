"use client";

import { useEffect, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Download, FileText, Share2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { CardShareModal } from "./CardShareModal";
import { QR_FG_DEFAULT } from "@/lib/constants";
import type { CardTemplate } from "@/lib/cardTemplates";
import { getAppOrigin } from "@/lib/utils";
import { toast } from "@/store/uiStore";
import type { Profile } from "@/types";

/* Standard business card: 3.5in x 2in at 300 DPI. */
const CARD_W = 1050;
const CARD_H = 600;

/* ── canvas helpers ── */

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function initialsOf(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .map((w) => w[0] ?? "")
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}

function setFont(
  ctx: CanvasRenderingContext2D,
  tpl: string,
  size: number,
): void {
  ctx.font = tpl.replace("{S}", String(size));
}

/** Shrink a `{S}` font template until `text` fits `maxW` (down to `minS`). */
function fitFont(
  ctx: CanvasRenderingContext2D,
  text: string,
  tpl: string,
  maxS: number,
  minS: number,
  maxW: number,
): void {
  let s = maxS;
  for (; s > minS; s--) {
    setFont(ctx, tpl, s);
    if (ctx.measureText(text).width <= maxW) break;
  }
  setFont(ctx, tpl, s);
}

/** Hard-trim `text` to `maxW`, appending an ellipsis when clipped. */
function truncateToWidth(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxW: number,
): string {
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxW) {
    t = t.slice(0, -1);
  }
  return `${t.replace(/\s+$/, "")}…`;
}

/** Word-wrap `text` to lines no wider than `maxW` (current ctx.font). */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxW: number,
): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (cur && ctx.measureText(test).width > maxW) {
      lines.push(cur);
      cur = w;
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

/**
 * Wrap `text` into at most `maxLines` lines, shrinking the font from `maxS`
 * down to `minS` only as much as needed so the whole headline fits without
 * being clipped. Returns the chosen size and the wrapped lines.
 */
function fitWrap(
  ctx: CanvasRenderingContext2D,
  text: string,
  fontTpl: string,
  maxS: number,
  minS: number,
  maxW: number,
  maxLines: number,
): { size: number; lines: string[] } {
  let size = minS;
  let lines: string[] = [];
  for (let s = maxS; s >= minS; s--) {
    ctx.font = fontTpl.replace("{S}", String(s));
    lines = wrapText(ctx, text, maxW);
    size = s;
    if (lines.length <= maxLines) break;
  }
  ctx.font = fontTpl.replace("{S}", String(size));
  if (lines.length > maxLines) {
    const head = lines.slice(0, maxLines - 1);
    head.push(lines.slice(maxLines - 1).join(" "));
    lines = head;
  }
  return { size, lines: lines.map((l) => truncateToWidth(ctx, l, maxW)) };
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Draw an image cover-fitted into a square region. */
function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  size: number,
): void {
  const ir = img.width / img.height;
  let sw: number, sh: number, sx: number, sy: number;
  if (ir > 1) {
    sh = img.height;
    sw = sh;
    sx = (img.width - sw) / 2;
    sy = 0;
  } else {
    sw = img.width;
    sh = sw;
    sx = 0;
    sy = (img.height - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, size, size);
}

async function drawCard(
  canvas: HTMLCanvasElement,
  qrCanvas: HTMLCanvasElement | null,
  profile: Profile,
  websiteUrl: string,
  theme: CardTemplate,
): Promise<void> {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  try {
    await document.fonts.ready;
  } catch {
    /* fonts API unavailable — fall back to system font */
  }
  const fam =
    getComputedStyle(document.body).fontFamily || "system-ui, sans-serif";

  ctx.clearRect(0, 0, CARD_W, CARD_H);

  /* Layout dispatch — each branch is a self-contained drawing
     pipeline. "classic" preserves the original look so every
     existing template renders identically. */
  const layout = theme.layout ?? "classic";
  if (layout === "minimal-mono") {
    return drawMinimalMono(ctx, qrCanvas, profile, websiteUrl, theme, fam);
  }
  if (layout === "photo-forward") {
    return drawPhotoForward(ctx, qrCanvas, profile, websiteUrl, theme, fam);
  }
  /* "holographic" reuses the classic pipeline but paints an
     iridescent multi-stop gradient as the bg first. Falls through
     to the classic block below. */
  const h = profile.header;

  /* Background */
  if (layout === "holographic") {
    /* Iridescent diagonal sweep for the chrome/holo look. */
    const bg = ctx.createLinearGradient(0, 0, CARD_W, CARD_H);
    bg.addColorStop(0, "#1a0b33");
    bg.addColorStop(0.35, "#3b0d63");
    bg.addColorStop(0.55, "#0d3d6b");
    bg.addColorStop(0.8, "#0d6b58");
    bg.addColorStop(1, "#1a0b33");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, CARD_W, CARD_H);
    /* Iridescent overlay sweep for that "shifting colour" feel. */
    const sheen = ctx.createLinearGradient(0, 0, CARD_W, CARD_H);
    sheen.addColorStop(0, "rgba(255,255,255,0)");
    sheen.addColorStop(0.5, "rgba(255,255,255,0.08)");
    sheen.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, CARD_W, CARD_H);
  } else {
    const bg = ctx.createLinearGradient(0, 0, 0, CARD_H);
    bg.addColorStop(0, theme.bg[0]);
    bg.addColorStop(1, theme.bg[1]);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, CARD_W, CARD_H);
  }

  /* Accent glow */
  const glow = ctx.createRadialGradient(
    CARD_W - 130,
    70,
    0,
    CARD_W - 130,
    70,
    440,
  );
  glow.addColorStop(0, theme.glow[0]);
  glow.addColorStop(1, theme.glow[1]);
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  const PAD = 64;
  const avSize = 120;
  const avX = PAD;
  const avY = 64;

  /* Avatar (cover-fit) or initials disc.
     Routed through the same-origin /api/img proxy so the canvas isn't
     tainted by Firebase Storage's missing CORS headers. */
  const avatar = h.avatarUrl
    ? await loadImage(`/api/img?url=${encodeURIComponent(h.avatarUrl)}`)
    : null;
  ctx.save();
  ctx.beginPath();
  ctx.arc(avX + avSize / 2, avY + avSize / 2, avSize / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  if (avatar) {
    drawCover(ctx, avatar, avX, avY, avSize);
  } else {
    ctx.fillStyle = theme.avatarBg;
    ctx.fillRect(avX, avY, avSize, avSize);
  }
  ctx.restore();
  if (!avatar) {
    ctx.fillStyle = theme.avatarText;
    ctx.font = `600 44px ${fam}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      initialsOf(h.displayName),
      avX + avSize / 2,
      avY + avSize / 2 + 2,
    );
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  }
  ctx.strokeStyle = theme.avatarRing;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(avX + avSize / 2, avY + avSize / 2, avSize / 2, 0, Math.PI * 2);
  ctx.stroke();

  /* Identity block — name, then a wrapped headline, then company.
     The headline word-wraps to a 2nd line instead of being clipped. */
  const textX = avX + avSize + 32;
  const textMaxW = 660 - textX;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";

  const nameY = avY + 50;
  fitFont(ctx, h.displayName, `700 {S}px ${fam}`, 44, 28, textMaxW);
  ctx.fillStyle = theme.nameColor;
  ctx.fillText(truncateToWidth(ctx, h.displayName, textMaxW), textX, nameY);

  let blockY = nameY;
  if (h.headline && h.headline.trim().length > 0) {
    const { size, lines } = fitWrap(
      ctx,
      h.headline,
      `600 {S}px ${fam}`,
      24,
      17,
      textMaxW,
      3,
    );
    const lineH = Math.round(size * 1.32);
    ctx.fillStyle = theme.headlineColor;
    let hy = nameY + 40;
    for (const ln of lines) {
      ctx.fillText(ln, textX, hy);
      blockY = hy;
      hy += lineH;
    }
  }
  if (h.company) {
    fitFont(ctx, h.company, `400 {S}px ${fam}`, 22, 15, textMaxW);
    ctx.fillStyle = theme.companyColor;
    const companyY = blockY === nameY ? nameY + 38 : blockY + 34;
    ctx.fillText(truncateToWidth(ctx, h.company, textMaxW), textX, companyY);
    blockY = companyY;
  }

  /* Divider — flows below the identity block so a 3-line headline never
     collides with it, but never rises above the original balanced spot. */
  const dividerY = Math.max(256, blockY + 22);
  ctx.strokeStyle = theme.divider;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(PAD, dividerY);
  ctx.lineTo(636, dividerY);
  ctx.stroke();

  /* Contact lines */
  const contacts = [h.phone, h.email, websiteUrl.replace(/^https?:\/\//, "")]
    .map((v) => (v ?? "").trim())
    .filter((v) => v.length > 0);
  let cy = dividerY + 62;
  for (const val of contacts) {
    ctx.fillStyle = theme.accent;
    ctx.beginPath();
    ctx.arc(PAD + 5, cy - 8, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = theme.contactColor;
    fitFont(ctx, val, `400 {S}px ${fam}`, 25, 16, 530);
    ctx.fillText(truncateToWidth(ctx, val, 530), PAD + 28, cy);
    cy += 50;
  }

  /* QR panel — always a white panel with a dark code for reliable scanning. */
  const qW = 296;
  const qX = CARD_W - PAD - qW;
  const qY = 150;
  ctx.save();
  if (theme.scheme === "light") {
    ctx.shadowColor = "rgba(0,0,0,0.14)";
    ctx.shadowBlur = 26;
    ctx.shadowOffsetY = 8;
  }
  roundRectPath(ctx, qX, qY, qW, qW, 26);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.restore();
  roundRectPath(ctx, qX, qY, qW, qW, 26);
  ctx.strokeStyle = "rgba(0,0,0,0.10)";
  ctx.lineWidth = 2;
  ctx.stroke();
  if (qrCanvas) {
    const inner = 248;
    const off = (qW - inner) / 2;
    ctx.drawImage(qrCanvas, qX + off, qY + off, inner, inner);
  }
  ctx.fillStyle = theme.scanLabel;
  ctx.font = `600 17px ${fam}`;
  ctx.textAlign = "center";
  ctx.fillText("SCAN TO VIEW FULL PROFILE", qX + qW / 2, qY + qW + 40);
  ctx.textAlign = "left";
}

/* ──────────────────────────────────────────
   Minimal-mono layout — typographic editorial.
   Pure paper, sumi-ink black, big name, thin
   rule, tiny contacts, tiny corner QR.
────────────────────────────────────────── */

async function drawMinimalMono(
  ctx: CanvasRenderingContext2D,
  qrCanvas: HTMLCanvasElement | null,
  profile: Profile,
  websiteUrl: string,
  theme: CardTemplate,
  fam: string,
): Promise<void> {
  const h = profile.header;
  /* Flat paper bg. */
  const bg = ctx.createLinearGradient(0, 0, 0, CARD_H);
  bg.addColorStop(0, theme.bg[0]);
  bg.addColorStop(1, theme.bg[1]);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  const PAD = 80;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";

  /* Tiny eyebrow label */
  ctx.fillStyle = theme.companyColor;
  ctx.font = `600 18px ${fam}`;
  ctx.fillText("CREDIBLY PROFILE", PAD, PAD + 4);

  /* Huge name, single line, hard-fit. */
  fitFont(ctx, h.displayName, `800 {S}px ${fam}`, 76, 40, CARD_W - PAD * 2);
  ctx.fillStyle = theme.nameColor;
  ctx.fillText(
    truncateToWidth(ctx, h.displayName, CARD_W - PAD * 2),
    PAD,
    PAD + 100,
  );

  /* Headline below name. */
  if (h.headline) {
    const { lines } = fitWrap(
      ctx,
      h.headline,
      `400 {S}px ${fam}`,
      26,
      18,
      CARD_W - PAD * 2,
      2,
    );
    ctx.fillStyle = theme.headlineColor;
    let hy = PAD + 145;
    for (const ln of lines) {
      ctx.fillText(ln, PAD, hy);
      hy += 34;
    }
  }

  /* Thin hairline rule */
  ctx.strokeStyle = theme.divider;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD, CARD_H - 180);
  ctx.lineTo(CARD_W - PAD - 180, CARD_H - 180);
  ctx.stroke();

  /* Compact contact stack */
  const contacts = [h.phone, h.email, websiteUrl.replace(/^https?:\/\//, "")]
    .map((v) => (v ?? "").trim())
    .filter((v) => v.length > 0);
  ctx.font = `400 17px ${fam}`;
  ctx.fillStyle = theme.contactColor;
  let cy = CARD_H - 140;
  for (const val of contacts) {
    ctx.fillText(truncateToWidth(ctx, val, CARD_W - PAD * 2 - 200), PAD, cy);
    cy += 28;
  }

  /* Tiny corner QR */
  const qW = 140;
  const qX = CARD_W - PAD - qW;
  const qY = CARD_H - PAD - qW;
  roundRectPath(ctx, qX, qY, qW, qW, 8);
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();
  roundRectPath(ctx, qX, qY, qW, qW, 8);
  ctx.strokeStyle = theme.divider;
  ctx.lineWidth = 1;
  ctx.stroke();
  if (qrCanvas) {
    const inner = 116;
    const off = (qW - inner) / 2;
    ctx.drawImage(qrCanvas, qX + off, qY + off, inner, inner);
  }
}

/* ──────────────────────────────────────────
   Photo-forward layout — left half is the
   avatar full-bleed, right half is identity +
   contacts + QR stacked.
────────────────────────────────────────── */

async function drawPhotoForward(
  ctx: CanvasRenderingContext2D,
  qrCanvas: HTMLCanvasElement | null,
  profile: Profile,
  websiteUrl: string,
  theme: CardTemplate,
  fam: string,
): Promise<void> {
  const h = profile.header;
  const SPLIT = Math.round(CARD_W * 0.42); /* photo takes ~42% of width */

  /* Right-half bg */
  const bg = ctx.createLinearGradient(SPLIT, 0, CARD_W, CARD_H);
  bg.addColorStop(0, theme.bg[0]);
  bg.addColorStop(1, theme.bg[1]);
  ctx.fillStyle = bg;
  ctx.fillRect(SPLIT, 0, CARD_W - SPLIT, CARD_H);

  /* Accent glow on the right */
  const glow = ctx.createRadialGradient(
    CARD_W - 130,
    70,
    0,
    CARD_W - 130,
    70,
    400,
  );
  glow.addColorStop(0, theme.glow[0]);
  glow.addColorStop(1, theme.glow[1]);
  ctx.fillStyle = glow;
  ctx.fillRect(SPLIT, 0, CARD_W - SPLIT, CARD_H);

  /* Avatar — full-bleed on the left half */
  const avatar = h.avatarUrl
    ? await loadImage(`/api/img?url=${encodeURIComponent(h.avatarUrl)}`)
    : null;
  if (avatar) {
    /* Cover-fit into SPLIT × CARD_H box */
    const targetRatio = SPLIT / CARD_H;
    const sourceRatio = avatar.width / avatar.height;
    let sw: number, sh: number, sx: number, sy: number;
    if (sourceRatio > targetRatio) {
      sh = avatar.height;
      sw = Math.round(sh * targetRatio);
      sx = Math.round((avatar.width - sw) / 2);
      sy = 0;
    } else {
      sw = avatar.width;
      sh = Math.round(sw / targetRatio);
      sx = 0;
      sy = Math.round((avatar.height - sh) / 2);
    }
    ctx.drawImage(avatar, sx, sy, sw, sh, 0, 0, SPLIT, CARD_H);
  } else {
    ctx.fillStyle = theme.avatarBg;
    ctx.fillRect(0, 0, SPLIT, CARD_H);
    ctx.fillStyle = theme.avatarText;
    ctx.font = `700 96px ${fam}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(initialsOf(h.displayName), SPLIT / 2, CARD_H / 2);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  }

  /* Right-half content */
  const PAD = 48;
  const textX = SPLIT + PAD;
  const textMaxW = CARD_W - textX - PAD;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";

  fitFont(ctx, h.displayName, `700 {S}px ${fam}`, 40, 26, textMaxW);
  ctx.fillStyle = theme.nameColor;
  ctx.fillText(truncateToWidth(ctx, h.displayName, textMaxW), textX, PAD + 30);

  let nextY = PAD + 70;
  if (h.headline) {
    const { size, lines } = fitWrap(
      ctx,
      h.headline,
      `500 {S}px ${fam}`,
      19,
      14,
      textMaxW,
      2,
    );
    ctx.fillStyle = theme.headlineColor;
    let hy = nextY;
    for (const ln of lines) {
      ctx.fillText(ln, textX, hy);
      hy += Math.round(size * 1.3);
      nextY = hy;
    }
  }

  /* Contact rows */
  const contacts = [h.phone, h.email, websiteUrl.replace(/^https?:\/\//, "")]
    .map((v) => (v ?? "").trim())
    .filter((v) => v.length > 0);
  ctx.font = `400 14px ${fam}`;
  ctx.fillStyle = theme.contactColor;
  let cy = nextY + 24;
  for (const val of contacts) {
    ctx.fillStyle = theme.accent;
    ctx.beginPath();
    ctx.arc(textX + 4, cy - 5, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = theme.contactColor;
    fitFont(ctx, val, `400 {S}px ${fam}`, 16, 11, textMaxW - 20);
    ctx.fillText(truncateToWidth(ctx, val, textMaxW - 20), textX + 18, cy);
    cy += 26;
  }

  /* QR — bottom-right corner of the right half */
  const qW = 140;
  const qX = CARD_W - PAD - qW;
  const qY = CARD_H - PAD - qW;
  roundRectPath(ctx, qX, qY, qW, qW, 12);
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();
  if (qrCanvas) {
    const inner = 116;
    const off = (qW - inner) / 2;
    ctx.drawImage(qrCanvas, qX + off, qY + off, inner, inner);
  }
}

/* ── component ── */

export function PrintableCard({
  profile,
  template,
}: {
  profile: Profile;
  template: CardTemplate;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const qrWrapRef = useRef<HTMLDivElement>(null);
  const [rendered, setRendered] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const websiteUrl = `${getAppOrigin()}/${profile.username}`;

  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    setRendered(false);
    const qrCanvas = qrWrapRef.current?.querySelector("canvas") ?? null;
    drawCard(canvas, qrCanvas, profile, websiteUrl, template).then(() => {
      if (!cancelled) setRendered(true);
    });
    return () => {
      cancelled = true;
    };
  }, [profile, websiteUrl, template]);

  const downloadPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `${profile.username}-business-card.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    toast.success("Business card PNG downloaded");
  };

  const downloadPdf = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setPdfBusy(true);
    try {
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ unit: "in", format: [3.5, 2] });
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, 3.5, 2);
      pdf.save(`${profile.username}-business-card.pdf`);
      toast.success("Print-ready PDF downloaded");
    } catch {
      toast.error("Couldn't generate the PDF — try the PNG instead.");
    } finally {
      setPdfBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Off-screen QR source for the canvas */}
      <div
        ref={qrWrapRef}
        aria-hidden
        className="pointer-events-none absolute -left-[9999px] -top-[9999px]"
      >
        <QRCodeCanvas
          value={websiteUrl}
          size={512}
          level="H"
          fgColor={QR_FG_DEFAULT}
          bgColor="#ffffff"
          marginSize={1}
        />
      </div>

      <canvas
        ref={canvasRef}
        width={CARD_W}
        height={CARD_H}
        className="w-full rounded-2xl border border-white/[0.08] shadow-card"
      />

      <Button
        onClick={() => setShareOpen(true)}
        disabled={!rendered}
        fullWidth
        leftIcon={<Share2 className="h-4 w-4" />}
      >
        Share business card
      </Button>

      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          onClick={downloadPng}
          disabled={!rendered}
          leftIcon={<Download className="h-4 w-4" />}
        >
          PNG
        </Button>
        <Button
          variant="outline"
          onClick={downloadPdf}
          loading={pdfBusy}
          disabled={!rendered}
          leftIcon={<FileText className="h-4 w-4" />}
        >
          Print PDF
        </Button>
      </div>

      <p className="text-center text-xs text-white/35">
        Standard 3.5″ × 2″ business card · 300 DPI
      </p>

      <CardShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        canvasRef={canvasRef}
        profile={profile}
      />
    </div>
  );
}
