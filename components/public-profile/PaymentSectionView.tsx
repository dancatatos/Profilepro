"use client";

/**
 * PaymentSection viewer — what a visitor sees on the public funnel or
 * profile. Three-step flow rendered inline:
 *   1. Pick a payment method → see account number + optional QR
 *   2. Fill in their details (name, email, phone, reference #)
 *   3. Upload receipt screenshot → submit
 *
 * On submit, the receipt is uploaded to Firebase Storage under the
 * OWNER'S path (storage rules allow anonymous create with image
 * validation), then a payment_submissions doc is created. Owner sees
 * it in their /payments queue and approves / rejects.
 *
 * Designed mobile-first since most PH visitors pay via GCash on
 * their phone — they jump out to GCash, take a screenshot, come back
 * and upload.
 */

import { useMemo, useState } from "react";
import {
  Banknote,
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  Loader2,
  Upload,
  Wallet,
} from "lucide-react";
import {
  createPaymentSubmission,
} from "@/lib/firebase/firestore";
import { uploadPaymentReceipt } from "@/lib/firebase/storage";
import { copyToClipboard, cn } from "@/lib/utils";
import type {
  PaymentMethod,
  PaymentMethodType,
  PaymentSection,
  PaymentSubmission,
  Profile,
} from "@/types";

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

function formatAmount(amount: number, currency: "PHP" | "USD"): string {
  const symbol = currency === "PHP" ? "₱" : "$";
  return `${symbol}${amount.toLocaleString()}`;
}

interface Props {
  section: PaymentSection;
  /** The funnel/profile owner — we need their uid + paymentMethods. */
  owner: Pick<Profile, "id" | "ownerId" | "paymentMethods">;
  /**
   * Where the submission came from — funnel slug or "profile". Stored
   * on the submission for analytics + future per-source filtering.
   */
  source: string;
}

