"use client";

/**
 * Payments dashboard — owner reviews receipt uploads here.
 *
 * Three tabs (Pending / Approved / Rejected). Each row shows the
 * visitor's contact info, amount, payment method snapshot, and the
 * receipt thumbnail. Click a row → modal with the full-size receipt
 * image + approve/reject actions.
 *
 * Approval flow:
 *   1. Mark submission as approved (timestamp + reviewer)
 *   2. Optionally create / move a lead into the configured pipeline
 *   3. Show toast confirmation
 *
 * Rejection flow:
 *   1. Ask for a reason (shown to visitor)
 *   2. Mark submission as rejected
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ExternalLink,
  Inbox,
  Loader2,
  Mail,
  Phone,
  RefreshCw,
  Wallet,
  X,
  XCircle,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useProfileStore } from "@/store/profileStore";
import {
  listPaymentSubmissions,
  updatePaymentSubmission,
  listPipelinesForUser,
  moveLeadToStage,
  activateTrainingForUser,
  getTraining,
  getUserByEmail,
} from "@/lib/firebase/firestore";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db, isFirebaseConfigured } from "@/lib/firebase/client";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/store/uiStore";
import { cn, timeAgo } from "@/lib/utils";
import type { PaymentSubmission, Pipeline } from "@/types";

type Tab = "pending" | "approved" | "rejected";

function formatAmount(s: PaymentSubmission): string {
  const symbol = s.currency === "PHP" ? "₱" : "$";
  return `${symbol}${s.amount.toLocaleString()}`;
}

export default function PaymentsPage() {
  const { account } = useAuth();
  const profile = useProfileStore((s) => s.profile);
  const [submissions, setSubmissions] = useState<PaymentSubmission[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<Tab>("pending");
  const [openSubmission, setOpenSubmission] = useState<PaymentSubmission | null>(
    null,
  );

  const load = useCallback(async () => {
    if (!account) return;
    setLoading(true);
    try {
      const [subs, pipes] = await Promise.all([
        listPaymentSubmissions(account.uid),
        listPipelinesForUser(account.uid),
      ]);
      setSubmissions(subs);
      setPipelines(pipes);
    } catch {
      toast.error("Couldn't load payments.");
    } finally {
      setLoading(false);
    }
  }, [account]);

  useEffect(() => {
    load();
  }, [load]);

  const buckets = useMemo(() => {
    const map: Record<Tab, PaymentSubmission[]> = {
      pending: [],
      approved: [],
      rejected: [],
    };
    for (const s of submissions) map[s.status].push(s);
    return map;
  }, [submissions]);

  const counts = {
    pending: buckets.pending.length,
    approved: buckets.approved.length,
    rejected: buckets.rejected.length,
  };
  const visible = buckets[tab];

  const handleReviewed = (updated: PaymentSubmission) => {
    setSubmissions((prev) =>
      prev.map((s) => (s.id === updated.id ? updated : s)),
    );
    setOpenSubmission(null);
  };

  if (!account) {
    return (
      <div className="flex h-[40vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-white/40" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title="Payments"
          subtitle="Review receipt uploads from your funnels and profile."
        />
        <Button
          variant="outline"
          size="sm"
          onClick={load}
          loading={loading}
          leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
        >
          Refresh
        </Button>
      </div>

      {/* Status tabs */}
      <div className="flex w-full overflow-x-auto rounded-xl bg-white/[0.03] p-1">
        {(["pending", "approved", "rejected"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium capitalize transition-colors",
              tab === t
                ? "bg-electric-500/15 text-electric-200"
                : "text-white/55 hover:text-white",
            )}
          >
            {t}
            <span className="rounded-full bg-white/[0.06] px-1.5 text-[10px] font-semibold">
              {counts[t]}
            </span>
          </button>
        ))}
      </div>

      {/* List */}
      {loading && submissions.length === 0 ? (
        <Card className="flex h-32 items-center justify-center text-sm text-white/40">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading payments…
        </Card>
      ) : visible.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-3 p-10 text-center">
          <Inbox className="h-7 w-7 text-white/20" />
          <p className="text-sm font-medium text-white/55">
            No {tab} payments yet
          </p>
          <p className="max-w-sm text-xs text-white/35">
            {tab === "pending"
              ? "When visitors upload receipts through a Payment section, they'll show up here for your review."
              : `You haven't ${tab} any payments yet.`}
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {visible.map((s) => (
            <SubmissionRow
              key={s.id}
              submission={s}
              onOpen={() => setOpenSubmission(s)}
            />
          ))}
        </div>
      )}

      <ReviewModal
        submission={openSubmission}
        onClose={() => setOpenSubmission(null)}
        ownerId={account.uid}
        pipelines={pipelines}
        profileId={profile?.id ?? account.uid}
        onReviewed={handleReviewed}
      />
    </div>
  );
}

