"use client";

/**
 * Affiliate settings — display name + payout method.
 *
 * Affiliates can edit their display name and payout method (the admin
 * needs valid payout info to actually send them money). Email and
 * referral code are locked here — code changes require admin sign-off
 * because all `/r/<code>` links and existing commissions reference it.
 */

import { useCallback, useEffect, useState } from "react";
import { Loader2, Save, ShieldAlert } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  getAffiliate,
  updateAffiliate,
  updateUserDoc,
} from "@/lib/firebase/firestore";
import { useAuthStore } from "@/store/authStore";
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

export default function AffiliateSettingsPage() {
  const { account } = useAuth();
  const setAccount = useAuthStore((s) => s.setAccount);
  const [affiliate, setAffiliate] = useState<Affiliate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  /* Local edit state */
  const [displayName, setDisplayName] = useState("");
  const [payoutType, setPayoutType] = useState<AffiliatePayoutMethod>("gcash");
  const [payoutDetails, setPayoutDetails] = useState("");
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async () => {
    if (!account || account.role !== "affiliate") return;
    setLoading(true);
    try {
      const aff = await getAffiliate(account.uid);
      setAffiliate(aff);
      if (aff) {
        setDisplayName(aff.displayName);
        setPayoutType(aff.payout?.type ?? "gcash");
        setPayoutDetails(aff.payout?.details ?? "");
        setDirty(false);
      }
    } catch {
      toast.error("Couldn't load your settings.");
    } finally {
      setLoading(false);
    }
  }, [account]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    if (!affiliate || !account) return;
    const trimmedName = displayName.trim();
    if (trimmedName.length < 2) {
      toast.error("Display name must be at least 2 characters.");
      return;
    }
    setSaving(true);
    try {
      const patch: Partial<Affiliate> = { displayName: trimmedName };
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

      /* Keep the user doc display name in sync — that's what shows in
         the header chip everywhere. */
      if (trimmedName !== account.displayName) {
        await updateUserDoc(account.uid, { displayName: trimmedName });
        setAccount({ ...account, displayName: trimmedName });
      }

      setAffiliate({
        ...affiliate,
        ...patch,
        updatedAt: Date.now(),
      });
      setDirty(false);
      toast.success("Settings saved.");
    } catch {
      toast.error("Couldn't save changes.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[40vh] items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-white/55">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading settings…
        </div>
      </div>
    );
  }

  if (!affiliate) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Settings</h1>
        <p className="mt-1 text-sm text-white/55">
          Update your profile and payout details. The admin uses your payout
          method to send your commissions.
        </p>
      </div>

      {/* Profile */}
      <Card className="space-y-4 p-5">
        <h2 className="font-display text-sm font-semibold text-white">
          Profile
        </h2>
        <Input
          label="Display name"
          value={displayName}
          onChange={(e) => {
            setDisplayName(e.target.value);
            setDirty(true);
          }}
          placeholder="Your name"
          hint="Shown in your dashboard and shared with the admin."
        />
        <Input
          label="Email"
          value={affiliate.email}
          disabled
          hint="Contact the admin to change your email."
        />
        <div>
          <label className="mb-1.5 block text-xs font-medium text-white/55">
            Referral code
          </label>
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-2.5 pl-3">
            <span className="rounded-md bg-electric-500/12 px-2 py-0.5 font-mono text-sm font-semibold text-electric-300">
              {affiliate.code}
            </span>
            <span className="text-xs text-white/40">— immutable</span>
          </div>
          <p className="mt-1.5 text-[11px] text-white/40">
            Changing your code would break all your existing shared links and
            commission attributions. Contact the admin if you need a change.
          </p>
        </div>
      </Card>

      {/* Payout */}
      <Card className="space-y-4 p-5">
        <h2 className="font-display text-sm font-semibold text-white">
          Payout method
        </h2>
        <p className="text-xs text-white/45">
          Without this set, the admin can&apos;t send you your commissions.
          Update any time.
        </p>
        <div>
          <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-white/40">
            How you want to be paid
          </label>
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
          hint="Visible only to the admin and you."
        />
      </Card>

      {/* Status notice */}
      {affiliate.status !== "active" && (
        <Card className="border border-gold-400/30 bg-gold-400/[0.06] p-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="h-4 w-4 shrink-0 text-gold-300" />
            <div>
              <p className="text-sm font-medium text-gold-300">
                Account is paused
              </p>
              <p className="text-xs text-gold-300/70">
                Your referral link still works, but new commissions are paused.
                Contact the admin to re-activate.
              </p>
            </div>
          </div>
        </Card>
      )}

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