export function PaymentSectionView({ section, owner, source }: Props) {
  /* Resolve which payment methods to show: the section's enabledMethodIds
     filter applied to the profile's full list. Empty list = show all
     enabled methods. */
  const methods = useMemo(() => {
    const all = (owner.paymentMethods ?? []).filter((m) => m.enabled);
    if (section.enabledMethodIds.length === 0) return all;
    return all.filter((m) => section.enabledMethodIds.includes(m.id));
  }, [owner.paymentMethods, section.enabledMethodIds]);

  const [selectedMethodId, setSelectedMethodId] = useState<string>(
    methods[0]?.id ?? "",
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [amount, setAmount] = useState(section.amount);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const selectedMethod = methods.find((m) => m.id === selectedMethodId);
  const showName = section.fields.includes("name");
  const showEmail = section.fields.includes("email");
  const showPhone = section.fields.includes("phone");

  /* If the owner hasn't configured any payment methods yet, render
     a helpful placeholder instead of a broken form. */
  if (methods.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/15 p-6 text-center">
        <p className="text-sm font-medium text-white/70">
          Payment methods not configured yet
        </p>
        <p className="mt-1 text-xs text-white/45">
          The owner needs to add at least one payment method on their
          profile.
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
          Payment received ✅
        </h3>
        <p className="mx-auto mt-2 max-w-md whitespace-pre-wrap text-sm text-white/65">
          {section.successMessage ??
            "Thanks! We received your payment proof and will verify within 24 hours. You'll hear from us soon."}
        </p>
      </div>
    );
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!selectedMethod) return setError("Please pick a payment method.");
    if (showName && name.trim().length < 2)
      return setError("Please enter your name.");
    if (!file) return setError("Please upload a receipt screenshot.");
    if (file.size > 5 * 1024 * 1024)
      return setError("Receipt must be under 5 MB.");
    if (!file.type.startsWith("image/"))
      return setError("Receipt must be an image (JPG / PNG).");

    setSubmitting(true);
    try {
      /* Storage rules allow anonymous create on this path with the
         image MIME + size validation, so this works without auth. */
      const receiptUrl = await uploadPaymentReceipt(owner.ownerId, file);

      const payload: Omit<PaymentSubmission, "id"> = {
        ownerId: owner.ownerId,
        profileId: owner.id,
        source,
        sectionId: section.id,
        visitorName: name.trim() || "Anonymous",
        ...(email.trim() ? { visitorEmail: email.trim() } : {}),
        ...(phone.trim() ? { visitorPhone: phone.trim() } : {}),
        amount,
        currency: section.currency,
        paymentMethodId: selectedMethod.id,
        paymentMethodLabel: selectedMethod.label,
        ...(reference.trim() ? { referenceNumber: reference.trim() } : {}),
        ...(note.trim() ? { userNote: note.trim() } : {}),
        receiptUrl,
        status: "pending",
        submittedAt: Date.now(),
      };
      await createPaymentSubmission(payload);
      setSubmitted(true);
    } catch (err) {
      console.error("[Credibly] Payment submission failed:", err);
      setError(
        "Couldn't submit — please try again or contact the seller directly.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Headline + description */}
      <div className="text-center">
        <h3 className="font-display text-lg font-bold text-white sm:text-xl">
          {section.headline}
        </h3>
        {section.subtext && (
          <p className="mt-1.5 text-sm text-white/65">{section.subtext}</p>
        )}
        <p className="mt-3 inline-flex items-center gap-1 rounded-full bg-electric-500/15 px-3 py-1 text-sm font-bold text-electric-200">
          {formatAmount(section.amount, section.currency)}
        </p>
      </div>

      {/* Step 1 — Pick a payment method */}
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/50">
          Step 1 — Send payment via:
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
                  ? "border-electric-500/50 bg-electric-500/10"
                  : "border-white/[0.07] bg-white/[0.02] hover:border-white/15",
              )}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-electric-500/15 text-electric-300">
                {methodIcon(m.type)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-medium text-white">
                  {m.label}
                </span>
                <span className="block truncate text-[10px] text-white/45">
                  {m.type.toUpperCase()}
                </span>
              </span>
            </button>
          ))}
        </div>

        {/* Selected method details — account number + name + optional QR */}
        {selectedMethod && (
          <SelectedMethodDetails method={selectedMethod} />
        )}
      </div>

      {/* Step 2 — Visitor details */}
      {(showName || showEmail || showPhone) && (
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/50">
            Step 2 — Your details
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {showName && (
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name *"
                className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-electric-500/40 sm:col-span-2"
              />
            )}
            {showEmail && (
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-electric-500/40"
              />
            )}
            {showPhone && (
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone"
                className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-electric-500/40"
              />
            )}
            {section.allowCustomAmount && (
              <input
                type="number"
                min={0}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value) || 0)}
                placeholder="Amount paid"
                className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-electric-500/40 sm:col-span-2"
              />
            )}
            <input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Reference / transaction # (optional)"
              className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-electric-500/40 sm:col-span-2"
            />
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Optional note (e.g. preferred schedule)"
              className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-electric-500/40 sm:col-span-2"
            />
          </div>
        </div>
      )}

      {/* Step 3 — Receipt upload */}
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/50">
          Step 3 — Upload your receipt
        </p>
        <label
          className={cn(
            "flex h-32 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed p-3 text-center transition-colors",
            file
              ? "border-jade-500/40 bg-jade-500/[0.05]"
              : "border-white/15 bg-white/[0.02] hover:border-electric-500/40",
          )}
        >
          {/* No `capture="environment"` — that attribute restricts the
              picker to the camera only, which is wrong here. Most users
              already paid via their banking app and have a SCREENSHOT
              of the receipt in their gallery; they need to pick it,
              not retake. Omitting capture lets the OS show its native
              "Camera | Gallery | Files" picker. */}
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="hidden"
          />
          {file ? (
            <div className="flex flex-col items-center gap-1.5 text-jade-200">
              <Check className="h-6 w-6" />
              <p className="text-xs font-medium">{file.name}</p>
              <p className="text-[10px] text-white/45">
                Tap to choose a different image
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1.5 text-white/40">
              <Upload className="h-6 w-6" />
              <p className="text-xs font-medium text-white/65">
                Tap to upload your receipt
              </p>
              <p className="text-[10px] text-white/35">
                Pick from gallery or take a photo · JPG or PNG · Max 5 MB
              </p>
            </div>
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
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-gradient py-3 text-sm font-bold text-white shadow-glow-blue transition-transform active:scale-[0.98] disabled:opacity-60"
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Submitting…
          </>
        ) : (
          <>Submit payment</>
        )}
      </button>
    </form>
  );
}

/* ── Selected payment-method details card ───────────────────────── */

function SelectedMethodDetails({ method }: { method: PaymentMethod }) {
  const [copied, setCopied] = useState(false);

  const copyAccount = async () => {
    const ok = await copyToClipboard(method.accountNumber);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div className="mt-3 rounded-xl border border-electric-500/25 bg-electric-500/[0.05] p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-electric-300">
          Send to
        </span>
        <button
          type="button"
          onClick={copyAccount}
          className="flex items-center gap-1 rounded-md bg-electric-500/15 px-2 py-1 text-[10px] font-semibold text-electric-200 hover:bg-electric-500/25"
        >
          {copied ? (
            <Check className="h-3 w-3" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
          {copied ? "Copied" : "Copy number"}
        </button>
      </div>
      <p className="mt-1 select-all font-mono text-lg font-bold text-white">
        {method.accountNumber}
      </p>
      {method.accountName && (
        <p className="mt-0.5 text-xs text-white/55">
          Account name:{" "}
          <span className="font-medium text-white/85">
            {method.accountName}
          </span>
        </p>
      )}
      {method.qrImageUrl && (
        <div className="mt-2 rounded-lg bg-white/95 p-3">
          <img
            src={method.qrImageUrl}
            alt="Payment QR code"
            className="mx-auto h-44 w-44 object-contain"
          />
          <p className="mt-1 text-center text-[10px] font-medium text-ink-950">
            Scan with your {method.type.toUpperCase()} app
          </p>
        </div>
      )}
    </div>
  );
}
