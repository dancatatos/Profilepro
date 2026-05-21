"use client";

import { useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { toast } from "@/store/uiStore";
import { QR_BG_DEFAULT, QR_FG_DEFAULT } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * Branded QR code. Renders at 1024px backing resolution for crisp
 * HD PNG export, while displaying at the requested CSS size.
 */
export function QRBlock({
  value,
  display = 220,
  fileName = "credibly-qr",
  showDownload = true,
  className,
}: {
  value: string;
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

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <div
        ref={wrap}
        className="rounded-3xl bg-white p-3.5 shadow-glass"
        style={{ width: display + 28, height: display + 28 }}
      >
        <QRCodeCanvas
          value={value || "https://credibly.app"}
          size={1024}
          level="H"
          fgColor={QR_FG_DEFAULT}
          bgColor={QR_BG_DEFAULT}
          marginSize={2}
          style={{ width: display, height: display }}
        />
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
