"use client";

import { useRouter } from "next/navigation";
import { LayoutTemplate } from "lucide-react";
import { useProfileStore } from "@/store/profileStore";
import { createSection } from "@/lib/defaults";
import { THEMES } from "@/lib/constants";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { toast } from "@/store/uiStore";
import type { SectionType, ThemeId } from "@/types";

interface TemplateDef {
  id: string;
  name: string;
  niche: string;
  themeId: ThemeId;
  headline: string;
  sections: SectionType[];
}

const TEMPLATES: TemplateDef[] = [
  {
    id: "recruiter",
    name: "Team Recruiter",
    niche: "Network Marketing",
    themeId: "navy-glass",
    headline: "I help everyday people build income from home",
    sections: ["cta", "socials", "about", "credibility", "testimonials", "leadCapture"],
  },
  {
    id: "coach",
    name: "Coach & Mentor",
    niche: "Coaching",
    themeId: "emerald-lux",
    headline: "I help you reach your next breakthrough",
    sections: ["cta", "about", "credibility", "testimonials", "video", "leadCapture"],
  },
  {
    id: "seller",
    name: "Online Seller",
    niche: "E-commerce",
    themeId: "midnight",
    headline: "Quality products, trusted service",
    sections: ["cta", "products", "socials", "testimonials", "gallery", "leadCapture"],
  },
  {
    id: "insurance",
    name: "Insurance Agent",
    niche: "Insurance",
    themeId: "pure-mono",
    headline: "Protecting families with the right coverage",
    sections: ["cta", "credibility", "about", "testimonials", "leadCapture"],
  },
  {
    id: "affiliate",
    name: "Affiliate Pro",
    niche: "Affiliate Marketing",
    themeId: "gold-elite",
    headline: "Tools & products I personally recommend",
    sections: ["cta", "products", "video", "socials", "leadCapture"],
  },
  {
    id: "personal",
    name: "Personal Brand",
    niche: "Personal Branding",
    themeId: "midnight",
    headline: "Building authority, one story at a time",
    sections: ["about", "cta", "credibility", "gallery", "socials", "leadCapture"],
  },
];

export default function TemplatesPage() {
  const router = useRouter();
  const profile = useProfileStore((s) => s.profile);
  const setProfile = useProfileStore((s) => s.setProfile);

  const applyTemplate = (t: TemplateDef) => {
    if (!profile) return;
    setProfile({
      ...profile,
      themeId: t.themeId,
      header: { ...profile.header, headline: t.headline },
      sections: t.sections.map((type) => createSection(type)),
    });
    toast.success(`"${t.name}" template applied`);
    router.push("/profile");
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Templates"
        subtitle="Start from a proven layout, then make it yours."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TEMPLATES.map((t) => {
          const theme = THEMES.find((x) => x.id === t.themeId) ?? THEMES[0];
          return (
            <Card key={t.id} className="overflow-hidden p-0">
              <div
                className="flex h-28 items-center justify-center"
                style={{ background: theme.background }}
              >
                <LayoutTemplate className="h-8 w-8 text-white/30" />
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-sm font-semibold text-white">
                    {t.name}
                  </h3>
                  <Badge tone="blue">{t.niche}</Badge>
                </div>
                <p className="mt-1 text-xs text-white/45">
                  {t.sections.length} sections · {theme.name} theme
                </p>
                <Button
                  size="sm"
                  fullWidth
                  className="mt-3"
                  onClick={() => applyTemplate(t)}
                >
                  Use template
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="p-4">
        <p className="text-xs text-white/45">
          Applying a template replaces your current sections &amp; theme. Your
          name, photo and links stay intact — just save when you&apos;re happy.
        </p>
      </Card>
    </div>
  );
}
