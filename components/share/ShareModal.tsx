"use client";

import { useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { QRBlock } from "@/components/qr/QRBlock";
import { SocialIcon } from "@/components/ui/SocialIcon";
import { copyToClipboard } from "@/lib/utils";
import { toast } from "@/store/uiStore";
import type { SocialPlatform } from "@/types";

interface ShareTarget {
  platform: SocialPlatform;
  label: string;
  color: string;
  /** intent = opens a real share dialog; copy = copies link to paste. */
  mode: "intent" | "copy";
}

const TARGETS: ShareTarget[] = [
  { platform: "facebook", label: "Facebook", color: "#1877F2", mode: "intent" },
  { platform: "whatsapp", label: "WhatsApp", color: "#25D366", mode: "intent" },
  { platform: "telegram", label: "Telegram", color: "#26A5E4", mode: "intent" },
  { platform: "x", label: "X", color: "#ffffff", mode: "intent" },
  { platform: "messenger", label: "Messenger", color: "#0084FF", mode: "copy" },
  { platform: "instagram", label: "Instagram", color: "#E4405F", mode: "copy" },
  { platform: "tiktok", label: "TikTok", color: "#ffffff", mode: "copy" },
];

function intentUrl(
  platform: SocialPlatform,
  url: string,
  text: string,
): string | null {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(text);
  switch (platform) {
    case "facebook":
      return `https://www.facebook.com/sharer/sharer.php?u=${u}`;
    case "whatsapp":
      return `https://wa.me/?text=${t}%20${u}`;
    case "telegram":
      return `https://t.me/share/url?url=${u}&text=${t}`;
    case "x":
      return `https://twitter.com/intent/tweet?url=${u}&text=${t}`;
    default:
      return null;
  }
}

export function ShareModal({
  open,
  onClose,
  url,
  title,
}: {
  open: boolean;
  onClose: () => void;
  url: string;
  title: string;
}) {
  const [copied, setCopied] = useState(false);
  const shareText = `Check out ${title} on Credibly`;

  const copyLink = async () => {
    const ok = await copyToClipboard(url);
    if (ok) {
      setCopied(true);
      toast.success("Profile link copied");
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error("Couldn't copy — copy it manually.");
    }
  };

  const handleTarget = async (target: ShareTarget) => {
    if (target.mode === "copy") {
      const ok = await copyToClipboard(url);
      if (ok) toast.success(`Link copied — paste it into ${target.label}`);
      return;
    }
    const href = intentUrl(target.platform, url, shareText);
    if (href) window.open(href, "_blank", "noopener,noreferrer,width=600,height=540");
  };

  const nativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text: shareText, url });
      } catch {
        /* user cancelled */
      }
    } else {
      copyLink();
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Share your profile">
      <div className="space-y-5 pb-3">
        {/* URL row */}
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-1.5 pl-3.5">
          <span className="flex-1 truncate text-sm text-white/65">{url}</span>
          <button
            onClick={copyLink}
            className="flex items-center gap-1.5 rounded-lg bg-brand-gradient px-3 py-2 text-xs font-semibold text-white"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>

        {/* Social targets */}
        <div>
          <p className="mb-2.5 text-xs font-medium text-white/45">Share to</p>
          <div className="grid grid-cols-4 gap-2.5">
            {TARGETS.map((t) => (
              <button
                key={t.platform}
                onClick={() => handleTarget(t)}
                className="flex flex-col items-center gap-1.5 rounded-xl border border-white/[0.07] bg-white/[0.03] py-3 no-tap-highlight active:scale-95"
              >
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-full"
                  style={{ backgroundColor: `${t.color}1f`, color: t.color }}
                >
                  <SocialIcon platform={t.platform} className="h-4 w-4" />
                </span>
                <span className="text-[10px] text-white/55">{t.label}</span>
              </button>
            ))}
            <button
              onClick={nativeShare}
              className="flex flex-col items-center gap-1.5 rounded-xl border border-white/[0.07] bg-white/[0.03] py-3 no-tap-highlight active:scale-95"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white">
                <Share2 className="h-4 w-4" />
              </span>
              <span className="text-[10px] text-white/55">More</span>
            </button>
          </div>
        </div>

        {/* QR */}
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
          <p className="mb-3 text-center text-xs font-medium text-white/45">
            Or scan the QR code
          </p>
          <QRBlock value={url} display={170} fileName="credibly-profile-qr" />
        </div>
      </div>
    </Modal>
  );
}
