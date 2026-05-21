"use client";

import { Download, MapPin, Share2 } from "lucide-react";
import { useProfileStore } from "@/store/profileStore";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { LogoMark } from "@/components/ui/Logo";
import { PageHeader } from "@/components/common/PageHeader";
import { QRBlock } from "@/components/qr/QRBlock";
import { SocialIcon } from "@/components/ui/SocialIcon";
import { APP } from "@/lib/constants";
import { toast } from "@/store/uiStore";
import type { SocialsSection } from "@/types";

export default function DigitalCardPage() {
  const profile = useProfileStore((s) => s.profile);
  if (!profile) return null;

  const { header } = profile;
  const url = `${APP.url}/${profile.username}`;
  const socials = profile.sections.find(
    (s): s is SocialsSection => s.type === "socials" && s.enabled,
  );

  const saveContact = () => {
    const vcard = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `FN:${header.displayName}`,
      header.company ? `ORG:${header.company}` : "",
      header.headline ? `TITLE:${header.headline}` : "",
      `URL:${url}`,
      "END:VCARD",
    ]
      .filter(Boolean)
      .join("\n");
    const blob = new Blob([vcard], { type: "text/vcard" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${profile.username}.vcf`;
    link.click();
    toast.success("Contact card downloaded");
  };

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: header.displayName, url });
      } catch {
        /* cancelled */
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Card link copied");
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Digital Business Card"
        subtitle="A premium card you can share in one tap."
      />

      <div className="mx-auto max-w-sm">
        {/* The card */}
        <Card className="relative overflow-hidden p-0">
          <div className="h-24 bg-brand-gradient" />
          <div className="absolute right-4 top-4">
            <LogoMark className="h-7 w-7 opacity-80" />
          </div>
          <div className="px-5 pb-5">
            <div className="-mt-10">
              <Avatar
                name={header.displayName}
                src={header.avatarUrl}
                size={80}
                verified={header.verified}
              />
            </div>
            <h2 className="mt-3 font-display text-lg font-bold text-white">
              {header.displayName}
            </h2>
            <p className="text-sm text-electric-300">{header.headline}</p>
            {(header.company || header.location) && (
              <p className="mt-1 flex items-center gap-1 text-xs text-white/45">
                {header.company}
                {header.company && header.location && " · "}
                {header.location && (
                  <>
                    <MapPin className="h-3 w-3" />
                    {header.location}
                  </>
                )}
              </p>
            )}

            {socials && socials.links.length > 0 && (
              <div className="mt-4 flex gap-2">
                {socials.links.map((l) => (
                  <a
                    key={l.id}
                    href={l.url || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white"
                  >
                    <SocialIcon platform={l.platform} className="h-4 w-4" />
                  </a>
                ))}
              </div>
            )}

            <div className="mt-5 flex items-center gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3">
              <QRBlock value={url} display={88} showDownload={false} />
              <div className="min-w-0">
                <p className="text-xs font-medium text-white">
                  Scan to view full profile
                </p>
                <p className="mt-0.5 truncate text-xs text-white/40">{url}</p>
              </div>
            </div>
          </div>
        </Card>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            onClick={saveContact}
            leftIcon={<Download className="h-4 w-4" />}
          >
            Save contact
          </Button>
          <Button onClick={share} leftIcon={<Share2 className="h-4 w-4" />}>
            Share card
          </Button>
        </div>
      </div>
    </div>
  );
}
