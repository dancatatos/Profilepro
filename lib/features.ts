/**
 * Canonical feature catalogue — single source of truth for what each
 * plan can include. The admin /admin/subscriptions page renders this
 * list as toggleable rows per plan; admins flip features on/off to
 * compose each tier.
 *
 * Why this lives in code (not Firestore):
 *   - Feature KEYS are referenced by app code to gate functionality
 *     (e.g. `userHasFeature(user, "ai_generation")`). Stable keys must
 *     never change without a deliberate code change.
 *   - When you add a new feature to the app (e.g. a new module), you
 *     add it here, and it automatically appears in every plan's
 *     editor with the toggle defaulting to off — so admins can decide
 *     which tier(s) to grant it to.
 *
 * Adding a new feature: append a row to FEATURE_CATALOG with a unique
 * key, a user-facing label, and optionally a category. That's it —
 * the admin editor and pricing display pick it up automatically.
 */

export interface CatalogFeature {
  /** Stable identifier — referenced by code gates. NEVER change once shipped. */
  key: string;
  /** User-facing label shown on pricing cards + the admin toggle row. */
  label: string;
  /** Grouping label for the admin editor (purely cosmetic). */
  category: string;
  /** Optional one-line description — surfaced as a hover/help hint in admin. */
  hint?: string;
}

export const FEATURE_CATALOG: readonly CatalogFeature[] = [
  /* ── Profile ─────────────────────────────────────────────────────── */
  {
    key: "profile_basic",
    label: "1 credibility profile",
    category: "Profile",
    hint: "Owning a single profile with the core sections.",
  },
  {
    key: "profile_unlimited_links",
    label: "Unlimited links & sections",
    category: "Profile",
    hint: "Remove the section count limit on the profile builder.",
  },
  {
    key: "remove_branding",
    label: "Remove Credibly branding",
    category: "Profile",
    hint: "Hide the 'Powered by Credibly' footer on the public profile.",
  },

  /* ── AI ──────────────────────────────────────────────────────────── */
  {
    key: "ai_generation",
    label: "Full AI generation suite",
    category: "AI",
    hint: "Auto-generate bio, headline, sections and CTAs with Gemini.",
  },
  {
    key: "ai_audit",
    label: "AI profile audit & scoring",
    category: "AI",
    hint: "AI-graded credibility score with improvement suggestions.",
  },
  {
    key: "ai_priority",
    label: "Priority AI generation",
    category: "AI",
    hint: "Faster AI responses + early access to new AI features.",
  },

  /* ── QR ──────────────────────────────────────────────────────────── */
  {
    key: "qr_standard",
    label: "QR code (standard)",
    category: "QR",
    hint: "Generate a basic QR for the profile.",
  },
  {
    key: "qr_branded_hd",
    label: "Branded HD QR export",
    category: "QR",
    hint: "1024px PNG export with branded panel templates.",
  },

  /* ── Analytics ───────────────────────────────────────────────────── */
  {
    key: "analytics_dashboard",
    label: "Analytics dashboard",
    category: "Analytics",
    hint: "View counts, click-throughs and conversion stats.",
  },
  {
    key: "team_analytics",
    label: "Advanced team analytics",
    category: "Analytics",
    hint: "Aggregated team performance + downline insights.",
  },

  /* ── Funnels ─────────────────────────────────────────────────────── */
  /* Count comes from the plan's `limits.funnels` numeric field — the
     label below is just a fallback used when no limit is set. The real
     display string ("Up to N sales funnels") is composed at render time
     by planDisplayFeatures() via the DYNAMIC_LABELS map. */
  {
    key: "funnels",
    label: "Sales funnels",
    category: "Funnels",
    hint:
      "Create multi-step funnels. Cap is set per-plan via the 'Funnels' limit field below.",
  },

  /* ── Templates ───────────────────────────────────────────────────── */
  {
    key: "shared_builds",
    label: "Shared build templates",
    category: "Templates",
    hint: "Save profile templates + clone shared ones via share codes.",
  },
  {
    key: "premium_templates",
    label: "Premium templates",
    category: "Templates",
    hint: "Curated premium template marketplace.",
  },
  {
    key: "premium_themes",
    label: "Premium themes",
    category: "Templates",
    hint: "Access the premium-tier visual themes in the theme picker.",
  },
  {
    key: "team_templates",
    label: "Team templates",
    category: "Templates",
    hint: "Templates designed for cloning to a downline.",
  },

  /* ── Appointments ────────────────────────────────────────────────── */
  {
    key: "appointments",
    label: "Appointment scheduling",
    category: "Appointments",
    hint: "Booking calendar on the profile + admin booking management.",
  },

  /* ── Team / scale ───────────────────────────────────────────────── */
  {
    key: "clone_profile",
    label: "Clone profile system",
    category: "Team",
    hint: "One-click cloning of a master profile to team members.",
  },
  {
    key: "team_management",
    label: "Team member management",
    category: "Team",
    hint: "Add, remove and manage team members.",
  },

  /* ── Leads ───────────────────────────────────────────────────────── */
  {
    key: "lead_export",
    label: "Lead tracking & export",
    category: "Leads",
    hint: "Export captured leads as CSV.",
  },
  {
    key: "follow_up_pipeline",
    label: "Follow-up pipeline",
    category: "Leads",
    hint:
      "Daily task dashboard, pipeline stages and AI-assisted message scripts for nurturing leads.",
  },
] as const;

