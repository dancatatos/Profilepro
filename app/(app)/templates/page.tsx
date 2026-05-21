"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useProfileStore } from "@/store/profileStore";
import { createSection } from "@/lib/defaults";
import { THEMES } from "@/lib/constants";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { toast } from "@/store/uiStore";
import { cn } from "@/lib/utils";
import type { SectionType, ThemeId } from "@/types";

/* ---- Template definitions ---- */

interface TemplateDef {
  id: string;
  name: string;
  niche: string;
  category: string;
  themeId: ThemeId;
  headline: string;
  bio: string;
  sections: SectionType[];
  featured?: boolean;
}

const TEMPLATES: TemplateDef[] = [
  /* ── Network Marketing ── */
  {
    id: "recruiter",
    name: "Team Recruiter",
    niche: "Network Marketing",
    category: "Network Marketing",
    themeId: "navy-glass",
    headline: "I help everyday people build income from home",
    bio: "Tired of the 9-5? I show real people how to build a flexible income stream around their lifestyle.",
    sections: ["cta", "socials", "about", "credibility", "testimonials", "leadCapture"],
    featured: true,
  },
  {
    id: "direct-sales",
    name: "Direct Sales Boss",
    niche: "Direct Sales",
    category: "Network Marketing",
    themeId: "rose-vibe",
    headline: "Join thousands who've transformed their life with us",
    bio: "Top performer. Product lover. Team builder. Let me show you what's possible.",
    sections: ["cta", "credibility", "products", "testimonials", "about", "leadCapture"],
    featured: true,
  },
  {
    id: "mlm-leader",
    name: "MLM Leader",
    niche: "Network Marketing",
    category: "Network Marketing",
    themeId: "vivid-purple",
    headline: "Building a movement, one teammate at a time",
    bio: "I went from zero to leader in 12 months. Now I help others do the same.",
    sections: ["cta", "about", "credibility", "video", "testimonials", "leadCapture"],
  },

  /* ── Coaching ── */
  {
    id: "coach",
    name: "Coach & Mentor",
    niche: "Coaching",
    category: "Coaching",
    themeId: "emerald-lux",
    headline: "I help you reach your next breakthrough",
    bio: "Certified coach helping high-achievers unlock their full potential. Let's build your roadmap.",
    sections: ["cta", "about", "credibility", "testimonials", "video", "leadCapture"],
    featured: true,
  },
  {
    id: "fitness-coach",
    name: "Fitness Coach",
    niche: "Health & Fitness",
    category: "Coaching",
    themeId: "deep-red",
    headline: "Get in the best shape of your life with expert coaching",
    bio: "I turn busy professionals into fit, confident, energized versions of themselves.",
    sections: ["cta", "about", "products", "testimonials", "video", "leadCapture"],
  },
  {
    id: "life-coach",
    name: "Life Coach",
    niche: "Life Coaching",
    category: "Coaching",
    themeId: "emerald-lux",
    headline: "Your next chapter starts with one decision",
    bio: "Helping you break free from what's holding you back and step into the life you deserve.",
    sections: ["cta", "credibility", "about", "video", "testimonials", "leadCapture"],
  },

  /* ── Health & Wellness ── */
  {
    id: "wellness",
    name: "Health & Wellness Pro",
    niche: "Health & Wellness",
    category: "Health & Wellness",
    themeId: "warm-coral",
    headline: "Transform your body and mind with proven wellness solutions",
    bio: "Sharing the products and habits that helped me reclaim my health — and can help you too.",
    sections: ["cta", "about", "products", "testimonials", "video", "leadCapture"],
    featured: true,
  },
  {
    id: "nutrition",
    name: "Nutrition & Diet",
    niche: "Nutrition",
    category: "Health & Wellness",
    themeId: "emerald-lux",
    headline: "Eat smart. Live better. Feel amazing.",
    bio: "Certified nutritionist helping you build sustainable habits without restrictive diets.",
    sections: ["cta", "about", "credibility", "products", "testimonials", "leadCapture"],
  },

  /* ── Creator & Influencer ── */
  {
    id: "creator",
    name: "Content Creator",
    niche: "Creator",
    category: "Creator & Influencer",
    themeId: "sky-blue",
    headline: "Creating content that inspires, educates & entertains",
    bio: "Follow along on my journey. New videos every week — don't miss out.",
    sections: ["cta", "socials", "video", "gallery", "about", "products"],
    featured: true,
  },
  {
    id: "influencer",
    name: "Social Influencer",
    niche: "Influencer",
    category: "Creator & Influencer",
    themeId: "navy-glass",
    headline: "Follow along on my journey across all platforms",
    bio: "Living authentically, creating consistently. Join the community.",
    sections: ["socials", "cta", "video", "gallery", "about"],
  },
  {
    id: "personal",
    name: "Personal Brand",
    niche: "Personal Branding",
    category: "Creator & Influencer",
    themeId: "midnight",
    headline: "Building authority, one story at a time",
    bio: "Sharing my expertise and experience to help you grow faster than I did.",
    sections: ["about", "cta", "credibility", "gallery", "socials", "leadCapture"],
  },

  /* ── Business & Sales ── */
  {
    id: "seller",
    name: "Online Seller",
    niche: "E-commerce",
    category: "Business & Sales",
    themeId: "midnight",
    headline: "Quality products, trusted service",
    bio: "Curated products I personally use and love. Fast delivery, real results.",
    sections: ["cta", "products", "socials", "testimonials", "gallery", "leadCapture"],
  },
  {
    id: "affiliate",
    name: "Affiliate Pro",
    niche: "Affiliate Marketing",
    category: "Business & Sales",
    themeId: "gold-elite",
    headline: "Tools & products I personally recommend",
    bio: "Only promoting what I've tested myself. No fluff — just the best of the best.",
    sections: ["cta", "products", "video", "socials", "leadCapture"],
    featured: true,
  },
  {
    id: "digital-entrepreneur",
    name: "Digital Entrepreneur",
    niche: "Digital Business",
    category: "Business & Sales",
    themeId: "gold-elite",
    headline: "Building digital businesses that generate real income",
    bio: "From side hustle to full-time income. I'll show you the exact blueprint I used.",
    sections: ["cta", "credibility", "about", "products", "testimonials", "leadCapture"],
  },

  /* ── Professional ── */
  {
    id: "insurance",
    name: "Insurance Agent",
    niche: "Insurance",
    category: "Professional",
    themeId: "pure-mono",
    headline: "Protecting families with the right coverage",
    bio: "Independent agent with access to 50+ carriers. I find you the best rate, guaranteed.",
    sections: ["cta", "credibility", "about", "testimonials", "leadCapture"],
  },
  {
    id: "realestate",
    name: "Real Estate Pro",
    niche: "Real Estate",
    category: "Professional",
    themeId: "purple-dusk",
    headline: "Your trusted partner in finding the perfect home",
    bio: "Licensed agent helping buyers and sellers navigate the market with confidence.",
    sections: ["cta", "credibility", "about", "testimonials", "video", "leadCapture"],
  },
];

