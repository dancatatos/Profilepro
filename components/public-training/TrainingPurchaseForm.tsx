"use client";

/**
 * Receipt-upload purchase form for paid-mode trainings.
 *
 * Mirrors the existing PaymentSectionView (used for funnel payments)
 * but trimmed for the training-specific case:
 *   - Always asks for visitor email (we use it to auto-grant access
 *     if the buyer has a Credibly account on the same email)
 *   - Always shows ALL the owner's enabled payment methods (no per-
 *     section method filter)
 *   - Stamps `trainingId` on the resulting PaymentSubmission so the
 *     /payments review flow knows to offer the "Grant training access"
 *     one-tap button on approval
 */

import { useState } from "react";
import {
  Banknote,
  CheckCircle2,
  Copy,
  CreditCard,
  Loader2,
  Upload,
  Wallet,
} from "lucide-react";
import { createPaymentSubmission } from "@/lib/firebase/firestore";
import { uploadPaymentReceipt } from "@/lib/firebase/storage";
import { cn, copyToClipboard } from "@/lib/utils";
import type {
  PaymentMethod,
  PaymentMethodType,
  PaymentSubmission,
  Profile,
  Training,
} from "@/types";

function methodIcon(type: PaymentMethodType) {
  if (type === "gcash" || type === "maya") return <Wallet className="h-4 w-4" />;
  if (type === "other") return <CreditCard className="h-4 w-4" />;
  return <Banknote className="h-4 w-4" />;
}

