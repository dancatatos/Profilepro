"use client";

import { useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { toast } from "@/store/uiStore";
import { QR_BG_DEFAULT, QR_FG_DEFAULT } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { QRTemplate } from "@/lib/qrTemplates";

/**
 * QR code in a styled panel — panel bg/border/shadow, optional label and
 * optional avatar overlay come from the chosen template. The QR itself
 * stays dark-on-white in every template so it always scans cleanly.
 *
 * The HD download is the bare QR canvas (most useful for print/embed).
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
  const wrap = useRef<HTMLDivElement>(null);

  const download = () => {
    const canvas = wrap.current?.querySelector("canvas");
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `${fileName}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    toast.success("HD QR code downloaded");
  };

  /* Route the avatar through the same-origin /api/img proxy so the canvas
     isn't tainted by Firebase Storage's missing CORS headers. */
  const imageSettings =
    template.includeAvatar && avatarUrl
      ? {
          src: `/api/img?url=${encodeURIComponent(avatarUrl)}`,
          height: Math.round(display * 0.22),
          width: Math.round(display * 0.22),
          excavate: true,
          crossOrigin: "anonymous" as const,
        }
      : undefined;

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <div
        ref={wrap}
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
          <QRCodeCanvas
            value={value || "https://credibly.app"}
            size={1024}
            level="H"
            fgColor={QR_FG_DEFAULT}
            bgColor={QR_BG_DEFAULT}
            marginSize={2}
            imageSettings={imageSettings}
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