/* ---- Category config ---- */

const CATEGORIES = [
  "All",
  "Network Marketing",
  "Coaching",
  "Health & Wellness",
  "Creator & Influencer",
  "Business & Sales",
  "Professional",
];

const SECTION_LABELS: Record<SectionType, string> = {
  cta: "CTA",
  socials: "Socials",
  about: "About",
  credibility: "Credibility",
  testimonials: "Testimonials",
  products: "Products",
  video: "Video",
  gallery: "Gallery",
  leadCapture: "Lead Form",
};

const SECTION_COLORS: Record<SectionType, string> = {
  cta: "bg-electric-500/20 text-electric-300",
  socials: "bg-blue-500/20 text-blue-300",
  about: "bg-white/10 text-white/60",
  credibility: "bg-gold-400/20 text-gold-300",
  testimonials: "bg-jade-500/20 text-jade-300",
  products: "bg-purple-500/20 text-purple-300",
  video: "bg-red-500/20 text-red-300",
  gallery: "bg-pink-500/20 text-pink-300",
  leadCapture: "bg-jade-500/20 text-jade-300",
};

/* ---- Mini preview component ---- */

function TemplatePreview({
  template,
  themeBackground,
}: {
  template: TemplateDef;
  themeBackground: string;
}) {
  return (
    <div
      className="relative h-36 overflow-hidden rounded-t-xl"
      style={{ background: themeBackground }}
    >
      {/* Simulated profile */}
      <div className="flex flex-col items-center pt-4 px-4">
        {/* Avatar */}
        <div className="h-8 w-8 rounded-full bg-white/20 mb-2 ring-2 ring-white/30" />
        {/* Name line */}
        <div className="h-2 w-24 rounded-full bg-white/30 mb-1" />
        {/* Headline line */}
        <div className="h-1.5 w-32 rounded-full bg-white/20 mb-3" />
        {/* Simulated buttons */}
        <div className="w-full space-y-1.5 px-2">
          {template.sections.slice(0, 3).map((s) => (
            <div
              key={s}
              className="h-5 w-full rounded-lg bg-white/15 flex items-center px-2"
            >
              <div className="h-1 w-12 rounded-full bg-white/25" />
            </div>
          ))}
        </div>
      </div>
      {/* Gradient overlay */}
      <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-ink-900/80 to-transparent" />
    </div>
  );
}