export function TrainingPurchaseForm({
  training,
  profile,
}: {
  training: Training;
  profile: Profile;
}) {
  const allMethods: PaymentMethod[] = (profile.paymentMethods ?? []).filter(
    (m) => m.enabled,
  );
  /* Allow the training to restrict which methods to surface (parity
     with PaymentSection). Empty list = all methods. */
  const methods =
    (training.paymentMethodIds?.length ?? 0) === 0
      ? allMethods
      : allMethods.filter((m) =>
          (training.paymentMethodIds ?? []).includes(m.id),
        );

  const [selectedMethodId, setSelectedMethodId] = useState(methods[0]?.id ?? "");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [reference, setReference] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  if (methods.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/15 p-6 text-center">
        <p className="text-sm font-medium text-white/70">
          The seller hasn&apos;t configured payment methods yet
        </p>
        <p className="mt-1 text-xs text-white/45">
          They need to add at least one method (GCash / Maya / bank) on
          their profile before they can accept purchases.
        </p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="rounded-2xl border border-jade-500/30 bg-jade-500/[0.05] p-6 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-jade-500/20">
          <CheckCircle2 className="h-6 w-6 text-jade-300" />
        </span>
        <h3 className="mt-3 font-display text-base font-bold text-white">
          Receipt submitted ✅
        </h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-white/65">
          Once the seller approves your payment, your training will unlock
          automatically. Make sure you&apos;ve signed up for a free Credibly
          account on the same email so we can grant access instantly.
        </p>
      </div>
    );
  }

  const selectedMethod = methods.find((m) => m.id === selectedMethodId);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!selectedMethod) return setError("Pick a payment method first.");
    if (name.trim().length < 2) return setError("Please enter your name.");
    if (!email.trim()) return setError("Please enter your email so we can grant access.");
    if (!file) return setError("Please upload a receipt screenshot.");
    if (file.size > 5 * 1024 * 1024) return setError("Receipt must be under 5 MB.");
    if (!file.type.startsWith("image/")) return setError("Receipt must be an image.");

    setSubmitting(true);
    try {
      const receiptUrl = await uploadPaymentReceipt(training.ownerId, file);
      const payload: Omit<PaymentSubmission, "id"> = {
        ownerId: training.ownerId,
        profileId: profile.id,
        source: `training:${training.slug}`,
        sectionId: training.id, // store the trainingId here for clarity
        visitorName: name.trim(),
        visitorEmail: email.trim(),
        ...(phone.trim() ? { visitorPhone: phone.trim() } : {}),
        amount: training.price ?? 0,
        currency: "PHP",
        paymentMethodId: selectedMethod.id,
        paymentMethodLabel: selectedMethod.label,
        ...(reference.trim() ? { referenceNumber: reference.trim() } : {}),
        receiptUrl,
        status: "pending",
        submittedAt: Date.now(),
        trainingId: training.id,
      };
      await createPaymentSubmission(payload);
      setSubmitted(true);
    } catch (err) {
      console.error("[Credibly] training purchase failed:", err);
      setError("Couldn't submit — please try again or contact the seller.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="text-center">
        <p className="inline-flex items-center gap-1 rounded-full bg-electric-500/15 px-3 py-1 text-base font-bold text-electric-200">
          ₱{(training.price ?? 0).toLocaleString()}
        </p>
      </div>

      {/* Method picker */}
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/50">
          Step 1 — Send payment via
        </p>
        <div className="grid grid-cols-2 gap-2">
          {methods.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setSelectedMethodId(m.id)}
              className={cn(
                "flex items-center gap-2 rounded-xl border p-2.5 text-left transition-colors",
                selectedMethodId === m.id
                  ? "border-electric-500/60 bg-electric-500/[0.08] text-white"
                  : "border-white/10 bg-white/[0.02] text-white/70 hover:border-white/20",
              )}
            >
              {methodIcon(m.type)}
              <span className="truncate text-xs font-medium">{m.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Selected method details */}
      {selectedMethod && (
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 text-xs">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="font-mono text-sm text-white">
                {selectedMethod.accountNumber}
              </p>
              <p className="mt-0.5 truncate text-[11px] text-white/55">
                {selectedMethod.accountName}
              </p>
            </div>
            <button
              type="button"
              onClick={() => copyToClipboard(selectedMethod.accountNumber)}
              className="flex shrink-0 items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-[11px] text-white/70 hover:bg-white/[0.05]"
            >
              <Copy className="h-3 w-3" />
              Copy
            </button>
          </div>
          {selectedMethod.qrImageUrl && (
            <img
              src={selectedMethod.qrImageUrl}
              alt="QR code"
              className="mx-auto mt-3 h-40 w-40 rounded-lg bg-white object-contain p-2"
            />
          )}
        </div>
      )}

      {/* Buyer details */}
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/50">
          Step 2 — Your details
        </p>
        <div className="space-y-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="h-10 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-electric-500/60"
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Your email (used to unlock the training)"
            className="h-10 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-electric-500/60"
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone (optional)"
            className="h-10 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-electric-500/60"
          />
          <input
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="Reference number (optional)"
            className="h-10 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-electric-500/60"
          />
        </div>
      </div>

      {/* Receipt upload */}
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/50">
          Step 3 — Upload your receipt
        </p>
        <label
          className={cn(
            "flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border border-dashed p-5 text-center transition-colors",
            file
              ? "border-jade-500/40 bg-jade-500/[0.05] text-jade-200"
              : "border-white/15 bg-white/[0.02] text-white/55 hover:border-electric-500/40",
          )}
        >
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          {file ? (
            <>
              <CheckCircle2 className="h-5 w-5" />
              <span className="text-xs font-medium">{file.name}</span>
              <span className="text-[10px] text-white/40">
                Click to replace
              </span>
            </>
          ) : (
            <>
              <Upload className="h-5 w-5" />
              <span className="text-xs font-medium">Choose receipt image</span>
              <span className="text-[10px] text-white/40">
                Max 5 MB · JPG / PNG
              </span>
            </>
          )}
        </label>
      </div>

      {error && (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-gradient px-4 py-3 text-sm font-semibold text-white shadow-glow-blue transition-transform active:scale-[0.98] disabled:opacity-50"
      >
        {submitting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <CheckCircle2 className="h-4 w-4" />
        )}
        Submit receipt
      </button>
    </form>
  );
}
