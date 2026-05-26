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

  const { hasAnyFeature, plans } = usePlanAccess();
  /* Access to funnels at all = either tier of funnels enabled. */
  const isPaid = hasAnyFeature(["funnels_5", "funnels_15"]);
  /* Limit lookup respects: per-user override → plan.limits.funnels →
     legacy hardcoded FUNNEL_LIMITS map. The admin can grant individual
     users extra capacity in /admin/users without touching their plan. */
  const limit = resolveUserFunnelLimit(account, plans);

  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [templateId, setTemplateId] = useState(FUNNEL_TEMPLATES[0].id);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [useCodeOpen, setUseCodeOpen] = useState(false);

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
      /* Keep the slug unique among this user's funnels. */
      const taken = new Set(funnels.map((f) => f.slug));
      let slug = funnel.slug;
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

  const remove = async (f: Funnel) => {
    setBusyId(f.id);
    try {
      await deleteFunnel(f.id);
      setFunnels((prev) => prev.filter((x) => x.id !== f.id));
      toast.success("Funnel deleted");
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
          <h3 className="mt-3 font-display text-base font-bold text-gold-200">
            Funnels is a Pro feature
          </h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-white/50">
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
        <Card className="p-8 text-center text-sm text-white/40">
          Loading funnels…
        </Card>
      ) : funnels.length === 0 ? (
        <Card className="p-8 text-center">
          <Filter className="mx-auto h-8 w-8 text-white/20" />
          <p className="mt-3 text-sm font-medium text-white">
            No funnels yet
          </p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-white/45">
            Create your first funnel — a short, mobile-first flow that turns
            visitors into leads.
          </p>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {funnels.map((f) => (
            <Card key={f.id} className="flex flex-col p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-white">
                      {f.name}
                    </p>
                    <Badge tone={f.status === "published" ? "blue" : "neutral"}>
                      {f.status}
                    </Badge>
                  </div>
                  <p className="mt-1 truncate text-xs text-white/45">
                    {f.steps.length} step{f.steps.length === 1 ? "" : "s"} ·
                    /{account.username || "you"}/{f.slug}
                  </p>
                  <p className="mt-0.5 text-[11px] text-white/30">
                    Updated {timeAgo(f.updatedAt)}
                  </p>
                </div>
                <button
                  onClick={() => remove(f)}
                  disabled={busyId === f.id}
                  aria-label="Delete funnel"
                  className="shrink-0 rounded-lg p-2 text-white/30 transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-40"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <Link
                href={`/funnels/${f.id}`}
                className="mt-3 inline-flex items-center justify-center rounded-xl border border-white/12 py-2 text-xs font-medium text-white/75 transition-colors hover:bg-white/5"
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
            <label className="mb-1.5 block text-xs font-medium text-white/65">
              Funnel name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Free Training Funnel"
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-electric-500/60"
            />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium text-white/65">Starting layout</p>
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
                      : "border-white/10 hover:border-white/20",
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
                      <p className="text-sm font-semibold text-white">
                        {t.name}
                      </p>
                      <span className="rounded-full bg-white/[0.06] px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-white/55">
                        {t.category}
                      </span>
                      <span className="rounded-full bg-electric-500/15 px-1.5 py-0.5 text-[9px] font-medium text-electric-300">
                        {t.stepCount} steps
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs leading-relaxed text-white/45">
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
    </div>
  );
}
