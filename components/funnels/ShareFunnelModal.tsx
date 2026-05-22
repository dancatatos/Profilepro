"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Package } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { publishSharedFunnel } from "@/lib/firebase/firestore";
import { funnelSnapshot } from "@/lib/funnels";
import { generateShareCode } from "@/lib/sharedBuilds";
import { copyToClipboard } from "@/lib/utils";
import { toast } from "@/store/uiStore";
import type { Funnel } from "@/types";

export function ShareFunnelModal({
  open,
  onClose,
  funnel,
}: {
  open: boolean;
  onClose: () => void;
  funnel: Funnel;
}) {
  const { account } = useAuth();
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setCode(null);
      setBusy(false);
    }
  }, [open]);

  const close = () => {
    if (busy) return;
    onClose();
  };

  const publish = async () => {
    if (!account) return;
    setBusy(true);
    try {
      const record = await publishSharedFunnel({
        ownerId: account.uid,
        ownerName: account.displayName || "A Credibly user",
        name: funnel.name,
        shareCode: generateShareCode(account.displayName || "FNL"),
        funnel: funnelSnapshot(funnel),
        revoked: false,
      });
      setCode(record.shareCode);
      toast.success("Funnel published — share the code!");
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
      title="Share this funnel"
      description="Publish it as a template others can clone with a code."
    >
      {code ? (
        <div className="flex flex-col items-center py-4 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-jade-500/15">
            <Check className="h-6 w-6 text-jade-400" />
          </span>
          <p className="mt-3 text-sm font-semibold text-white">
            Your funnel is shared
          </p>
          <p className="mt-0.5 text-xs text-white/45">
            Anyone on Pro or Team can clone it with this code.
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
            Manage or revoke shared funnels any time on the Funnels page.
          </p>
        </div>
      ) : (
        <div className="space-y-4 pb-2">
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
            <p className="flex items-center gap-1.5 text-xs font-medium text-white/70">
              <Package className="h-3.5 w-3.5 text-electric-400" />
              What gets shared
            </p>
            <p className="mt-1 text-xs leading-relaxed text-white/45">
              Every step, its layout and copy. Links are cleared so the
              recipient adds their own. Shares the funnel as it looks right
              now.
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
