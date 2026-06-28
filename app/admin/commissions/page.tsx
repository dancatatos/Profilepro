"use client";

/**
 * Admin → all commissions across all affiliates.
 *
 * Used to track payouts: filter by pending/paid/reversed, select
 * commissions in bulk, mark them as paid in one click after the admin
 * has actually sent the money (via GCash / bank / etc.). Each affiliate's
 * cached stats are auto-recomputed after every status change so their
 * dashboard reflects "Pending payout" and "Paid out" totals correctly.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CheckCheck,
  Filter,
  Loader2,
  RefreshCw,
  RotateCcw,
  Search,
  Wallet,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import {
  batchSetCommissionStatus,
  listAllCommissions,
  setCommissionStatus,
} from "@/lib/firebase/firestore";
import { auth as firebaseAuth } from "@/lib/firebase/client";
import { timeAgo } from "@/lib/utils";
import { toast } from "@/store/uiStore";
import type { Commission, CommissionStatus, CommissionType } from "@/types";

/**
 * Best-effort POST to /api/notify/commission-paid. The route handles
 * grouping commissions by affiliate and sending one summary email per
 * affiliate, so we just pass the full list of IDs that were marked paid.
 * Non-blocking — toast already fired by the caller.
 */
async function notifyCommissionsPaid(commissionIds: string[]): Promise<void> {
  if (commissionIds.length === 0) return;
  try {
    const user = firebaseAuth.currentUser;
    if (!user) return;
    const idToken = await user.getIdToken();
    await fetch("/api/notify/commission-paid", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ commissionIds }),
    });
  } catch {
    /* swallow — email is best-effort */
  }
}

type StatusFilter = "all" | CommissionStatus;
type TypeFilter = "all" | CommissionType;

const STATUS_TABS: { id: StatusFilter; label: string }[] = [
  { id: "pending", label: "Pending" },
  { id: "paid", label: "Paid" },
  { id: "reversed", label: "Reversed" },
  { id: "all", label: "All" },
];

const TYPE_TABS: { id: TypeFilter; label: string }[] = [
  { id: "all", label: "All types" },
  { id: "signup", label: "Signup" },
  { id: "renewal", label: "Renewal" },
  { id: "adjustment", label: "Adjustment" },
];

function formatPHP(n: number): string {
  return `₱${(n ?? 0).toLocaleString()}`;
}

