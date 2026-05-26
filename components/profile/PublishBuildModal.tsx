"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Copy, Crown, Package } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { usePlanAccess } from "@/components/providers/PlanProvider";
import { useProfileStore } from "@/store/profileStore";
import { publishSharedBuild } from "@/lib/firebase/firestore";
import { buildSnapshotFromProfile, generateShareCode } from "@/lib/sharedBuilds";
import { copyToClipboard } from "@/lib/utils";
import { toast } from "@/store/uiStore";

export function PublishBuildModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { account } = useAuth();
  const { hasFeature } = usePlanAccess();
  const profile = useProfileStore((s) => s.profile);

  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState<string | null>(null);

  const isPaid = hasFeature("shared_builds");

  /* Reset + seed the form each time the modal opens. */
  useEffect(() => {
    if (!open) return;
    const p = useProfileStore.getState().profile;
    setName(p ? `${p.header.displayName}'s Build` : "My Build");
    setCode(null);
    setBusy(false);
  }, [open]);

  const close = () => {
    if (busy) return;
    onClose();
  };

  const publish = async () => {
    if (!profile || !account) return;
    if (name.trim().length < 2) {
      toast.error("Give your build a name.");
      return;
    }
    setBusy(true);
    try {
      const record = await publishSharedBuild({
        ownerId: account.uid,
        ownerName: account.displayName || "A Credibly user",
        name: name.trim(),
        shareCode: generateShareCode(account.displayName || "BLD"),
        themeId: profile.themeId,
        build: buildSnapshotFromProfile(profile),
        revoked: false,
      });
      setCode(record.shareCode);
      toast.success("Build published — share the code!");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Couldn't publish — try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  const copyCode = async () => {
    if (!code) return;
    if (await copyToClipboard(code)) toast.success("Code copied");
    else toast.error("Couldn't copy the code.");
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Share this build"
      description="Publish your profile as a template others can use."
    >
      {!isPaid ? (
        /* ── Free users — upgrade gate ── */
        <div className="flex flex-col items-center py-6 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-gold-300 to-gold-500">
            <Crown className="h-6 w-6 text-ink-950" />
          </span>
          <h3 className="mt-3 font-display text-base font-bold text-gold-200">
            Sharing builds is a Pro feature
          </h3>
          <p className="mx-auto mt-1 max-w-xs text-sm text-white/50">
            Upgrade to Pro to publish your profile as a reusable template and
            pass it to your team with a share code.
          </p>
          <Link
            href="/billing"
            onClick={close}
            className="mt-4 inline-flex rounded-xl bg-gradient-to-r from-gold-300 to-gold-500 px-5 py-2.5 text-sm font-bold text-ink-950"
          >
            Upgrade to Pro
          </Link>
        </div>
      ) : code ? (
        /* ── Success — show the share code ── */
        <div className="flex flex-col items-center py-4 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-jade-500/15">
            <Check className="h-6 w-6 text-jade-400" />
          </span>
          <p className="mt-3 text-sm font-semibold text-white">
            Your build is live
          </p>
          <p className="mt-0.5 text-xs text-white/45">
            Anyone on Pro or Team can add your build with this code.
          </p>
          <div className="mt-4 flex w-full items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <span className="flex-1 text-center font-display text-lg font-bold tracking-[0.2em] text-electric-300">
              {code}
            </span>
            <button
              onClick={copyCode}
              aria-label="Copy code"
              className="rounded-lg bg-white/10 p-2 text-white/70 hover:bg-white/15"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-4 w-full">
            <Button fullWidth onClick={close}>
              Done
            </Button>
          </div>
          <p className="mt-3 text-xs text-white/35">
            Manage or revoke shared builds any time on the Shared Builds page.
          </p>
        </div>
      ) : (
        /* ── Publish form ── */
        <div className="space-y-4 pb-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-white/65">
              Build name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Recruiter Build 2026"
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-electric-500/60"
            />
          </div>
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
            <p className="flex items-center gap-1.5 text-xs font-medium text-white/70">
              <Package className="h-3.5 w-3.5 text-electric-400" />
              What gets shared
            </p>
            <p className="mt-1 text-xs leading-relaxed text-white/45">
              Your theme, section layout and copy. Links are cleared so
              recipients add their own — and your name, photo and contact
              details are never included.
            </p>
          </div>
          <Button fullWidth onClick={publish} loading={busy}>
            Publish &amp; get share code
          </Button>
        </div>
      )}
    </Modal>
  );
}
