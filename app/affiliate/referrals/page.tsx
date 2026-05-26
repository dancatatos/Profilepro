"use client";

/**
 * Affiliate referrals — list of customers attributed to this affiliate.
 *
 * To respect customer privacy AND keep Firestore rules simple, the
 * affiliate doesn't read raw user docs. Instead this page derives the
 * referral list from the commission ledger — every paid referral
 * already has commission rows, which snapshot the user's masked email
 * and display name at write time.
 *
 * Result: a referral only appears here AFTER they've been upgraded to
 * a paid plan and a commission row exists. Free signups via the link
 * are tracked silently on the user doc (affiliateId) but not exposed.
 * That's intentional — the affiliate only sees data they've actually
 * earned money from.
 */

import { useEffect, useMemo, useState } from "react";
import { Loader2, Search, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { listCommissionsForAffiliate } from "@/lib/firebase/firestore";
import { timeAgo } from "@/lib/utils";
import type { Commission } from "@/types";

interface ReferralSummary {
  userId: string;
  displayName: string;
  emailMasked: string;
  currentPlan: string;
  firstSeenAt: number;
  lastEarnedAt: number;
  totalEarned: number;
  commissionCount: number;
  /** Most recent commission, used to render the latest plan + status. */
  latest: Commission;
}

function formatPHP(n: number): string {
  return `₱${(n ?? 0).toLocaleString()}`;
}

/** Roll up commissions into one row per unique referred user. */
function summarise(commissions: Commission[]): ReferralSummary[] {
  const map = new Map<string, ReferralSummary>();
  /* commissions arrive newest-first; iterate and accumulate. */
  for (const c of commissions) {
    const existing = map.get(c.userId);
    if (existing) {
      existing.totalEarned += c.amount;
      existing.commissionCount += 1;
      existing.firstSeenAt = Math.min(existing.firstSeenAt, c.earnedAt);
      if (c.earnedAt > existing.lastEarnedAt) {
        existing.lastEarnedAt = c.earnedAt;
        existing.currentPlan = c.planName;
        existing.latest = c;
      }
    } else {
      map.set(c.userId, {
        userId: c.userId,
        displayName: c.userDisplayName,
        emailMasked: c.userEmailMasked,
        currentPlan: c.planName,
        firstSeenAt: c.earnedAt,
        lastEarnedAt: c.earnedAt,
        totalEarned: c.amount,
        commissionCount: 1,
        latest: c,
      });
    }
  }
  return Array.from(map.values()).sort(
    (a, b) => b.lastEarnedAt - a.lastEarnedAt,
  );
}

export default function AffiliateReferralsPage() {
  const { account } = useAuth();
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!account || account.role !== "affiliate") return;
    let cancelled = false;
    (async () => {
      try {
        const list = await listCommissionsForAffiliate(account.uid);
        if (!cancelled) setCommissions(list);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [account]);

  const referrals = useMemo(() => summarise(commissions), [commissions]);
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return referrals;
    return referrals.filter(
      (r) =>
        r.displayName.toLowerCase().includes(q) ||
        r.emailMasked.toLowerCase().includes(q) ||
        r.currentPlan.toLowerCase().includes(q),
    );
  }, [referrals, search]);

  if (loading) {
    return (
      <div className="flex h-[40vh] items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-white/55">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading referrals…
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Referrals</h1>
        <p className="mt-1 text-sm text-white/55">
          Everyone you&apos;ve referred who&apos;s on a paid plan. Free signups
          are tracked silently — they appear here once they upgrade.
        </p>
      </div>

      <Card className="p-5">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-sm font-semibold text-white">
            All referrals
          </h2>
          <div className="relative w-64 max-w-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
            <Input
              placeholder="Search name, email or plan…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 text-sm"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/[0.04]">
              <Users className="h-6 w-6 text-white/30" />
            </span>
            <p className="text-sm font-medium text-white">
              {referrals.length === 0
                ? "No paid referrals yet"
                : "No referrals match your search"}
            </p>
            <p className="max-w-sm text-xs text-white/40">
              {referrals.length === 0
                ? "Share your referral link and your customers will appear here once they activate a plan."
                : "Try clearing the search field."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-xs text-white/40">
                  <th className="pb-3 text-left font-medium">Customer</th>
                  <th className="pb-3 text-left font-medium">Current plan</th>
                  <th className="pb-3 text-left font-medium">Joined</th>
                  <th className="pb-3 text-left font-medium">Last activity</th>
                  <th className="pb-3 text-left font-medium">Commissions</th>
                  <th className="pb-3 text-right font-medium">Total earned</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filtered.map((r) => (
                  <tr key={r.userId} className="group">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-electric-500/15 text-xs font-bold uppercase text-electric-300">
                          {r.displayName?.[0] ?? "?"}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-white">
                            {r.displayName}
                          </p>
                          <p className="truncate text-xs text-white/40">
                            {r.emailMasked}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <Badge tone="blue">{r.currentPlan}</Badge>
                    </td>
                    <td className="py-3 pr-4 text-white/50">
                      {timeAgo(r.firstSeenAt)}
                    </td>
                    <td className="py-3 pr-4 text-white/50">
                      {timeAgo(r.lastEarnedAt)}
                    </td>
                    <td className="py-3 pr-4 text-white/75">
                      {r.commissionCount}{" "}
                      <span className="text-xs text-white/40">
                        {r.commissionCount === 1 ? "payment" : "payments"}
                      </span>
                    </td>
                    <td className="py-3 text-right font-semibold text-white">
                      {formatPHP(r.totalEarned)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {filtered.length > 0 && (
          <p className="mt-4 text-right text-xs text-white/30">
            Showing {filtered.length} of {referrals.length}
          </p>
        )}
      </Card>
    </div>
  );
}