export default function AdminCommissionsPage() {
  const { account } = useAuth();
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listAllCommissions();
      setCommissions(list);
      setSelected(new Set());
    } catch {
      toast.error("Couldn't load commissions.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (account?.role === "admin") load();
  }, [account, load]);

  /* Filtered + searched list */
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return commissions.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (typeFilter !== "all" && c.type !== typeFilter) return false;
      if (!q) return true;
      return (
        c.userDisplayName.toLowerCase().includes(q) ||
        c.userEmailMasked.toLowerCase().includes(q) ||
        c.affiliateCode.toLowerCase().includes(q) ||
        c.planName.toLowerCase().includes(q)
      );
    });
  }, [commissions, statusFilter, typeFilter, search]);

  /* Totals across ALL (unfiltered) commissions */
  const totals = useMemo(() => {
    return commissions.reduce(
      (acc, c) => {
        if (c.status === "pending") acc.pending += c.amount;
        if (c.status === "paid") acc.paid += c.amount;
        if (c.status === "reversed") acc.reversed += c.amount;
        return acc;
      },
      { pending: 0, paid: 0, reversed: 0 },
    );
  }, [commissions]);

  /* Selection helpers */
  const allFilteredSelected =
    filtered.length > 0 && filtered.every((c) => selected.has(c.id));
  const someFilteredSelected =
    filtered.some((c) => selected.has(c.id)) && !allFilteredSelected;
  const toggleAllFiltered = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filtered.forEach((c) => next.delete(c.id));
      } else {
        filtered.forEach((c) => next.add(c.id));
      }
      return next;
    });
  };
  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedCommissions = commissions.filter((c) => selected.has(c.id));
  const selectedTotal = selectedCommissions.reduce(
    (sum, c) => sum + c.amount,
    0,
  );

  const markStatus = async (status: CommissionStatus) => {
    if (selected.size === 0) return;
    const verb =
      status === "paid"
        ? "as paid"
        : status === "reversed"
          ? "as reversed"
          : "as pending";
    if (
      !confirm(
        `Mark ${selected.size} commission${selected.size === 1 ? "" : "s"} ${verb}? Total: ${formatPHP(selectedTotal)}.`,
      )
    )
      return;
    setBusy(true);
    const ids = Array.from(selected);
    try {
      await batchSetCommissionStatus(ids, status);
      toast.success(
        `${selected.size} commission${selected.size === 1 ? "" : "s"} marked ${verb}.`,
      );
      /* Send commission-paid emails after a paid-status flip. Grouped
         per-affiliate by the API route so each affiliate gets a single
         summary email, never N spam messages. */
      if (status === "paid") {
        notifyCommissionsPaid(ids);
      }
      await load();
    } catch {
      toast.error("Couldn't update those commissions.");
    } finally {
      setBusy(false);
    }
  };

  const markOne = async (c: Commission, status: CommissionStatus) => {
    setBusy(true);
    try {
      await setCommissionStatus(c.id, status);
      toast.success("Updated.");
      /* Optimistic local update so the row reflects the change without a refetch. */
      setCommissions((prev) =>
        prev.map((row) =>
          row.id === c.id
            ? {
                ...row,
                status,
                paidAt: status === "paid" ? Date.now() : row.paidAt,
              }
            : row,
        ),
      );
      /* Same notification path as the batch action — one paid row → one email. */
      if (status === "paid") {
        notifyCommissionsPaid([c.id]);
      }
    } catch {
      toast.error("Couldn't update.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4 p-4 sm:space-y-6 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            Commissions
          </h1>
          <p className="text-sm text-slate-500">
            Affiliate earnings ledger across all referrals.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={load}
          loading={loading}
          leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
        >
          Refresh
        </Button>
      </div>

      {/* Summary tiles */}
      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryTile
          label="Pending payout"
          value={formatPHP(totals.pending)}
          accent="gold"
        />
        <SummaryTile label="Paid out" value={formatPHP(totals.paid)} accent="jade" />
        <SummaryTile label="Reversed" value={formatPHP(totals.reversed)} />
      </div>

      {/* Filters */}
      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-slate-400">
            <Filter className="h-3.5 w-3.5" />
            Filter
          </div>
          <FilterPills
            value={statusFilter}
            options={STATUS_TABS}
            onChange={setStatusFilter}
          />
          <span className="text-slate-300">·</span>
          <FilterPills
            value={typeFilter}
            options={TYPE_TABS}
            onChange={setTypeFilter}
          />
          <div className="relative ml-auto w-64 max-w-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-300" />
            <Input
              placeholder="Search affiliate, customer, plan…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 text-sm"
            />
          </div>
        </div>
      </Card>

      {/* Bulk action bar — only when at least one is selected */}
      {selected.size > 0 && (
        <Card className="border border-electric-500/30 bg-electric-500/[0.05] p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-900">
              <span className="font-semibold">{selected.size}</span> selected ·{" "}
              <span className="text-slate-500">total {formatPHP(selectedTotal)}</span>
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelected(new Set())}
              >
                Clear selection
              </Button>
              <Button
                size="sm"
                variant="outline"
                leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
                onClick={() => markStatus("reversed")}
                loading={busy}
              >
                Mark reversed
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => markStatus("pending")}
                loading={busy}
              >
                Mark pending
              </Button>
              <Button
                size="sm"
                leftIcon={<CheckCheck className="h-3.5 w-3.5" />}
                onClick={() => markStatus("paid")}
                loading={busy}
              >
                Mark paid
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Ledger */}
      <Card className="p-5">
        {loading ? (
          <div className="flex h-40 items-center justify-center text-sm text-slate-400">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading commissions…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
              <Wallet className="h-6 w-6 text-slate-300" />
            </span>
            <p className="text-sm font-medium text-slate-900">
              {commissions.length === 0
                ? "No commissions yet"
                : "No commissions match your filter"}
            </p>
            <p className="max-w-sm text-xs text-slate-400">
              {commissions.length === 0
                ? "Commissions are auto-created when you upgrade a referred user to a paid plan."
                : "Try clearing one or both filters."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-400">
                  <th className="pb-3 pr-2 text-left font-medium">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = someFilteredSelected;
                      }}
                      onChange={toggleAllFiltered}
                      className="h-4 w-4 cursor-pointer rounded border-slate-300 bg-slate-100 accent-electric-500"
                      aria-label="Select all in view"
                    />
                  </th>
                  <th className="pb-3 text-left font-medium">Affiliate</th>
                  <th className="pb-3 text-left font-medium">Customer</th>
                  <th className="pb-3 text-left font-medium">Plan</th>
                  <th className="pb-3 text-left font-medium">Type</th>
                  <th className="pb-3 text-left font-medium">Earned</th>
                  <th className="pb-3 text-left font-medium">Status</th>
                  <th className="pb-3 text-right font-medium">Amount</th>
                  <th className="pb-3 text-right font-medium">Quick</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filtered.map((c) => {
                  const isSelected = selected.has(c.id);
                  return (
                    <tr
                      key={c.id}
                      className={
                        isSelected
                          ? "bg-electric-500/[0.04]"
                          : "group"
                      }
                    >
                      <td className="py-3 pr-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleOne(c.id)}
                          className="h-4 w-4 cursor-pointer rounded border-slate-300 bg-slate-100 accent-electric-500"
                          aria-label={`Select commission ${c.id}`}
                        />
                      </td>
                      <td className="py-3 pr-4">
                        <Link
                          href={`/admin/affiliates/${c.affiliateId}`}
                          className="inline-flex items-center gap-1.5 rounded-md bg-electric-500/12 px-2 py-0.5 font-mono text-xs font-semibold text-electric-700 hover:bg-electric-500/20"
                        >
                          {c.affiliateCode}
                        </Link>
                      </td>
                      <td className="py-3 pr-4">
                        <p className="text-sm text-slate-900">
                          {c.userDisplayName}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {c.userEmailMasked}
                        </p>
                      </td>
                      <td className="py-3 pr-4 text-slate-700">{c.planName}</td>
                      <td className="py-3 pr-4">
                        <Badge
                          tone={
                            c.type === "renewal"
                              ? "blue"
                              : c.type === "adjustment"
                                ? "neutral"
                                : "jade"
                          }
                        >
                          {c.type}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4 text-slate-500">
                        {timeAgo(c.earnedAt)}
                      </td>
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
                      <td className="py-3 pr-4 text-right font-semibold text-slate-900">
                        {formatPHP(c.amount)}
                      </td>
                      <td className="py-3 text-right">
                        {c.status === "pending" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            leftIcon={<CheckCheck className="h-3 w-3" />}
                            onClick={() => markOne(c, "paid")}
                            disabled={busy}
                          >
                            Paid
                          </Button>
                        ) : c.status === "paid" ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => markOne(c, "pending")}
                            disabled={busy}
                          >
                            Undo
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => markOne(c, "pending")}
                            disabled={busy}
                          >
                            Restore
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {filtered.length > 0 && (
          <p className="mt-4 text-right text-xs text-slate-300">
            Showing {filtered.length} of {commissions.length} commissions
          </p>
        )}
      </Card>

      <Card className="p-4">
        <p className="text-xs text-slate-400">
          Marking a commission as <strong>paid</strong> updates the affiliate&apos;s
          cached &ldquo;Paid out&rdquo; and &ldquo;Pending payout&rdquo; totals
          on their dashboard. After you&apos;ve sent the money (GCash / bank
          / etc.), come here and mark the batch as paid.
        </p>
      </Card>
    </div>
  );
}

/* ── Helpers ── */

function SummaryTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "jade" | "gold";
}) {
  return (
    <Card
      className={
        accent === "jade"
          ? "border border-jade-500/30 bg-jade-500/[0.05] p-4"
          : accent === "gold"
            ? "border border-gold-400/30 bg-gold-400/[0.06] p-4"
            : "p-4"
      }
    >
      <p
        className={
          accent === "jade"
            ? "text-[11px] font-medium uppercase tracking-wider text-jade-600/80"
            : accent === "gold"
              ? "text-[11px] font-medium uppercase tracking-wider text-amber-700/80"
              : "text-[11px] font-medium uppercase tracking-wider text-slate-400"
        }
      >
        {label}
      </p>
      <p className="mt-1 font-display text-2xl font-bold text-slate-900">{value}</p>
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
              ? "rounded-lg border border-electric-500/50 bg-electric-500/15 px-2.5 py-1 text-[11px] font-medium text-electric-700"
              : "rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500 hover:bg-slate-200"
          }
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
