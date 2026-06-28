"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  Link2,
  Plus,
  RefreshCw,
  Save,
  Send,
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
import { ShareFunnelModal } from "@/components/funnels/ShareFunnelModal";
import { FunnelLinkModal } from "@/components/funnels/FunnelLinkModal";
import { FunnelPhonePreview } from "@/components/funnels/FunnelPhonePreview";
import { FunnelThemeModal } from "@/components/funnels/FunnelThemeModal";
import { ThemeMiniPreview } from "@/components/profile/ThemeMiniPreview";
import { THEME_CONFIGS } from "@/lib/themes";
import {
  SectionsProvider,
  type SectionsApi,
} from "@/components/profile/SectionsContext";
import {
  getFunnelAnalytics,
  getFunnelById,
  listPipelinesForUser,
  saveFunnel,
} from "@/lib/firebase/firestore";
import { createFunnelStep } from "@/lib/funnels";
import { createSection } from "@/lib/defaults";
import { cn, copyToClipboard, getAppOrigin, slugify } from "@/lib/utils";
import { toast } from "@/store/uiStore";
import type {
  Funnel,
  FunnelCta,
  FunnelStep,
  FunnelStepType,
  Pipeline,
  ProfileSection,
} from "@/types";

const FIELD =
  "h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 placeholder:text-slate-300 outline-none focus:border-electric-500/60";

const STEP_TYPES: { value: FunnelStepType; label: string; hint: string }[] = [
  { value: "optin", label: "Opt-In", hint: "Capture a name + contact" },
  { value: "content", label: "Content / Sales", hint: "Pitch, story or video" },
  { value: "offer", label: "Offer", hint: "A product with a buy link" },
  { value: "thankyou", label: "Thank You", hint: "Confirm + a next action" },
];

function stepTypeLabel(type: FunnelStepType): string {
  return STEP_TYPES.find((t) => t.value === type)?.label ?? type;
}

/* ---------------- Step share link ---------------- */

/**
 * Per-step deep-link editor. Renders the step's share URL with a
 * Copy button + an optional slug input. If the owner leaves slug
 * blank we use the 1-based step index instead. Hidden on the first
 * step since visitors landing at the funnel root already start there
 * and a `?step=1` link would just look noisy.
 */
