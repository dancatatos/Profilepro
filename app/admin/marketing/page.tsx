"use client";

/**
 * Admin → Marketing Content editor.
 *
 * Edits every section of the public homepage (hero copy, social proof,
 * testimonials, video testimonials, FAQ, final CTA) and writes the
 * result to settings/marketing. Defaults from lib/marketing.ts are
 * shown if nothing has been saved yet, so the admin always edits
 * against a known-good baseline.
 *
 * Layout: one expandable card per section. Each section that supports
 * conditional rendering on the homepage has an "Enabled" toggle so
 * the admin can hide a half-finished section instead of shipping
 * placeholder content.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Eye,
  EyeOff,
  Plus,
  RefreshCw,
  Save,
  Star,
  Trash2,
} from "lucide-react";
import { DASHBOARD_NAV } from "@/lib/constants";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import {
  getMarketingContent,
  setMarketingContent,
} from "@/lib/firebase/firestore";
import { useMarketingStore } from "@/store/marketingStore";
import {
  blankFaqItem,
  blankStat,
  blankTestimonial,
  blankVideoTestimonial,
  DEFAULT_HOMEPAGE_DEEP_DIVES,
  DEFAULT_MARKETING_CONTENT,
  mergeMarketingContent,
} from "@/lib/marketing";
import { toast } from "@/store/uiStore";
import { cn } from "@/lib/utils";
import type {
  HomepageDeepDive,
  HomepageDeepDiveBlob,
  MarketingContent,
  MarketingFaqItem,
  MarketingStat,
  MarketingTestimonial,
  MarketingVideoTestimonial,
} from "@/types";

export default function AdminMarketingPage() {
  const { account } = useAuth();
  const [content, setContent] = useState<MarketingContent>(
    DEFAULT_MARKETING_CONTENT,
  );
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const override = await getMarketingContent();
      setContent(mergeMarketingContent(override));
      setDirty(false);
    } catch {
      toast.error("Couldn't load marketing content.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (account?.role === "admin") load();
  }, [account, load]);

  /* Generic patcher: takes a section key + partial patch, updates the
     local content and flags it dirty. Each editor below uses a thin
     wrapper around this for ergonomics. */
  const patch = <K extends keyof MarketingContent>(
    section: K,
    update: Partial<MarketingContent[K]>,
  ) => {
    setContent((prev) => ({
      ...prev,
      /* MarketingContent has both object-typed sections (hero, faq,
         etc.) and scalar fields (trustPhotoUrl). This helper is only
         called for the object-typed ones; the cast tells TS to trust
         the caller. */
      [section]: {
        ...(prev[section] as object),
        ...(update as object),
      },
    }));
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      await setMarketingContent(content);
      /* Push the new content into the in-memory store so any open
         dashboard tab (sidebar nav, /trainings, etc.) reflects the
         feature-label rename without a page reload. */
      useMarketingStore.getState().setLocal(content);
      setDirty(false);
      toast.success("Marketing content saved — live on the homepage.");
    } catch {
      toast.error("Couldn't save — check Firestore rules.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 p-4 sm:space-y-6 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-xl font-bold text-slate-900 sm:text-2xl">
            Marketing Content
          </h1>
          <p className="text-xs text-slate-500 sm:text-sm">
            Edit what appears on crediblyai.com — hero copy, social proof,
            testimonials, FAQ, and final CTA.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/"
            target="_blank"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Preview
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={load}
            loading={loading}
            leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
          >
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={save}
            loading={saving}
            disabled={!dirty || saving}
            leftIcon={<Save className="h-3.5 w-3.5" />}
          >
            {dirty ? "Save changes" : "Saved"}
          </Button>
        </div>
      </div>

      {dirty && (
        <div className="rounded-xl border border-electric-500/20 bg-electric-500/[0.06] px-4 py-2.5 text-xs text-electric-700">
          You have unsaved changes. Click <strong>Save changes</strong> to
          publish them to the live homepage.
        </div>
      )}

      <HomepageBrandingEditor
        branding={content.homepage?.branding}
        onChange={(next) => {
          setContent((prev) => ({
            ...prev,
            homepage: { ...(prev.homepage ?? {}), branding: next },
          }));
          setDirty(true);
        }}
      />

      <HomepageSeoEditor
        seo={content.homepage?.seo}
        onChange={(next) => {
          setContent((prev) => ({
            ...prev,
            homepage: { ...(prev.homepage ?? {}), seo: next },
          }));
          setDirty(true);
        }}
      />

      <HomepageDeepDivesEditor
        deepDives={content.homepage?.deepDives ?? DEFAULT_HOMEPAGE_DEEP_DIVES}
        onChange={(next) => {
          setContent((prev) => ({
            ...prev,
            homepage: { ...(prev.homepage ?? {}), deepDives: next },
          }));
          setDirty(true);
        }}
      />

      <TrustPhotoEditor
        photoUrl={content.trustPhotoUrl}
        photoAlt={content.trustPhotoAlt}
        onChange={(next) => {
          setContent((prev) => ({ ...prev, ...next }));
          setDirty(true);
        }}
      />

      <FeatureLabelsEditor
        labels={content.featureLabels}
        onChange={(next) => {
          setContent((prev) => ({ ...prev, featureLabels: next }));
          setDirty(true);
        }}
      />

      <DashboardNavEditor
        layout={content.dashboardNav}
        onChange={(next) => {
          setContent((prev) => ({ ...prev, dashboardNav: next }));
          setDirty(true);
        }}
      />

      <HeroEditor
        hero={content.hero}
        onChange={(update) => patch("hero", update)}
      />

      <SocialProofEditor
        section={content.socialProof}
        onChange={(update) => patch("socialProof", update)}
      />

      <TestimonialsEditor
        section={content.testimonials}
        onChange={(update) => patch("testimonials", update)}
      />

      <VideoTestimonialsEditor
        section={content.testimonialVideos}
        onChange={(update) => patch("testimonialVideos", update)}
      />

      <FaqEditor
        section={content.faq}
        onChange={(update) => patch("faq", update)}
      />

      <FinalCtaEditor
        section={content.finalCta}
        onChange={(update) => patch("finalCta", update)}
      />

      {/* Sticky bottom save for long pages — easier than scrolling back up. */}
      <div className="sticky bottom-4 z-10 flex justify-end">
        <Button
          onClick={save}
          loading={saving}
          disabled={!dirty || saving}
          leftIcon={<Save className="h-4 w-4" />}
        >
          {dirty ? "Save changes" : "All saved"}
        </Button>
      </div>
    </div>
  );
}

