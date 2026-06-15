"use client";

/**
 * Marketing homepage.
 *
 * Section order (top → bottom):
 *   1. Sticky nav
 *   2. Hero — outcome-focused headline + live featured customer profile
 *   3. Social proof bar (admin-toggleable)
 *   4. Features grid — 6 fundamentals
 *   5. Pipelines feature deep-dive (NEW dedicated section)
 *   6. Funnels feature deep-dive (NEW dedicated section)
 *   7. Manual Payments feature deep-dive (NEW dedicated section)
 *   8. AI callout (kept from previous version)
 *   9. "How it works" 3-step
 *  10. Testimonials (admin-toggleable)
 *  11. Video testimonials (admin-toggleable)
 *  12. Pricing — read from admin-managed plans
 *  13. FAQ (admin-toggleable)
 *  14. Final CTA (editable copy)
 *  15. Footer
 *
 * All marketing copy + testimonials + FAQ + final CTA are pulled from
 * the `settings/marketing` Firestore doc edited via /admin/marketing.
 * Defaults from lib/marketing.ts guarantee the page renders well
 * before the admin saves anything.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Calendar,
  Check,
  ChevronDown,
  Copy,
  CreditCard,
  KanbanSquare,
  LayoutTemplate,
  PlayCircle,
  QrCode,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Star,
  Target,
  Upload,
  Wand2,
  Zap,
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { PublicProfileView } from "@/components/public-profile/PublicProfileView";
import { LightHero } from "@/components/marketing/LightHero";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { LightStats } from "@/components/marketing/LightStats";
import { LightFeatures } from "@/components/marketing/LightFeatures";
import { LightDeepDive } from "@/components/marketing/LightDeepDive";
import { PhoneEmbed } from "@/components/marketing/PhoneEmbed";
import { LightTestimonials } from "@/components/marketing/LightTestimonials";
import { LightPricing } from "@/components/marketing/LightPricing";
import { LightHowItWorks } from "@/components/marketing/LightHowItWorks";
import { LightAIHighlight } from "@/components/marketing/LightAIHighlight";
import { LightTrustPhoto } from "@/components/marketing/LightTrustPhoto";
import { LightFAQ } from "@/components/marketing/LightFAQ";
import { DarkFinalCTA } from "@/components/marketing/DarkFinalCTA";
import { DEMO_PROFILE } from "@/lib/defaults";
import { PLANS } from "@/lib/constants";
import { planDisplayFeatures } from "@/lib/features";
import {
  getFeatureFlags,
  getMarketingContent,
  getPlansConfig,
  getProfileByUsername,
} from "@/lib/firebase/firestore";
import {
  DEFAULT_HOMEPAGE_DEEP_DIVES,
  DEFAULT_MARKETING_CONTENT,
  mergeMarketingContent,
} from "@/lib/marketing";
import { normalizeVideoUrl } from "@/lib/video";
import { cn } from "@/lib/utils";
import type { Plan, Profile } from "@/types";

const FEATURES = [
  { icon: Wand2, title: "AI Profile Generator", desc: "Answer a few questions — AI writes your headline, bio, CTAs and credibility copy instantly." },
  { icon: BadgeCheck, title: "Credibility First", desc: "Showcase awards, ranks, milestones and testimonials that build trust fast." },
  { icon: Copy, title: "Clone Profiles", desc: "Top earners share a layout; downlines clone it and AI rewrites it to stay unique." },
  { icon: QrCode, title: "QR & Digital Card", desc: "Branded HD QR codes and a modern digital business card for events and tarps." },
  { icon: BarChart3, title: "Real Analytics", desc: "Track views, clicks, leads and conversion — know exactly what's working." },
  { icon: Smartphone, title: "Installable App", desc: "A fast, mobile-first PWA your prospects can open like a native app." },
];

const STEPS = [
  { n: 1, title: "Answer a few questions", desc: "Tell the AI about your niche, offer and audience." },
  { n: 2, title: "AI builds your profile", desc: "Headline, bio, CTAs and sections — generated in seconds." },
  { n: 3, title: "Share & capture leads", desc: "Send your link or QR code and watch the leads roll in." },
];

export default function LandingPage() {
  const [plans, setPlans] = useState<Plan[]>(PLANS);
  const [featured, setFeatured] = useState<Profile>(DEMO_PROFILE);
  const [content, setContent] = useState(DEFAULT_MARKETING_CONTENT);

  useEffect(() => {
    getPlansConfig()
      .then((p) => p && setPlans(p))
      .catch(() => null);
  }, []);

  /* Marketing content — admin-edited override layered on top of
     DEFAULT_MARKETING_CONTENT. Initial render uses defaults so the
     page paints instantly; swap to override once it resolves. */
  useEffect(() => {
    let cancelled = false;
    getMarketingContent()
      .then((override) => {
        if (cancelled) return;
        setContent(mergeMarketingContent(override));
      })
      .catch(() => null);
    return () => {
      cancelled = true;
    };
  }, []);

  /* Featured customer profile lookup — same logic as before, with the
     soft-warn for draft profiles still in place. */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const flags = await getFeatureFlags();
        const username = flags.featuredProfileUsername?.trim();
        if (!username) return;
        const profile = await getProfileByUsername(username);
        if (cancelled || !profile) return;
        if (profile.status !== "published") {
          console.warn(
            `[Credibly] Featured @${username} is "${profile.status}". Showing anyway.`,
          );
        }
        setFeatured(profile);
      } catch (err) {
        console.error("[Credibly] Featured profile lookup failed:", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const { hero, socialProof, testimonials, testimonialVideos, faq, finalCta } =
    content;

  /* Nav links — single source of truth, shared between the new light
     hero nav AND the (still-dark) sections below. */
  const navLinks = [
    { href: "#features", label: "Features" },
    { href: "#how", label: "How it works" },
    { href: "#pricing", label: "Pricing" },
    ...(faq.enabled ? [{ href: "#faq", label: "FAQ" }] : []),
  ];

  return (
    <div className="relative">
      {/* Sticky marketing nav — lives at page root so it persists over
          every section (the hero clips its decorative blobs with
          overflow-hidden, which would otherwise break sticky). */}
      <MarketingNav navLinks={navLinks} />

      {/* ── NEW: Light marketing surface (Sessions 1 + 2) ───────────
          Hero → stats → features → 3 deep-dives → testimonials →
          pricing. */}
      <LightHero hero={hero} navLinks={navLinks} featuredProfile={featured} />

      {socialProof.enabled && socialProof.stats.length > 0 && (
        <LightStats stats={socialProof.stats} />
      )}

      <LightFeatures features={FEATURES} />

      {/* 4 admin-driven deep-dives, alternating L/R. Each phone frame
          embeds a real Credibly funnel/training URL set from
          /admin/marketing → Homepage tab. Order: Team Onboarding →
          Follow-up Automation → Recruitment Funnels → Product Funnels. */}
      {(content.homepage?.deepDives ?? DEFAULT_HOMEPAGE_DEEP_DIVES).map(
        (dive, i) => (
          <LightDeepDive
            key={dive.id}
            eyebrow={dive.eyebrow}
            title={dive.title}
            body={dive.body}
            bullets={dive.bullets}
            mockup={<PhoneEmbed url={dive.embedUrl} label={dive.eyebrow} />}
            reverse={i % 2 === 1}
            blob={dive.blob}
          />
        ),
      )}

      {testimonials.enabled && testimonials.items.length > 0 && (
        <LightTestimonials
          title={testimonials.title}
          subtitle={testimonials.subtitle}
          items={testimonials.items}
        />
      )}

      <LightPricing plans={plans} />

      <LightAIHighlight />

      <LightHowItWorks steps={STEPS} />

      <LightTrustPhoto
        photoUrl={content.trustPhotoUrl}
        photoAlt={content.trustPhotoAlt}
      />

      {faq.enabled && faq.items.length > 0 && (
        <LightFAQ title={faq.title} items={faq.items} />
      )}

      <DarkFinalCTA
        title={finalCta.title}
        subtitle={finalCta.subtitle}
        primaryCta={finalCta.primaryCta}
        secondaryCta={finalCta.secondaryCta}
      />

      {/* ── Footer — stays dark, consistent with the final CTA above ── */}
      <footer className="bg-ink-950 text-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-10 sm:flex-row">
          <Logo />
          <p className="text-xs text-white/35">
            &copy; {new Date().getFullYear()} Credibly. Built for trust.
          </p>
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-white/45">
            <Link href="/login" className="hover:text-white">Log in</Link>
            <Link href="/signup" className="hover:text-white">Sign up</Link>
            <Link href="/demo" className="hover:text-white">Example</Link>
            <Link href="/privacy" className="hover:text-white">Privacy</Link>
            <Link href="/terms" className="hover:text-white">Terms</Link>
          </div>
        </div>
      </footer>

      {/* ── Legacy dark sections still rendered for testimonial
          videos (when admin enables them) — wrapped in their own
          dark container so the gradient back to the dark footer
          still reads coherently if they're empty. ── */}
      <div className="relative overflow-hidden bg-ink-950">
      {/* ── Testimonial videos (admin-toggleable) ───────────────── */}
      {testimonialVideos.enabled && testimonialVideos.items.length > 0 && (
        <section className="mx-auto max-w-6xl px-5 py-16">
          <div className="text-center">
            <h2 className="font-display text-3xl font-bold text-white">
              {testimonialVideos.title}
            </h2>
            {testimonialVideos.subtitle && (
              <p className="mx-auto mt-3 max-w-md text-sm text-white/50">
                {testimonialVideos.subtitle}
              </p>
            )}
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {testimonialVideos.items.map((v) => {
              const normalised = normalizeVideoUrl(v.videoUrl);
              return (
                <div
                  key={v.id}
                  className="glass-card overflow-hidden rounded-2xl"
                >
                  <div className="relative aspect-video w-full overflow-hidden bg-black">
                    {normalised && normalised.provider !== "mp4" ? (
                      <iframe
                        src={normalised.embedUrl}
                        title={v.title}
                        className="h-full w-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                      />
                    ) : normalised ? (
                      <video
                        src={normalised.embedUrl}
                        controls
                        className="h-full w-full"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-white/30">
                        <PlayCircle className="h-10 w-10" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <p className="text-sm font-medium text-white">{v.title}</p>
                    {v.authorName && (
                      <p className="mt-0.5 text-xs text-white/45">
                        {v.authorName}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      </div>
    </div>
  );
}

/* ── Feature deep-dive section ─────────────────────────────────── */

/**
 * Two-column section template for the three flagship features
 * (Pipelines, Funnels, Manual Payments). Each side renders a
 * static mockup so visitors get a feel without needing to sign up.
 */
function FeatureDeepDive({
  eyebrow,
  title,
  body,
  bullets,
  icon,
  accent,
  mockup,
  reverse,
}: {
  eyebrow: string;
  title: string;
  body: string;
  bullets: string[];
  icon: React.ReactNode;
  accent: "electric" | "jade" | "gold";
  mockup: React.ReactNode;
  reverse: boolean;
}) {
  const accentMap: Record<typeof accent, string> = {
    electric: "text-electric-300 bg-electric-500/15",
    jade: "text-jade-300 bg-jade-500/15",
    gold: "text-gold-300 bg-gold-400/15",
  };
  return (
    <section className="mx-auto max-w-6xl px-5 py-16">
      <div
        className={cn(
          "grid items-center gap-10 lg:grid-cols-2",
          reverse && "lg:[&>*:first-child]:order-2",
        )}
      >
        <div>
          <span
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold",
              accentMap[accent],
            )}
          >
            {icon}
            {eyebrow}
          </span>
          <h2 className="mt-4 font-display text-3xl font-bold text-white">
            {title}
          </h2>
          <p className="mt-3 text-sm text-white/55">{body}</p>
          <ul className="mt-5 space-y-2.5">
            {bullets.map((b) => (
              <li
                key={b}
                className="flex items-start gap-2.5 text-sm text-white/70"
              >
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-jade-400" />
                {b}
              </li>
            ))}
          </ul>
        </div>
        <div>{mockup}</div>
      </div>
    </section>
  );
}

/* ── Static feature mockups (faux app screenshots) ─────────────── */

function PipelinesMockup() {
  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="mb-3 flex items-center gap-2">
        <Calendar className="h-4 w-4 text-electric-300" />
        <p className="text-xs font-semibold uppercase tracking-wider text-white/55">
          Today · 5 tasks
        </p>
      </div>
      <div className="space-y-2">
        {[
          { name: "Maria S.", stage: "Cold contact", overdue: true },
          { name: "Aaron P.", stage: "Watched intro", overdue: false },
          { name: "Diane M.", stage: "Discovery call", overdue: false },
          { name: "Rico C.", stage: "Considering", overdue: false },
        ].map((t) => (
          <div
            key={t.name}
            className={cn(
              "flex items-center gap-3 rounded-lg border p-2.5",
              t.overdue
                ? "border-red-500/25 bg-red-500/[0.04]"
                : "border-white/[0.07] bg-white/[0.02]",
            )}
          >
            <Avatar name={t.name} size={32} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">
                {t.name}
              </p>
              <p className="truncate text-[11px] text-white/40">{t.stage}</p>
            </div>
            {t.overdue && (
              <span className="rounded-md bg-red-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-red-300">
                Overdue
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function FunnelsMockup() {
  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="mb-3 flex items-center gap-2">
        <Target className="h-4 w-4 text-jade-300" />
        <p className="text-xs font-semibold uppercase tracking-wider text-white/55">
          Recruitment Funnel · 4 steps
        </p>
      </div>
      <div className="space-y-2">
        {[
          { n: 1, label: "Opt-in: Get free training", done: true },
          { n: 2, label: "Waiting room + countdown", done: true },
          { n: 3, label: "Live webinar / replay", done: false, current: true },
          { n: 4, label: "Thank you + book a call", done: false },
        ].map((s) => (
          <div
            key={s.n}
            className={cn(
              "flex items-center gap-3 rounded-lg border p-2.5",
              s.current
                ? "border-jade-500/40 bg-jade-500/[0.05]"
                : "border-white/[0.07] bg-white/[0.02]",
            )}
          >
            <span
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-bold",
                s.done
                  ? "bg-jade-500/20 text-jade-300"
                  : s.current
                    ? "bg-jade-500/30 text-jade-200"
                    : "bg-white/[0.05] text-white/45",
              )}
            >
              {s.done ? <Check className="h-3.5 w-3.5" /> : s.n}
            </span>
            <p className="text-sm text-white/75">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function PaymentsMockup() {
  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="mb-3 flex items-center gap-2">
        <Upload className="h-4 w-4 text-gold-300" />
        <p className="text-xs font-semibold uppercase tracking-wider text-white/55">
          Pending · 3
        </p>
      </div>
      <div className="space-y-2">
        {[
          { name: "Maria S.", method: "GCash", amount: "₱2,499" },
          { name: "Rico C.", method: "BPI", amount: "₱2,499" },
          { name: "Diane M.", method: "Maya", amount: "₱4,999" },
        ].map((p) => (
          <div
            key={p.name}
            className="flex items-center gap-3 rounded-lg border border-white/[0.07] bg-white/[0.02] p-2.5"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gold-400/15 text-gold-300">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">
                {p.name}
              </p>
              <p className="truncate text-[11px] text-white/40">
                {p.method} · {p.amount}
              </p>
            </div>
            <button
              type="button"
              className="rounded-md bg-jade-500/20 px-2 py-1 text-[10px] font-semibold text-jade-300"
            >
              Approve
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── FAQ accordion row ─────────────────────────────────────────── */

function FaqRow({
  item,
}: {
  item: { id: string; question: string; answer: string };
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left hover:bg-white/[0.02]"
        aria-expanded={open}
      >
        <p className="text-sm font-medium text-white">{item.question}</p>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-white/40 transition-transform",
            open && "rotate-180 text-white",
          )}
        />
      </button>
      {open && (
        <div className="border-t border-white/[0.06] px-5 py-4 text-sm leading-relaxed text-white/65">
          {item.answer}
        </div>
      )}
    </div>
  );
}