function StepShareLink({
  funnel,
  step,
  stepIndex,
  username,
  onSlugChange,
}: {
  funnel: Funnel;
  step: FunnelStep;
  stepIndex: number;
  username: string;
  onSlugChange: (slug: string) => void;
}) {
  if (stepIndex <= 0) {
    return null;
  }
  const slugPart = step.slug?.trim() || String(stepIndex + 1);
  const shareUrl = `${getAppOrigin()}/${username}/${funnel.slug}?step=${encodeURIComponent(slugPart)}`;
  const copy = () =>
    copyToClipboard(shareUrl).then(
      () => toast.success("Step link copied"),
      () => toast.error("Couldn't copy — copy manually"),
    );
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="mb-1.5 text-xs font-medium text-slate-600">
        Step share link
      </p>
      <p className="mb-2 text-[10px] text-slate-500">
        Send visitors directly to this step from anywhere — email,
        DM, another funnel, social bios. Funnel still behaves
        normally once they land.
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
        <input
          value={step.slug ?? ""}
          onChange={(e) => onSlugChange(slugify(e.target.value))}
          placeholder={`Optional URL slug (e.g. "watch-training" → ?step=watch-training)`}
          className={FIELD}
        />
        <Button
          size="sm"
          variant="outline"
          onClick={copy}
          leftIcon={<Copy className="h-3.5 w-3.5" />}
        >
          Copy link
        </Button>
      </div>
      <p className="mt-2 break-all rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-[11px] text-electric-700">
        {shareUrl}
      </p>
    </div>
  );
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
        className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 py-2.5 text-xs font-medium text-slate-500 hover:border-electric-500/40 hover:text-slate-900"
      >
        <Plus className="h-4 w-4" />
        Add a button
      </button>
    );
  }
  return (
    <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-slate-600">Step button</p>
        <button
          onClick={() => onChange(undefined)}
          className="text-xs text-slate-400 hover:text-red-600"
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
  const [shareOpen, setShareOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);

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

  /* User's pipelines — needed for the "Lead destination" dropdown.
     Lazy-loaded once per page visit; failures are silent (the dropdown
     just shows "default pipeline" with no override option). */
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  useEffect(() => {
    if (!account) return;
    let cancelled = false;
    listPipelinesForUser(account.uid)
      .then((list) => {
        if (!cancelled) setPipelines(list);
      })
      .catch(() => {
        /* no pipelines or no permission — silent fall-through */
      });
    return () => {
      cancelled = true;
    };
  }, [account]);

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
        <p className="text-sm font-medium text-slate-900">Funnel not found</p>
        <p className="mt-1 text-xs text-slate-500">It may have been deleted.</p>
        <Link
          href="/funnels"
          className="mt-4 inline-flex rounded-xl border border-white/12 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100"
        >
          Back to Funnels
        </Link>
      </Card>
    );
  }

  if (account && funnel.ownerId !== account.uid) {
    return (
      <Card className="p-8 text-center">
        <p className="text-sm font-medium text-slate-900">
          This isn&apos;t your funnel
        </p>
        <Link
          href="/funnels"
          className="mt-4 inline-flex rounded-xl border border-white/12 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100"
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

  const currentTheme =
    THEME_CONFIGS.find((t) => t.id === funnel.themeId) ?? THEME_CONFIGS[0];

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

  const publicPath = `${getAppOrigin()}/${account?.username || "you"}/${funnel.slug}`;

  return (
    <>
      {/*
        Action bar — restructured for mobile:
          - Mobile: title row (back arrow + name + status) on its own
            line; action buttons in a horizontal scroll row below so
            Preview / Share / Save all stay visible without wrapping.
          - Desktop (sm+): single row, actions right-aligned.
      */}
      <div className="mb-3 space-y-2 sm:space-y-0">
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/funnels"
            aria-label="Back to Funnels"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-900"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-xl font-bold text-slate-900">
              {funnel.name}
            </h1>
            <p className="text-xs text-slate-500">
              {dirty ? "Unsaved changes" : "All changes saved"}
            </p>
          </div>
          {/* On sm+ the action buttons sit inline with the title. */}
          <div className="hidden shrink-0 items-center gap-2 sm:flex">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreviewOpen(true)}
              leftIcon={<Eye className="h-4 w-4" />}
              className="lg:hidden"
            >
              Preview
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLinkOpen(true)}
              leftIcon={<Link2 className="h-4 w-4" />}
            >
              Link
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShareOpen(true)}
              leftIcon={<Send className="h-4 w-4" />}
            >
              Share
            </Button>
            <Button
              size="sm"
              onClick={save}
              loading={saving}
              leftIcon={<Save className="h-4 w-4" />}
            >
              Save{dirty ? "" : "d"}
            </Button>
          </div>
        </div>
        {/* Mobile-only action row: horizontal scroll so every button
            is always reachable, even on the narrowest phones. */}
        <div className="-mx-4 overflow-x-auto px-4 pb-0.5 sm:hidden">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreviewOpen(true)}
              leftIcon={<Eye className="h-4 w-4" />}
              className="shrink-0"
            >
              Preview
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLinkOpen(true)}
              leftIcon={<Link2 className="h-4 w-4" />}
              className="shrink-0"
            >
              Link
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShareOpen(true)}
              leftIcon={<Send className="h-4 w-4" />}
              className="shrink-0"
            >
              Share
            </Button>
            <Button
              size="sm"
              onClick={save}
              loading={saving}
              leftIcon={<Save className="h-4 w-4" />}
              className="shrink-0"
            >
              Save{dirty ? "" : "d"}
            </Button>
          </div>
        </div>
      </div>

      {/* Split-pane: editor + live preview */}
      <div className="-mx-4 lg:-mx-8 lg:flex lg:h-[calc(100dvh-9.5rem)] lg:overflow-hidden">
        <div className="px-4 pb-28 lg:flex-1 lg:min-w-0 lg:overflow-y-auto lg:px-8 lg:pb-10 lg:pt-1">
          <div className="mx-auto max-w-3xl space-y-4">

      {/* Funnel settings */}
      <Card className="p-4">
        <CardHeader title="Funnel settings" subtitle="Name, link and status" />
        <div className="mt-3 space-y-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-600">
              Funnel name
            </label>
            <input
              value={funnel.name}
              onChange={(e) => patchFunnel({ name: e.target.value })}
              className={FIELD}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-600">
              Link slug
            </label>
            <input
              value={funnel.slug}
              onChange={(e) => patchFunnel({ slug: slugify(e.target.value) })}
              className={FIELD}
            />
            {/* URL preview + quick-copy + share shortcut so the user
                can grab the link without opening any modal. The Link
                button opens the full share sheet (native share / QR). */}
            <div className="mt-1.5 flex items-center gap-1.5">
              <p className="min-w-0 flex-1 truncate text-[11px] text-slate-400">
                {publicPath}
              </p>
              <button
                type="button"
                onClick={async () => {
                  const ok = await copyToClipboard(publicPath);
                  if (ok) toast.success("Link copied");
                  else toast.error("Couldn't copy — long-press to copy.");
                }}
                aria-label="Copy funnel link"
                className="shrink-0 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-900"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setLinkOpen(true)}
                aria-label="Open share sheet"
                className="shrink-0 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-electric-700"
              >
                <Link2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-xs font-medium text-slate-600">Theme</p>
            <button
              onClick={() => setThemeOpen(true)}
              className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-2 text-left transition-colors hover:border-white/25"
            >
              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md">
                <ThemeMiniPreview theme={currentTheme} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">
                  {currentTheme.name}
                </p>
                <p className="text-[11px] text-slate-400">Tap to change</p>
              </div>
            </button>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div>
              <p className="text-sm font-medium text-slate-900">Published</p>
              <p className="text-xs text-slate-500">
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

          {/* Lead destination — which follow-up pipeline leads from this
              funnel route into. Falls back to the user's default pipeline
              when "Use my default" is selected. Only shown when the user
              actually has pipelines set up — otherwise the dropdown would
              be empty and confusing. */}
          {pipelines.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-slate-900">Lead destination</p>
                <Link
                  href="/pipelines"
                  className="text-[10px] text-electric-600 hover:text-electric-700"
                >
                  Open pipelines →
                </Link>
              </div>
              <p className="mb-2 text-xs text-slate-500">
                Where new leads from this funnel will land. They start in
                the first stage of the chosen pipeline.
              </p>
              <Select
                value={funnel.pipelineId ?? ""}
                onChange={(value) =>
                  patchFunnel({ pipelineId: value || undefined })
                }
                options={[
                  {
                    value: "",
                    label: (() => {
                      const def = pipelines.find((p) => p.isDefault);
                      return def
                        ? `Use my default pipeline (${def.name})`
                        : "Use my default pipeline";
                    })(),
                  },
                  ...pipelines.map((p) => ({
                    value: p.id,
                    label: `${p.name}${p.isDefault ? " · default" : ""}`,
                  })),
                ]}
              />
            </div>
          )}
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
                  : "border-slate-200 bg-slate-50",
              )}
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-100 text-xs text-slate-500">
                {i + 1}
              </span>
              <button
                onClick={() => setCurrentStepId(step.id)}
                className="min-w-0 flex-1 text-left"
              >
                <p className="truncate text-sm font-medium text-slate-900">
                  {step.name}
                </p>
                <p className="text-xs text-slate-400">
                  {stepTypeLabel(step.type)}
                </p>
              </button>
              <button
                onClick={() => moveStep(i, -1)}
                disabled={i === 0}
                aria-label="Move step up"
                className="rounded-md p-1 text-slate-400 hover:text-slate-900 disabled:opacity-25"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
              <button
                onClick={() => moveStep(i, 1)}
                disabled={i === funnel.steps.length - 1}
                aria-label="Move step down"
                className="rounded-md p-1 text-slate-400 hover:text-slate-900 disabled:opacity-25"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
              <button
                onClick={() => removeStep(step.id)}
                disabled={funnel.steps.length <= 1}
                aria-label="Delete step"
                className="rounded-md p-1 text-slate-300 hover:text-red-600 disabled:opacity-25"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button
            onClick={() => setAddStepOpen(true)}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 py-2.5 text-xs font-medium text-slate-500 hover:border-electric-500/40 hover:text-slate-900"
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
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">
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
              <label className="mb-1.5 block text-xs font-medium text-slate-600">
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

          {/* Deep-link slug + share URL — owners can send visitors
              straight to any step from outside the funnel. Slug-style
              values are nicer than ?step=2; if left blank we fall
              back to the 1-based step index. */}
          <StepShareLink
            funnel={funnel}
            stepIndex={funnel.steps.findIndex((s) => s.id === currentStep.id)}
            step={currentStep}
            username={account?.username || "you"}
            onSlugChange={(slug) => patchStep(currentStep.id, { slug })}
          />

          <StepCtaEditor
            step={currentStep}
            onChange={(cta) => patchStep(currentStep.id, { cta })}
          />

          <div>
            <p className="mb-2 text-xs font-medium text-slate-600">
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
            className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
        {entered === 0 ? (
          <p className="mt-3 text-xs text-slate-500">
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
                      <span className="truncate text-slate-600">
                        {i + 1}. {step.name}
                      </span>
                      <span className="shrink-0 text-slate-500">
                        {views} view{views === 1 ? "" : "s"}
                      </span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-electric-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-slate-500">
              {entered} entered · {finished} reached the end · {completion}%
              completion
            </p>
          </>
        )}
      </Card>

          </div>
        </div>
        <div className="hidden lg:flex lg:w-[400px] lg:shrink-0 lg:flex-col lg:items-center lg:overflow-y-auto lg:border-l lg:border-slate-200 lg:bg-white/30 lg:px-6 lg:py-6">
          <p className="mb-3 text-center text-xs font-medium text-slate-400">
            Live preview · {currentStep.name}
          </p>
          <FunnelPhonePreview
            funnel={funnel}
            currentStepId={currentStep.id}
            height={660}
          />
        </div>
      </div>

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
              className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-left hover:border-electric-500/40"
            >
              <p className="text-sm font-medium text-slate-900">{t.label}</p>
              <p className="text-xs text-slate-500">{t.hint}</p>
            </button>
          ))}
        </div>
      </Modal>

      <ShareFunnelModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        funnel={funnel}
      />

      <FunnelLinkModal
        open={linkOpen}
        onClose={() => setLinkOpen(false)}
        url={publicPath}
        funnelName={funnel.name}
        isPublished={funnel.status === "published"}
        fileName={`credibly-${funnel.slug || "funnel"}-qr`}
      />

      <FunnelThemeModal
        open={themeOpen}
        onClose={() => setThemeOpen(false)}
        themeId={funnel.themeId}
        onChange={(id) => patchFunnel({ themeId: id })}
      />

      {/* Mobile preview modal */}
      <Modal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title="Live preview"
      >
        <div className="pb-3">
          <FunnelPhonePreview
            funnel={funnel}
            currentStepId={currentStep.id}
            height={560}
          />
        </div>
      </Modal>
    </>
  );
}
