"use client";

import { useEffect, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { APP, QR_FG_DEFAULT } from "@/lib/constants";
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

/** Largest font size (from a `{S}` template) at which `text` fits `maxW`. */
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
    ctx.font = tpl.replace("{S}", String(s));
    if (ctx.measureText(text).width <= maxW) break;
  }
  ctx.font = tpl.replace("{S}", String(s));
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
  const h = profile.header;

  /* Background */
  const bg = ctx.createLinearGradient(0, 0, 0, CARD_H);
  bg.addColorStop(0, "#13131f");
  bg.addColorStop(1, "#0a0a10");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  /* Accent glow */
  const glow = ctx.createRadialGradient(
    CARD_W - 130,
    70,
    0,
    CARD_W - 130,
    70,
    440,
  );
  glow.addColorStop(0, "rgba(46,107,255,0.22)");
  glow.addColorStop(1, "rgba(46,107,255,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  const PAD = 64;
  const avSize = 120;
  const avX = PAD;
  const avY = 64;

  /* Avatar (cover-fit) or initials disc */
  const avatar = h.avatarUrl ? await loadImage(h.avatarUrl) : null;
  ctx.save();
  ctx.beginPath();
  ctx.arc(avX + avSize / 2, avY + avSize / 2, avSize / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  if (avatar) {
    drawCover(ctx, avatar, avX, avY, avSize);
  } else {
    ctx.fillStyle = "#1b2540";
    ctx.fillRect(avX, avY, avSize, avSize);
  }
  ctx.restore();
  if (!avatar) {
    ctx.fillStyle = "#8fb0ff";
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
  ctx.strokeStyle = "rgba(255,255,255,0.16)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(avX + avSize / 2, avY + avSize / 2, avSize / 2, 0, Math.PI * 2);
  ctx.stroke();

  /* Identity block */
  const textX = avX + avSize + 32;
  const textMaxW = 660 - textX;
  ctx.textBaseline = "alphabetic";

  ctx.fillStyle = "#ffffff";
  fitFont(ctx, h.displayName, `700 {S}px ${fam}`, 46, 28, textMaxW);
  ctx.fillText(h.displayName, textX, avY + 52);

  if (h.headline) {
    ctx.fillStyle = "#5b8cff";
    fitFont(ctx, h.headline, `600 {S}px ${fam}`, 25, 16, textMaxW);
    ctx.fillText(h.headline, textX, avY + 90);
  }
  if (h.company) {
    ctx.fillStyle = "#9aa0ad";
    fitFont(ctx, h.company, `400 {S}px ${fam}`, 22, 15, textMaxW);
    ctx.fillText(h.company, textX, avY + 122);
  }

  /* Divider */
  ctx.strokeStyle = "rgba(255,255,255,0.10)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(PAD, 256);
  ctx.lineTo(636, 256);
  ctx.stroke();

  /* Contact lines */
  const contacts = [h.phone, h.email, websiteUrl.replace(/^https?:\/\//, "")]
    .map((v) => (v ?? "").trim())
    .filter((v) => v.length > 0);
  let cy = 318;
  for (const val of contacts) {
    ctx.fillStyle = "#5b8cff";
    ctx.beginPath();
    ctx.arc(PAD + 5, cy - 8, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e8eaf0";
    fitFont(ctx, val, `400 {S}px ${fam}`, 25, 16, 530);
    ctx.fillText(val, PAD + 28, cy);
    cy += 50;
  }

  /* QR panel */
  const qW = 296;
  const qX = CARD_W - PAD - qW;
  const qY = 150;
  roundRectPath(ctx, qX, qY, qW, qW, 26);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  if (qrCanvas) {
    const inner = 248;
    const off = (qW - inner) / 2;
    ctx.drawImage(qrCanvas, qX + off, qY + off, inner, inner);
  }
  ctx.fillStyle = "#8b8f9c";
  ctx.font = `600 17px ${fam}`;
  ctx.textAlign = "center";
  ctx.fillText("SCAN TO VIEW FULL PROFILE", qX + qW / 2, qY + qW + 40);
  ctx.textAlign = "left";
}

/* ── component ── */

export function PrintableCard({ profile }: { profile: Profile }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const qrWrapRef = useRef<HTMLDivElement>(null);
  const [rendered, setRendered] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);

  const websiteUrl = `${APP.url}/${profile.username}`;

  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    setRendered(false);
    const qrCanvas = qrWrapRef.current?.querySelector("canvas") ?? null;
    drawCard(canvas, qrCanvas, profile, websiteUrl).then(() => {
      if (!cancelled) setRendered(true);
    });
    return () => {
      cancelled = true;
    };
  }, [profile, websiteUrl]);

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

      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          onClick={downloadPng}
          disabled={!rendered}
          leftIcon={<Download className="h-4 w-4" />}
        >
          Download PNG
        </Button>
        <Button
          onClick={downloadPdf}
          loading={pdfBusy}
          disabled={!rendered}
          leftIcon={<FileText className="h-4 w-4" />}
        >
          Print-ready PDF
        </Button>
      </div>

      <p className="text-center text-xs text-white/35">
        Standard 3.5″ × 2″ business card · 300 DPI
      </p>
    </div>
  );
}
