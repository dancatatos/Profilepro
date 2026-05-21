"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  BadgeCheck,
  Check,
  Copy,
  QrCode,
  Smartphone,
  Sparkles,
  Wand2,
  Zap,
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PublicProfileView } from "@/components/public-profile/PublicProfileView";
import { DEMO_PROFILE } from "@/lib/defaults";
import { PLANS } from "@/lib/constants";
import { getPlansConfig } from "@/lib/firebase/firestore";
import type { Plan } from "@/types";

const AUDIENCES = [
  "Network Marketers",
  "Affiliate Marketers",
  "Insurance Agents",
  "Coaches",
  "Recruiters",
  "Online Sellers",
];

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

  useEffect(() => {
    getPlansConfig()
      .then((p) => {
        if (p) setPlans(p);
      })
      .catch(() => null);
  }, []);

  return (
    <div className="relative overflow-hidden bg-ink-950">
      <div className="glow-blob -left-32 top-0 h-80 w-80 bg-electric-600/30" />
      <div className="glow-blob right-0 top-[40rem] h-80 w-80 bg-jade-600/20" />

      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-ink-950/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Logo />
          <nav className="hidden items-center gap-7 text-sm text-white/60 md:flex">
            <a href="#features" className="hover:text-white">Features</a>
            <a href="#how" className="hover:text-white">How it works</a>
            <a href="#pricing" className="hover:text-white">Pricing</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button href="/login" variant="ghost" size="sm">
              Log in
            </Button>
            <Button href="/signup" size="sm">
              Get started
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative mx-auto max-w-6xl px-5 pt-14 pb-10 lg:pt-20">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Badge tone="blue" icon={<Sparkles className="h-3 w-3" />}>
              AI-powered credibility platform
            </Badge>
            <h1 className="mt-4 font-display text-4xl font-bold leading-[1.1] text-white sm:text-5xl">
              Build Your Professional{" "}
              <span className="text-gradient">Credibility Profile</span> In
              Minutes.
            </h1>
            <p className="mt-4 max-w-lg text-base text-white/55">
              Perfect for network marketers, recruiters, coaches and online
              sellers who want to look more professional online — and close
              more prospects.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button href="/signup" size="lg" rightIcon={<ArrowRight className="h-4 w-4" />}>
                Start free
              </Button>
              <Button href="/demo" size="lg" variant="outline">
                See live example
              </Button>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              {AUDIENCES.map((a) => (
                <span
                  key={a}
                  className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-xs text-white/55"
                >
                  {a}
                </span>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="relative mx-auto"
          >
            <div className="absolute -inset-6 rounded-[3rem] bg-electric-600/20 blur-3xl" />
            <div className="relative w-[300px] rounded-[2.6rem] border-4 border-ink-700 bg-ink-950 p-2 shadow-glass">
              <div className="no-scrollbar h-[600px] overflow-y-auto rounded-[2rem]">
                <PublicProfileView profile={DEMO_PROFILE} />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
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

      {/* AI highlight */}
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

      {/* How it works */}
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

      {/* Pricing */}
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
          {plans.map((plan) => (
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
                ₱{plan.priceMonthly.toLocaleString()}
                <span className="text-sm font-normal text-white/40">/mo</span>
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
                {plan.features.map((f) => (
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

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="relative overflow-hidden rounded-3xl bg-brand-gradient p-10 text-center">
          <div className="glow-blob left-1/2 top-0 h-60 w-60 -translate-x-1/2 bg-white/20" />
          <div className="relative">
            <h2 className="font-display text-3xl font-bold text-white">
              Look more professional. Close more prospects.
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-white/80">
              Build your AI-powered credibility profile today — free to start,
              installable as an app.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button href="/signup" variant="solid" size="lg">
                Create your profile
              </Button>
              <Button href="/demo" variant="outline" size="lg" className="border-white/30">
                View example
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.06]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 sm:flex-row">
          <Logo />
          <p className="text-xs text-white/35">
            &copy; {new Date().getFullYear()} Credibly. Built for trust.
          </p>
          <div className="flex gap-5 text-xs text-white/45">
            <Link href="/login">Log in</Link>
            <Link href="/signup">Sign up</Link>
            <Link href="/demo">Example</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
