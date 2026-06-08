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
  DEFAULT_MARKETING_CONTENT,
  mergeMarketingContent,
} from "@/lib/marketing";
import { toast } from "@/store/uiStore";
import { cn } from "@/lib/utils";
import type {
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
      [section]: { ...prev[section], ...update },
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
          <h1 className="font-display text-xl font-bold text-white sm:text-2xl">
            Marketing Content
          </h1>
          <p className="text-xs text-white/45 sm:text-sm">
            Edit what appears on crediblyai.com — hero copy, social proof,
            testimonials, FAQ, and final CTA.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/"
            target="_blank"
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-white/70 transition-colors hover:bg-white/[0.05]"
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
        <div className="rounded-xl border border-electric-500/20 bg-electric-500/[0.06] px-4 py-2.5 text-xs text-electric-200">
          You have unsaved changes. Click <strong>Save changes</strong> to
          publish them to the live homepage.
        </div>
      )}

      <FeatureLabelsEditor
        labels={content.featureLabels}
        onChange={(next) => {
          setContent((prev) => ({ ...prev, featureLabels: next }));
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
      <div className="flex items-center gap-3 border-b border-white/[0.06] bg-white/[0.02] px-4 py-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="min-w-0 flex-1 text-left"
        >
          <p className="truncate text-sm font-semibold text-white">{title}</p>
          {description && (
            <p className="mt-0.5 truncate text-[11px] text-white/40">
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
                ? "bg-jade-500/15 text-jade-300"
                : "bg-white/[0.05] text-white/45",
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
          className="rounded-md p-1 text-white/40 hover:bg-white/[0.05] hover:text-white"
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
      <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-white/45">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-[10px] text-white/35">{hint}</p>}
    </div>
  );
}

const inputCx =
  "w-full rounded-lg border border-white/10 bg-white/[0.03] p-2.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-electric-500/40";

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
        <div className="rounded-lg border border-dashed border-white/10 py-4 text-center text-xs text-white/45">
          No stats yet — click &ldquo;Add stat&rdquo; below.
        </div>
      ) : (
        <div className="space-y-2">
          {section.stats.map((s) => (
            <div
              key={s.id}
              className="grid gap-2 rounded-lg border border-white/[0.07] bg-white/[0.02] p-2.5 sm:grid-cols-[140px_1fr_auto] sm:items-center"
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
                className="rounded-md p-1.5 text-white/30 transition-colors hover:bg-red-500/10 hover:text-red-400"
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
        <div className="rounded-lg border border-dashed border-white/10 py-4 text-center text-xs text-white/45">
          No testimonials yet — click &ldquo;Add testimonial&rdquo; below.
        </div>
      ) : (
        <div className="space-y-3">
          {section.items.map((t) => (
            <div
              key={t.id}
              className="space-y-2 rounded-lg border border-white/[0.07] bg-white/[0.02] p-3"
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
              <div className="flex items-center justify-between border-t border-white/[0.06] pt-2">
                <div className="flex gap-0.5 text-gold-300">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={cn(
                        "h-3.5 w-3.5",
                        i < (t.rating ?? 0)
                          ? "fill-gold-300"
                          : "fill-transparent text-white/15",
                      )}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(t.id)}
                  className="flex items-center gap-1 rounded-md p-1.5 text-xs text-white/40 transition-colors hover:bg-red-500/10 hover:text-red-400"
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
        <div className="rounded-lg border border-dashed border-white/10 py-4 text-center text-xs text-white/45">
          No videos yet — click &ldquo;Add video&rdquo; below.
        </div>
      ) : (
        <div className="space-y-3">
          {section.items.map((v) => (
            <div
              key={v.id}
              className="space-y-2 rounded-lg border border-white/[0.07] bg-white/[0.02] p-3"
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
              <div className="flex justify-end border-t border-white/[0.06] pt-2">
                <button
                  type="button"
                  onClick={() => removeItem(v.id)}
                  className="flex items-center gap-1 rounded-md p-1.5 text-xs text-white/40 transition-colors hover:bg-red-500/10 hover:text-red-400"
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
        <div className="rounded-lg border border-dashed border-white/10 py-4 text-center text-xs text-white/45">
          No FAQ items yet — click &ldquo;Add question&rdquo; below.
        </div>
      ) : (
        <div className="space-y-2">
          {section.items.map((f) => (
            <div
              key={f.id}
              className="space-y-2 rounded-lg border border-white/[0.07] bg-white/[0.02] p-3"
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
                  className="flex items-center gap-1 rounded-md p-1.5 text-xs text-white/40 transition-colors hover:bg-red-500/10 hover:text-red-400"
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
      <p className="mt-1 text-[11px] text-white/40">
        Examples: <code>Programs</code> / <code>Program</code>, <code>Academy</code> /
        <code> Module</code>, <code>Coaching</code> / <code>Session</code>. Refresh the
        app after saving to see the new label everywhere it&apos;s used.
      </p>
    </SectionCard>
  );
}