/* ---- Main page ---- */

export default function TemplatesPage() {
  const router = useRouter();
  const profile = useProfileStore((s) => s.profile);
  const setProfile = useProfileStore((s) => s.setProfile);
  const [activeCategory, setActiveCategory] = useState("All");
  const [applying, setApplying] = useState<string | null>(null);

  const filtered =
    activeCategory === "All"
      ? TEMPLATES
      : TEMPLATES.filter((t) => t.category === activeCategory);

  const featured = filtered.filter((t) => t.featured);
  const rest = filtered.filter((t) => !t.featured);

  const applyTemplate = (t: TemplateDef) => {
    if (!profile) return;
    setApplying(t.id);
    setTimeout(() => {
      setProfile({
        ...profile,
        themeId: t.themeId,
        header: {
          ...profile.header,
          headline: t.headline,
          bio: t.bio,
        },
        sections: t.sections.map((type) => createSection(type)),
      });
      toast.success(`"${t.name}" template applied! ✨`);
      router.push("/profile");
      setApplying(null);
    }, 400);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Templates"
        subtitle="Start from a proven layout for your niche, then make it yours."
      />

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={cn(
              "shrink-0 rounded-full px-4 py-1.5 text-xs font-medium transition-colors",
              activeCategory === cat
                ? "bg-electric-500/20 text-electric-300 ring-1 ring-electric-500/40"
                : "bg-white/[0.06] text-white/50 hover:bg-white/10 hover:text-white",
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Featured */}
      {featured.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-white/30">
              ⭐ Featured
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((t) => (
              <TemplateCard
                key={t.id}
                template={t}
                applying={applying}
                onApply={applyTemplate}
              />
            ))}
          </div>
        </div>
      )}

      {/* Rest */}
      {rest.length > 0 && (
        <div className="space-y-3">
          {featured.length > 0 && (
            <h2 className="text-xs font-semibold uppercase tracking-wider text-white/30">
              All Templates
            </h2>
          )}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((t) => (
              <TemplateCard
                key={t.id}
                template={t}
                applying={applying}
                onApply={applyTemplate}
              />
            ))}
          </div>
        </div>
      )}

      <Card className="p-4">
        <p className="text-xs text-white/45">
          Applying a template replaces your current sections &amp; theme. Your
          name, photo and social links stay intact. Save your profile after
          applying to go live.
        </p>
      </Card>
    </div>
  );
}

function TemplateCard({
  template,
  applying,
  onApply,
}: {
  template: TemplateDef;
  applying: string | null;
  onApply: (t: TemplateDef) => void;
}) {
  const theme = THEMES.find((x) => x.id === template.themeId) ?? THEMES[0];
  const isApplying = applying === template.id;

  return (
    <Card className="overflow-hidden p-0 transition-all hover:ring-1 hover:ring-white/20">
      <TemplatePreview template={template} themeBackground={theme.background} />

      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-display text-sm font-semibold text-white leading-tight">
            {template.name}
          </h3>
          <Badge tone="blue" className="shrink-0 text-[10px]">
            {template.niche}
          </Badge>
        </div>

        <p className="text-xs text-white/45 mb-3 line-clamp-2">
          {template.headline}
        </p>

        {/* Section chips */}
        <div className="flex flex-wrap gap-1 mb-3">
          {template.sections.map((s) => (
            <span
              key={s}
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-medium",
                SECTION_COLORS[s],
              )}
            >
              {SECTION_LABELS[s]}
            </span>
          ))}
        </div>

        <Button
          size="sm"
          fullWidth
          loading={isApplying}
          disabled={!!applying}
          onClick={() => onApply(template)}
          variant={template.featured ? "primary" : "outline"}
        >
          {isApplying ? "Applying…" : "Use template"}
        </Button>
      </div>
    </Card>
  );
}
