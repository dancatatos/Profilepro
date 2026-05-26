"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Check,
  Lock,
  Sparkles,
  Search,
  Crown,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  THEME_CONFIGS,
  THEME_CATEGORIES,
  recommendTheme,
  type ThemeConfig,
  type ThemeEffect,
} from "@/lib/themes";
import { ThemeMiniPreview } from "@/components/profile/ThemeMiniPreview";
import { useProfileStore } from "@/store/profileStore";
import { usePlanAccess } from "@/components/providers/PlanProvider";
import { cn } from "@/lib/utils";
import type { ThemeId } from "@/types";

/* ── Effect labels ── */

const EFFECT_LABELS: Record<ThemeEffect, string> = {
  "animated-gradient": "Animated",
  glassmorphism: "Glass",
  glow: "Glow",
  neon: "Neon",
  shimmer: "Shimmer",
  aurora: "Aurora",
  particles: "Particles",
  grain: "Grain",
};

/* ── AI Recommend ── */

const NICHES = [
  "Network Marketing / MLM",
  "Coaching / Mentoring",
  "Health & Wellness",
  "Fashion & Beauty",
  "Real Estate",
  "Finance / Investing",
  "Tech / SaaS",
  "Music / Entertainment",
  "Food & Restaurant",
  "Travel & Lifestyle",
  "Gaming / Streaming",
  "Affiliate Marketing",
  "Freelance / VA",
  "General Business",
];

const STYLES = [
  "Professional & Trustworthy",
  "Luxury & Premium",
  "Bold & Energetic",
  "Minimal & Clean",
  "Creative & Colorful",
  "Futuristic & Tech",
  "Warm & Friendly",
];