/** Look up a catalog entry by its stable key. */
export function getCatalogFeature(key: string): CatalogFeature | undefined {
  return FEATURE_CATALOG.find((f) => f.key === key);
}

/** Get the user-facing label for a feature key (or the key itself as fallback). */
export function featureLabel(key: string): string {
  return getCatalogFeature(key)?.label ?? key;
}

/** Group the catalogue by category — used by the admin editor's section layout. */
export function groupCatalogByCategory(): Array<{
  category: string;
  features: CatalogFeature[];
}> {
  const map = new Map<string, CatalogFeature[]>();
  for (const f of FEATURE_CATALOG) {
    const list = map.get(f.category) ?? [];
    list.push(f);
    map.set(f.category, list);
  }
  return Array.from(map.entries()).map(([category, features]) => ({
    category,
    features,
  }));
}

/**
 * Per-feature dynamic label resolvers. When a feature's display string
 * depends on a numeric plan setting (e.g. funnels = "Up to 5 sales
 * funnels"), it gets an entry here keyed by the catalog `key`. The
 * resolver receives the plan's `limits` and returns the final label.
 *
 * Returning `null` means "hide this feature row" — used to omit count
 * features when the plan explicitly sets the cap to 0 (e.g. a plan
 * with no funnels shouldn't advertise "0 sales funnels").
 */
const DYNAMIC_LABELS: Record<
  string,
  (limits: { funnels?: number; sharedBuilds?: number; pipelines?: number } | undefined) => string | null
> = {
  funnels: (limits) => {
    const n = limits?.funnels;
    if (n === undefined || n === null) return "Sales funnels";
    if (n <= 0) return null;
    if (n === 1) return "1 sales funnel";
    return `Up to ${n} sales funnels`;
  },
};

/**
 * Compute the unified display feature list for a plan — used by the
 * billing page + public pricing card. Combines:
 *
 *   1. Canonical features (featureKeys → catalog labels), in catalog
 *      order so categories stay grouped visually. Features registered
 *      in DYNAMIC_LABELS substitute the plan's numeric limits into
 *      their label ("Up to 5 sales funnels") so the pricing card
 *      always matches the actual cap.
 *   2. Custom display lines (plan.features) appended after, allowing
 *      marketing copy like "Everything in Free" without affecting
 *      functional gating.
 */