/* ── Generic collapsible section shell ─────────────────────────── */

function SectionCard({
  title,
  description,
  enabled,
  onToggleEnabled,
  children,
  defaultOpen = true,
}: {
  title: string;
  description?: string;
  /** Pass undefined for sections that can't be hidden (e.g. Hero). */
  enabled?: boolean;
  onToggleEnabled?: (next: boolean) => void;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="min-w-0 flex-1 text-left"
        >
          <p className="truncate text-sm font-semibold text-slate-900">{title}</p>
          {description && (
            <p className="mt-0.5 truncate text-[11px] text-slate-400">
              {description}
            </p>
          )}
        </button>
        {enabled !== undefined && onToggleEnabled && (
          <button
            type="button"
            onClick={() => onToggleEnabled(!enabled)}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
              enabled
                ? "bg-jade-500/15 text-jade-600"
                : "bg-slate-100 text-slate-500",
            )}
          >
            {enabled ? (
              <>
                <Eye className="h-3 w-3" />
                Visible
              </>
            ) : (
              <>
                <EyeOff className="h-3 w-3" />
                Hidden
              </>
            )}
          </button>
        )}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Collapse" : "Expand"}
          className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-900"
        >
          {open ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
      </div>
      {open && <div className="space-y-3 p-4">{children}</div>}
    </Card>
  );
}

/* ── Small reusable inputs ─────────────────────────────────────── */

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-slate-500">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-[10px] text-slate-400">{hint}</p>}
    </div>
  );
}

const inputCx =
  "w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-300 focus:border-electric-500/40";

/* ── Hero editor ───────────────────────────────────────────────── */

