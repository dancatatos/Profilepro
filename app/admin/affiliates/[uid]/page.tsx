"use client";

/**
 * Admin → individual affiliate detail page.
 *
 * Step 3 ships a minimal version: identity, code, status, payout
 * settings, admin notes, and a "Copy referral link" button. The
 * detailed commission ledger view is wired in Step 5 once we start
 * generating commission records on user upgrades.
 */

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  Check,
  Copy,
  Handshake,
  Loader2,
  Pause,
  Play,
  Save,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import {
  getAffiliate,
  listUpcomingRenewalsForAffiliate,
  updateAffiliate,
  type UpcomingRenewal,
} from "@/lib/firebase/firestore";
import { referralShareUrl } from "@/lib/affiliate";
import { copyToClipboard, timeAgo, timeUntil } from "@/lib/utils";
import { toast } from "@/store/uiStore";
import type {
  Affiliate,
  AffiliatePayout,
  AffiliatePayoutMethod,
} from "@/types";

const PAYOUT_METHODS: { id: AffiliatePayoutMethod; label: string }[] = [
  { id: "gcash", label: "GCash" },
  { id: "bank", label: "Bank Transfer" },
  { id: "paypal", label: "PayPal" },
  { id: "other", label: "Other" },
];

export default function AffiliateDetailPage() {
  const { account } = useAuth();
  const params = useParams<{ uid: string }>();
  const uid = params?.uid as string;

  const [affiliate, setAffiliate] = useState<Affiliate | null>(null);
  const [renewals, setRenewals] = useState<UpcomingRenewal[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  /* Local edit state */
  const [payoutType, setPayoutType] = useState<AffiliatePayoutMethod>("gcash");
  const [payoutDetails, setPayoutDetails] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    try {
      const aff = await getAffiliate(uid);
      setAffiliate(aff);
      if (aff) {
        setPayoutType(aff.payout?.type ?? "gcash");
        setPayoutDetails(aff.payout?.details ?? "");
        setAdminNotes(aff.adminNotes ?? "");
        setDirty(false);
        /* Load upcoming renewals in parallel — soft-fail so a missing
           subscription field on legacy users doesn't break the page. */
        try {
          const rows = await listUpcomingRenewalsForAffiliate(aff.code, 30);
          setRenewals(rows);
        } catch {
          setRenewals([]);
        }
      }
    } catch {
      toast.error("Couldn't load this affiliate.");
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    if (account?.role === "admin") load();
  }, [account, load]);

  const save = async () => {
    if (!affiliate) return;
    setSaving(true);
    try {
      const patch: Partial<Affiliate> = {
        adminNotes: adminNotes.trim() || undefined,
      };
      if (payoutDetails.trim()) {
        const payout: AffiliatePayout = {
          type: payoutType,
          details: payoutDetails.trim(),
        };
        patch.payout = payout;
      } else {
        patch.payout = undefined;
      }
      await updateAffiliate(affiliate.uid, patch);
      setAffiliate({
        ...affiliate,
        ...patch,
        updatedAt: Date.now(),
      });
      setDirty(false);
      toast.success("Affiliate updated.");
    } catch {
      toast.error("Couldn't save changes.");
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async () => {
    if (!affiliate) return;
    const nextStatus = affiliate.status === "active" ? "paused" : "active";
    if (
      !confirm(
        nextStatus === "paused"
          ? `Pause ${affiliate.displayName}? Their referral link will keep working, but you can use this to flag them as inactive.`
          : `Re-activate ${affiliate.displayName}?`,
      )
    )
      return;
    setSaving(true);
    try {
      await updateAffiliate(affiliate.uid, { status: nextStatus });
      setAffiliate({ ...affiliate, status: nextStatus });
      toast.success(`Affiliate ${nextStatus}.`);
    } catch {
      toast.error("Couldn't update status.");
    } finally {
      setSaving(false);
    }
  };

  const copyLink = async () => {
    if (!affiliate) return;
    if (await copyToClipboard(referralShareUrl(affiliate.code))) {
      setCopied(true);
      toast.success("Referral link copied.");
      setTimeout(() => setCopied(false), 1800);
    } else {
      toast.error("Couldn't copy.");
    }
  };

  if (loading) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-white/55">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading affiliate…
        </div>
      </div>
    );
  }

  if (!affiliate) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-4 p-6">
        <p className="text-sm text-white/55">Affiliate not found.</p>
        <Link href="/admin/affiliates">
          <Button variant="outline" leftIcon={<ArrowLeft className="h-4 w-4" />}>
            Back to affiliates
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <Link
          href="/admin/affiliates"
          className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-white/45 hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All affiliates
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold text-white">
              {affiliate.displayName}
            </h1>
            <p className="text-sm text-white/45">
              {affiliate.email} · joined {timeAgo(affiliate.createdAt)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              leftIcon={
                copied ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )
              }
              onClick={copyLink}
            >
              {copied ? "Copied" : "Copy referral link"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              loading={saving}
              leftIcon={
                affiliate.status === "active" ? (
                  <Pause className="h-3.5 w-3.5" />
                ) : (
                  <Play className="h-3.5 w-3.5" />
                )
              }
              onClick={toggleStatus}
            >
              {affiliate.status === "active" ? "Pause" : "Re-activate"}
            </Button>
          </div>
        </div>
      </div>

      {/* Identity card */}
      <Card className="p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-white/40">
              Status
            </p>
            <div className="mt-1.5">
              <Badge tone={affiliate.status === "active" ? "jade" : "gold"}>
                {affiliate.status}
              </Badge>
            </div>
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-white/40">
              Referral code
            </p>
            <p className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-electric-500/12 px-2 py-1 font-mono text-sm font-semibold text-electric-300">
              <Handshake className="h-3.5 w-3.5" />
              {affiliate.code}
            </p>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-4">
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
          {
            label: "Pending payout",
            value: `₱${(affiliate.stats?.pendingPayout ?? 0).toLocaleString()}`,
          },
        ].map((s) => (
          <Card key={s.label} className="p-4">
            <p className="text-[11px] font-medium uppercase tracking-wider text-white/40">
              {s.label}
            </p>
            <p className="mt-1 font-display text-xl font-bold text-white">
              {s.value}
            </p>
          </Card>
        ))}
      </div>

      {/* Upcoming renewals — soft-fails to nothing if there are none */}
      <Card className="p-5">
        <div className="mb-3 flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-electric-300" />
          <h2 className="font-display text-sm font-semibold text-white">
            Upcoming renewals (next 30 days)
          </h2>
          {renewals.length > 0 && (
            <Badge tone="blue">{renewals.length}</Badge>
          )}
        </div>
        {renewals.length === 0 ? (
          <p className="text-xs text-white/45">
            No referrals are up for renewal in the next 30 days. Renewals
            appear here once you upgrade a referred user to a paid plan.
          </p>
        ) : (
          <>
            <p className="mb-3 text-xs text-white/45">
              Reach out to these customers (or coordinate with{" "}
              {affiliate.displayName.split(" ")[0]}) to renew them before
              their cycle ends. Each renewal credits another commission to
              this affiliate.
            </p>
            <div className="space-y-2">
              {renewals.map((r) => {
                const expiresSoon =
                  r.expiresAt - Date.now() <= 7 * 24 * 60 * 60 * 1000;
                return (
                  <div
                    key={r.userId}
                    className={
                      expiresSoon
                        ? "flex items-center justify-between gap-3 rounded-xl border border-gold-400/30 bg-gold-400/[0.05] p-3"
                        : "flex items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3"
                    }
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">
                        {r.displayName}
                      </p>
                      <p className="truncate text-[11px] text-white/45">
                        {r.emailMasked} · {r.planName}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-bold text-white">
                        ₱{r.commission.toLocaleString()}
                      </p>
                      <p
                        className={
                          expiresSoon
                            ? "text-[11px] text-gold-300"
                            : "text-[11px] text-white/45"
                        }
                      >
                        {timeUntil(r.expiresAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Card>

      {/* Payout */}
      <Card className="space-y-4 p-5">
        <h2 className="font-display text-sm font-semibold text-white">
          Payout method
        </h2>
        <div>
          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-white/40">
            How they want to be paid
          </p>
          <div className="flex flex-wrap gap-1.5">
            {PAYOUT_METHODS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setPayoutType(m.id);
                  setDirty(true);
                }}
                className={
                  payoutType === m.id
                    ? "rounded-lg border border-electric-500/50 bg-electric-500/15 px-3 py-1.5 text-xs font-medium text-electric-300"
                    : "rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/55 hover:bg-white/[0.08]"
                }
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
        <Input
          label="Payout details"
          placeholder={
            payoutType === "gcash"
              ? "e.g. 09xx xxx xxxx"
              : payoutType === "bank"
                ? "e.g. BPI 1234-5678-90, Account name…"
                : payoutType === "paypal"
                  ? "PayPal email"
                  : "Free-text payout destination"
          }
          value={payoutDetails}
          onChange={(e) => {
            setPayoutDetails(e.target.value);
            setDirty(true);
          }}
          hint="Only you can see this — affiliates don't see other affiliates' payout info."
        />
      </Card>

      {/* Admin notes */}
      <Card className="p-5">
        <h2 className="mb-3 font-display text-sm font-semibold text-white">
          Admin notes
        </h2>
        <textarea
          rows={4}
          value={adminNotes}
          onChange={(e) => {
            setAdminNotes(e.target.value);
            setDirty(true);
          }}
          placeholder="Private notes about this affiliate — never shown to them."
          className="w-full rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-electric-500/40"
        />
      </Card>

      {/* Save bar */}
      <div className="sticky bottom-4 z-10 flex justify-end">
        <Button
          loading={saving}
          disabled={!dirty || saving}
          leftIcon={<Save className="h-4 w-4" />}
          onClick={save}
        >
          {dirty ? "Save changes" : "Saved"}
        </Button>
      </div>
    </div>
  );
}
