"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Plus,
  RefreshCw,
  Save,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";
import { Modal } from "@/components/ui/Modal";
import { FullScreenLoader } from "@/components/ui/Spinner";
import { SectionsManager } from "@/components/profile/SectionsManager";
import {
  SectionsProvider,
  type SectionsApi,
} from "@/components/profile/SectionsContext";
import {
  getFunnelAnalytics,
  getFunnelById,
  saveFunnel,
} from "@/lib/firebase/firestore";
import { createFunnelStep } from "@/lib/funnels";
import { createSection } from "@/lib/defaults";
import { APP } from "@/lib/constants";
import { cn, slugify } from "@/lib/utils";
import { toast } from "@/store/uiStore";
import type {
  Funnel,
  FunnelCta,
  FunnelStep,
  FunnelStepType,
  ProfileSection,
} from "@/types";

const FIELD =
  "h-10 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-electric-500/60";

const STEP_TYPES: { value: FunnelStepType; label: string; hint: string }[] = [
  { value: "optin", label: "Opt-In", hint: "Capture a name + contact" },
  { value: "content", label: "Content / Sales", hint: "Pitch, story or video" },
  { value: "offer", label: "Offer", hint: "A product with a buy link" },
  { value: "thankyou", label: "Thank You", hint: "Confirm + a next action" },
];

function stepTypeLabel(type: FunnelStepType): string {
  return STEP_TYPES.find((t) => t.value === type)?.label ?? type;
}

/* ---------------- Step CTA editor ---------------- */

function StepCtaEditor({
  step,
  onChange,
}: {
  step: FunnelStep;
  onChange: (cta: FunnelCta | undefined) => void;
}) {
  const cta = step.cta;
  if (!cta) {
    return (
      <button
        onClick={() => onChange({ label: "Continue", action: "next" })}
        className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/15 py-2.5 text-xs font-medium text-white/55 hover:border-electric-500/40 hover:text-white"
      >
        <Plus className="h-4 w-4" />
        Add a button
      </button>
    );
  }
  return (
    <div className="space-y-2 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-white/65">Step button</p>
        <button
          onClick={() => onChange(undefined)}
          className="text-xs text-white/35 hover:text-red-400"
        >
          Remove
        </button>
      </div>
      <input
        value={cta.label}
        onChange={(e) => onChange({ ...cta, label: e.target.value })}
        placeholder="Button label"
        className={FIELD}
      />
      <Select
        value={cta.action}
        onChange={(v) => onChange({ ...cta, action: v as FunnelCta["action"] })}
        options={[
          { value: "next", label: "Go to next step" },
          { value: "url", label: "Open an external link" },
        ]}
      />
      {cta.action === "url" && (
        <input
          value={cta.url || ""}
          onChange={(e) => onChange({ ...cta, url: e.target.value })}
          placeholder="https://your-link.com"
          className={FIELD}
        />
      )}
    </div>
  );
}

/* ---------------- Builder ---------------- */

