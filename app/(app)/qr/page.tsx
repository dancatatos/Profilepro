"use client";

import { useEffect, useState } from "react";
import { Copy, Printer, QrCode } from "lucide-react";
import { useProfileStore } from "@/store/profileStore";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/common/PageHeader";
import { StyledQR } from "@/components/qr/StyledQR";
import { QRTemplatePicker } from "@/components/qr/QRTemplatePicker";
import {
  QR_TEMPLATE_STORAGE_KEY,
  getQRTemplate,
} from "@/lib/qrTemplates";
import { copyToClipboard, getAppOrigin } from "@/lib/utils";
import { toast } from "@/store/uiStore";

/**
 * Compute a safe QR display size for the current viewport.
 *
 * Originally measured the Card's clientWidth, but that hit a chicken-
 * and-egg problem: the QR initially renders at 240px, overflows the
 * Card on narrow phones, the Card grows to fit (via flex layout), the
 * measurement returns "plenty of room" and never shrinks the QR.
 *
 * Fix: anchor the calculation to `window.innerWidth` instead. That's a
 * stable ceiling that doesn't depend on the QR itself, so we always
 * shrink correctly. Overhead numbers below match the actual padding
 * chain (page px-4 + Card p-4 + QR panel p-5 + inner card p-3.5).
 */
function useResponsiveQRSize(): number {
  const [size, setSize] = useState(240);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const compute = () => {
      const vw = window.innerWidth;
      /* Two-column grid kicks in at lg (1024px+) — at that point the
         QR card gets half the viewport minus gap + sidebar (64px nav).
         For < lg we have the full content width, single column. */
      const isWideLayout = vw >= 1024;
      const availableForCard = isWideLayout
        ? (vw - 256) / 2 - 32 // sidebar + grid gap + safe margin
        : vw - 32; // page horizontal padding (px-4 = 16 each side)
      /* Padding chain inside the Card:
           Card p-4 mobile / p-6 desktop  → 32 / 48
           QR panel p-5                    → 40
           Inner card p-3.5                → 28
           Safety buffer                   →  8 */
      const cardPadding = isWideLayout ? 48 : 32;
      const overhead = cardPadding + 40 + 28 + 8;
      const next = Math.max(
        160, // floor — anything smaller scans poorly with stylised dots
        Math.min(240, availableForCard - overhead),
      );
      setSize(Math.round(next));
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, []);

  return size;
}

const USE_CASES = [
  {
    title: "Tarpaulins & banners",
    desc: "Print on event tarps so prospects scan instantly.",
  },
  {
    title: "Business cards",
    desc: "Add to physical cards for a modern hybrid card.",
  },
  {
    title: "Presentations",
    desc: "Show on slides during opportunity meetings.",
  },
];

export default function QRPage() {
  const profile = useProfileStore((s) => s.profile);
  const url = `${getAppOrigin()}/${profile?.username || "demo"}`;
  const qrSize = useResponsiveQRSize();

  const [templateId, setTemplateId] = useState("midnight");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(QR_TEMPLATE_STORAGE_KEY);
      if (saved) setTemplateId(saved);
    } catch {
      /* localStorage unavailable */
    }
  }, []);

  const pickTemplate = (id: string) => {
    setTemplateId(id);
    try {
      localStorage.setItem(QR_TEMPLATE_STORAGE_KEY, id);
    } catch {
      /* localStorage unavailable */
    }
  };

  const template = getQRTemplate(templateId);

  return (
    <div className="space-y-5">
      <PageHeader
        title="QR Codes"
        subtitle="Share your profile anywhere — online or offline."
      />

      <div className="grid gap-5 lg:grid-cols-2">
        {/*
          Card padding shrinks on mobile and overflow-hidden ensures
          nothing inside (QR, URL row, template swatches) can blow the
          card out. The QR size itself is computed from window.innerWidth
          via useResponsiveQRSize so it's anchored to a stable ceiling
          rather than measuring its own potentially-overflowing parent.
        */}
        <Card className="flex w-full max-w-full flex-col items-center overflow-hidden p-4 sm:p-6">
          <QRTemplatePicker
            active={templateId}
            onPick={pickTemplate}
            className="w-full"
          />
          <div className="mt-4 w-full max-w-full overflow-hidden">
            <StyledQR
              value={url}
              template={template}
              avatarUrl={profile?.header.avatarUrl}
              display={qrSize}
              fileName="credibly-profile-qr"
              className="mx-auto"
            />
          </div>
          <p className="mt-4 text-center text-xs text-white/45">
            High-resolution 1024px PNG — print-ready for tarps and cards.
          </p>
          <div className="mt-3 flex w-full items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-1.5 pl-3">
            <span className="flex-1 truncate text-xs text-white/55">{url}</span>
            <Button
              size="sm"
              variant="outline"
              leftIcon={<Copy className="h-3.5 w-3.5" />}
              onClick={async () => {
                if (await copyToClipboard(url)) toast.success("Link copied");
              }}
            >
              Copy
            </Button>
          </div>
        </Card>

        <div className="space-y-3">
          <Card className="p-5">
            <h3 className="font-display text-sm font-semibold text-white">
              Where to use your QR code
            </h3>
            <div className="mt-3 space-y-2.5">
              {USE_CASES.map((u) => (
                <div key={u.title} className="flex gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-electric-500/12">
                    <QrCode className="h-4 w-4 text-electric-400" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-white">{u.title}</p>
                    <p className="text-xs text-white/45">{u.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-5">
            <h3 className="font-display text-sm font-semibold text-white">
              Pro tip
            </h3>
            <p className="mt-1.5 text-xs text-white/50">
              Pair your QR code with a strong call-to-action like &ldquo;Scan
              to see how I can help you&rdquo; for the best results.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              leftIcon={<Printer className="h-3.5 w-3.5" />}
              onClick={() => window.print()}
            >
              Print this page
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
