"use client";

/**
 * Affiliate dashboard — overview page.
 *
 * Shows the affiliate's key stats, referral link, recent referrals and
 * recent earnings at a glance. Detailed views live under
 * /affiliate/referrals and /affiliate/earnings.
 *
 * Stats come from two sources:
 *   - The affiliate doc's cached `stats` object (cheap, instant)
 *   - The commissions collection (authoritative — recomputed for the
 *     "Recent earnings" panel)
 *
 * The cached stats are kept in sync by the commission-creation helpers
 * in Step 5. Until that lands, the dashboard mostly shows zeros and
 * empty states — which is fine, that's accurate.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  Copy,
  ExternalLink,
  Loader2,
  Sparkles,
  Wallet,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  getAffiliate,
  listCommissionsForAffiliate,
} from "@/lib/firebase/firestore";
import { referralShareUrl } from "@/lib/affiliate";
import { copyToClipboard, timeAgo } from "@/lib/utils";
import { toast } from "@/store/uiStore";
import type { Affiliate, Commission } from "@/types";

function formatPHP(n: number): string {
  return `₱${(n ?? 0).toLocaleString()}`;
}

export default function AffiliateOverviewPage() {
  const { account } = useAuth();
  const [affiliate, setAffiliate] = useState<Affiliate | null>(null);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!account || account.role !== "affiliate") return;
    let cancelled = false;
    (async () => {
      try {
        const [aff, recent] = await Promise.all([
          getAffiliate(account.uid),
          listCommissionsForAffiliate(account.uid).catch(() => []),
        ]);
        if (cancelled) return;
        setAffiliate(aff);
        setCommissions(recent);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [account]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-white/55">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading your dashboard…
        </div>
      </div>
    );
  }

  if (!affiliate) return null;

  const link = referralShareUrl(affiliate.code);
  const recentReferrals = [
    ...new Map(commissions.map((c) => [c.userId, c])).values(),
  ].slice(0, 5);
  const recentEarnings = commissions.slice(0, 5);

  const stats = affiliate.stats ?? {
    totalReferrals: 0,
    activeReferrals: 0,
    totalEarned: 0,
    pendingPayout: 0,
    paidOut: 0,
  };

  const copyLink = async () => {
    if (await copyToClipboard(link)) {
      setCopied(true);
      toast.success("Referral link copied.");
      setTimeout(() => setCopied(false), 1800);
    } else {
      toast.error("Couldn't copy.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">
            Welcome back, {affiliate.displayName.split(" ")[0]} 👋
          </h1>
          <p className="mt-1 text-sm text-white/55">
            Track your referrals and earnings — payouts are processed manually
            by the admin.
          </p>
        </div>
        <div className="rounded-xl border border-electric-500/30 bg-electric-500/[0.05] px-3 py-1.5">
          <span className="mr-1.5 text-[11px] font-medium uppercase tracking-wider text-electric-300/70">
            Your code
          </span>
          <span className="rounded-md bg-electric-500/15 px-2 py-0.5 font-mono text-sm font-semibold text-electric-300">
            {affiliate.code}
          </span>
        </div>
      </div>

      {/* Referral link */}
      <Card className="p-5">
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-white/45">
          Your referral link
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-1.5 pl-3">
            <span className="flex-1 truncate text-sm text-white/75">{link}</span>
            <Button
              size="sm"
              variant={copied ? "outline" : "primary"}
              leftIcon={
                copied ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )
              }
              onClick={copyLink}
            >
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-white/40">
          Share via WhatsApp, Messenger, SMS — anywhere. Clicks are attributed
          for 30 days; you earn on every paid signup AND every renewal.
        </p>
      </Card>

      {/* Stats grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatTile label="Total referrals" value={stats.totalReferrals} />
        <StatTile label="Active" value={stats.activeReferrals} />
        <StatTile label="Total earned" value={formatPHP(stats.totalEarned)} accent />
        <StatTile label="Pending payout" value={formatPHP(stats.pendingPayout)} />
        <StatTile label="Paid out" value={formatPHP(stats.paidOut)} />
      </div>

      {/* Recent earnings + recent referrals */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Recent earnings */}
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-sm font-semibold text-white">
              Recent earnings
            </h2>
            <Link href="/affiliate/earnings">
              <Button
                size="sm"
                variant="outline"
                rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
              >
                View all
              </Button>
            </Link>
          </div>
          {recentEarnings.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04]">
                <Wallet className="h-5 w-5 text-white/30" />
              </span>
              <p className="text-sm text-white/55">No earnings yet</p>
              <p className="max-w-xs text-xs text-white/40">
                Once someone you referred is upgraded to a paid plan, their
                commission shows up here.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentEarnings.map((c) => (
                <CommissionRow key={c.id} c={c} />
              ))}
            </div>
          )}
        </Card>

        {/* Recent referrals */}
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-sm font-semibold text-white">
              Recent referrals
            </h2>
            <Link href="/affiliate/referrals">
              <Button
                size="sm"
                variant="outline"
                rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
              >
                View all
              </Button>
            </Link>
          </div>
          {recentReferrals.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04]">
                <Sparkles className="h-5 w-5 text-white/30" />
              </span>
              <p className="text-sm text-white/55">No referrals yet</p>
              <p className="max-w-xs text-xs text-white/40">
                Share your link to start. Anyone who signs up via{" "}
                <span className="font-mono text-electric-300">
                  /r/{affiliate.code}
                </span>{" "}
                will appear here once they activate a plan.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentReferrals.map((c) => (
                <div
                  key={c.userId}
                  className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-electric-500/15 text-xs font-bold uppercase text-electric-300">
                    {c.userDisplayName?.[0] ?? "?"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">
                      {c.userDisplayName || "Anonymous"}
                    </p>
                    <p className="truncate text-xs text-white/45">
                      {c.userEmailMasked} · {c.planName}
                    </p>
                  </div>
                  <Badge tone="blue">{c.planName}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Help banner */}
      <Card className="border border-electric-500/20 bg-electric-500/[0.04] p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-electric-500/15">
            <ExternalLink className="h-4 w-4 text-electric-300" />
          </span>
          <div>
            <h3 className="font-display text-sm font-semibold text-white">
              How to promote effectively
            </h3>
            <p className="mt-1 text-xs text-white/55">
              Pair your referral link with a clear call-to-action like
              &ldquo;Get your AI credibility profile&rdquo;. Add the link to
              your bio, your QR code, your business card. The 30-day cookie
              gives prospects plenty of time to decide.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ── Small components ── */

function StatTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <Card
      className={
        accent
          ? "border border-electric-500/30 bg-electric-500/[0.05] p-4"
          : "p-4"
      }
    >
      <p
        className={
          accent
            ? "text-[11px] font-medium uppercase tracking-wider text-electric-300/80"
            : "text-[11px] font-medium uppercase tracking-wider text-white/40"
        }
      >
        {label}
      </p>
      <p className="mt-1 font-display text-2xl font-bold text-white">{value}</p>
    </Card>
  );
}

function CommissionRow({ c }: { c: Commission }) {
  const isPaid = c.status === "paid";
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">
          {c.userDisplayName} · {c.planName}
        </p>
        <p className="text-[11px] text-white/45">
          {c.type === "signup" ? "Signup commission" : c.type === "renewal" ? "Renewal commission" : "Adjustment"}{" "}
          · {timeAgo(c.earnedAt)}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-bold text-white">{formatPHP(c.amount)}</p>
        <Badge tone={isPaid ? "jade" : "gold"}>
          {isPaid ? "Paid" : "Pending"}
        </Badge>
      </div>
    </div>
  );
}
