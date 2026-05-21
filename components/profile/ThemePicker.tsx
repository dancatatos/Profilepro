"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Check, Lock, Sparkles, Search, Star, ChevronDown, ChevronUp } from "lucide-react";
import {
  THEME_CONFIGS,
  THEME_CATEGORIES,
  recommendTheme,
  type ThemeConfig,
} from "@/lib/themes";
import { useProfileStore } from "@/store/profileStore";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import type { ThemeId } from "@/types";

/* ── AI Recommend modal ── */

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

  const run = () => {
    const ids = recommendTheme({ niche, style, gender });
    setResults(ids);
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-ink-900 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-electric-400" />
          <span className="text-sm font-semibold text-white">AI Theme Recommendation</span>
        </div>
        <button onClick={onClose} className="text-white/40 hover:text-white text-xs">
          ✕ Close
        </button>
      </div>
      <p className="text-xs text-white/45">Tell us about your brand and we&apos;ll suggest the perfect theme.</p>

      <div className="space-y-3">
        {/* Niche */}
        <div>
          <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-white/40">
            Your Niche
          </label>
          <select
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
            className="h-9 w-full rounded-lg border border-white/10 bg-white/[0.05] px-3 text-xs text-white outline-none"
          >
            <option value="">Select a niche…</option>
            {NICHES.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>

        {/* Style */}
        <div>
          <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-white/40">
            Branding Style
          </label>
          <select
            value={style}
            onChange={(e) => setStyle(e.target.value)}
            className="h-9 w-full rounded-lg border border-white/10 bg-white/[0.05] px-3 text-xs text-white outline-none"
          >
            <option value="">Select a style…</option>
            {STYLES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Gender vibe */}
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
          className="h-9 w-full rounded-xl bg-electric-500 text-sm font-semibold text-white disabled:opacity-40 transition-opacity"
        >
          Find My Theme
        </button>
      </div>

      {/* Results */}
      {results && (
        <div>
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-white/40">
            Recommended for you
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {results.map((id) => {
              const tc = THEME_CONFIGS.find((t) => t.id === id);
              if (!tc) return null;
              return (
                <button
                  key={id}
                  onClick={() => { onPick(id); onClose(); }}
                  className="group overflow-hidden rounded-xl border border-white/10 text-left hover:border-electric-500/50 transition-colors"
                >
                  <div
                    className="h-10 w-full"
                    style={{ background: tc.previewGradient }}
                  />
                  <div className="px-2 py-1.5">
                    <p className="truncate text-[11px] font-semibold text-white">
                      {tc.name}
                    </p>
                    {tc.tier === "premium" && (
                      <span className="text-[9px] font-medium text-gold-300">PRO</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Theme card ── */

function ThemeCard({
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
  return (
    <button
      onClick={onSelect}
      className={cn(
        "group relative overflow-hidden rounded-xl border text-left transition-all",
        active
          ? "border-electric-500 ring-2 ring-electric-500/30"
          : locked
          ? "border-white/[0.06] opacity-70 hover:opacity-90"
          : "border-white/10 hover:border-white/25",
      )}
    >
      {/* Preview swatch */}
      <div
        className="relative h-16 w-full overflow-hidden"
        style={{ background: theme.previewGradient }}
      >
        {/* Simulated profile mini-UI */}
        <div className="flex flex-col items-center pt-2.5">
          <div
            className="mb-1 h-4 w-4 rounded-full"
            style={{ background: "rgba(255,255,255,0.25)" }}
          />
          <div
            className="mb-0.5 h-1 w-10 rounded-full"
            style={{ background: "rgba(255,255,255,0.30)" }}
          />
          <div
            className="h-0.5 w-14 rounded-full"
            style={{ background: "rgba(255,255,255,0.18)" }}
          />
        </div>

        {/* Premium badge */}
        {theme.tier === "premium" && (
          <div className="absolute left-1.5 top-1.5 flex items-center gap-0.5 rounded-md bg-black/50 px-1.5 py-0.5">
            <Star className="h-2.5 w-2.5 fill-gold-400 text-gold-400" />
            <span className="text-[9px] font-bold text-gold-300">PRO</span>
          </div>
        )}

        {/* Active check */}
        {active && (
          <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-electric-500">
            <Check className="h-3 w-3 text-white" />
          </span>
        )}

        {/* Lock overlay */}
        {locked && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-[2px]">
            <Lock className="h-5 w-5 text-white/70" />
          </div>
        )}

        {/* Effect indicators */}
        {theme.effects.length > 0 && !locked && (
          <div className="absolute bottom-1 right-1.5 flex gap-0.5">
            {theme.effects.slice(0, 3).map((fx) => (
              <span
                key={fx}
                className="h-1 w-1 rounded-full bg-white/50"
              />
            ))}
          </div>
        )}
      </div>

      {/* Name */}
      <div
        className="px-2 py-1.5"
        style={{ background: "rgba(0,0,0,0.35)" }}
      >
        <p className="truncate text-[11px] font-medium text-white/80">
          {theme.name}
        </p>
        {locked && (
          <p className="text-[9px] text-gold-300/70">Upgrade to unlock</p>
        )}
      </div>
    </button>
  );
}

/* ── Main ThemePicker ── */

export function ThemePicker() {
  const profile = useProfileStore((s) => s.profile);
  const setTheme = useProfileStore((s) => s.setTheme);
  const { account } = useAuth();

  // All hooks must be called before any early return
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [showAI, setShowAI] = useState(false);
  const [showAllFree, setShowAllFree] = useState(false);
  const [showAllPremium, setShowAllPremium] = useState(false);

  const isPro = account?.plan === "pro" || account?.plan === "team";

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

  const FREE_LIMIT = 8;
  const PREMIUM_LIMIT = 9;

  // Guard after all hooks
  if (!profile) return null;

  return (
    <div className="space-y-4">
      {/* AI Recommend toggle */}
      <button
        onClick={() => setShowAI((v) => !v)}
        className="flex w-full items-center gap-2 rounded-xl border border-electric-500/20 bg-electric-500/[0.06] px-3 py-2.5 text-left transition-colors hover:bg-electric-500/10"
      >
        <Sparkles className="h-4 w-4 text-electric-400 shrink-0" />
        <div className="flex-1">
          <p className="text-xs font-semibold text-electric-300">AI Theme Recommendation</p>
          <p className="text-[11px] text-white/40">Find the perfect theme for your brand</p>
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

      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search themes…"
          className="h-9 w-full rounded-xl border border-white/10 bg-white/[0.04] pl-8 pr-3 text-xs text-white placeholder:text-white/30 outline-none focus:border-electric-500/50"
        />
      </div>

      {/* Category tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
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

      {/* Results count */}
      {search && (
        <p className="text-[11px] text-white/35">
          {filtered.length} theme{filtered.length !== 1 ? "s" : ""} found
        </p>
      )}

      {/* ── FREE THEMES ── */}
      {freeThemes.length > 0 && (
        <div>
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-white/30">
            Free Themes ({freeThemes.length})
          </p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {(showAllFree ? freeThemes : freeThemes.slice(0, FREE_LIMIT)).map((tc) => (
              <ThemeCard
                key={tc.id}
                theme={tc}
                active={profile.themeId === tc.id}
                locked={false}
                onSelect={() => handleSelect(tc)}
              />
            ))}
          </div>
          {freeThemes.length > FREE_LIMIT && (
            <button
              onClick={() => setShowAllFree((v) => !v)}
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/[0.06] bg-white/[0.02] py-2 text-[11px] font-medium text-white/40 hover:bg-white/[0.05] hover:text-white/60 transition-colors"
            >
              {showAllFree ? (
                <><ChevronUp className="h-3.5 w-3.5" /> Show less</>
              ) : (
                <><ChevronDown className="h-3.5 w-3.5" /> +{freeThemes.length - FREE_LIMIT} more free themes</>
              )}
            </button>
          )}
        </div>
      )}

      {/* ── PREMIUM THEMES ── */}
      {premiumThemes.length > 0 && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11px] font-medium uppercase tracking-wider text-white/30">
              ⭐ Premium Themes ({premiumThemes.length})
            </p>
            {!isPro && (
              <span className="rounded-full bg-gold-400/10 px-2 py-0.5 text-[10px] font-semibold text-gold-300">
                PRO required
              </span>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {(showAllPremium ? premiumThemes : premiumThemes.slice(0, PREMIUM_LIMIT)).map(
              (tc) => (
                <ThemeCard
                  key={tc.id}
                  theme={tc}
                  active={profile.themeId === tc.id}
                  locked={isLocked(tc)}
                  onSelect={() => handleSelect(tc)}
                />
              ),
            )}
          </div>
          {premiumThemes.length > PREMIUM_LIMIT && (
            <button
              onClick={() => setShowAllPremium((v) => !v)}
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/[0.06] bg-white/[0.02] py-2 text-[11px] font-medium text-white/40 hover:bg-white/[0.05] hover:text-white/60 transition-colors"
            >
              {showAllPremium ? (
                <><ChevronUp className="h-3.5 w-3.5" /> Show less</>
              ) : (
                <><ChevronDown className="h-3.5 w-3.5" /> +{premiumThemes.length - PREMIUM_LIMIT} more premium themes</>
              )}
            </button>
          )}

          {/* Upgrade CTA */}
          {!isPro && (
            <Link
              href="/billing"
              className="mt-3 flex items-center gap-2 rounded-xl border border-gold-400/20 bg-gold-400/[0.06] px-4 py-3 transition-colors hover:bg-gold-400/10"
            >
              <Star className="h-4 w-4 text-gold-400 shrink-0" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-gold-300">Unlock All Premium Themes</p>
                <p className="text-[11px] text-white/40">
                  Upgrade to PRO — animated, glassmorphism, neon &amp; more
                </p>
              </div>
              <span className="shrink-0 rounded-lg bg-gold-400/15 px-2.5 py-1 text-xs font-bold text-gold-300">
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

      {/* Current theme description */}
      {(() => {
        const current = THEME_CONFIGS.find((t) => t.id === profile.themeId);
        if (!current) return null;
        return (
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
            <div className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-full shrink-0"
                style={{ background: current.previewGradient }}
              />
              <p className="text-xs font-semibold text-white">{current.name}</p>
              {current.tier === "premium" && (
                <Star className="h-3 w-3 fill-gold-400 text-gold-400" />
              )}
            </div>
            <p className="mt-0.5 text-[11px] text-white/40">{current.description}</p>
          </div>
        );
      })()}
    </div>
  );
}
