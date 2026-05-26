"use client";

/**
 * Affiliate dashboard — placeholder for Step 4.
 *
 * Right now this only verifies the signed-in user has role="affiliate"
 * and shows their referral link + a coming-soon panel. Step 4 fills in
 * the actual dashboard (referrals table, earnings, upcoming renewals).
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Copy,
  Check,
  Handshake,
  LogOut,
  Sparkles,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { logout } from "@/lib/firebase/auth";
import { getAffiliate } from "@/lib/firebase/firestore";
import { referralShareUrl } from "@/lib/affiliate";
import { copyToClipboard } from "@/lib/utils";
import { toast } from "@/store/uiStore";
import type { Affiliate } from "@/types";

export default function AffiliateDashboardPage() {
  const router = useRouter();
  const { account, loading } = useAuth();
  const [affiliate, setAffiliate] = useState<Affiliate | null>(null);
  const [loadingAff, setLoadingAff] = useState(true);
  const [copied, setCopied] = useState(false);

  /* Guard: must be signed in AND have role=affiliate */
  useEffect(() => {
    if (loading) return;
    if (!account) {
      router.replace("/login");
      return;
    }
    if (account.role !== "affiliate") {
      /* Admins and regular users don't belong here. */
      router.replace(account.role === "admin" ? "/admin" : "/dashboard");
      return;
    }
    (async () => {
      try {
        const aff = await getAffiliate(account.uid);
        setAffiliate(aff);
      } finally {
        setLoadingAff(false);
      }
    })();
  }, [account, loading, router]);

  const handleLogout = async () => {
    await logout();
    router.replace("/affiliate/login");
  };

  const copy = async (value: string, label: string) => {
    if (await copyToClipboard(value)) {
      setCopied(true);
      toast.success(`${label} copied.`);
      setTimeout(() => setCopied(false), 1800);
    } else {
      toast.error("Couldn't copy.");
    }
  };

  if (loading || loadingAff) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-white/55">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading your dashboard…
        </div>
      </div>
    );
  }

  if (!affiliate || !account) return null;

  const link = referralShareUrl(affiliate.code);

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Logo />
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-medium text-white">
              {affiliate.displayName}
            </p>
            <p className="text-[11px] text-white/40">{affiliate.email}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            leftIcon={<LogOut className="h-3.5 w-3.5" />}
          >
            Sign out
          </Button>
        </div>
      </div>

      {/* Welcome */}
      <Card className="p-6">
        <div className="mb-3 flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-electric-500/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-electric-300">
            <Handshake className="h-3 w-3" />
            Affiliate
          </span>
          <span className="text-xs text-white/40">·</span>
          <span className="rounded-md bg-electric-500/12 px-2 py-0.5 font-mono text-[11px] font-semibold text-electric-300">
            {affiliate.code}
          </span>
        </div>
        <h1 className="font-display text-2xl font-bold text-white">
          Welcome, {affiliate.displayName.split(" ")[0]} 🎉
        </h1>
        <p className="mt-2 text-sm text-white/55">
          Your account is active. Share your referral link below — anyone who
          clicks it and signs up within 30 days will be tied to your code, and
          you&apos;ll earn commission on every plan they activate (signup +
          every renewal).
        </p>
      </Card>

      {/* Referral link */}
      <Card className="p-5">
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-white/45">
          Your referral link
        </p>
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-1.5 pl-3">
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
            onClick={() => copy(link, "Referral link")}
          >
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
        <p className="mt-2 text-[11px] text-white/40">
          Share this link by SMS, WhatsApp, Messenger or anywhere else. The
          attribution window is 30 days from the first click.
        </p>
      </Card>

      {/* Stats stub */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Referrals", value: affiliate.stats?.totalReferrals ?? 0 },
          {
            label: "Active",
            value: affiliate.stats?.activeReferrals ?? 0,
          },
          {
            label: "Total earned",
            value: `₱${(affiliate.stats?.totalEarned ?? 0).toLocaleString()}`,
          },
        ].map((s) => (
          <Card key={s.label} className="p-4">
            <p className="text-[11px] font-medium uppercase tracking-wider text-white/40">
              {s.label}
            </p>
            <p className="mt-1 font-display text-2xl font-bold text-white">
              {s.value}
            </p>
          </Card>
        ))}
      </div>

      {/* Coming soon */}
      <Card className="border border-electric-500/20 bg-electric-500/[0.04] p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-electric-500/15">
            <Sparkles className="h-4 w-4 text-electric-300" />
          </span>
          <div>
            <h3 className="font-display text-sm font-semibold text-white">
              More dashboard features coming soon
            </h3>
            <p className="mt-1 text-xs text-white/55">
              Detailed referral list (with status), commission ledger, upcoming
              renewal alerts and payout history are being added next. For now,
              start sharing your link — every signup is tracked from day one
              and will appear here when the dashboard goes live.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
