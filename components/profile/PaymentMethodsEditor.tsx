"use client";

/**
 * Payment Methods editor — owner configures their GCash, Maya, bank
 * accounts here ONCE on the profile. Every PaymentSection (in any
 * funnel or on this profile) then reuses these methods, so adding a
 * new funnel that accepts payment doesn't require re-typing the
 * account details.
 *
 * Stored on Profile.paymentMethods. The viewer-side renders these
 * verbatim for the visitor — visitor copies the number, sends payment
 * via their banking app, then uploads a screenshot.
 */

import { useRef, useState } from "react";
import {
  Banknote,
  CreditCard,
  ImagePlus,
  Loader2,
  Plus,
  Trash2,
  Wallet,
} from "lucide-react";
import { useProfileStore } from "@/store/profileStore";
import { useAuth } from "@/hooks/useAuth";
import { uploadImage } from "@/lib/firebase/storage";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { toast } from "@/store/uiStore";
import { uid as makeId, cn } from "@/lib/utils";
import type { PaymentMethod, PaymentMethodType } from "@/types";

const METHOD_OPTIONS: { value: PaymentMethodType; label: string }[] = [
  { value: "gcash", label: "GCash" },
  { value: "maya", label: "Maya" },
  { value: "bpi", label: "BPI" },
  { value: "bdo", label: "BDO" },
  { value: "unionbank", label: "UnionBank" },
  { value: "metrobank", label: "Metrobank" },
  { value: "landbank", label: "LandBank" },
  { value: "other", label: "Other" },
];

/* Visual hint per method type — shown as a tinted icon chip. */
function methodIcon(type: PaymentMethodType) {
  switch (type) {
    case "gcash":
    case "maya":
      return <Wallet className="h-4 w-4" />;
    case "other":
      return <CreditCard className="h-4 w-4" />;
    default:
      return <Banknote className="h-4 w-4" />;
  }
}

export function PaymentMethodsEditor() {
  const profile = useProfileStore((s) => s.profile);
  const setProfile = useProfileStore((s) => s.setProfile);
  const { account } = useAuth();

  if (!profile) return null;
  const methods = profile.paymentMethods ?? [];

  const updateMethods = (next: PaymentMethod[]) => {
    setProfile({ ...profile, paymentMethods: next, updatedAt: Date.now() });
  };

  const addMethod = () => {
    const blank: PaymentMethod = {
      id: makeId("pm"),
      type: "gcash",
      label: "Main GCash",
      accountNumber: "",
      accountName: "",
      enabled: true,
      sortOrder: (methods[methods.length - 1]?.sortOrder ?? 0) + 10,
    };
    updateMethods([...methods, blank]);
  };

  const patchMethod = (id: string, patch: Partial<PaymentMethod>) => {
    updateMethods(methods.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  };

  const removeMethod = (id: string) => {
    if (!confirm("Remove this payment method? Existing payment sections that reference it will fall back to your other methods."))
      return;
    updateMethods(methods.filter((m) => m.id !== id));
  };

  return (
    <Card id="payment-methods" className="scroll-mt-20 p-4">
      <CardHeader
        title="Payment Methods"
        subtitle="Your GCash, Maya, bank accounts — used by Payment sections in funnels."
        action={
          <Button
            size="sm"
            variant="outline"
            onClick={addMethod}
            leftIcon={<Plus className="h-3.5 w-3.5" />}
          >
            Add
          </Button>
        }
      />

      {methods.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-slate-200 py-6 text-center">
          <Wallet className="mx-auto mb-2 h-6 w-6 text-slate-300" />
          <p className="text-sm font-medium text-slate-500">
            No payment methods yet
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Add your GCash, Maya, or bank account so you can accept
            manual payments through your funnels.
          </p>
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          {methods.map((m) => (
            <PaymentMethodRow
              key={m.id}
              method={m}
              ownerUid={account?.uid ?? "demo"}
              onChange={(patch) => patchMethod(m.id, patch)}
              onRemove={() => removeMethod(m.id)}
            />
          ))}
        </div>
      )}
    </Card>
  );
}

/* ── Single payment-method row ──────────────────────────────────── */

function PaymentMethodRow({
  method,
  ownerUid,
  onChange,
  onRemove,
}: {
  method: PaymentMethod;
  ownerUid: string;
  onChange: (patch: Partial<PaymentMethod>) => void;
  onRemove: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const onQrFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("QR image must be under 5MB.");
      return;
    }
    setUploading(true);
    try {
      const url = await uploadImage(ownerUid, file, "media");
      onChange({ qrImageUrl: url });
      toast.success("QR uploaded.");
    } catch {
      toast.error("Upload failed.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div
      className={cn(
        "rounded-xl border p-3",
        method.enabled
          ? "border-slate-200 bg-slate-50"
          : "border-slate-200 bg-white/[0.01] opacity-60",
      )}
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-electric-500/15 text-electric-700">
          {methodIcon(method.type)}
        </span>
        <input
          value={method.label}
          onChange={(e) => onChange({ label: e.target.value })}
          placeholder="Display label (e.g. Main GCash)"
          className="h-8 flex-1 rounded border border-slate-200 bg-slate-50 px-2 text-sm text-slate-900 outline-none focus:border-electric-500/40"
        />
        {/* Enable / disable toggle */}
        <label className="flex shrink-0 items-center gap-1.5 text-[10px] text-slate-500">
          <input
            type="checkbox"
            checked={method.enabled}
            onChange={(e) => onChange({ enabled: e.target.checked })}
            className="h-3.5 w-3.5 cursor-pointer rounded border-slate-300 bg-slate-100 accent-electric-500"
          />
          Active
        </label>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove method"
          className="rounded p-1 text-slate-300 hover:bg-red-500/10 hover:text-red-600"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Select
          value={method.type}
          onChange={(v) => onChange({ type: v as PaymentMethodType })}
          options={METHOD_OPTIONS}
        />
        <input
          value={method.accountNumber}
          onChange={(e) => onChange({ accountNumber: e.target.value })}
          placeholder={
            method.type === "gcash" || method.type === "maya"
              ? "Phone number (e.g. 0917-xxx-xxxx)"
              : "Account number"
          }
          className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none placeholder:text-slate-300 focus:border-electric-500/40"
        />
      </div>

      <input
        value={method.accountName}
        onChange={(e) => onChange({ accountName: e.target.value })}
        placeholder="Account name (visitors verify this matches before sending)"
        className="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none placeholder:text-slate-300 focus:border-electric-500/40"
      />

      {/* Optional QR code upload */}
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50 transition-colors hover:border-electric-500/40"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
          ) : method.qrImageUrl ? (
            <img
              src={method.qrImageUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <ImagePlus className="h-4 w-4 text-slate-300" />
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={onQrFile}
          className="hidden"
        />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium text-slate-600">
            QR code <span className="text-slate-400">(optional)</span>
          </p>
          <p className="text-[10px] text-slate-400">
            Upload your in-app QR so visitors can scan & pay faster.
          </p>
        </div>
        {method.qrImageUrl && (
          <button
            type="button"
            onClick={() => onChange({ qrImageUrl: undefined })}
            className="text-[10px] text-red-700/80 hover:text-red-700"
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
}
