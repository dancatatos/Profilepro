"use client";

import { useEffect, useState } from "react";
import { Download, Mail, MapPin, Phone, Share2 } from "lucide-react";
import { useProfileStore } from "@/store/profileStore";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { LogoMark } from "@/components/ui/Logo";
import { PageHeader } from "@/components/common/PageHeader";
import { QRBlock } from "@/components/qr/QRBlock";
import { SocialIcon } from "@/components/ui/SocialIcon";
import { PrintableCard } from "@/components/card/PrintableCard";
import { CardTemplatePicker } from "@/components/card/CardTemplatePicker";
import { ShareModal } from "@/components/share/ShareModal";
import {
  CARD_TEMPLATE_STORAGE_KEY,
  getCardTemplate,
} from "@/lib/cardTemplates";
import { getAppOrigin } from "@/lib/utils";
import { toast } from "@/store/uiStore";
import type { SocialsSection } from "@/types";

export default function DigitalCardPage() {
  const profile = useProfileStore((s) => s.profile);
  const [shareOpen, setShareOpen] = useState(false);
  const [templateId, setTemplateId] = useState("midnight");

  /* Restore the last-picked card style. */
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CARD_TEMPLATE_STORAGE_KEY);
      if (saved) setTemplateId(saved);
    } catch {
      /* localStorage unavailable */
    }
  }, []);

  if (!profile) return null;

  const { header } = profile;
  const url = `${getAppOrigin()}/${profile.username}`;
  const socials = profile.sections.find(
    (s): s is SocialsSection => s.type === "socials" && s.enabled,
  );

  const t = getCardTemplate(templateId);
  /* Subtle, scheme-aware fills for tiles that sit on the themed card. */
  const tileBg =
    t.scheme === "dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.035)";
  const tileBorder =
    t.scheme === "dark" ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.10)";

  const pickTemplate = (id: string) => {
    setTemplateId(id);
    try {
      localStorage.setItem(CARD_TEMPLATE_STORAGE_KEY, id);
    } catch {
      /* localStorage unavailable */
    }
  };

  const saveContact = () => {
    const vcard = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `FN:${header.displayName}`,
      header.company ? `ORG:${header.company}` : "",
      header.headline ? `TITLE:${header.headline}` : "",
      header.phone ? `TEL;TYPE=CELL:${header.phone}` : "",
      header.email ? `EMAIL;TYPE=INTERNET:${header.email}` : "",
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

  return (
    <div className="space-y-5">
      <PageHeader
        title="Digital Business Card"
        subtitle="A premium card you can share in one tap."
      />

      <div className="mx-auto max-w-sm">
        <CardTemplatePicker active={templateId} onPick={pickTemplate} />

        {/* The themed card */}
        <div
          className="relative mt-4 overflow-hidden rounded-2xl border"
          style={{
            background: `linear-gradient(180deg, ${t.bg[0]}, ${t.bg[1]})`,
            borderColor: t.divider,
          }}
        >
          <div
            className="h-24"
            style={{
              background: `linear-gradient(120deg, ${t.accent}, ${t.bg[0]})`,
            }}
          />
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
            <h2
              className="mt-3 break-words font-display text-lg font-bold"
              style={{ color: t.nameColor }}
            >
              {header.displayName}
            </h2>
            <p
              className="break-words text-sm"
              style={{ color: t.headlineColor }}
            >
              {header.headline}
            </p>
            {(header.company || header.location) && (
              <p
                className="mt-1 flex items-center gap-1 text-xs"
                style={{ color: t.companyColor }}
              >
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

            {(header.phone || header.email) && (
              <div className="mt-3 space-y-1.5">
                {header.phone && (
                  <p
                    className="flex items-center gap-2 text-xs"
                    style={{ color: t.contactColor }}
                  >
                    <Phone className="h-3.5 w-3.5" style={{ color: t.accent }} />
                    {header.phone}
                  </p>
                )}
                {header.email && (
                  <p
                    className="flex items-center gap-2 text-xs"
                    style={{ color: t.contactColor }}
                  >
                    <Mail className="h-3.5 w-3.5" style={{ color: t.accent }} />
                    {header.email}
                  </p>
                )}
              </div>
            )}

            {socials && socials.links.length > 0 && (
              <div className="mt-4 flex gap-2">
                {socials.links.map((l) => (
                  <a
                    key={l.id}
                    href={l.url || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-9 w-9 items-center justify-center rounded-full border"
                    style={{
                      background: tileBg,
                      borderColor: tileBorder,
                      color: t.nameColor,
                    }}
                  >
                    <SocialIcon platform={l.platform} className="h-4 w-4" />
                  </a>
                ))}
              </div>
            )}

            <div
              className="mt-5 flex items-center gap-4 rounded-2xl border p-3"
              style={{ background: tileBg, borderColor: tileBorder }}
            >
              <QRBlock value={url} display={88} showDownload={false} />
              <div className="min-w-0">
                <p
                  className="text-xs font-medium"
                  style={{ color: t.nameColor }}
                >
                  Scan to view full profile
                </p>
                <p
                  className="mt-0.5 truncate text-xs"
                  style={{ color: t.scanLabel }}
                >
                  {url}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            onClick={saveContact}
            leftIcon={<Download className="h-4 w-4" />}
          >
            Save contact
          </Button>
          <Button
            onClick={() => setShareOpen(true)}
            leftIcon={<Share2 className="h-4 w-4" />}
          >
            Share card
          </Button>
        </div>

        {/* Printable business card */}
        <div className="mt-8">
          <h2 className="font-display text-sm font-semibold text-white">
            Printable business card
          </h2>
          <p className="mb-3 mt-0.5 text-xs text-white/45">
            A print-ready card for events, tarps and handouts. Add your phone
            &amp; email in the Profile Builder header to fill it out.
          </p>
          <PrintableCard profile={profile} template={t} />
        </div>
      </div>

      <ShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        url={url}
        title={header.displayName}
      />
    </div>
  );
}