export default function FunnelBuilderPage() {
  const params = useParams();
  const funnelId = String(params.id ?? "");
  const { account, loading: authLoading } = useAuth();

  const [funnel, setFunnel] = useState<Funnel | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [currentStepId, setCurrentStepId] = useState("");
  const [addStepOpen, setAddStepOpen] = useState(false);
  const [analytics, setAnalytics] = useState<Record<number, number>>({});
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getFunnelById(funnelId)
      .then((f) => {
        if (cancelled) return;
        setFunnel(f);
        if (f && f.steps[0]) setCurrentStepId(f.steps[0].id);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [funnelId]);

  const loadAnalytics = useCallback(async () => {
    if (!account) return;
    setAnalyticsLoading(true);
    try {
      setAnalytics(await getFunnelAnalytics(account.uid, funnelId));
    } catch {
      /* analytics is non-critical — ignore load failures */
    } finally {
      setAnalyticsLoading(false);
    }
  }, [account, funnelId]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const mutate = useCallback((fn: (f: Funnel) => Funnel) => {
    setFunnel((prev) => (prev ? { ...fn(prev), updatedAt: Date.now() } : prev));
    setDirty(true);
  }, []);

  const patchFunnel = (patch: Partial<Funnel>) =>
    mutate((f) => ({ ...f, ...patch }));

  const patchStep = (stepId: string, patch: Partial<FunnelStep>) =>
    mutate((f) => ({
      ...f,
      steps: f.steps.map((s) => (s.id === stepId ? { ...s, ...patch } : s)),
    }));

  const updateStepSections = (
    stepId: string,
    fn: (sections: ProfileSection[]) => ProfileSection[],
  ) =>
    mutate((f) => ({
      ...f,
      steps: f.steps.map((s) =>
        s.id === stepId ? { ...s, sections: fn(s.sections) } : s,
      ),
    }));

  const addStep = (type: FunnelStepType) => {
    const step = createFunnelStep(type);
    mutate((f) => ({ ...f, steps: [...f.steps, step] }));
    setCurrentStepId(step.id);
    setAddStepOpen(false);
  };

  const removeStep = (stepId: string) => {
    if (!funnel || funnel.steps.length <= 1) return;
    const remaining = funnel.steps.filter((s) => s.id !== stepId);
    mutate((f) => ({ ...f, steps: f.steps.filter((s) => s.id !== stepId) }));
    if (currentStepId === stepId) setCurrentStepId(remaining[0].id);
  };

  const moveStep = (index: number, dir: -1 | 1) => {
    mutate((f) => {
      const steps = [...f.steps];
      const j = index + dir;
      if (j < 0 || j >= steps.length) return f;
      [steps[index], steps[j]] = [steps[j], steps[index]];
      return { ...f, steps };
    });
  };

  const save = async () => {
    if (!funnel) return;
    setSaving(true);
    try {
      await saveFunnel(funnel);
      setDirty(false);
      toast.success("Funnel saved");
    } catch {
      toast.error("Couldn't save — please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return <FullScreenLoader label="Loading funnel…" />;
  }

  if (!funnel) {
    return (
      <Card className="p-8 text-center">
        <p className="text-sm font-medium text-white">Funnel not found</p>
        <p className="mt-1 text-xs text-white/45">It may have been deleted.</p>
        <Link
          href="/funnels"
          className="mt-4 inline-flex rounded-xl border border-white/12 px-4 py-2 text-xs font-medium text-white/70 hover:bg-white/5"
        >
          Back to Funnels
        </Link>
      </Card>
    );
  }

  if (account && funnel.ownerId !== account.uid) {
    return (
      <Card className="p-8 text-center">
        <p className="text-sm font-medium text-white">
          This isn&apos;t your funnel
        </p>
        <Link
          href="/funnels"
          className="mt-4 inline-flex rounded-xl border border-white/12 px-4 py-2 text-xs font-medium text-white/70 hover:bg-white/5"
        >
          Back to Funnels
        </Link>
      </Card>
    );
  }

  const currentStep =
    funnel.steps.find((s) => s.id === currentStepId) ?? funnel.steps[0];

  const entered = analytics[0] ?? 0;
  const finished = analytics[funnel.steps.length - 1] ?? 0;
  const completion = entered > 0 ? Math.round((finished / entered) * 100) : 0;

  const sectionsApi: SectionsApi = {
    sections: currentStep.sections,
    setSections: (sections) =>
      updateStepSections(currentStep.id, () => sections),
    addSection: (type) =>
      updateStepSections(currentStep.id, (secs) => [
        ...secs,
        createSection(type),
      ]),
    removeSection: (id) =>
      updateStepSections(currentStep.id, (secs) =>
        secs.filter((s) => s.id !== id),
      ),
    toggleSection: (id) =>
      updateStepSections(currentStep.id, (secs) =>
        secs.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)),
      ),
    updateSection: (id, patch) =>
      updateStepSections(currentStep.id, (secs) =>
        secs.map((s) =>
          s.id === id ? ({ ...s, ...patch } as ProfileSection) : s,
        ),
      ),
  };

  const publicPath = `${APP.url}/${account?.username || "you"}/${funnel.slug}`;

  return (
    <div className="space-y-4">
      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/funnels"
          aria-label="Back to Funnels"
          className="rounded-lg p-1.5 text-white/40 hover:bg-white/5 hover:text-white"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="mr-auto min-w-0">
          <h1 className="truncate font-display text-xl font-bold text-white">
            {funnel.name}
          </h1>
          <p className="text-xs text-white/45">
            {dirty ? "Unsaved changes" : "All changes saved"}
          </p>
        </div>
        <Button
          size="sm"
          onClick={save}
          loading={saving}
          leftIcon={<Save className="h-4 w-4" />}
        >
          Save{dirty ? "" : "d"}
        </Button>
      </div>

      {/* Funnel settings */}
      <Card className="p-4">
        <CardHeader title="Funnel settings" subtitle="Name, link and status" />
        <div className="mt-3 space-y-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-white/65">
              Funnel name
            </label>
            <input
              value={funnel.name}
              onChange={(e) => patchFunnel({ name: e.target.value })}
              className={FIELD}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-white/65">
              Link slug
            </label>
            <input
              value={funnel.slug}
              onChange={(e) => patchFunnel({ slug: slugify(e.target.value) })}
              className={FIELD}
            />
            <p className="mt-1 truncate text-[11px] text-white/35">
              {publicPath}
            </p>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
            <div>
              <p className="text-sm font-medium text-white">Published</p>
              <p className="text-xs text-white/45">
                {funnel.status === "published"
                  ? "Live at your funnel link"
                  : "Only you can see it"}
              </p>
            </div>
            <Switch
              checked={funnel.status === "published"}
              onChange={() =>
                patchFunnel({
                  status: funnel.status === "published" ? "draft" : "published",
                })
              }
            />
          </div>
        </div>
      </Card>

      {/* Steps */}
      <Card className="p-4">
        <CardHeader title="Steps" subtitle="The pages a visitor moves through" />
        <div className="mt-3 space-y-2">
          {funnel.steps.map((step, i) => (
            <div
              key={step.id}
              className={cn(
                "flex items-center gap-2 rounded-xl border p-2",
                step.id === currentStep.id
                  ? "border-electric-500 bg-electric-500/10"
                  : "border-white/[0.07] bg-white/[0.02]",
              )}
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/[0.06] text-xs text-white/50">
                {i + 1}
              </span>
              <button
                onClick={() => setCurrentStepId(step.id)}
                className="min-w-0 flex-1 text-left"
              >
                <p className="truncate text-sm font-medium text-white">
                  {step.name}
                </p>
                <p className="text-xs text-white/40">
                  {stepTypeLabel(step.type)}
                </p>
              </button>
              <button
                onClick={() => moveStep(i, -1)}
                disabled={i === 0}
                aria-label="Move step up"
                className="rounded-md p-1 text-white/35 hover:text-white disabled:opacity-25"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
              <button
                onClick={() => moveStep(i, 1)}
                disabled={i === funnel.steps.length - 1}
                aria-label="Move step down"
                className="rounded-md p-1 text-white/35 hover:text-white disabled:opacity-25"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
              <button
                onClick={() => removeStep(step.id)}
                disabled={funnel.steps.length <= 1}
                aria-label="Delete step"
                className="rounded-md p-1 text-white/30 hover:text-red-400 disabled:opacity-25"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button
            onClick={() => setAddStepOpen(true)}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/15 py-2.5 text-xs font-medium text-white/55 hover:border-electric-500/40 hover:text-white"
          >
            <Plus className="h-4 w-4" />
            Add step
          </button>
        </div>
      </Card>

      {/* Current step editor */}
      <Card className="p-4">
        <CardHeader
          title={`Editing: ${currentStep.name}`}
          subtitle="Step settings, button and page content"
        />
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/65">
                Step name
              </label>
              <input
                value={currentStep.name}
                onChange={(e) =>
                  patchStep(currentStep.id, { name: e.target.value })
                }
                className={FIELD}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/65">
                Step type
              </label>
              <Select
                value={currentStep.type}
                onChange={(v) =>
                  patchStep(currentStep.id, { type: v as FunnelStepType })
                }
                options={STEP_TYPES.map((t) => ({
                  value: t.value,
                  label: t.label,
                }))}
              />
            </div>
          </div>

          <StepCtaEditor
            step={currentStep}
            onChange={(cta) => patchStep(currentStep.id, { cta })}
          />

          <div>
            <p className="mb-2 text-xs font-medium text-white/65">
              Page content
            </p>
            <SectionsProvider value={sectionsApi}>
              <SectionsManager />
            </SectionsProvider>
          </div>
        </div>
      </Card>

      {/* Funnel analytics */}
      <Card className="p-4">
        <div className="flex items-start justify-between gap-3">
          <CardHeader
            title="Funnel analytics"
            subtitle="How visitors move through your steps"
          />
          <button
            onClick={loadAnalytics}
            disabled={analyticsLoading}
            aria-label="Refresh analytics"
            className="shrink-0 rounded-lg p-1.5 text-white/40 hover:bg-white/5 hover:text-white disabled:opacity-40"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
        {entered === 0 ? (
          <p className="mt-3 text-xs text-white/45">
            No visits yet — publish your funnel and share its link to start
            tracking step-by-step drop-off.
          </p>
        ) : (
          <>
            <div className="mt-3 space-y-2.5">
              {funnel.steps.map((step, i) => {
                const views = analytics[i] ?? 0;
                const pct = Math.min(100, (views / entered) * 100);
                return (
                  <div key={step.id}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="truncate text-white/70">
                        {i + 1}. {step.name}
                      </span>
                      <span className="shrink-0 text-white/45">
                        {views} view{views === 1 ? "" : "s"}
                      </span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className="h-full rounded-full bg-electric-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-white/45">
              {entered} entered · {finished} reached the end · {completion}%
              completion
            </p>
          </>
        )}
      </Card>

      {/* Add step modal */}
      <Modal
        open={addStepOpen}
        onClose={() => setAddStepOpen(false)}
        title="Add a step"
        description="Pick the kind of page to add."
      >
        <div className="grid gap-2 pb-2">
          {STEP_TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => addStep(t.value)}
              className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 text-left hover:border-electric-500/40"
            >
              <p className="text-sm font-medium text-white">{t.label}</p>
              <p className="text-xs text-white/45">{t.hint}</p>
            </button>
          ))}
        </div>
      </Modal>
    </div>
  );
}
