"use client";

/**
 * FunnelLinkModal — "modern share" sheet for a funnel link.
 *
 * Mirrors the profile ShareModal pattern so users who already shared
 * their profile feel at home, with one extra: an on-demand QR block
 * (user can tap to reveal — keeps the sheet compact for users who
 * just want to copy + share, while still offering a printable QR for
 * those who request it).
 *
 * The "Share" CTA is the primary action and uses the Web Share API
 * (navigator.share) where available so the OS share sheet opens —
 * picking Messenger / WhatsApp / Notes / etc. autofills the link and
 * jumps straight into the chat, exactly the modern flow the user
 * described. Where Web Share isn't available (most desktops), the
 * primary button falls back to a Copy action.
 */

import { useState } from "react";
import {
  Check,
  Copy,
  ExternalLink,
  QrCode,
  Share2,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { QRBlock } from "@/components/qr/QRBlock";
import { SocialIcon } from "@/components/ui/SocialIcon";
import { copyToClipboard } from "@/lib/utils";
import { toast } from "@/store/uiStore";
import type { SocialPlatform } from "@/types";

interface ShareTarget {
  platform: SocialPlatform;
  label: string;
  color: string;
  /**
   * intent       — open a real share dialog (Facebook sharer, WhatsApp web…)
   * copy-and-open — copy the link AND open the destination app's web inbox
   *                 in a new tab. On mobile, opening messenger.com /
   *                 instagram.com / tiktok.com auto-deep-links into the
   *                 installed app via Universal Links / Android intents,
   *                 so the user lands inside the real app, link already
   *                 on their clipboard, one paste from done.
   */
  mode: "intent" | "copy-and-open";
  /** Destination URL — used in copy-and-open mode. */
  openUrl?: string;
}

const TARGETS: ShareTarget[] = [
  { platform: "facebook", label: "Facebook", color: "#1877F2", mode: "intent" },
  { platform: "whatsapp", label: "WhatsApp", color: "#25D366", mode: "intent" },
  { platform: "telegram", label: "Telegram", color: "#26A5E4", mode: "intent" },
  {
    platform: "messenger",
    label: "Messenger",
    color: "#0084FF",
    mode: "copy-and-open",
    openUrl: "https://www.messenger.com/",
  },
  {
    platform: "instagram",
    label: "Instagram",
    color: "#E4405F",
    mode: "copy-and-open",
    openUrl: "https://www.instagram.com/direct/inbox/",
  },
  {
    platform: "tiktok",
    label: "TikTok",
    color: "#ffffff",
    mode: "copy-and-open",
    openUrl: "https://www.tiktok.com/messages/",
  },
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
    default:
      return null;
  }
}

export function FunnelLinkModal({
  open,
  onClose,
  url,
  funnelName,
  isPublished,
  fileName = "credibly-funnel-qr",
}: {
  open: boolean;
  onClose: () => void;
  url: string;
  funnelName: string;
  isPublished: boolean;
  fileName?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);

  /* Browser support varies — track it so the primary CTA can adapt. */
  const canNativeShare =
    typeof navigator !== "undefined" && typeof navigator.share === "function";

  const shareText = `Check out my "${funnelName}" funnel`;

  const flashCopied = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const copyLink = async () => {
    const ok = await copyToClipboard(url);
    if (ok) {
      flashCopied();
      toast.success("Link copied");
    } else {
      toast.error("Couldn't copy — long-press the link to copy manually.");
    }
  };

  const nativeShare = async () => {
    if (canNativeShare) {
      try {
        await navigator.share({ title: funnelName, text: shareText, url });
      } catch {
        /* user cancelled the OS sheet — nothing to do */
      }
    } else {
      /* Desktop browsers: fall back to copy so the user can paste. */
      await copyLink();
    }
  };

  const handleTarget = (target: ShareTarget) => {
    if (target.mode === "intent") {
      const href = intentUrl(target.platform, url, shareText);
      if (href)
        window.open(href, "_blank", "noopener,noreferrer,width=600,height=540");
      return;
    }

    /* copy-and-open: open the destination FIRST (synchronously, in
       the same click handler) so the browser doesn't block the popup.
       On mobile, hitting messenger.com / instagram.com / tiktok.com
       auto-deep-links into the installed app via Universal Links —
       so this single code path opens the real app on phones and the
       web inbox on desktop, no UA sniffing needed. */
    if (target.openUrl) {
      window.open(target.openUrl, "_blank", "noopener,noreferrer");
    }
    copyToClipboard(url).then((ok) => {
      if (ok) {
        toast.success(`Link copied — paste it into ${target.label}`);
      } else {
        toast.error(
          `Couldn't copy — copy the link manually for ${target.label}.`,
        );
      }
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Share funnel link"
      description={
        isPublished
          ? "Send this link to your audience — it opens the funnel directly."
          : "Heads-up: this funnel is still a draft. Publish it before sharing so visitors can view it."
      }
    >
      <div className="space-y-4 pb-3">
        {/* URL row with copy */}
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

        {/* Primary share CTA — opens native OS share sheet on mobile.
            On desktop where there's no Web Share API, it falls back
            to copying the link so the button is still useful. */}
        <Button
          fullWidth
          onClick={nativeShare}
          leftIcon={<Share2 className="h-4 w-4" />}
        >
          {canNativeShare ? "Share via…" : "Copy link"}
        </Button>

        {/* Per-platform shortcuts (mobile-friendly grid) */}
        <div>
          <p className="mb-2.5 text-xs font-medium text-white/45">
            Or send to
          </p>
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
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-1.5 rounded-xl border border-white/[0.07] bg-white/[0.03] py-3 no-tap-highlight active:scale-95"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white">
                <ExternalLink className="h-4 w-4" />
              </span>
              <span className="text-[10px] text-white/55">Open</span>
            </a>
          </div>
        </div>

        {/* QR — collapsed by default since most shares are link-only.
            User taps to reveal + download (matches the "only if
            requested" framing from the original request). */}
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3">
          {showQr ? (
            <div className="space-y-2">
              <p className="text-center text-xs font-medium text-white/45">
                Scan to open this funnel
              </p>
              <QRBlock value={url} display={170} fileName={fileName} />
              <button
                onClick={() => setShowQr(false)}
                className="block w-full pt-1 text-center text-[11px] text-white/40 hover:text-white/65"
              >
                Hide QR
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowQr(true)}
              className="flex w-full items-center justify-center gap-2 py-1.5 text-xs font-medium text-white/65 hover:text-white"
            >
              <QrCode className="h-4 w-4" />
              Generate a QR code for this funnel
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
