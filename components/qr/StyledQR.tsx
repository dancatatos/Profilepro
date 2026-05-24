"use client";

import { useEffect, useRef } from "react";
import QRCodeStyling, { type Options } from "qr-code-styling";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { toast } from "@/store/uiStore";
import { QR_BG_DEFAULT, QR_FG_DEFAULT } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { QRTemplate } from "@/lib/qrTemplates";

/**
 * Build a QRCodeStyling Options object from one of our templates. Renders
 * at 1024×1024 internally for crisp HD download — the rendered canvas is
 * scaled to the requested `display` size via CSS.
 */
function buildOptions(
  value: string,
  template: QRTemplate,
  imageSrc: string | undefined,
): Options {
  return {
    width: 1024,
    height: 1024,
    type: "canvas",
    data: value || "https://credibly.app",
    image: imageSrc,
    margin: 16,
    qrOptions: { errorCorrectionLevel: "H" },
    dotsOptions: {
      type: template.dotsType ?? "square",
      color: QR_FG_DEFAULT,
      ...(template.dotsGradient
        ? {
            gradient: {
              type: "linear",
              rotation: (template.dotsGradient.angle * Math.PI) / 180,
              colorStops: [
                { offset: 0, color: template.dotsGradient.from },
                { offset: 1, color: template.dotsGradient.to },
              ],
            },
          }
        : {}),
    },
    cornersSquareOptions: {
      type: template.cornersSquareType ?? "square",
      color: QR_FG_DEFAULT,
    },
    cornersDotOptions: {
      type: template.cornersDotType ?? "square",
      color: QR_FG_DEFAULT,
    },
    backgroundOptions: { color: QR_BG_DEFAULT },
    imageOptions: {
      hideBackgroundDots: true,
      imageSize: 0.22,
      margin: 4,
      crossOrigin: "anonymous",
    },
  };
}

/**
 * QR code in a styled panel — uses qr-code-styling so we can have
 * rounded/classy modules and gradient dots. The QR itself stays
 * dark on white (with optional gradient) and uses error-correction H
 * so it still scans cleanly even with styled modules and a centre image.
 */
export function StyledQR({
  value,
  template,
  avatarUrl,
  display = 240,
  fileName = "credibly-qr",
  showDownload = true,
  className,
}: {
  value: string;
  template: QRTemplate;
  avatarUrl?: string;
  display?: number;
  fileName?: string;
  showDownload?: boolean;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const qrRef = useRef<QRCodeStyling | null>(null);

  /* Route the avatar through the same-origin /api/img proxy so the canvas
     isn't tainted by Firebase Storage's missing CORS headers. */
  const imageSrc =
    template.includeAvatar && avatarUrl
      ? `/api/img?url=${encodeURIComponent(avatarUrl)}`
      : undefined;

  useEffect(() => {
    if (!containerRef.current) return;
    const opts = buildOptions(value, template, imageSrc);
    if (!qrRef.current) {
      qrRef.current = new QRCodeStyling(opts);
      qrRef.current.append(containerRef.current);
    } else {
      qrRef.current.update(opts);
    }
    /* qr-code-styling renders the canvas at width/height = 1024 px.
       Scale it down to the requested `display` size via CSS — keeps the
       crisp HD pixels while fitting the UI. */
    const canvas = containerRef.current.querySelector("canvas");
    if (canvas instanceof HTMLCanvasElement) {
      canvas.style.width = `${display}px`;
      canvas.style.height = `${display}px`;
    }
  }, [value, template, imageSrc, display]);

  const download = () => {
    qrRef.current?.download({ name: fileName, extension: "png" });
    toast.success("HD QR code downloaded");
  };

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <div
        className="flex flex-col items-center rounded-3xl p-5"
        style={{
          background: template.panelBg,
          border: `1px solid ${template.panelBorder}`,
          boxShadow: template.panelShadow,
        }}
      >
        <div
          className="rounded-2xl bg-white p-3.5"
          style={{ border: `1px solid ${template.qrCardBorder}` }}
        >
          <div
            ref={containerRef}
            style={{ width: display, height: display }}
          />
        </div>
        {template.label && (
          <p
            className="mt-3 text-center text-xs font-bold uppercase tracking-[0.25em]"
            style={{ color: template.labelColor }}
          >
            {template.label}
          </p>
        )}
      </div>
      {showDownload && (
        <Button
          variant="outline"
          size="sm"
          leftIcon={<Download className="h-4 w-4" />}
          onClick={download}
        >
          Download HD PNG
        </Button>
      )}
    </div>
  );
}
