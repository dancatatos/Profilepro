"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Circle, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useProfileStore } from "@/store/profileStore";
import { getAnalyticsSummary } from "@/lib/firebase/firestore";
import { profileCompleteness } from "@/lib/profileMetrics";
import { formatCompact, formatPercent } from "@/lib/utils";
import type { AnalyticsSummary } from "@/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { ScoreRing } from "@/components/common/ScoreRing";
import { StatCard } from "@/components/common/StatCard";

const DEMO_SUMMARY: AnalyticsSummary = {
  views: 1240,
  ctaClicks: 312,
  socialClicks: 188,
  leads: 47,
  shares: 63,
  conversionRate: 47 / 1240,
};

const QUICK = [
  { label: "Edit Profile", icon: "UserRound", href: "/profile", accent: "blue" },
  { label: "AI Assistant", icon: "Sparkles", href: "/ai-assistant", accent: "jade" },
  { label: "QR Code", icon: "QrCode", href: "/qr", accent: "gold" },
  { label: "Analytics", icon: "BarChart3", href: "/analytics", accent: "white" },
] as const;

const MODULES = [
  { label: "Templates", icon: "LayoutTemplate", href: "/templates", desc: "Start from a proven layout" },
  { label: "Digital Card", icon: "CreditCard", href: "/card", desc: "Your modern business card" },
  { label: "Leads", icon: "Users", href: "/leads", desc: "Prospects who reached out" },
  { label: "Media Library", icon: "Images", href: "/media", desc: "Photos & video assets" },
  { label: "Billing", icon: "Sparkles", href: "/billing", desc: "Plan & subscription" },
  { label: "Settings", icon: "Settings", href: "/settings", desc: "Account & profile URL" },
];

export default function DashboardPage() {
  const { account } = useAuth();
  const profile = useProfileStore((s) => s.profile);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);

  useEffect(() => {
    if (!account) return;
    if (account.uid === "demo") {
      setSummary(DEMO_SUMMARY);
      return;
    }
    getAnalyticsSummary(account.uid).then(setSummary).catch(() => null);
  }, [account]);

  const { score, checklist } = useMemo(
    () => profileCompleteness(profile),
    [profile],
  );
  const s = summary ?? {
    views: 0,
    ctaClicks: 0,
    socialClicks: 0,
    leads: 0,
    shares: 0,
    conversionRate: 0,
  };

  const firstName = account?.displayName?.split(" ")[0] || "there";

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-white/45">Welcome back,</p>
        <h1 className="font-display text-2xl font-bold text-white">
          {firstName} &#128075;
        </h1>
      </div>

      {/* Completeness + AI */}
      <Card className="overflow-hidden p-5">
        <div className="flex items-center gap-5">
          <ScoreRing value={score} accent={score >= 70 ? "jade" : "blue"} label="ready" />
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-base font-semibold text-white">
              Your profile is {score}% ready
            </h2>
            <p className="mt-0.5 text-xs text-white/45">
              {score >= 80
                ? "Looking sharp — share it with prospects!"
                : "Finish the steps below to build instant trust."}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button href="/profile" size="sm" rightIcon={<ArrowRight className="h-3.5 w-3.5" />}>
                Continue building
              </Button>
              <Button href="/ai-assistant" size="sm" variant="outline" leftIcon={<Sparkles className="h-3.5 w-3.5" />}>
                Generate with AI
              </Button>
            </div>
          </div>
        </div>
        <div className="mt-4 grid gap-1.5 border-t border-white/[0.06] pt-4 sm:grid-cols-2">
          {checklist.slice(0, 6).map((c) => (
            <div key={c.label} className="flex items-center gap-2 text-xs">
              {c.done ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-jade-400" />
              ) : (
                <Circle className="h-4 w-4 shrink-0 text-white/20" />
              )}
              <span className={c.done ? "text-white/50 line-through" : "text-white/70"}>
                {c.label}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon="Eye" label="Profile views" value={formatCompact(s.views)} accent="blue" />
        <StatCard icon="MousePointerClick" label="CTA clicks" value={formatCompact(s.ctaClicks)} accent="jade" />
        <StatCard icon="Inbox" label="Leads captured" value={formatCompact(s.leads)} accent="gold" />
        <StatCard icon="TrendingUp" label="Conversion" value={formatPercent(s.conversionRate)} accent="white" />
      </div>

      {/* Quick actions */}
      <div>
        <h3 className="mb-2.5 font-display text-sm font-semibold text-white">
          Quick actions
        </h3>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {QUICK.map((q, i) => (
            <motion.div
              key={q.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link href={q.href}>
                <Card className="flex items-center gap-3 p-4 transition-transform active:scale-[0.98]">
                  <StatIcon icon={q.icon} accent={q.accent} />
                  <span className="text-sm font-medium text-white">
                    {q.label}
                  </span>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Modules */}
      <div>
        <h3 className="mb-2.5 font-display text-sm font-semibold text-white">
          Explore Credibly
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {MODULES.map((m) => (
            <Link key={m.label} href={m.href}>
              <Card className="flex items-center gap-3 p-4 transition-transform active:scale-[0.98]">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.05]">
                  <Icon name={m.icon} className="h-5 w-5 text-white/55" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white">{m.label}</p>
                  <p className="truncate text-xs text-white/40">{m.desc}</p>
                </div>
                <ArrowRight className="ml-auto h-4 w-4 text-white/25" />
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatIcon({ icon, accent }: { icon: string; accent: string }) {
  const map: Record<string, string> = {
    blue: "text-electric-400 bg-electric-500/10",
    jade: "text-jade-400 bg-jade-500/10",
    gold: "text-gold-300 bg-gold-400/10",
    white: "text-white bg-white/10",
  };
  return (
    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${map[accent]}`}>
      <Icon name={icon} className="h-5 w-5" />
    </div>
  );
}
