"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import {
  lookupSharedFunnelByCode,
  saveFunnel,
} from "@/lib/firebase/firestore";
import { funnelFromShared } from "@/lib/funnels";
import { toast } from "@/store/uiStore";
import type { SharedFunnel } from "@/types";

export function UseFunnelCodeModal({
  open,
  onClose,
  takenSlugs,
  atLimit,
  limit,
}: {
  open: boolean;
  onClose: () => void;
  takenSlugs: string[];
  atLimit: boolean;
  limit: number;
}) {
  const router = useRouter();
  const { account } = useAuth();
  const [code, setCode] = useState("");
  const [looking, setLooking] = useState(false);
  const [found, setFound] = useState<SharedFunnel | null>(null);
  const [cloning, setCloning] = useState(false);

  useEffect(() => {
    if (open) {
      setCode("");
      setFound(null);
      setLooking(false);
      setCloning(false);
    }
  }, [open]);

  const close = () => {
    if (cloning) return;
    onClose();
  };

  const find = async () => {
    const c = code.trim();
    if (c.length < 3) {
      toast.error("Enter a share code.");
      return;
    }
    setLooking(true);
    setFound(null);
    try {
      const result = await lookupSharedFunnelByCode(c);
      if (!result) toast.error("No active funnel found for that code.");
      else setFound(result);
    } catch {
      toast.error("Lookup failed — please try again.");
    } finally {
      setLooking(false);
    }
  };

  const clone = async () => {
    if (!account || !found) return;
    if (atLimit) {
      toast.error(`Your plan allows ${limit} funnels.`);
      return;
    }
    setCloning(true);
    try {
      const funnel = funnelFromShared(account.uid, found);
      const taken = new Set(takenSlugs);
      let slug = funnel.slug;
      let n = 2;
      while (taken.has(slug)) slug = `${funnel.slug}-${n++}`;
      funnel.slug = slug;
      await saveFunnel(funnel);
      toast.success("Funnel added — opening the builder…");
      router.push(`/funnels/${funnel.id}`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Couldn't add the funnel.",
      );
      setCloning(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Use a funnel code"
      description="Paste a code to clone someone's funnel into your account."
    >
      <div className="space-y-3 pb-2">
        <div className="flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => {
              if (e.key === "Enter") find();
            }}
            placeholder="FNL-XXXXXX"
            className="h-11 flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 text-sm tracking-widest text-white outline-none placeholder:text-white/25 focus:border-electric-500/60"
          />
          <Button
            onClick={find}
            loading={looking}
            leftIcon={<Search className="h-4 w-4" />}
          >
            Find
          </Button>
        </div>

        {found && (
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
            <p className="text-sm font-semibold text-white">{found.name}</p>
            <p className="mt-0.5 text-xs text-white/45">
              Shared by {found.ownerName} · {found.funnel.steps.length} step
              {found.funnel.steps.length === 1 ? "" : "s"}
            </p>
            <div className="mt-3">
              <Button fullWidth onClick={clone} loading={cloning}>
                Clone this funnel
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
