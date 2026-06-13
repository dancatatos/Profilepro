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
  { n: "1", title: "Answer a few questions", desc: "Tell the AI about your niche, offer and audience." },
  { n: "2", title: "AI builds your profile", desc: "Headline, bio, CTAs and sections — generated in seconds." },
  { n: "3", title: "Share & capture leads", desc: "Send your link or QR code and watch the leads roll in." },
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
      {/* ── NEW: Light hero (Session 1 of homepage redesign) ────────
          Self-contained light island over white. Replaces the old
          dark nav + hero. Everything below stays on the original
          dark theme until subsequent design sessions migrate them. */}
      <LightHero hero={hero} navLinks={navLinks} featuredProfile={featured} />

      {/* ── Original (dark) sections continue below ─────────────── */}
      <div className="relative overflow-hidden bg-ink-950">
        <div className="glow-blob -left-32 top-0 h-80 w-80 bg-electric-600/30" />
        <div className="glow-blob right-0 top-[40rem] h-80 w-80 bg-jade-600/20" />

      {/* ── Social proof bar (admin-toggleable) ─────────────────── */}
      {socialProof.enabled && socialProof.stats.length > 0 && (
        <section className="mx-auto max-w-6xl px-5 pb-4">
          <div className="grid grid-cols-2 gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 sm:grid-cols-4">
            {socialProof.stats.map((s) => (
              <div key={s.id} className="text-center">
                <p className="font-display text-2xl font-bold text-white sm:text-3xl">
                  {s.value}
                </p>
                <p className="text-[11px] text-white/45 sm:text-xs">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Features grid ───────────────────────────────────────── */}
      <section id="features" className="mx-auto max-w-6xl px-5 py-16">
        <div className="text-center">
          <h2 className="font-display text-3xl font-bold text-white">
            Everything you need to{" "}
            <span className="text-gradient-jade">build trust</span>
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-white/50">
            Not just a link in bio — a complete credibility operating system.
          </p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="glass-card rounded-2xl p-5"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-electric-500/12">
                <f.icon className="h-5 w-5 text-electric-400" />
              </span>
              <h3 className="mt-3.5 font-display text-base font-semibold text-white">
                {f.title}
              </h3>
              <p className="mt-1 text-sm text-white/50">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Pipelines feature deep-dive ─────────────────────────── */}
      <FeatureDeepDive
        eyebrow="Follow-up Pipelines"
        title="Never forget a follow-up again"
        body="Every lead lands on a daily task board. The right message at the right time, ready to copy + paste in English or Taglish — no more 'crap, I forgot to message Maria back.' Top recruiters add 3-5 extra sign-ups a month just from following up consistently."
        bullets={[
          "Daily task dashboard surfaces who to follow up TODAY",
          "Pre-written message templates per pipeline stage",
          "Native English + Taglish modes — paste straight into Messenger",
          "Push notifications at 9 AM PHT each morning",
        ]}
        icon={<KanbanSquare className="h-5 w-5" />}
        accent="electric"
        mockup={<PipelinesMockup />}
        reverse={false}
      />

      {/* ── Funnels feature deep-dive ───────────────────────────── */}
      <FeatureDeepDive
        eyebrow="Mini Sales Funnels"
        title="Turn DMs into deals — no ClickFunnels needed"
        body="Drop a multi-step funnel together in 10 minutes. Opt-in → waiting room → webinar → offer → thank you. Each visitor gets enrolled in the right pipeline automatically, so your daily task list stays current."
        bullets={[
          "AI-generated funnels for recruiting, training, opt-ins, offers",
          "Built-in countdown timers + scarcity sections",
          "Auto-enrol funnel leads into the right pipeline",
          "Templates ready to clone — no design skills needed",
        ]}
        icon={<LayoutTemplate className="h-5 w-5" />}
        accent="jade"
        mockup={<FunnelsMockup />}
        reverse={true}
      />

      {/* ── Manual Payments feature deep-dive ───────────────────── */}
      <FeatureDeepDive
        eyebrow="Manual Payments"
        title="Get paid via GCash, Maya & bank — no Stripe needed"
        body="Set up your accounts once. Add a payment section to any funnel. Visitors send payment outside the app, upload their receipt, and you approve from /payments. Zero processor fees. Approved buyers auto-flow into your pipeline."
        bullets={[
          "Configure GCash / Maya / BPI / BDO accounts once, reuse everywhere",
          "Visitors upload receipt; you approve or reject with one tap",
          "Approved payments auto-enrol the buyer into your pipeline",
          "Zero processor fees — keep 100% of what you charge",
        ]}
        icon={<CreditCard className="h-5 w-5" />}
        accent="gold"
        mockup={<PaymentsMockup />}
        reverse={false}
      />

      {/* ── AI highlight ────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="glass-card overflow-hidden rounded-3xl p-8 lg:p-12">
          <div className="grid items-center gap-8 lg:grid-cols-2">
            <div>
              <Badge tone="jade" icon={<Zap className="h-3 w-3" />}>
                Gemini AI inside
              </Badge>
              <h2 className="mt-4 font-display text-3xl font-bold text-white">
                Your AI credibility copywriter
              </h2>
              <p className="mt-3 text-sm text-white/55">
                Generate persuasive, conversion-focused copy in seconds — in
                English or natural Taglish. AI audits your profile and tells
                you exactly how to improve.
              </p>
              <ul className="mt-5 space-y-2.5">
                {[
                  "Conversational AI profile generator",
                  "Native Taglish mode for Filipino marketers",
                  "AI audit with credibility & conversion scores",
                  "Rewrite bios, CTAs and recruiting pitches",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-white/70">
                    <Check className="h-4 w-4 shrink-0 text-jade-400" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-white/[0.07] bg-ink-900/60 p-5">
              <div className="flex items-center gap-2 text-xs text-white/40">
                <Sparkles className="h-3.5 w-3.5 text-electric-400" />
                Credibly AI
              </div>
              <p className="mt-3 rounded-xl bg-white/[0.04] p-3 text-sm text-white/80">
                &ldquo;Tinutulungan ko ang mga busy moms na magkaroon ng extra
                income mula sa bahay — kahit walang experience.&rdquo;
              </p>
              <div className="mt-3 flex gap-2">
                <span className="rounded-lg bg-jade-500/15 px-2.5 py-1 text-xs text-jade-300">
                  Credibility 92
                </span>
                <span className="rounded-lg bg-electric-500/15 px-2.5 py-1 text-xs text-electric-300">
                  Conversion 88
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────── */}
      <section id="how" className="mx-auto max-w-6xl px-5 py-16">
        <div className="text-center">
          <h2 className="font-display text-3xl font-bold text-white">
            Live in 3 simple steps
          </h2>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="glass-card rounded-2xl p-6 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-gradient font-display text-lg font-bold text-white shadow-glow-blue">
                {s.n}
              </span>
              <h3 className="mt-4 font-display text-base font-semibold text-white">
                {s.title}
              </h3>
              <p className="mt-1 text-sm text-white/50">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Testimonials (admin-toggleable) ─────────────────────── */}
      {testimonials.enabled && testimonials.items.length > 0 && (
        <section className="mx-auto max-w-6xl px-5 py-16">
          <div className="text-center">
            <h2 className="font-display text-3xl font-bold text-white">
              {testimonials.title}
            </h2>
            {testimonials.subtitle && (
              <p className="mx-auto mt-3 max-w-md text-sm text-white/50">
                {testimonials.subtitle}
              </p>
            )}
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {testimonials.items.map((t) => (
              <div
                key={t.id}
                className="glass-card flex flex-col rounded-2xl p-5"
              >
                {t.rating ? (
                  <div className="mb-3 flex gap-0.5 text-gold-300">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          "h-3.5 w-3.5",
                          i < (t.rating ?? 0)
                            ? "fill-gold-300"
                            : "fill-transparent text-white/15",
                        )}
                      />
                    ))}
                  </div>
                ) : null}
                <p className="flex-1 text-sm leading-relaxed text-white/75">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="mt-4 flex items-center gap-3 border-t border-white/[0.06] pt-4">
                  <Avatar name={t.name} src={t.avatarUrl} size={36} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">
                      {t.name}
                    </p>
                    <p className="truncate text-xs text-white/45">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

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

      {/* ── Pricing ─────────────────────────────────────────────── */}
      <section id="pricing" className="mx-auto max-w-6xl px-5 py-16">
        <div className="text-center">
          <h2 className="font-display text-3xl font-bold text-white">
            Simple, honest pricing
          </h2>
          <p className="mt-3 text-sm text-white/50">
            Start free. Upgrade when you&apos;re ready to scale.
          </p>
        </div>
        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {plans
            .filter((plan) => plan.visibility !== "affiliate")
            .map((plan) => (
              <div
                key={plan.id}
                className={`rounded-2xl border p-6 ${
                  plan.highlighted
                    ? "border-electric-500/40 bg-electric-500/[0.05]"
                    : "border-white/[0.07] bg-white/[0.02]"
                }`}
              >
                {plan.highlighted && (
                  <Badge tone="blue" className="mb-3">
                    Most popular
                  </Badge>
                )}
                <h3 className="font-display text-lg font-bold text-white">
                  {plan.name}
                </h3>
                <p className="text-xs text-white/45">{plan.tagline}</p>
                <p className="mt-4 font-display text-3xl font-bold text-white">
                  ₱{plan.price.toLocaleString()}
                  <span className="text-sm font-normal text-white/40">
                    {plan.billingPeriod === "annual" ? "/yr" : "/mo"}
                  </span>
                </p>
                <Button
                  href="/signup"
                  fullWidth
                  variant={plan.highlighted ? "primary" : "outline"}
                  className="mt-4"
                >
                  Get {plan.name}
                </Button>
                <ul className="mt-5 space-y-2">
                  {planDisplayFeatures(plan).map((f) => (
                    <li
                      key={f.label}
                      className={`flex items-center gap-2 text-sm ${
                        f.included ? "text-white/70" : "text-white/30"
                      }`}
                    >
                      <Check
                        className={`h-4 w-4 shrink-0 ${
                          f.included ? "text-jade-400" : "text-white/15"
                        }`}
                      />
                      {f.label}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
        </div>
      </section>

      {/* ── FAQ (admin-toggleable, defaults to enabled) ─────────── */}
      {faq.enabled && faq.items.length > 0 && (
        <section id="faq" className="mx-auto max-w-3xl px-5 py-16">
          <div className="text-center">
            <h2 className="font-display text-3xl font-bold text-white">
              {faq.title}
            </h2>
          </div>
          <div className="mt-10 space-y-2.5">
            {faq.items.map((item) => (
              <FaqRow key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}

      {/* ── Final CTA ───────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="relative overflow-hidden rounded-3xl bg-brand-gradient p-10 text-center">
          <div className="glow-blob left-1/2 top-0 h-60 w-60 -translate-x-1/2 bg-white/20" />
          <div className="relative">
            <h2 className="font-display text-3xl font-bold text-white">
              {finalCta.title}
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-white/80">
              {finalCta.subtitle}
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button href="/signup" variant="solid" size="lg">
                {finalCta.primaryCta}
              </Button>
              <Button
                href="/demo"
                variant="outline"
                size="lg"
                className="border-white/30"
              >
                {finalCta.secondaryCta}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.06]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 sm:flex-row">
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
