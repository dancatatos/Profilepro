"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Crown,
  Filter,
  Plus,
  RefreshCw,
  Sparkles,
  Ticket,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePlanAccess } from "@/components/providers/PlanProvider";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { FullScreenLoader } from "@/components/ui/Spinner";
import { AIFunnelModal } from "@/components/funnels/AIFunnelModal";
import { UseFunnelCodeModal } from "@/components/funnels/UseFunnelCodeModal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  deleteFunnel,
  listFunnels,
  saveFunnel,
} from "@/lib/firebase/firestore";
import { createFunnel, FUNNEL_TEMPLATES } from "@/lib/funnels";
import { THEME_CONFIGS } from "@/lib/themes";
import { resolveUserFunnelLimit } from "@/lib/constants";
import { cn, timeAgo } from "@/lib/utils";
import { toast } from "@/store/uiStore";
import type { Funnel } from "@/types";

export default function FunnelsPage() {
  const router = useRouter();
  const { account, loading: authLoading } = useAuth();

  const { plans } = usePlanAccess();
  /* Limit lookup respects: per-user override → plan.limits.funnels →
     legacy hardcoded FUNNEL_LIMITS map. The admin can grant individual
     users extra capacity in /admin/users without touching their plan.
     Access is now purely cap-driven: any positive limit unlocks the
     page — so a free plan with `limits.funnels: 1` gets in. */
  const limit = resolveUserFunnelLimit(account, plans);
  const isPaid = limit > 0;

  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [templateId, setTemplateId] = useState(FUNNEL_TEMPLATES[0].id);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [useCodeOpen, setUseCodeOpen] = useState(false);
  /* The funnel pending deletion — null when no confirm dialog is
     open. Holding the whole Funnel (not just the id) lets the
     dialog show the name so the user double-checks they're deleting
     the right one before confirming. */
  const [pendingDelete, setPendingDelete] = useState<Funnel | null>(null);

  const load = useCallback(async () => {
    if (!account || !isPaid) return;
    setLoading(true);
    try {
      setFunnels(await listFunnels(account.uid));
    } catch {
      toast.error("Couldn't load your funnels.");
    } finally {
      setLoading(false);
    }
  }, [account, isPaid]);

  useEffect(() => {
    load();
  }, [load]);

  const create = async () => {
    if (!account) return;
    if (funnels.length >= limit) {
      toast.error(`Your plan allows ${limit} funnels.`);
      return;
    }
    const template =
      FUNNEL_TEMPLATES.find((t) => t.id === templateId) ?? FUNNEL_TEMPLATES[0];
    setCreating(true);
    try {
      const funnel = createFunnel(account.uid, name, template);
      /* Keep the slug unique among this user's funnels AND avoid
         reserved segments that collide with sibling public routes
         under /{username}/ — currently just "t" (training page). */
      const RESERVED_FUNNEL_SLUGS = new Set(["t"]);
      const taken = new Set(funnels.map((f) => f.slug));
      let slug = funnel.slug;
      if (RESERVED_FUNNEL_SLUGS.has(slug)) slug = `${slug}-funnel`;
      let n = 2;
      while (taken.has(slug)) slug = `${funnel.slug}-${n++}`;
      funnel.slug = slug;
      await saveFunnel(funnel);
      toast.success("Funnel created");
      router.push(`/funnels/${funnel.id}`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Couldn't create the funnel.",
      );
      setCreating(false);
    }
  };

  /* Actual deletion — called only after the user confirms via the
     ConfirmDialog. The trash icon now just opens the dialog. */
  const confirmRemove = async () => {
    const f = pendingDelete;
    if (!f) return;
    setBusyId(f.id);
    try {
      await deleteFunnel(f.id);
      setFunnels((prev) => prev.filter((x) => x.id !== f.id));
      toast.success("Funnel deleted");
      setPendingDelete(null);
    } catch {
      toast.error("Couldn't delete the funnel.");
    } finally {
      setBusyId(null);
    }
  };

  if (authLoading || !account) {
    return <FullScreenLoader label="Loading funnels…" />;
  }

  /* ── Free users: upgrade prompt ── */
  if (!isPaid) {
    return (
      <div className="space-y-5">
        <PageHeader
          title="Funnels"
          subtitle="Launch a mini sales funnel in minutes."
        />
        <Card className="border border-gold-400/20 bg-gradient-to-b from-gold-400/[0.06] to-transparent p-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-gold-300 to-gold-500">
            <Crown className="h-6 w-6 text-ink-950" />
          </div>
          <h3 className="mt-3 font-display text-base font-bold text-amber-700">
            Funnels is a Pro feature
          </h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
            Upgrade to build mobile-first opt-in, sales and opportunity
            funnels — each with its own shareable link.
          </p>
          <Link
            href="/billing"
            className="mt-4 inline-flex rounded-xl bg-gradient-to-r from-gold-300 to-gold-500 px-5 py-2.5 text-sm font-bold text-ink-950"
          >
            Upgrade to Pro
          </Link>
        </Card>
      </div>
    );
  }

  const atLimit = funnels.length >= limit;

  return (
    <div className="space-y-5">
      {/*
        Header layout:
          - Mobile: title row on top, action row scrolls horizontally
            below so all 4 buttons stay reachable without wrapping
            into a messy multi-row layout.
          - Desktop (sm+): title + buttons share one row, buttons
            right-aligned without scrolling.
      */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title="Funnels"
          subtitle={`Your mini sales funnels · ${funnels.length}/${limit}`}
        />
        <div className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 sm:pb-0">
          <div className="flex shrink-0 justify-start gap-2 sm:flex-wrap sm:justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={load}
              loading={loading}
              leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
              className="shrink-0"
            >
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (atLimit) {
                  toast.error(`Your plan allows ${limit} funnels.`);
                  return;
                }
                setName("");
                setTemplateId(FUNNEL_TEMPLATES[0].id);
                setCreateOpen(true);
              }}
              leftIcon={<Plus className="h-3.5 w-3.5" />}
              className="shrink-0"
            >
              New funnel
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUseCodeOpen(true)}
              leftIcon={<Ticket className="h-3.5 w-3.5" />}
              className="shrink-0"
            >
              Use a code
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (atLimit) {
                  toast.error(`Your plan allows ${limit} funnels.`);
                  return;
                }
                setAiOpen(true);
              }}
              leftIcon={<Sparkles className="h-3.5 w-3.5" />}
              className="shrink-0"
            >
              AI funnel
            </Button>
          </div>
        </div>
      </div>

      {loading && funnels.length === 0 ? (
        <Card className="p-8 text-center text-sm text-slate-400">
          Loading funnels…
        </Card>
      ) : funnels.length === 0 ? (
        <Card className="p-8 text-center">
          <Filter className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-900">
            No funnels yet
          </p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500">
            Create your first funnel — a short, mobile-first flow that turns
            visitors into leads.
          </p>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {funnels.map((f) => (
            /* min-w-0 on the card itself keeps the GRID cell from
               growing to fit the longest funnel name on mobile. Without
               it, a single ~50-char title (e.g. "Amare Member
               Onboarding — 10 Training Modules") forced the card past
               the viewport edge, taking the "Open builder" button
               with it. */
            <Card key={f.id} className="flex min-w-0 flex-col p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {/* min-w-0 on the inner flex so the truncate <p>
                      knows its width can be smaller than the natural
                      content width. Without it, truncate is a no-op. */}
                  <div className="flex min-w-0 items-center gap-2">
                    <p className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900">
                      {f.name}
                    </p>
                    <Badge tone={f.status === "published" ? "blue" : "neutral"}>
                      {f.status}
                    </Badge>
                  </div>
                  <p className="mt-1 truncate text-xs text-slate-500">
                    {f.steps.length} step{f.steps.length === 1 ? "" : "s"} ·
                    /{account.username || "you"}/{f.slug}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-300">
                    Updated {timeAgo(f.updatedAt)}
                  </p>
                </div>
                <button
                  onClick={() => setPendingDelete(f)}
                  disabled={busyId === f.id}
                  aria-label="Delete funnel"
                  className="shrink-0 rounded-lg p-2 text-slate-300 transition-colors hover:bg-red-500/10 hover:text-red-600 disabled:opacity-40"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <Link
                href={`/funnels/${f.id}`}
                className="mt-3 inline-flex items-center justify-center rounded-xl border border-white/12 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100"
              >
                Open builder
              </Link>
            </Card>
          ))}
        </div>
      )}

      {/* Create funnel modal */}
      <Modal
        open={createOpen}
        onClose={() => !creating && setCreateOpen(false)}
        title="New funnel"
        description="Name it and pick a starting layout."
      >
        <div className="space-y-4 pb-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-600">
              Funnel name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Free Training Funnel"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 outline-none placeholder:text-slate-300 focus:border-electric-500/60"
            />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-600">Starting layout</p>
            {FUNNEL_TEMPLATES.map((t) => {
              const theme = THEME_CONFIGS.find((c) => c.id === t.themeId);
              const selected = templateId === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTemplateId(t.id)}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors",
                    selected
                      ? "border-electric-500 bg-electric-500/10"
                      : "border-slate-200 hover:border-slate-300",
                  )}
                >
                  {/* Theme swatch — tiny preview of the colours the
                      template uses, so the user can see the visual
                      mood at a glance without opening the funnel. */}
                  <span
                    className="mt-0.5 h-10 w-10 shrink-0 rounded-lg ring-1 ring-white/10"
                    style={{
                      background:
                        theme?.previewGradient ??
                        "linear-gradient(135deg,#2e6bff,#1a52e0)",
                    }}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="text-sm font-semibold text-slate-900">
                        {t.name}
                      </p>
                      <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-slate-500">
                        {t.category}
                      </span>
                      <span className="rounded-full bg-electric-500/15 px-1.5 py-0.5 text-[9px] font-medium text-electric-700">
                        {t.stepCount} steps
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                      {t.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
          <Button fullWidth onClick={create} loading={creating}>
            Create funnel
          </Button>
        </div>
      </Modal>

      <AIFunnelModal
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        takenSlugs={funnels.map((f) => f.slug)}
      />

      <UseFunnelCodeModal
        open={useCodeOpen}
        onClose={() => setUseCodeOpen(false)}
        takenSlugs={funnels.map((f) => f.slug)}
        atLimit={atLimit}
        limit={limit}
      />

      {/* Delete confirmation — guards against accidental taps on the
          trash icon. Shows the funnel's name so the user double-checks
          they're nuking the right one. Loading state disables the
          buttons during the Firestore call. */}
      <ConfirmDialog
        open={!!pendingDelete}
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmRemove}
        loading={!!pendingDelete && busyId === pendingDelete.id}
        title="Delete this funnel?"
        confirmLabel="Delete funnel"
        body={
          pendingDelete ? (
            <>
              <p>
                <strong className="text-slate-900">{pendingDelete.name}</strong>{" "}
                will be permanently deleted, along with its{" "}
                {pendingDelete.steps.length} step
                {pendingDelete.steps.length === 1 ? "" : "s"}.
              </p>
              <p className="mt-1 text-xs text-slate-500">
                This can&apos;t be undone. Existing leads stay in your account
                — only the funnel itself is removed.
              </p>
            </>
          ) : null
        }
      />
    </div>
  );
}
