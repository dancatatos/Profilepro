"use client";

/**
 * Affiliate earnings — full commission ledger.
 *
 * Reads all of this affiliate's commission records and groups them by
 * payment status. Pending commissions are highlighted because they
 * represent income the admin still owes them. Each row shows the
 * referred user, plan, type (signup vs renewal), amount and date.
 *
 * Commission records are created by the admin upgrade action (Step 5).
 * Until that lands, this page shows the empty state — accurate.
 */

import { useEffect, useMemo, useState } from "react";
import { Filter, Loader2, Wallet } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { listCommissionsForAffiliate } from "@/lib/firebase/firestore";
import { timeAgo } from "@/lib/utils";
import type { Commission, CommissionStatus, CommissionType } from "@/types";

type StatusFilter = "all" | CommissionStatus;
type TypeFilter = "all" | CommissionType;

function formatPHP(n: number): string {
  return `₱${(n ?? 0).toLocaleString()}`;
}

const STATUS_TABS: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "paid", label: "Paid" },
  { id: "reversed", label: "Reversed" },
];

const TYPE_TABS: { id: TypeFilter; label: string }[] = [
  { id: "all", label: "All types" },
  { id: "signup", label: "Signup" },
  { id: "renewal", label: "Renewal" },
  { id: "adjustment", label: "Adjustment" },
];

export default function AffiliateEarningsPage() {
  const { account } = useAuth();
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");

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

  /* Totals across ALL commissions, ignoring filters — the filter only
     scopes the table below, not the headline summary. */
  const totals = useMemo(() => {
    return commissions.reduce(
      (acc, c) => {
        acc.all += c.amount;
        if (c.status === "pending") acc.pending += c.amount;
        if (c.status === "paid") acc.paid += c.amount;
        if (c.status === "reversed") acc.reversed += c.amount;
        return acc;
      },
      { all: 0, pending: 0, paid: 0, reversed: 0 },
    );
  }, [commissions]);

  const filtered = useMemo(() => {
    return commissions.filter(
      (c) =>
        (statusFilter === "all" || c.status === statusFilter) &&
        (typeFilter === "all" || c.type === typeFilter),
    );
  }, [commissions, statusFilter, typeFilter]);

  if (loading) {
    return (
      <div className="flex h-[40vh] items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-white/55">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading earnings…
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Earnings</h1>
        <p className="mt-1 text-sm text-white/55">
          Every commission you&apos;ve earned, on signups and renewals. Payouts
          are processed manually by your admin.
        </p>
      </div>

      {/* Summary */}
      <div className="grid gap-3 sm:grid-cols-4">
        <SummaryTile label="Total earned" value={formatPHP(totals.all)} accent />
        <SummaryTile label="Pending" value={formatPHP(totals.pending)} />
        <SummaryTile label="Paid out" value={formatPHP(totals.paid)} />
        <SummaryTile label="Reversed" value={formatPHP(totals.reversed)} />
      </div>

      {/* Filters */}
      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-white/40">
            <Filter className="h-3.5 w-3.5" />
            Filter
          </div>
          <FilterPills
            value={statusFilter}
            options={STATUS_TABS}
            onChange={setStatusFilter}
          />
          <span className="text-white/20">·</span>
          <FilterPills
            value={typeFilter}
            options={TYPE_TABS}
            onChange={setTypeFilter}
          />
        </div>
      </Card>

      {/* Ledger */}
      <Card className="p-5">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/[0.04]">
              <Wallet className="h-6 w-6 text-white/30" />
            </span>
            <p className="text-sm font-medium text-white">
              {commissions.length === 0
                ? "No earnings yet"
                : "No earnings match your filter"}
            </p>
            <p className="max-w-sm text-xs text-white/40">
              {commissions.length === 0
                ? "Every paid signup and every renewal of someone you referred will appear here. Keep sharing your link!"
                : "Try clearing one or both filters above."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-xs text-white/40">
                  <th className="pb-3 text-left font-medium">Referral</th>
                  <th className="pb-3 text-left font-medium">Plan</th>
                  <th className="pb-3 text-left font-medium">Type</th>
                  <th className="pb-3 text-left font-medium">Earned</th>
                  <th className="pb-3 text-left font-medium">Status</th>
                  <th className="pb-3 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filtered.map((c) => (
                  <CommissionLedgerRow key={c.id} c={c} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {filtered.length > 0 && (
          <p className="mt-4 text-right text-xs text-white/30">
            Showing {filtered.length} of {commissions.length}
          </p>
        )}
      </Card>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
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

function FilterPills<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { id: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={
            value === opt.id
              ? "rounded-lg border border-electric-500/50 bg-electric-500/15 px-2.5 py-1 text-[11px] font-medium text-electric-300"
              : "rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-white/55 hover:bg-white/[0.08]"
          }
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function CommissionLedgerRow({ c }: { c: Commission }) {
  return (
    <tr className="group">
      <td className="py-3 pr-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-electric-500/15 text-xs font-bold uppercase text-electric-300">
            {c.userDisplayName?.[0] ?? "?"}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">
              {c.userDisplayName}
            </p>
            <p className="truncate text-xs text-white/40">{c.userEmailMasked}</p>
          </div>
        </div>
      </td>
      <td className="py-3 pr-4 text-white/75">{c.planName}</td>
      <td className="py-3 pr-4">
        <Badge tone={c.type === "renewal" ? "blue" : c.type === "adjustment" ? "neutral" : "jade"}>
          {c.type}
        </Badge>
      </td>
      <td className="py-3 pr-4 text-white/50">{timeAgo(c.earnedAt)}</td>
      <td className="py-3 pr-4">
        <Badge
          tone={
            c.status === "paid"
              ? "jade"
              : c.status === "reversed"
                ? "danger"
                : "gold"
          }
        >
          {c.status}
        </Badge>
      </td>
      <td className="py-3 text-right font-semibold text-white">
        {formatPHP(c.amount)}
      </td>
    </tr>
  );
}