/* ── Single submission row ──────────────────────────────────────── */

function SubmissionRow({
  submission,
  onOpen,
}: {
  submission: PaymentSubmission;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3 text-left transition-colors hover:border-electric-500/30 hover:bg-white/[0.04]"
    >
      {/* Receipt thumbnail */}
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-white/[0.07] bg-white/[0.04]">
        {submission.receiptUrl && (
          <img
            src={submission.receiptUrl}
            alt="Receipt"
            className="h-full w-full object-cover"
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold text-white">
            {submission.visitorName}
          </p>
          <span className="rounded-full bg-electric-500/12 px-1.5 py-0.5 text-[10px] font-bold text-electric-200">
            {formatAmount(submission)}
          </span>
        </div>
        <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-white/45">
          {submission.visitorEmail && (
            <span className="flex items-center gap-1">
              <Mail className="h-3 w-3" />
              {submission.visitorEmail}
            </span>
          )}
          {submission.visitorPhone && (
            <span className="flex items-center gap-1">
              <Phone className="h-3 w-3" />
              {submission.visitorPhone}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Wallet className="h-3 w-3" />
            {submission.paymentMethodLabel}
          </span>
        </div>
        <p className="mt-0.5 text-[10px] text-white/35">
          {timeAgo(submission.submittedAt)}
          {submission.referenceNumber && ` · Ref ${submission.referenceNumber}`}
        </p>
      </div>

      {/* Status pill on the right */}
      <span
        className={cn(
          "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
          submission.status === "pending" &&
            "bg-gold-400/15 text-gold-300",
          submission.status === "approved" &&
            "bg-jade-500/15 text-jade-300",
          submission.status === "rejected" &&
            "bg-red-500/15 text-red-300",
        )}
      >
        {submission.status}
      </span>
    </button>
  );
}

/* ── Review modal ───────────────────────────────────────────────── */

function ReviewModal({
  submission,
  onClose,
  ownerId,
  profileId,
  pipelines,
  onReviewed,
}: {
  submission: PaymentSubmission | null;
  onClose: () => void;
  ownerId: string;
  profileId: string;
  pipelines: Pipeline[];
  onReviewed: (updated: PaymentSubmission) => void;
}) {
  const [working, setWorking] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  if (!submission) return null;

  const isPending = submission.status === "pending";

  const approve = async () => {
    setWorking(true);
    try {
      const updated: PaymentSubmission = {
        ...submission,
        status: "approved",
        reviewedAt: Date.now(),
        reviewerId: ownerId,
      };

      /* Optionally route the visitor into a pipeline as a new lead.
         We auto-create a lead doc so the owner can follow up via the
         daily task system. Lead is enrolled in the user's default
         pipeline (first stage) since the section doesn't carry a
         pipeline link directly — owner can move them after if needed. */
      const def = pipelines.find((p) => p.isDefault);
      if (def && def.stages.length > 0 && isFirebaseConfigured) {
        const firstStage = [...def.stages].sort(
          (a, b) => a.sortOrder - b.sortOrder,
        )[0];
        const now = Date.now();
        const leadRef = await addDoc(collection(db, "leads"), {
          ownerId,
          profileId,
          name: submission.visitorName,
          ...(submission.visitorEmail
            ? { email: submission.visitorEmail }
            : {}),
          ...(submission.visitorPhone
            ? { phone: submission.visitorPhone }
            : {}),
          source: `payment:${submission.paymentMethodLabel}`,
          createdAt: now,
          serverCreatedAt: serverTimestamp(),
          pipelineId: def.id,
          stageId: firstStage.id,
          stageEnteredAt: now,
          ...(firstStage.daysBeforeNextTask
            ? {
                nextTaskAt:
                  now +
                  firstStage.daysBeforeNextTask * 24 * 60 * 60 * 1000,
              }
            : {}),
        });
        await moveLeadToStage(
          leadRef.id,
          def.id,
          firstStage.id,
          firstStage.daysBeforeNextTask,
        );
        updated.linkedLeadId = leadRef.id;
      }

      await updatePaymentSubmission(submission.id, {
        status: "approved",
        reviewedAt: updated.reviewedAt,
        reviewerId: updated.reviewerId,
        ...(updated.linkedLeadId ? { linkedLeadId: updated.linkedLeadId } : {}),
      });

      /* If this receipt was for a paid-mode TRAINING, try to grant
         access to the buyer's account. Two outcomes:
           a) Buyer's email matches a Credibly account → activate
              automatically (best path, zero further work for owner).
           b) No account on that email → tell the owner the activation
              code so they can DM it to the buyer alongside a "sign up
              free at crediblyai.com/training" nudge.
         Either way the receipt is approved — the auto-grant is a
         bonus, never a blocker. */
      if (submission.trainingId) {
        try {
          const training = await getTraining(submission.trainingId);
          if (training) {
            const buyerEmail = submission.visitorEmail?.trim();
            const buyer = buyerEmail ? await getUserByEmail(buyerEmail) : null;
            if (buyer) {
              await activateTrainingForUser({
                userId: buyer.uid,
                trainingId: training.id,
                ownerId: training.ownerId,
                unlockedVia: "purchase",
              });
              toast.success(
                `Approved — ${submission.visitorName} unlocked "${training.title}".`,
              );
            } else {
              /* No matching account. Owner shares the activation
                 code manually. Copy-friendly toast so they can grab
                 it quickly. */
              try {
                await navigator.clipboard.writeText(training.activationCode);
              } catch {
                // ignore — toast still shows the code below
              }
              toast.success(
                `Approved. Buyer has no account yet — share this code: ${training.activationCode} (copied to clipboard)`,
              );
            }
          } else {
            toast.success(`Approved — ${submission.visitorName} is now a lead.`);
          }
        } catch (err) {
          console.warn("[Credibly] training auto-grant failed:", err);
          toast.success(`Approved — ${submission.visitorName} is now a lead.`);
        }
      } else {
        toast.success(`Approved — ${submission.visitorName} is now a lead.`);
      }
      onReviewed(updated);
    } catch (err) {
      console.error("[Credibly] Approve failed:", err);
      toast.error("Couldn't approve — try again.");
    } finally {
      setWorking(false);
    }
  };

  const reject = async () => {
    if (!rejectReason.trim()) {
      toast.error("Please add a reason — it helps the visitor know what to fix.");
      return;
    }
    setWorking(true);
    try {
      const updated: PaymentSubmission = {
        ...submission,
        status: "rejected",
        reviewedAt: Date.now(),
        reviewerId: ownerId,
        rejectionReason: rejectReason.trim(),
      };
      await updatePaymentSubmission(submission.id, {
        status: "rejected",
        reviewedAt: updated.reviewedAt,
        reviewerId: updated.reviewerId,
        rejectionReason: updated.rejectionReason,
      });
      toast.success("Payment rejected.");
      onReviewed(updated);
    } catch {
      toast.error("Couldn't reject — try again.");
    } finally {
      setWorking(false);
    }
  };

  return (
    <Modal
      open={!!submission}
      onClose={onClose}
      title={`Payment from ${submission.visitorName}`}
      description={`${formatAmount(submission)} via ${submission.paymentMethodLabel}`}
      size="lg"
    >
      <div className="space-y-3 pb-3">
        {/* Receipt — full size */}
        <a
          href={submission.receiptUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block overflow-hidden rounded-xl border border-white/10 bg-black"
        >
          <img
            src={submission.receiptUrl}
            alt="Receipt"
            className="max-h-[55vh] w-full object-contain"
          />
        </a>
        <p className="text-center text-[10px] text-white/35">
          <ExternalLink className="mr-1 inline h-3 w-3" />
          Tap image to open full-size in new tab
        </p>

        {/* Submission details */}
        <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 text-xs">
          <DetailRow label="Visitor" value={submission.visitorName} />
          {submission.visitorEmail && (
            <DetailRow label="Email" value={submission.visitorEmail} />
          )}
          {submission.visitorPhone && (
            <DetailRow label="Phone" value={submission.visitorPhone} />
          )}
          <DetailRow label="Amount" value={formatAmount(submission)} />
          <DetailRow label="Method" value={submission.paymentMethodLabel} />
          {submission.referenceNumber && (
            <DetailRow label="Reference" value={submission.referenceNumber} />
          )}
          <DetailRow label="Source" value={submission.source} />
          <DetailRow label="Submitted" value={timeAgo(submission.submittedAt)} />
        </div>

        {submission.userNote && (
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
              Note from visitor
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-white/80">
              {submission.userNote}
            </p>
          </div>
        )}

        {submission.status === "rejected" && submission.rejectionReason && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/[0.04] p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-red-300">
              Rejection reason
            </p>
            <p className="mt-1 text-sm text-white/80">
              {submission.rejectionReason}
            </p>
          </div>
        )}

        {/* Actions */}
        {isPending && !showRejectForm && (
          <div className="flex gap-2">
            <Button
              fullWidth
              variant="outline"
              onClick={() => setShowRejectForm(true)}
              leftIcon={<X className="h-4 w-4" />}
              disabled={working}
            >
              Reject
            </Button>
            <Button
              fullWidth
              onClick={approve}
              loading={working}
              disabled={working}
              leftIcon={<CheckCircle2 className="h-4 w-4" />}
            >
              {submission.trainingId
                ? "Approve & grant training access"
                : "Approve & create lead"}
            </Button>
          </div>
        )}

        {isPending && showRejectForm && (
          <div className="space-y-2 rounded-xl border border-red-500/20 bg-red-500/[0.04] p-3">
            <p className="text-xs font-semibold text-red-200">
              Why reject?
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Receipt unclear, amount doesn't match, wrong account…"
              rows={3}
              className="w-full resize-none rounded-lg border border-red-500/20 bg-ink-950/40 p-2.5 text-sm text-white outline-none placeholder:text-white/25 focus:border-red-500/40"
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                fullWidth
                onClick={() => setShowRejectForm(false)}
                disabled={working}
              >
                Cancel
              </Button>
              <Button
                fullWidth
                onClick={reject}
                loading={working}
                disabled={working || !rejectReason.trim()}
                leftIcon={<XCircle className="h-4 w-4" />}
                className="!bg-red-500 hover:!bg-red-600"
              >
                Confirm reject
              </Button>
            </div>
          </div>
        )}

        {!isPending && (
          <p className="text-center text-[11px] text-white/40">
            Reviewed{" "}
            {submission.reviewedAt ? timeAgo(submission.reviewedAt) : "—"}
          </p>
        )}
      </div>
    </Modal>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wider text-white/35">
        {label}
      </p>
      <p className="mt-0.5 truncate text-white/80">{value}</p>
    </div>
  );
}
