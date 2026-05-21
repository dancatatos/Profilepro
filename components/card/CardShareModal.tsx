"use client";

import type { RefObject } from "react";
import { Copy, Download, Share2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { SocialIcon } from "@/components/ui/SocialIcon";
import { toast } from "@/store/uiStore";
import type { Profile, SocialPlatform } from "@/types";

/* Chat apps can't accept an image file via a web link — so each app tile
   copies the card image to the clipboard and opens the app, ready to paste. */
const APP_TILES: {
  platform: SocialPlatform;
  label: string;
  color: string;
  openUrl: string;
}[] = [
  {
    platform: "whatsapp",
    label: "WhatsApp",
    color: "#25D366",
    openUrl: "https://web.whatsapp.com/",
  },
  {
    platform: "telegram",
    label: "Telegram",
    color: "#26A5E4",
    openUrl: "https://web.telegram.org/",
  },
  {
    platform: "messenger",
    label: "Messenger",
    color: "#0084FF",
    openUrl: "https://www.messenger.com/",
  },
  {
    platform: "facebook",
    label: "Facebook",
    color: "#1877F2",
    openUrl: "https://www.facebook.com/",
  },
  {
    platform: "x",
    label: "X",
    color: "#ffffff",
    openUrl: "https://x.com/compose/post",
  },
];

const tileCls =
  "flex flex-col items-center gap-1.5 rounded-xl border border-white/[0.07] bg-white/[0.03] py-3 no-tap-highlight active:scale-95";

export function CardShareModal({
  open,
  onClose,
  canvasRef,
  profile,
}: {
  open: boolean;
  onClose: () => void;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  profile: Profile;
}) {
  const fileName = `${profile.username}-business-card.png`;

  const getBlob = (): Promise<Blob | null> =>
    new Promise((resolve) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        resolve(null);
        return;
      }
      canvas.toBlob((b) => resolve(b), "image/png");
    });

  const copyImage = async (): Promise<boolean> => {
    try {
      if (typeof ClipboardItem === "undefined" || !navigator.clipboard?.write) {
        return false;
      }
      const blob = await getBlob();
      if (!blob) return false;
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      return true;
    } catch {
      return false;
    }
  };

  const savePng = async () => {
    const blob = await getBlob();
    if (!blob) {
      toast.error("Couldn't prepare the card image.");
      return;
    }
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const shareToApp = (app: (typeof APP_TILES)[number]) => {
    // Open the app first (synchronously) so the popup isn't blocked.
    window.open(app.openUrl, "_blank", "noopener,noreferrer");
    copyImage().then((ok) => {
      if (ok) {
        toast.success(`Card image copied — paste it into ${app.label}`);
      } else {
        savePng();
        toast.info(`Card image saved — attach it in ${app.label}`);
      }
    });
    onClose();
  };

  const copyOnly = async () => {
    const ok = await copyImage();
    if (ok) {
      toast.success("Card image copied — paste it into any chat");
    } else {
      await savePng();
      toast.info("Copy isn't supported here — card image saved instead");
    }
  };

  const nativeShare = async () => {
    const blob = await getBlob();
    if (!blob) return;
    const file = new File([blob], fileName, { type: "image/png" });
    if (
      typeof navigator.canShare === "function" &&
      navigator.canShare({ files: [file] })
    ) {
      try {
        await navigator.share({
          files: [file],
          title: `${profile.header.displayName} — business card`,
        });
        onClose();
      } catch {
        /* user cancelled the share sheet */
      }
    } else {
      copyOnly();
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Share your business card">
      <div className="space-y-4 pb-3">
        <p className="text-xs text-white/45">
          Pick an app — your card image is copied to the clipboard, so you
          can paste it (Ctrl / ⌘ + V) straight into the chat.
        </p>

        <div className="grid grid-cols-4 gap-2.5">
          {APP_TILES.map((app) => (
            <button
              key={app.platform}
              onClick={() => shareToApp(app)}
              className={tileCls}
            >
              <span
                className="flex h-9 w-9 items-center justify-center rounded-full"
                style={{
                  backgroundColor: `${app.color}1f`,
                  color: app.color,
                }}
              >
                <SocialIcon platform={app.platform} className="h-4 w-4" />
              </span>
              <span className="text-[10px] text-white/55">{app.label}</span>
            </button>
          ))}

          <button onClick={copyOnly} className={tileCls}>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white">
              <Copy className="h-4 w-4" />
            </span>
            <span className="text-[10px] text-white/55">Copy image</span>
          </button>

          <button onClick={savePng} className={tileCls}>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white">
              <Download className="h-4 w-4" />
            </span>
            <span className="text-[10px] text-white/55">Save image</span>
          </button>

          <button onClick={nativeShare} className={tileCls}>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white">
              <Share2 className="h-4 w-4" />
            </span>
            <span className="text-[10px] text-white/55">More</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