function AIRecommendPanel({
  onPick,
  onClose,
}: {
  onPick: (id: ThemeId) => void;
  onClose: () => void;
}) {
  const [niche, setNiche] = useState("");
  const [style, setStyle] = useState("");
  const [gender, setGender] = useState<"any" | "feminine" | "masculine">("any");
  const [results, setResults] = useState<ThemeId[] | null>(null);

  const run = () => setResults(recommendTheme({ niche, style, gender }));

  return (
    <div className="rounded-2xl border border-electric-500/20 bg-gradient-to-b from-electric-500/[0.07] to-ink-900/40 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-electric-400" />
          <span className="text-sm font-semibold text-white">
            AI Theme Match
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-xs text-white/40 transition-colors hover:text-white"
        >
          Close
        </button>
      </div>
      <p className="mb-3 text-xs text-white/45">
        Tell us about your brand and we&apos;ll pick themes that fit.
      </p>

      <div className="space-y-3">
        <div>
          <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-white/40">
            Your Niche
          </label>
          <select
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
            className="h-9 w-full rounded-lg border border-white/10 bg-white/[0.05] px-3 text-xs text-white outline-none focus:border-electric-500/50"
          >
            <option value="">Select a niche…</option>
            {NICHES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-white/40">
            Branding Style
          </label>
          <select
            value={style}
            onChange={(e) => setStyle(e.target.value)}
            className="h-9 w-full rounded-lg border border-white/10 bg-white/[0.05] px-3 text-xs text-white outline-none focus:border-electric-500/50"
          >
            <option value="">Select a style…</option>
            {STYLES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-white/40">
            Audience Vibe
          </label>
          <div className="flex gap-2">
            {(["any", "feminine", "masculine"] as const).map((g) => (
              <button
                key={g}
                onClick={() => setGender(g)}
                className={cn(
                  "flex-1 rounded-lg border py-1.5 text-xs font-medium capitalize transition-colors",
                  gender === g
                    ? "border-electric-500/50 bg-electric-500/15 text-electric-300"
                    : "border-white/10 bg-white/[0.04] text-white/50 hover:bg-white/[0.08]",
                )}
              >
                {g === "any" ? "Any / Neutral" : g}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={run}
          disabled={!niche && !style}
          className="h-9 w-full rounded-xl bg-brand-gradient text-sm font-semibold text-white transition-opacity disabled:opacity-40"
        >
          Find My Theme
        </button>
      </div>

      {results && (
        <div className="mt-4">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-white/40">
            Recommended for you
          </p>
          <div className="grid grid-cols-3 gap-2">
            {results.map((id) => {
              const tc = THEME_CONFIGS.find((t) => t.id === id);
              if (!tc) return null;
              return (
                <button
                  key={id}
                  onClick={() => {
                    onPick(id);
                    onClose();
                  }}
                  className="group overflow-hidden rounded-xl border border-white/10 text-left transition-all hover:border-electric-500/50"
                >
                  <div className="relative aspect-[3/4] w-full overflow-hidden">
                    <ThemeMiniPreview theme={tc} />
                    {tc.tier === "premium" && (
                      <span className="absolute right-1 top-1 rounded bg-gradient-to-r from-gold-300 to-gold-500 px-1 py-0.5 text-[7px] font-bold uppercase text-ink-950">
                        Pro
                      </span>
                    )}
                  </div>
                  <p className="truncate px-1.5 py-1 text-[10px] font-medium text-white/80">
                    {tc.name}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Theme gallery card ── */

function ThemeGalleryCard({
  theme,
  active,
  locked,
  onSelect,
}: {
  theme: ThemeConfig;
  active: boolean;
  locked: boolean;
  onSelect: () => void;
}) {
  const premium = theme.tier === "premium";

  return (
    <button
      onClick={onSelect}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border p-1.5 text-left transition-all duration-200",
        active
          ? "border-electric-500 ring-2 ring-electric-500/40"
          : premium
            ? "border-gold-400/25 bg-gold-400/[0.03] hover:-translate-y-0.5 hover:border-gold-400/55 hover:shadow-glow-gold"
            : "border-white/10 hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/[0.03]",
      )}
    >
      {/* Preview */}
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl">
        <ThemeMiniPreview theme={theme} />

        {/* legibility scrim */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/15" />

        {/* Premium badge */}
        {premium && (
          <div className="absolute right-1.5 top-1.5 flex items-center gap-0.5 rounded-full bg-gradient-to-r from-gold-200 to-gold-500 px-1.5 py-[3px] shadow-sm">
            <Crown className="h-2.5 w-2.5 text-ink-950" />
            <span className="text-[8px] font-bold uppercase tracking-wide text-ink-950">
              Premium
            </span>
          </div>
        )}

        {/* Active check */}
        {active && (
          <span className="absolute left-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-electric-500 ring-2 ring-white/25">
            <Check className="h-3 w-3 text-white" />
          </span>
        )}

        {/* Lock overlay */}
        {locked && (
          <div className="absolute inset-0 flex items-center justify-center bg-ink-950/45 backdrop-blur-[1px]">
            <div className="flex items-center gap-1 rounded-full bg-ink-950/85 px-2 py-1 ring-1 ring-gold-400/30">
              <Lock className="h-3 w-3 text-gold-300" />
              <span className="text-[9px] font-bold tracking-wide text-gold-200">
                PRO
              </span>
            </div>
          </div>
        )}

        {/* Effect chips */}
        {theme.effects.length > 0 && (
          <div className="absolute bottom-1.5 left-1.5 flex flex-wrap gap-1">
            {theme.effects.slice(0, 2).map((fx) => (
              <span
                key={fx}
                className="rounded-md bg-black/55 px-1.5 py-0.5 text-[8px] font-medium text-white/85 backdrop-blur-sm"
              >
                {EFFECT_LABELS[fx]}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-1.5 pb-1 pt-2">
        <p
          className={cn(
            "truncate text-xs font-semibold",
            active ? "text-electric-300" : "text-white",
          )}
        >
          {theme.name}
        </p>
        <p className="truncate text-[10px] text-white/35">
          {theme.description}
        </p>
      </div>
    </button>
  );
}

/* ── Main ThemePicker ── */

export function ThemePicker() {
  const profile = useProfileStore((s) => s.profile);
  const setTheme = useProfileStore((s) => s.setTheme);

  // All hooks before any early return
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [showAI, setShowAI] = useState(false);
  const [showAllFree, setShowAllFree] = useState(false);
  const [showAllPremium, setShowAllPremium] = useState(false);

  const { hasFeature } = usePlanAccess();
  /* "isPro" name preserved — semantically the gate is now
     "user has access to premium themes" via feature toggle. */
  const isPro = hasFeature("premium_themes");
  const isLocked = (tc: ThemeConfig) => tc.tier === "premium" && !isPro;

  const handleSelect = (tc: ThemeConfig) => {
    if (isLocked(tc)) return;
    setTheme(tc.id);
  };

  const filtered = useMemo(() => {
    let list = THEME_CONFIGS;
    if (category !== "All") {
      list = list.filter((t) => t.categories.includes(category));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.categories.some((c) => c.toLowerCase().includes(q)),
      );
    }
    return list;
  }, [category, search]);

  const freeThemes = filtered.filter((t) => t.tier === "free");
  const premiumThemes = filtered.filter((t) => t.tier === "premium");

  const FREE_LIMIT = 6;
  const PREMIUM_LIMIT = 6;

  // Guard after all hooks
  if (!profile) return null;

  const current = THEME_CONFIGS.find((t) => t.id === profile.themeId);

  return (
    <div className="space-y-4">
      {/* ── Currently applied ── */}
      {current && (
        <div className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-2.5">
          <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-lg">
            <ThemeMiniPreview theme={current} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-medium uppercase tracking-wider text-white/35">
                Applied
              </span>
              {current.tier === "premium" && (
                <span className="flex items-center gap-0.5 rounded bg-gold-400/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-gold-300">
                  <Crown className="h-2.5 w-2.5" /> Premium
                </span>
              )}
            </div>
            <p className="truncate text-sm font-semibold text-white">
              {current.name}
            </p>
            <p className="truncate text-[11px] text-white/40">
              {current.description}
            </p>
          </div>
        </div>
      )}

      {/* ── AI Recommend ── */}
      <button
        onClick={() => setShowAI((v) => !v)}
        className="flex w-full items-center gap-2 rounded-xl border border-electric-500/20 bg-electric-500/[0.06] px-3 py-2.5 text-left transition-colors hover:bg-electric-500/10"
      >
        <Sparkles className="h-4 w-4 shrink-0 text-electric-400" />
        <div className="flex-1">
          <p className="text-xs font-semibold text-electric-300">
            AI Theme Match
          </p>
          <p className="text-[11px] text-white/40">
            Get themes picked for your brand
          </p>
        </div>
        {showAI ? (
          <ChevronUp className="h-4 w-4 text-white/30" />
        ) : (
          <ChevronDown className="h-4 w-4 text-white/30" />
        )}
      </button>

      {showAI && (
        <AIRecommendPanel
          onPick={(id) => setTheme(id)}
          onClose={() => setShowAI(false)}
        />
      )}

      {/* ── Search ── */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search themes…"
          className="h-9 w-full rounded-xl border border-white/10 bg-white/[0.04] pl-8 pr-3 text-xs text-white outline-none placeholder:text-white/30 focus:border-electric-500/50"
        />
      </div>

      {/* ── Category tabs ── */}
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 no-scrollbar">
        {THEME_CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1 text-[11px] font-medium transition-colors",
              category === cat
                ? "bg-electric-500/20 text-electric-300 ring-1 ring-electric-500/40"
                : "bg-white/[0.05] text-white/45 hover:bg-white/[0.09] hover:text-white/70",
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {search && (
        <p className="text-[11px] text-white/35">
          {filtered.length} theme{filtered.length !== 1 ? "s" : ""} found
        </p>
      )}

      {/* ── Essentials (free) ── */}
      {freeThemes.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-baseline gap-2">
            <h3 className="text-sm font-semibold text-white">Essentials</h3>
            <span className="text-[11px] text-white/35">
              {freeThemes.length} free
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {(showAllFree ? freeThemes : freeThemes.slice(0, FREE_LIMIT)).map(
              (tc) => (
                <ThemeGalleryCard
                  key={tc.id}
                  theme={tc}
                  active={profile.themeId === tc.id}
                  locked={false}
                  onSelect={() => handleSelect(tc)}
                />
              ),
            )}
          </div>
          {freeThemes.length > FREE_LIMIT && (
            <button
              onClick={() => setShowAllFree((v) => !v)}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/[0.06] bg-white/[0.02] py-2 text-[11px] font-medium text-white/45 transition-colors hover:bg-white/[0.05] hover:text-white/70"
            >
              {showAllFree ? (
                <>
                  <ChevronUp className="h-3.5 w-3.5" /> Show less
                </>
              ) : (
                <>
                  <ChevronDown className="h-3.5 w-3.5" /> Show all{" "}
                  {freeThemes.length} essentials
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* ── Premium Collection ── */}
      {premiumThemes.length > 0 && (
        <div className="rounded-2xl border border-gold-400/15 bg-gradient-to-b from-gold-400/[0.06] via-gold-400/[0.015] to-transparent p-3">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-baseline gap-2">
              <div className="flex items-center gap-1.5">
                <Crown className="h-4 w-4 text-gold-400" />
                <h3 className="text-sm font-bold text-gold-200">
                  Premium Collection
                </h3>
              </div>
              <span className="text-[11px] text-gold-300/50">
                {premiumThemes.length}
              </span>
            </div>
            {!isPro && (
              <span className="rounded-full bg-gold-400/12 px-2 py-0.5 text-[10px] font-semibold text-gold-300">
                PRO
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {(showAllPremium
              ? premiumThemes
              : premiumThemes.slice(0, PREMIUM_LIMIT)
            ).map((tc) => (
              <ThemeGalleryCard
                key={tc.id}
                theme={tc}
                active={profile.themeId === tc.id}
                locked={isLocked(tc)}
                onSelect={() => handleSelect(tc)}
              />
            ))}
          </div>

          {premiumThemes.length > PREMIUM_LIMIT && (
            <button
              onClick={() => setShowAllPremium((v) => !v)}
              className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl border border-gold-400/15 bg-gold-400/[0.04] py-2 text-[11px] font-medium text-gold-300/70 transition-colors hover:bg-gold-400/[0.09] hover:text-gold-300"
            >
              {showAllPremium ? (
                <>
                  <ChevronUp className="h-3.5 w-3.5" /> Show less
                </>
              ) : (
                <>
                  <ChevronDown className="h-3.5 w-3.5" /> Show all{" "}
                  {premiumThemes.length} premium themes
                </>
              )}
            </button>
          )}

          {!isPro && (
            <Link
              href="/billing"
              className="mt-3 flex items-center gap-3 rounded-xl border border-gold-400/25 bg-gradient-to-r from-gold-400/[0.12] to-gold-400/[0.04] px-4 py-3 transition-colors hover:from-gold-400/20"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-gold-300 to-gold-500">
                <Crown className="h-4 w-4 text-ink-950" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-gold-200">
                  Unlock the Premium Collection
                </p>
                <p className="text-[11px] text-white/45">
                  Animated, glass, neon &amp; luxury themes
                </p>
              </div>
              <span className="shrink-0 rounded-lg bg-gradient-to-r from-gold-300 to-gold-500 px-3 py-1.5 text-xs font-bold text-ink-950">
                Upgrade
              </span>
            </Link>
          )}
        </div>
      )}

      {filtered.length === 0 && (
        <p className="py-8 text-center text-sm text-white/30">
          No themes match &ldquo;{search}&rdquo;
        </p>
      )}
    </div>
  );
}