function HeroEditor({
  hero,
  onChange,
}: {
  hero: MarketingContent["hero"];
  onChange: (update: Partial<MarketingContent["hero"]>) => void;
}) {
  return (
    <SectionCard
      title="Hero"
      description="Headline + subheadline + CTAs at the very top of the homepage."
    >
      <Field label="Badge text" hint="Small pill above the headline.">
        <input
          value={hero.badge}
          onChange={(e) => onChange({ badge: e.target.value })}
          className={inputCx}
          placeholder="AI-powered credibility platform"
        />
      </Field>

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Headline line 1">
          <input
            value={hero.headlineLine1}
            onChange={(e) => onChange({ headlineLine1: e.target.value })}
            className={inputCx}
            placeholder="Recruit faster."
          />
        </Field>
        <Field
          label="Gradient phrase"
          hint="Renders in the blue gradient color."
        >
          <input
            value={hero.headlineGradient}
            onChange={(e) => onChange({ headlineGradient: e.target.value })}
            className={inputCx}
            placeholder="Follow up smarter."
          />
        </Field>
        <Field label="Headline line 2">
          <input
            value={hero.headlineLine2}
            onChange={(e) => onChange({ headlineLine2: e.target.value })}
            className={inputCx}
            placeholder="Get paid easier."
          />
        </Field>
      </div>

      <Field label="Subheadline" hint="1-2 sentences under the headline.">
        <textarea
          value={hero.subheadline}
          onChange={(e) => onChange({ subheadline: e.target.value })}
          rows={3}
          className={cn(inputCx, "resize-none")}
        />
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Primary CTA">
          <input
            value={hero.primaryCta}
            onChange={(e) => onChange({ primaryCta: e.target.value })}
            className={inputCx}
            placeholder="Start free"
          />
        </Field>
        <Field label="Secondary CTA">
          <input
            value={hero.secondaryCta}
            onChange={(e) => onChange({ secondaryCta: e.target.value })}
            className={inputCx}
            placeholder="See live example"
          />
        </Field>
      </div>

      <Field
        label="Audience pills"
        hint="One per line — shown as chips under the CTAs."
      >
        <textarea
          value={hero.audiences.join("\n")}
          onChange={(e) =>
            onChange({
              audiences: e.target.value
                .split("\n")
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
          rows={4}
          className={cn(inputCx, "resize-none font-mono text-xs")}
        />
      </Field>
    </SectionCard>
  );
}

/* ── Social proof editor ───────────────────────────────────────── */

function SocialProofEditor({
  section,
  onChange,
}: {
  section: MarketingContent["socialProof"];
  onChange: (update: Partial<MarketingContent["socialProof"]>) => void;
}) {
  const updateStat = (id: string, patch: Partial<MarketingStat>) => {
    onChange({
      stats: section.stats.map((s) =>
        s.id === id ? { ...s, ...patch } : s,
      ),
    });
  };
  const removeStat = (id: string) => {
    onChange({ stats: section.stats.filter((s) => s.id !== id) });
  };
  const addStat = () => {
    onChange({ stats: [...section.stats, blankStat()] });
  };

  return (
    <SectionCard
      title="Social Proof Bar"
      description="A 4-stat row under the hero. Turn ON when you have real numbers."
      enabled={section.enabled}
      onToggleEnabled={(next) => onChange({ enabled: next })}
    >
      {section.stats.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 py-4 text-center text-xs text-slate-500">
          No stats yet — click &ldquo;Add stat&rdquo; below.
        </div>
      ) : (
        <div className="space-y-2">
          {section.stats.map((s) => (
            <div
              key={s.id}
              className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5 sm:grid-cols-[140px_1fr_auto] sm:items-center"
            >
              <input
                value={s.value}
                onChange={(e) => updateStat(s.id, { value: e.target.value })}
                placeholder="200+"
                className={cn(
                  inputCx,
                  "font-display text-base font-bold sm:p-2",
                )}
              />
              <input
                value={s.label}
                onChange={(e) => updateStat(s.id, { label: e.target.value })}
                placeholder="Profiles built"
                className={cn(inputCx, "sm:p-2")}
              />
              <button
                type="button"
                onClick={() => removeStat(s.id)}
                aria-label="Remove stat"
                className="rounded-md p-1.5 text-slate-300 transition-colors hover:bg-red-500/10 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={addStat}
        leftIcon={<Plus className="h-3.5 w-3.5" />}
      >
        Add stat
      </Button>
    </SectionCard>
  );
}

/* ── Testimonials editor ───────────────────────────────────────── */

function TestimonialsEditor({
  section,
  onChange,
}: {
  section: MarketingContent["testimonials"];
  onChange: (update: Partial<MarketingContent["testimonials"]>) => void;
}) {
  const updateItem = (id: string, patch: Partial<MarketingTestimonial>) => {
    onChange({
      items: section.items.map((t) =>
        t.id === id ? { ...t, ...patch } : t,
      ),
    });
  };
  const removeItem = (id: string) => {
    onChange({ items: section.items.filter((t) => t.id !== id) });
  };
  const addItem = () => {
    onChange({ items: [...section.items, blankTestimonial()] });
  };

  return (
    <SectionCard
      title="Written Testimonials"
      description="Customer quotes shown in a 3-column grid."
      enabled={section.enabled}
      onToggleEnabled={(next) => onChange({ enabled: next })}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Section title">
          <input
            value={section.title}
            onChange={(e) => onChange({ title: e.target.value })}
            className={inputCx}
          />
        </Field>
        <Field label="Subtitle (optional)">
          <input
            value={section.subtitle ?? ""}
            onChange={(e) =>
              onChange({ subtitle: e.target.value || undefined })
            }
            className={inputCx}
          />
        </Field>
      </div>

      {section.items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 py-4 text-center text-xs text-slate-500">
          No testimonials yet — click &ldquo;Add testimonial&rdquo; below.
        </div>
      ) : (
        <div className="space-y-3">
          {section.items.map((t) => (
            <div
              key={t.id}
              className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3"
            >
              <div className="grid gap-2 sm:grid-cols-2">
                <Field label="Name">
                  <input
                    value={t.name}
                    onChange={(e) =>
                      updateItem(t.id, { name: e.target.value })
                    }
                    className={inputCx}
                    placeholder="Maria Santos"
                  />
                </Field>
                <Field label="Role / context">
                  <input
                    value={t.role}
                    onChange={(e) =>
                      updateItem(t.id, { role: e.target.value })
                    }
                    className={inputCx}
                    placeholder="Wellness Coach · Manila"
                  />
                </Field>
              </div>
              <Field label="Quote">
                <textarea
                  value={t.quote}
                  onChange={(e) =>
                    updateItem(t.id, { quote: e.target.value })
                  }
                  rows={3}
                  className={cn(inputCx, "resize-none")}
                  placeholder="Credibly changed how I follow up — went from forgetting half my leads to closing 3 extra recruits last month."
                />
              </Field>
              <div className="grid gap-2 sm:grid-cols-[1fr_120px]">
                <Field label="Avatar URL (optional)">
                  <input
                    value={t.avatarUrl ?? ""}
                    onChange={(e) =>
                      updateItem(t.id, {
                        avatarUrl: e.target.value || undefined,
                      })
                    }
                    className={inputCx}
                    placeholder="https://… (falls back to initials if blank)"
                  />
                </Field>
                <Field label="Rating">
                  <select
                    value={t.rating ?? 5}
                    onChange={(e) =>
                      updateItem(t.id, { rating: Number(e.target.value) })
                    }
                    className={inputCx}
                  >
                    {[5, 4, 3, 2, 1, 0].map((n) => (
                      <option key={n} value={n}>
                        {n === 0 ? "No stars" : `${n} stars`}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="flex items-center justify-between border-t border-slate-200 pt-2">
                <div className="flex gap-0.5 text-amber-700">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={cn(
                        "h-3.5 w-3.5",
                        i < (t.rating ?? 0)
                          ? "fill-gold-300"
                          : "fill-transparent text-slate-900/15",
                      )}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(t.id)}
                  className="flex items-center gap-1 rounded-md p-1.5 text-xs text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-600"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={addItem}
        leftIcon={<Plus className="h-3.5 w-3.5" />}
      >
        Add testimonial
      </Button>
    </SectionCard>
  );
}

/* ── Video testimonials editor ─────────────────────────────────── */

function VideoTestimonialsEditor({
  section,
  onChange,
}: {
  section: MarketingContent["testimonialVideos"];
  onChange: (
    update: Partial<MarketingContent["testimonialVideos"]>,
  ) => void;
}) {
  const updateItem = (
    id: string,
    patch: Partial<MarketingVideoTestimonial>,
  ) => {
    onChange({
      items: section.items.map((v) =>
        v.id === id ? { ...v, ...patch } : v,
      ),
    });
  };
  const removeItem = (id: string) => {
    onChange({ items: section.items.filter((v) => v.id !== id) });
  };
  const addItem = () => {
    onChange({ items: [...section.items, blankVideoTestimonial()] });
  };

  return (
    <SectionCard
      title="Video Testimonials"
      description="Short videos from real users — YouTube, Vimeo or Adilo URLs."
      enabled={section.enabled}
      onToggleEnabled={(next) => onChange({ enabled: next })}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Section title">
          <input
            value={section.title}
            onChange={(e) => onChange({ title: e.target.value })}
            className={inputCx}
          />
        </Field>
        <Field label="Subtitle (optional)">
          <input
            value={section.subtitle ?? ""}
            onChange={(e) =>
              onChange({ subtitle: e.target.value || undefined })
            }
            className={inputCx}
          />
        </Field>
      </div>

      {section.items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 py-4 text-center text-xs text-slate-500">
          No videos yet — click &ldquo;Add video&rdquo; below.
        </div>
      ) : (
        <div className="space-y-3">
          {section.items.map((v) => (
            <div
              key={v.id}
              className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3"
            >
              <Field label="Video title">
                <input
                  value={v.title}
                  onChange={(e) =>
                    updateItem(v.id, { title: e.target.value })
                  }
                  className={inputCx}
                  placeholder="How I closed 5 recruits in 30 days"
                />
              </Field>
              <Field
                label="Video URL"
                hint="YouTube, Vimeo, or Adilo share link."
              >
                <input
                  value={v.videoUrl}
                  onChange={(e) =>
                    updateItem(v.id, { videoUrl: e.target.value })
                  }
                  className={inputCx}
                  placeholder="https://youtu.be/…"
                />
              </Field>
              <Field label="Author name (optional)">
                <input
                  value={v.authorName ?? ""}
                  onChange={(e) =>
                    updateItem(v.id, {
                      authorName: e.target.value || undefined,
                    })
                  }
                  className={inputCx}
                  placeholder="Maria Santos · Wellness Coach"
                />
              </Field>
              <div className="flex justify-end border-t border-slate-200 pt-2">
                <button
                  type="button"
                  onClick={() => removeItem(v.id)}
                  className="flex items-center gap-1 rounded-md p-1.5 text-xs text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-600"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={addItem}
        leftIcon={<Plus className="h-3.5 w-3.5" />}
      >
        Add video
      </Button>
    </SectionCard>
  );
}

/* ── FAQ editor ────────────────────────────────────────────────── */

function FaqEditor({
  section,
  onChange,
}: {
  section: MarketingContent["faq"];
  onChange: (update: Partial<MarketingContent["faq"]>) => void;
}) {
  const updateItem = (id: string, patch: Partial<MarketingFaqItem>) => {
    onChange({
      items: section.items.map((f) =>
        f.id === id ? { ...f, ...patch } : f,
      ),
    });
  };
  const removeItem = (id: string) => {
    onChange({ items: section.items.filter((f) => f.id !== id) });
  };
  const addItem = () => {
    onChange({ items: [...section.items, blankFaqItem()] });
  };

  return (
    <SectionCard
      title="FAQ"
      description="Accordion of common buyer questions — kills objections."
      enabled={section.enabled}
      onToggleEnabled={(next) => onChange({ enabled: next })}
    >
      <Field label="Section title">
        <input
          value={section.title}
          onChange={(e) => onChange({ title: e.target.value })}
          className={inputCx}
        />
      </Field>

      {section.items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 py-4 text-center text-xs text-slate-500">
          No FAQ items yet — click &ldquo;Add question&rdquo; below.
        </div>
      ) : (
        <div className="space-y-2">
          {section.items.map((f) => (
            <div
              key={f.id}
              className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3"
            >
              <input
                value={f.question}
                onChange={(e) =>
                  updateItem(f.id, { question: e.target.value })
                }
                className={cn(inputCx, "font-medium")}
                placeholder="Question?"
              />
              <textarea
                value={f.answer}
                onChange={(e) =>
                  updateItem(f.id, { answer: e.target.value })
                }
                rows={3}
                className={cn(inputCx, "resize-none text-xs")}
                placeholder="Answer that addresses the objection directly."
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => removeItem(f.id)}
                  className="flex items-center gap-1 rounded-md p-1.5 text-xs text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-600"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={addItem}
        leftIcon={<Plus className="h-3.5 w-3.5" />}
      >
        Add question
      </Button>
    </SectionCard>
  );
}

/* ── Final CTA editor ──────────────────────────────────────────── */

function FinalCtaEditor({
  section,
  onChange,
}: {
  section: MarketingContent["finalCta"];
  onChange: (update: Partial<MarketingContent["finalCta"]>) => void;
}) {
  return (
    <SectionCard
      title="Final CTA"
      description="The big blue gradient block right before the footer."
    >
      <Field label="Title">
        <input
          value={section.title}
          onChange={(e) => onChange({ title: e.target.value })}
          className={inputCx}
        />
      </Field>
      <Field label="Subtitle">
        <textarea
          value={section.subtitle}
          onChange={(e) => onChange({ subtitle: e.target.value })}
          rows={2}
          className={cn(inputCx, "resize-none")}
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Primary CTA">
          <input
            value={section.primaryCta}
            onChange={(e) => onChange({ primaryCta: e.target.value })}
            className={inputCx}
          />
        </Field>
        <Field label="Secondary CTA">
          <input
            value={section.secondaryCta}
            onChange={(e) => onChange({ secondaryCta: e.target.value })}
            className={inputCx}
          />
        </Field>
      </div>
    </SectionCard>
  );
}

/* ---------------- Feature labels ---------------- */

/**
 * Configurable display names for in-app features. Right now only the
 * "Trainings" feature surfaces here — admin can rebrand to "Programs",
 * "Academy", "Coaching", etc. without a code deploy. Both singular and
 * plural so empty states + count strings read naturally.
 *
 * The label flows through:
 *   - Sidebar nav entry
 *   - /trainings page header + empty states
 *   - Public "Have a code?" CTA on profiles
 *   - The /training redeem page (Session 3)
 */
function FeatureLabelsEditor({
  labels,
  onChange,
}: {
  labels:
    | { trainingsPlural?: string; trainingsSingular?: string }
    | undefined;
  onChange: (next: { trainingsPlural?: string; trainingsSingular?: string }) => void;
}) {
  const plural = labels?.trainingsPlural ?? "";
  const singular = labels?.trainingsSingular ?? "";
  return (
    <SectionCard
      title="Feature labels"
      description="Rebrand in-app feature names without a code deploy. Leave blank to use the defaults."
      defaultOpen={false}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Trainings — plural">
          <input
            value={plural}
            onChange={(e) =>
              onChange({ ...labels, trainingsPlural: e.target.value })
            }
            placeholder="Default: Trainings"
            className={inputCx}
          />
        </Field>
        <Field label="Trainings — singular">
          <input
            value={singular}
            onChange={(e) =>
              onChange({ ...labels, trainingsSingular: e.target.value })
            }
            placeholder="Default: Training"
            className={inputCx}
          />
        </Field>
      </div>
      <p className="mt-1 text-[11px] text-slate-400">
        Examples: <code>Programs</code> / <code>Program</code>, <code>Academy</code> /
        <code> Module</code>, <code>Coaching</code> / <code>Session</code>. Refresh the
        app after saving to see the new label everywhere it&apos;s used.
      </p>
    </SectionCard>
  );
}

/* ---------------- Dashboard nav layout ---------------- */

/**
 * Lets the admin reorder the user-facing sidebar + hide items they
 * don't want surfaced. Affects every signed-in user globally — the
 * resolver in lib/constants.ts merges this with DASHBOARD_NAV at
 * render time.
 *
 * Constraints:
 *   - "Dashboard" and "Settings" stay locked-visible regardless of
 *     hidden state (enforced both here and in the resolver) so users
 *     can never be stranded
 *   - Brand-new code-level nav items the admin hasn't seen yet
 *     auto-appear at the bottom on next page load
 */
function DashboardNavEditor({
  layout,
  onChange,
}: {
  layout: { order?: string[]; hidden?: string[] } | undefined;
  onChange: (next: { order: string[]; hidden: string[] }) => void;
}) {
  /* Build the working list: start from saved order, append any
     code-level items the admin hasn't seen yet. */
  const allKeys = DASHBOARD_NAV.map((n) => n.key);
  const savedOrder = layout?.order ?? [];
  const merged: string[] = [];
  for (const k of savedOrder) {
    if (allKeys.includes(k) && !merged.includes(k)) merged.push(k);
  }
  for (const k of allKeys) {
    if (!merged.includes(k)) merged.push(k);
  }
  const hidden = new Set(layout?.hidden ?? []);
  const lookup = new Map(DASHBOARD_NAV.map((n) => [n.key, n]));

  const commit = (nextOrder: string[], nextHidden: Set<string>) => {
    onChange({
      order: nextOrder,
      hidden: Array.from(nextHidden),
    });
  };

  const move = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= merged.length) return;
    const next = [...merged];
    [next[idx], next[target]] = [next[target], next[idx]];
    commit(next, hidden);
  };

  const toggleHidden = (key: string) => {
    const next = new Set(hidden);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    commit(merged, next);
  };

  const reset = () => commit([], new Set());

  const lockedKeys = new Set(["home", "settings"]);

  return (
    <SectionCard
      title="Dashboard navigation"
      description="Reorder the sidebar or hide items you don't want users to see. Affects every signed-in user."
      defaultOpen={false}
    >
      <div className="space-y-1.5">
        {merged.map((key, idx) => {
          const item = lookup.get(key);
          if (!item) return null;
          const isLocked = lockedKeys.has(key);
          const isHidden = hidden.has(key);
          return (
            <div
              key={key}
              className={cn(
                "flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5",
                isHidden && "opacity-50",
              )}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-[10px] font-semibold text-slate-500">
                {idx + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">
                  {item.label}
                </p>
                <p className="truncate text-[10px] text-slate-400">
                  {item.href}
                  {isLocked && (
                    <span className="ml-1.5 rounded bg-electric-500/15 px-1 py-0.5 text-electric-700">
                      Always visible
                    </span>
                  )}
                </p>
              </div>
              {/* Show/hide toggle */}
              <button
                type="button"
                onClick={() => toggleHidden(key)}
                disabled={isLocked}
                className={cn(
                  "rounded-md border px-2 py-1 text-[10px] font-medium transition-colors disabled:opacity-30",
                  isHidden
                    ? "border-slate-200 text-slate-500 hover:bg-slate-100"
                    : "border-jade-500/30 bg-jade-500/[0.08] text-jade-600 hover:bg-jade-500/15",
                )}
                aria-label={isHidden ? "Show in sidebar" : "Hide from sidebar"}
              >
                {isLocked ? "Visible" : isHidden ? "Hidden" : "Visible"}
              </button>
              {/* Reorder */}
              <button
                type="button"
                onClick={() => move(idx, -1)}
                disabled={idx === 0}
                aria-label="Move up"
                className="rounded p-1 text-slate-400 hover:text-slate-900 disabled:opacity-25"
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => move(idx, 1)}
                disabled={idx === merged.length - 1}
                aria-label="Move down"
                className="rounded p-1 text-slate-400 hover:text-slate-900 disabled:opacity-25"
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
      <button
        type="button"
        onClick={reset}
        className="mt-3 rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-medium text-slate-600 hover:bg-slate-100"
      >
        Reset to default order
      </button>
      <p className="mt-2 text-[11px] text-slate-400">
        Dashboard and Settings stay visible no matter what — locking them
        keeps users from getting stranded. Brand-new nav items that ship
        with future updates appear at the bottom automatically.
      </p>
    </SectionCard>
  );
}

/* ---------------- Trust photo (homepage trust section) ---------------- */

/**
 * Photo + alt-text for the "Built in Manila" trust section on the
 * homepage. The image fills 65% of that section; the floating glass-
 * morphism card with copy + CTA overlays its right edge. Use a real
 * photo of yourself, a customer, or a team gathering — anything that
 * grounds the page in a human moment rather than illustrations.
 */
function TrustPhotoEditor({
  photoUrl,
  photoAlt,
  onChange,
}: {
  photoUrl: string | undefined;
  photoAlt: string | undefined;
  onChange: (next: { trustPhotoUrl?: string; trustPhotoAlt?: string }) => void;
}) {
  return (
    <SectionCard
      title="Trust section photo"
      description="The big human photo on the 'Built in Manila' section of the homepage. Falls back to a curated default if unset."
      defaultOpen={false}
    >
      <div className="space-y-3">
        <Field label="Photo URL">
          <input
            value={photoUrl ?? ""}
            onChange={(e) =>
              onChange({ trustPhotoUrl: e.target.value, trustPhotoAlt: photoAlt })
            }
            placeholder="https://… (Firebase Storage, Unsplash, etc.)"
            className={inputCx}
          />
        </Field>
        <Field label="Alt text">
          <input
            value={photoAlt ?? ""}
            onChange={(e) =>
              onChange({ trustPhotoUrl: photoUrl, trustPhotoAlt: e.target.value })
            }
            placeholder="Describe the photo for accessibility + SEO"
            className={inputCx}
          />
        </Field>
        {photoUrl?.trim() && (
          <div className="mt-2">
            <p className="mb-1 text-[11px] uppercase tracking-wider text-slate-400">
              Preview
            </p>
            <img
              src={photoUrl}
              alt={photoAlt ?? ""}
              className="aspect-[4/3] w-full max-w-md rounded-xl border border-slate-200 object-cover"
              loading="lazy"
            />
          </div>
        )}
      </div>
    </SectionCard>
  );
}

/* ── Homepage: branding (logo + favicon) ──────────────────────── */

type HomepageBranding = NonNullable<MarketingContent["homepage"]>["branding"];
type HomepageSeo = NonNullable<MarketingContent["homepage"]>["seo"];

function HomepageBrandingEditor({
  branding,
  onChange,
}: {
  branding: HomepageBranding;
  onChange: (next: HomepageBranding) => void;
}) {
  const value = branding ?? {};
  return (
    <SectionCard
      title="Homepage · Branding"
      description="Logo + favicon shown across the public site."
      defaultOpen={false}
    >
      <Field label="Logo URL" hint="Used in the marketing header + footer.">
        <input
          className={inputCx}
          value={value.logoUrl ?? ""}
          placeholder="https://…"
          onChange={(e) => onChange({ ...value, logoUrl: e.target.value })}
        />
      </Field>
      <Field label="Favicon URL" hint="32×32 PNG or ICO recommended.">
        <input
          className={inputCx}
          value={value.faviconUrl ?? ""}
          placeholder="https://…/favicon.png"
          onChange={(e) => onChange({ ...value, faviconUrl: e.target.value })}
        />
      </Field>
    </SectionCard>
  );
}

/* ── Homepage: SEO ─────────────────────────────────────────────── */

function HomepageSeoEditor({
  seo,
  onChange,
}: {
  seo: HomepageSeo;
  onChange: (next: HomepageSeo) => void;
}) {
  const value = seo ?? {};
  return (
    <SectionCard
      title="Homepage · SEO"
      description="Page title + meta description + Open Graph image."
      defaultOpen={false}
    >
      <Field label="Page title" hint="Shown in the browser tab + search results.">
        <input
          className={inputCx}
          value={value.title ?? ""}
          placeholder="Credibly — Look credible. Convert prospects."
          onChange={(e) => onChange({ ...value, title: e.target.value })}
        />
      </Field>
      <Field
        label="Meta description"
        hint="One-line snippet shown under the title in Google."
      >
        <textarea
          className={`${inputCx} min-h-[80px]`}
          value={value.description ?? ""}
          placeholder="The complete platform for PH recruiters, coaches & online sellers…"
          onChange={(e) => onChange({ ...value, description: e.target.value })}
        />
      </Field>
      <Field
        label="Open Graph image URL"
        hint="1200×630 image shown when the link is shared on FB / Messenger / X."
      >
        <input
          className={inputCx}
          value={value.ogImageUrl ?? ""}
          placeholder="https://…/og.png"
          onChange={(e) => onChange({ ...value, ogImageUrl: e.target.value })}
        />
      </Field>
    </SectionCard>
  );
}

/* ── Homepage: deep-dive sections ──────────────────────────────── */

const BLOB_OPTIONS: HomepageDeepDiveBlob[] = [
  "lavender",
  "mint",
  "cream",
  "butter",
];

function HomepageDeepDivesEditor({
  deepDives,
  onChange,
}: {
  deepDives: HomepageDeepDive[];
  onChange: (next: HomepageDeepDive[]) => void;
}) {
  const update = (id: string, patch: Partial<HomepageDeepDive>) => {
    onChange(
      deepDives.map((d) => (d.id === id ? ({ ...d, ...patch } as HomepageDeepDive) : d)),
    );
  };
  const updateBullet = (id: string, index: number, text: string) => {
    onChange(
      deepDives.map((d) => {
        if (d.id !== id) return d;
        const bullets = [...d.bullets];
        bullets[index] = text;
        return { ...d, bullets };
      }),
    );
  };
  const resetToDefault = (id: string) => {
    const def = DEFAULT_HOMEPAGE_DEEP_DIVES.find((d) => d.id === id);
    if (!def) return;
    onChange(deepDives.map((d) => (d.id === id ? def : d)));
  };
  const move = (id: string, dir: -1 | 1) => {
    const i = deepDives.findIndex((d) => d.id === id);
    if (i < 0) return;
    const j = i + dir;
    if (j < 0 || j >= deepDives.length) return;
    const next = [...deepDives];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const resetOrder = () => {
    const byId = new Map(deepDives.map((d) => [d.id, d] as const));
    onChange(DEFAULT_HOMEPAGE_DEEP_DIVES.map((d) => byId.get(d.id) ?? d));
  };
  return (
    <SectionCard
      title="Homepage · Deep-Dive Sections"
      description="The 4 feature spotlights between Features and Pricing. Paste a Credibly funnel/training URL to render it live inside the phone frame. Use ↑/↓ to reorder."
      defaultOpen={false}
    >
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[11px] text-slate-500">
          Render order on the homepage (top → bottom = section 1 → 4).
        </p>
        <button
          type="button"
          onClick={resetOrder}
          className="rounded-md px-2 py-1 text-[10px] font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900"
        >
          Reset order
        </button>
      </div>
      <div className="space-y-4">
        {deepDives.map((d, i) => (
          <div
            key={d.id}
            className="rounded-xl border border-slate-200 bg-slate-50 p-3"
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="min-w-0 flex-1 truncate text-xs font-semibold uppercase tracking-wider text-slate-500">
                <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded bg-slate-100 text-[10px] text-slate-600">
                  {i + 1}
                </span>
                {d.eyebrow || d.id}
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => move(d.id, -1)}
                  disabled={i === 0}
                  aria-label="Move up"
                  className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => move(d.id, 1)}
                  disabled={i === deepDives.length - 1}
                  aria-label="Move down"
                  className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => resetToDefault(d.id)}
                  className="ml-1 rounded-md px-2 py-1 text-[10px] font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                >
                  Reset
                </button>
              </div>
            </div>
            <div className="space-y-3">
              <Field label="Eyebrow">
                <input
                  className={inputCx}
                  value={d.eyebrow}
                  onChange={(e) => update(d.id, { eyebrow: e.target.value })}
                />
              </Field>
              <Field label="Headline">
                <input
                  className={inputCx}
                  value={d.title}
                  onChange={(e) => update(d.id, { title: e.target.value })}
                />
              </Field>
              <Field label="Body">
                <textarea
                  className={`${inputCx} min-h-[90px]`}
                  value={d.body}
                  onChange={(e) => update(d.id, { body: e.target.value })}
                />
              </Field>
              <Field label="Benefits (4 bullets)">
                <div className="space-y-2">
                  {[0, 1, 2, 3].map((idx) => (
                    <input
                      key={idx}
                      className={inputCx}
                      value={d.bullets[idx] ?? ""}
                      placeholder={`Benefit ${idx + 1}`}
                      onChange={(e) =>
                        updateBullet(d.id, idx, e.target.value)
                      }
                    />
                  ))}
                </div>
              </Field>
              <Field
                label="Embed URL (Credibly funnel / training)"
                hint={
                  d.id === "followUp"
                    ? "Use /showcase/pipelines/{username} for a public, anonymised view of your real pipeline — /pipelines requires login + Pro plan."
                    : "Renders inside the phone frame. Leave blank to show a placeholder."
                }
              >
                <input
                  className={inputCx}
                  value={d.embedUrl ?? ""}
                  placeholder={
                    d.id === "followUp"
                      ? "https://crediblyai.com/showcase/pipelines/dan"
                      : "https://crediblyai.com/dan/launch-funnel"
                  }
                  onChange={(e) => update(d.id, { embedUrl: e.target.value })}
                />
              </Field>
              <Field label="Pastel blob colour">
                <div className="flex flex-wrap gap-2">
                  {BLOB_OPTIONS.map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => update(d.id, { blob: b })}
                      className={cn(
                        "rounded-md border px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                        d.blob === b
                          ? "border-electric-500/40 bg-electric-500/15 text-electric-700"
                          : "border-slate-200 bg-slate-50 text-slate-500 hover:text-slate-900",
                      )}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </Field>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
