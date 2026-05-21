"use client";

import { Copy, Printer, QrCode } from "lucide-react";
import { useProfileStore } from "@/store/profileStore";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/common/PageHeader";
import { QRBlock } from "@/components/qr/QRBlock";
import { APP } from "@/lib/constants";
import { copyToClipboard } from "@/lib/utils";
import { toast } from "@/store/uiStore";

const USE_CASES = [
  { icon: "Printer", title: "Tarpaulins & banners", desc: "Print on event tarps so prospects scan instantly." },
  { icon: "CreditCard", title: "Business cards", desc: "Add to physical cards for a modern hybrid card." },
  { icon: "Presentation", title: "Presentations", desc: "Show on slides during opportunity meetings." },
];

export default function QRPage() {
  const profile = useProfileStore((s) => s.profile);
  const url = `${APP.url}/${profile?.username || "demo"}`;

  return (
    <div className="space-y-5">
      <PageHeader
        title="QR Codes"
        subtitle="Share your profile anywhere — online or offline."
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="flex flex-col items-center p-6">
          <QRBlock value={url} display={240} fileName="credibly-profile-qr" />
          <p className="mt-4 text-center text-xs text-white/45">
            High-resolution 1024px PNG — print-ready for tarps and cards.
          </p>
          <div className="mt-3 flex w-full items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-1.5 pl-3">
            <span className="flex-1 truncate text-xs text-white/55">
              {url}
            </span>
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