export function planDisplayFeatures(plan: {
  featureKeys?: string[];
  features?: { label: string; included: boolean }[];
  limits?: { funnels?: number; sharedBuilds?: number; pipelines?: number };
}): { label: string; included: boolean }[] {
  const keys = new Set(plan.featureKeys ?? []);
  /* Iterate the catalog in declaration order so categories group
     visually on the pricing card. */
  const fromCatalog: { label: string; included: boolean }[] = [];
  for (const cf of FEATURE_CATALOG) {
    if (!keys.has(cf.key)) continue;
    const dynamic = DYNAMIC_LABELS[cf.key];
    const label = dynamic ? dynamic(plan.limits) : cf.label;
    if (label === null) continue;
    fromCatalog.push({ label, included: true });
  }
  return [...fromCatalog, ...(plan.features ?? [])];
}

/**
 * Whether the given plan grants access to a feature key.
 *
 * Two layers of fallback for plans created before the catalogue
 * existed:
 *   1. If `featureKeys` is set, use it directly (the modern path).
 *   2. Otherwise fall back to the legacy `features` array — match a
 *      feature label fuzzily against the catalogue. This means an old
 *      plan that listed "AI generation" as a checked feature still
 *      grants `ai_generation` access.
 *
 * Returns false when no plan is provided so undefined-plan callers
 * fail closed rather than open.
 */
export function planHasFeature(
  plan: { featureKeys?: string[]; features?: { label: string; included: boolean }[] } | null | undefined,
  featureKey: string,
): boolean {
  if (!plan) return false;
  if (plan.featureKeys && plan.featureKeys.length > 0) {
    if (plan.featureKeys.includes(featureKey)) return true;
    /* Back-compat: the funnels feature used to be split into two
       count-tier keys (funnels_5, funnels_15). Plans saved before the
       unified `funnels` key shipped still carry those — treat either
       as granting `funnels` access so existing Firestore docs keep
       working without a migration. */
    if (
      featureKey === "funnels" &&
      (plan.featureKeys.includes("funnels_5") || plan.featureKeys.includes("funnels_15"))
    ) {
      return true;
    }
    return false;
  }
  /* Legacy fallback — match by label. */
  const catalog = getCatalogFeature(featureKey);
  if (!catalog || !plan.features) return false;
  return plan.features.some(
    (f) => f.included && f.label.toLowerCase() === catalog.label.toLowerCase(),
  );
}

/** Helper: true when the plan has at least one of the listed feature keys. */
export function planHasAnyFeature(
  plan: { featureKeys?: string[]; features?: { label: string; included: boolean }[] } | null | undefined,
  keys: string[],
): boolean {
  return keys.some((k) => planHasFeature(plan, k));
}

/**
 * Default featureKeys assigned to a freshly-created plan based on its
 * id. The three built-in plans (free / pro / team) get sensible
 * starting sets so admins don't have to flip 15 toggles on first run.
 * Custom plans created by the admin start with an empty list.
 */
export function defaultFeatureKeysForPlan(planId: string): string[] {
  if (planId === "free") {
    return ["profile_basic", "qr_standard"];
  }
  if (planId === "pro") {
    return [
      "profile_basic",
      "profile_unlimited_links",
      "remove_branding",
      "ai_generation",
      "ai_audit",
      "qr_standard",
      "qr_branded_hd",
      "analytics_dashboard",
      "funnels",
      "shared_builds",
      "premium_templates",
      "premium_themes",
      "appointments",
      "follow_up_pipeline",
    ];
  }
  if (planId === "team") {
    return [
      "profile_basic",
      "profile_unlimited_links",
      "remove_branding",
      "ai_generation",
      "ai_audit",
      "ai_priority",
      "qr_standard",
      "qr_branded_hd",
      "analytics_dashboard",
      "team_analytics",
      "funnels",
      "shared_builds",
      "premium_templates",
      "premium_themes",
      "team_templates",
      "clone_profile",
      "team_management",
      "lead_export",
      "appointments",
      "follow_up_pipeline",
    ];
  }
  /* Custom plan — admin picks features explicitly. */
  return [];
}
