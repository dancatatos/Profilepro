/* ============================================================
   Credibly — App-wide constants
   ============================================================ */

import type {
  AICopyMode,
  Plan,
  PlanId,
  ProfileTheme,
  SectionType,
  SocialPlatform,
} from "@/types";

export const APP = {
  name: "Credibly",
  tagline: "Your AI-powered credibility profile",
  description:
    "Build a professional online credibility profile in minutes. Perfect for network marketers, recruiters, coaches and online sellers.",
  url: process.env.NEXT_PUBLIC_APP_URL || "https://www.crediblyai.com",
};

/* ---------------- Dashboard navigation ---------------- */

export interface NavItem {
  key: string;
  label: string;
  href: string;
  icon: string; // lucide icon name
}

export const DASHBOARD_NAV: NavItem[] = [
  { key: "home", label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" },
  { key: "profile", label: "My Profile", href: "/profile", icon: "UserRound" },
  { key: "funnels", label: "Funnels", href: "/funnels", icon: "Filter" },
  { key: "templates", label: "Template Marketplace", href: "/templates", icon: "LayoutTemplate" },
  { key: "shared-builds", label: "Shared Builds", href: "/shared-builds", icon: "Package" },
  { key: "qr", label: "QR Codes", href: "/qr", icon: "QrCode" },
  { key: "card", label: "Digital Card", href: "/card", icon: "CreditCard" },
  { key: "appointments", label: "Appointments", href: "/appointments", icon: "CalendarDays" },
  { key: "leads", label: "Leads", href: "/leads", icon: "Users" },
  { key: "pipelines", label: "Follow-Up", href: "/pipelines", icon: "KanbanSquare" },
  { key: "payments", label: "Payments", href: "/payments", icon: "Wallet" },
  { key: "analytics", label: "Analytics", href: "/analytics", icon: "BarChart3" },
  { key: "trainings", label: "Trainings", href: "/trainings", icon: "GraduationCap" },
  { key: "teams", label: "Teams", href: "/teams", icon: "Users" },
  { key: "my-events", label: "My Events", href: "/my-events", icon: "CalendarDays" },
  { key: "university", label: "Credibly University", href: "/university", icon: "GraduationCap" },
  { key: "media", label: "Media Library", href: "/media", icon: "Images" },
  { key: "settings", label: "Settings", href: "/settings", icon: "Settings" },
  { key: "billing", label: "Billing", href: "/billing", icon: "CreditCard" },
];

/** The 5 items shown in the mobile bottom navigation. */
export const BOTTOM_NAV: NavItem[] = [
  { key: "profile", label: "Profile", href: "/profile", icon: "UserRound" },
  { key: "qr", label: "QR", href: "/qr", icon: "QrCode" },
  { key: "home", label: "Home", href: "/dashboard", icon: "LayoutDashboard" },
  { key: "analytics", label: "Stats", href: "/analytics", icon: "BarChart3" },
  { key: "settings", label: "Settings", href: "/settings", icon: "Settings" },
];

/* ---------------- Section catalog ---------------- */

export interface SectionMeta {
  type: SectionType;
  label: string;
  description: string;
  icon: string;
}

export const SECTION_CATALOG: SectionMeta[] = [
  {
    type: "cta",
    label: "CTA Buttons",
    description: "Join my team, book a call, free training…",
    icon: "MousePointerClick",
  },
  {
    type: "socials",
    label: "Social Links",
    description: "Facebook, Instagram, TikTok, WhatsApp…",
    icon: "Share2",
  },
  {
    type: "about",
    label: "About Me",
    description: "Your story, mission and journey",
    icon: "FileText",
  },
  {
    type: "hero",
    label: "Hero",
    description: "Big headline + subhead — your eye-catching top block",
    icon: "Rocket",
  },
  {
    type: "benefits",
    label: "Benefits",
    description: "Bullet list of value props",
    icon: "ListChecks",
  },
  {
    type: "faq",
    label: "FAQ",
    description: "Common questions and answers",
    icon: "HelpCircle",
  },
  {
    type: "pricingCard",
    label: "Pricing Card",
    description: "Featured offer — price + features + CTA",
    icon: "Tag",
  },
  {
    type: "text",
    label: "Text Block",
    description: "Formatted text — bold, lists, headings, alignment",
    icon: "Type",
  },
  {
    type: "countdown",
    label: "Countdown Timer",
    description: "A live timer that builds urgency",
    icon: "Timer",
  },
  {
    type: "credibility",
    label: "Credibility",
    description: "Awards, ranks, milestones, certifications",
    icon: "Award",
  },
  {
    type: "testimonials",
    label: "Testimonials",
    description: "Text, image and video social proof",
    icon: "Quote",
  },
  {
    type: "products",
    label: "Products / Services",
    description: "Showcase what you offer with CTAs",
    icon: "ShoppingBag",
  },
  {
    type: "video",
    label: "Video",
    description: "Embed YouTube, TikTok or Facebook reels",
    icon: "Play",
  },
  {
    type: "gallery",
    label: "Gallery",
    description: "Lifestyle, team and event photos",
    icon: "Images",
  },
  {
    type: "image",
    label: "Single Image",
    description: "Drop one photo, banner or graphic — with optional link",
    icon: "Image",
  },
  {
    type: "embedHtml",
    label: "Embed / Custom HTML",
    description:
      "Calendly, Tally, ManyChat, custom widgets — paste any embed code",
    icon: "Code2",
  },
  {
    type: "leadCapture",
    label: "Lead Capture",
    description: "Collect names, emails and chat leads",
    icon: "Inbox",
  },
  {
    type: "appointment",
    label: "Appointment Scheduler",
    description: "Let visitors book a call or meeting with you",
    icon: "CalendarClock",
  },
  {
    type: "payment",
    label: "Accept Payment",
    description:
      "Collect GCash / Maya / bank receipts — visitor pays, uploads proof",
    icon: "Wallet",
  },
];

/* ---------------- Social platforms ---------------- */

export interface SocialMeta {
  platform: SocialPlatform;
  label: string;
  /** react-icons key reference, resolved in components/ui/SocialIcon */
  icon: string;
  color: string;
  placeholder: string;
}

export const SOCIAL_PLATFORMS: SocialMeta[] = [
  { platform: "facebook", label: "Facebook", icon: "facebook", color: "#1877F2", placeholder: "https://facebook.com/yourname" },
  { platform: "instagram", label: "Instagram", icon: "instagram", color: "#E4405F", placeholder: "https://instagram.com/yourname" },
  { platform: "tiktok", label: "TikTok", icon: "tiktok", color: "#ffffff", placeholder: "https://tiktok.com/@yourname" },
  { platform: "youtube", label: "YouTube", icon: "youtube", color: "#FF0000", placeholder: "https://youtube.com/@yourname" },
  { platform: "telegram", label: "Telegram", icon: "telegram", color: "#26A5E4", placeholder: "https://t.me/yourname" },
  { platform: "whatsapp", label: "WhatsApp", icon: "whatsapp", color: "#25D366", placeholder: "https://wa.me/63xxxxxxxxxx" },
  { platform: "messenger", label: "Messenger", icon: "messenger", color: "#0084FF", placeholder: "https://m.me/yourname" },
  { platform: "x", label: "X / Twitter", icon: "x", color: "#ffffff", placeholder: "https://x.com/yourname" },
  { platform: "linkedin", label: "LinkedIn", icon: "linkedin", color: "#0A66C2", placeholder: "https://linkedin.com/in/yourname" },
  { platform: "website", label: "Website", icon: "website", color: "#2e6bff", placeholder: "https://yoursite.com" },
];

/* ---------------- Profile themes (legacy compat — new system is lib/themes.ts) ---------------- */

export const THEMES: ProfileTheme[] = [
  {
    id: "midnight",
    name: "Midnight",
    background:
      "radial-gradient(120% 80% at 50% 0%, #16161d 0%, #0a0a0c 55%, #050507 100%)",
    accent: "blue",
    buttonStyle: "gradient",
  },
  {
    id: "navy-glass",
    name: "Navy Glass",
    background:
      "radial-gradient(120% 80% at 50% 0%, #16294a 0%, #0a1322 55%, #060b16 100%)",
    accent: "blue",
    buttonStyle: "solid",
  },
  {
    id: "emerald-lux",
    name: "Emerald Lux",
    background:
      "radial-gradient(120% 80% at 50% 0%, #0b3b30 0%, #07140f 55%, #050707 100%)",
    accent: "jade",
    buttonStyle: "gradient",
  },
  {
    id: "gold-elite",
    name: "Gold Elite",
    background:
      "radial-gradient(120% 80% at 50% 0%, #2a2418 0%, #14110a 55%, #080706 100%)",
    accent: "gold",
    buttonStyle: "outline",
  },
  {
    id: "pure-mono",
    name: "Pure Mono",
    background:
      "radial-gradient(120% 80% at 50% 0%, #1c1c23 0%, #0f0f13 55%, #050507 100%)",
    accent: "white",
    buttonStyle: "solid",
  },
  /* ── Vibrant / Coloured themes ── */
  {
    id: "vivid-purple",
    name: "Vivid Purple",
    background:
      "linear-gradient(180deg, #7c3aed 0%, #5b21b6 50%, #3b0764 100%)",
    accent: "white",
    buttonStyle: "solid",
  },
  {
    id: "rose-vibe",
    name: "Rose Vibe",
    background:
      "linear-gradient(180deg, #ec4899 0%, #db2777 45%, #9d174d 100%)",
    accent: "white",
    buttonStyle: "solid",
  },
  {
    id: "deep-red",
    name: "Deep Red",
    background:
      "linear-gradient(180deg, #dc2626 0%, #991b1b 50%, #450a0a 100%)",
    accent: "gold",
    buttonStyle: "solid",
  },
  {
    id: "sky-blue",
    name: "Sky Blue",
    background:
      "linear-gradient(180deg, #0ea5e9 0%, #0284c7 50%, #0c4a6e 100%)",
    accent: "white",
    buttonStyle: "solid",
  },
  {
    id: "warm-coral",
    name: "Warm Coral",
    background:
      "linear-gradient(180deg, #f97316 0%, #ea580c 50%, #7c2d12 100%)",
    accent: "white",
    buttonStyle: "solid",
  },
  {
    id: "purple-dusk",
    name: "Purple Dusk",
    background:
      "radial-gradient(120% 80% at 50% 0%, #4c1d95 0%, #2e1065 55%, #0f0a1a 100%)",
    accent: "white",
    buttonStyle: "outline",
  },
];

/* ---------------- AI copy modes ---------------- */

export interface CopyModeMeta {
  id: AICopyMode;
  label: string;
  description: string;
}

export const AI_COPY_MODES: CopyModeMeta[] = [
  { id: "professional", label: "Professional", description: "Polished and trustworthy" },
  { id: "luxury", label: "Luxury", description: "Premium, aspirational tone" },
  { id: "friendly", label: "Friendly", description: "Warm and approachable" },
  { id: "corporate", label: "Corporate", description: "Formal and structured" },
  { id: "energetic", label: "Energetic", description: "High-energy and bold" },
  { id: "genz", label: "Gen Z", description: "Modern, punchy, casual" },
  { id: "recruiting", label: "Recruiting Focused", description: "Built to attract team members" },
  { id: "sales", label: "Sales Focused", description: "Conversion-driven copy" },
  { id: "personal-brand", label: "Personal Branding", description: "Story-led authority" },
  { id: "authority", label: "Authority Expert", description: "Positions you as the expert" },
];

/* ---------------- Subscription plans ---------------- */

/**
 * Default Gumroad checkout URL used as a fallback for the paid plans before
 * the admin sets per-plan URLs in the subscriptions page. Once saved in
 * Firestore, `plan.checkoutUrl` overrides this.
 */
const DEFAULT_GUMROAD_URL = "https://danzbiz.gumroad.com/l/profileproplan";

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    price: 0,
    billingPeriod: "monthly",
    tagline: "Get online and look professional.",
    /* Legacy free-text rows kept for backward compat — featureKeys
       (canonical) is the new source of truth and is merged in on top
       at display time. */
    features: [{ label: "Core profile sections", included: true }],
    featureKeys: ["profile_basic", "qr_standard"],
    limits: { funnels: 0, sharedBuilds: 0, trainingsCreate: 0, trainingsActivate: 1 },
    visibility: "public",
    checkoutUrl: "",
    commission: 0,
  },
  {
    id: "pro",
    name: "Pro",
    price: 499,
    billingPeriod: "monthly",
    highlighted: true,
    tagline: "AI-powered profile that converts.",
    features: [{ label: "Everything in Free", included: true }],
    featureKeys: [
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
    ],
    limits: { funnels: 5, sharedBuilds: 5, trainingsCreate: 1, trainingsActivate: 999 },
    visibility: "public",
    checkoutUrl: DEFAULT_GUMROAD_URL,
    commission: 0,
    duration: { value: 1, unit: "months" },
  },
  {
    id: "team",
    name: "Team",
    price: 14990,
    billingPeriod: "annual",
    tagline: "Scale your downline with cloning.",
    features: [{ label: "Everything in Pro", included: true }],
    featureKeys: [
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
    ],
    limits: { funnels: 15, sharedBuilds: 15, trainingsCreate: 5, trainingsActivate: 999 },
    visibility: "public",
    checkoutUrl: DEFAULT_GUMROAD_URL,
    commission: 0,
    duration: { value: 1, unit: "years" },
  },
];

/* ---------------- Onboarding questions ---------------- */

export const ONBOARDING_QUESTIONS = [
  { key: "niche", question: "What niche or industry are you in?", placeholder: "e.g. Health & wellness network marketing" },
  { key: "company", question: "What company or brand are you with?", placeholder: "e.g. Acme Wellness" },
  { key: "offer", question: "What products or services do you offer?", placeholder: "e.g. Supplements + a business opportunity" },
  { key: "targetMarket", question: "Who is your target market?", placeholder: "e.g. Busy moms aged 25-45 in the Philippines" },
  { key: "mission", question: "What is your mission?", placeholder: "e.g. Help families build extra income from home" },
  { key: "resultYouHelpAchieve", question: "What result do you help people achieve?", placeholder: "e.g. A side income of ₱20k+/month" },
  { key: "brandingStyle", question: "What branding style do you prefer?", placeholder: "e.g. Premium and trustworthy" },
] as const;

export const QR_FG_DEFAULT = "#0a0a0c";
export const QR_BG_DEFAULT = "#ffffff";

/* ---------------- Shared build locker ---------------- */

/**
 * How many shared builds each plan can keep saved in their locker.
 * Unknown plan IDs (custom admin-created plans) inherit the "pro" tier
 * by default — use `getTemplateLockerSlots(planId)` instead of indexing
 * this map directly so the fallback applies.
 */
export const TEMPLATE_LOCKER_SLOTS: Record<string, number> = {
  free: 0,
  pro: 5,
  team: 15,
};

/**
 * How many funnels each plan can create.
 * Unknown plan IDs default to the "pro" tier — use `getFunnelLimit(planId)`.
 */
export const FUNNEL_LIMITS: Record<string, number> = {
  free: 0,
  pro: 5,
  team: 15,
};

/** Resolve a plan's locker slots, defaulting to the Pro tier for custom plans. */
export function getTemplateLockerSlots(planId: PlanId): number {
  return TEMPLATE_LOCKER_SLOTS[planId] ?? TEMPLATE_LOCKER_SLOTS.pro;
}

/** Resolve a plan's funnel limit, defaulting to the Pro tier for custom plans. */
export function getFunnelLimit(planId: PlanId): number {
  return FUNNEL_LIMITS[planId] ?? FUNNEL_LIMITS.pro;
}

/**
 * Resolve a user's effective funnel limit, taking into account both
 * per-user overrides AND per-plan limits (with the legacy hardcoded
 * map as a final fallback).
 *
 * Lookup priority:
 *   1. user.limitOverrides.funnels  — admin-set per-user grant
 *   2. plan.limits.funnels          — admin-set per-plan setting
 *   3. FUNNEL_LIMITS[planId]        — legacy hardcoded default
 */
export function resolveUserFunnelLimit(
  user: { plan?: PlanId; limitOverrides?: { funnels?: number } } | null | undefined,
  plans: Plan[] | null | undefined,
): number {
  if (user?.limitOverrides?.funnels !== undefined) {
    return user.limitOverrides.funnels;
  }
  const planId = user?.plan ?? "free";
  const plan = plans?.find((p) => p.id === planId);
  if (plan?.limits?.funnels !== undefined) return plan.limits.funnels;
  return getFunnelLimit(planId);
}

/**
 * Same lookup priority as resolveUserFunnelLimit, but for shared-build
 * locker slots. Per-user override → per-plan setting → legacy default.
 */
export function resolveUserSharedBuildSlots(
  user: { plan?: PlanId; limitOverrides?: { sharedBuilds?: number } } | null | undefined,
  plans: Plan[] | null | undefined,
): number {
  if (user?.limitOverrides?.sharedBuilds !== undefined) {
    return user.limitOverrides.sharedBuilds;
  }
  const planId = user?.plan ?? "free";
  const plan = plans?.find((p) => p.id === planId);
  if (plan?.limits?.sharedBuilds !== undefined) return plan.limits.sharedBuilds;
  return getTemplateLockerSlots(planId);
}

/**
 * How many follow-up pipelines each plan can create. Soft cap so the
 * pipeline-switcher stays useful and prevents accidental duplicates
 * from re-running the template picker.
 *
 * Sized for typical use: most recruiters live in 1-2 pipelines; power
 * users (multiple offers, team builders) might want 3-5. The "team"
 * tier gets headroom for sub-teams.
 */
export const PIPELINE_LIMITS: Record<string, number> = {
  free: 0,
  pro: 3,
  team: 10,
};

/** Resolve a plan's pipeline limit, defaulting to Pro tier for custom plans. */
export function getPipelineLimit(planId: PlanId): number {
  return PIPELINE_LIMITS[planId] ?? PIPELINE_LIMITS.pro;
}

/**
 * Resolve a user's effective pipeline limit. Same lookup priority as
 * `resolveUserFunnelLimit`: per-user override → per-plan setting →
 * legacy hardcoded default. Admin can grant a single user extra
 * pipelines without touching their plan.
 */
export function resolveUserPipelineLimit(
  user: { plan?: PlanId; limitOverrides?: { pipelines?: number } } | null | undefined,
  plans: Plan[] | null | undefined,
): number {
  if (user?.limitOverrides?.pipelines !== undefined) {
    return user.limitOverrides.pipelines;
  }
  const planId = user?.plan ?? "free";
  const plan = plans?.find((p) => p.id === planId);
  if (plan?.limits?.pipelines !== undefined) return plan.limits.pipelines;
  return getPipelineLimit(planId);
}

/* ---------------- Training limits ---------------- */

/**
 * Hardcoded fallbacks for the trainings-create and trainings-activate
 * limits — used when a plan doc has no explicit `limits.trainingsCreate`
 * / `limits.trainingsActivate` set. Admin can override these per-plan
 * in /admin/subscriptions, and per-user in /admin/users.
 *
 * Defaults mirror the BUILT_IN_PLANS values:
 *   free  → can create 0, can activate 1
 *   pro   → can create 1, can activate "effectively unlimited" (999)
 *   team  → can create 5, can activate "effectively unlimited" (999)
 *
 * 999 is treated as "unlimited" everywhere — the UI shows ∞ instead of
 * the literal number. Keeps the limit math simple (always a number).
 */
export const TRAININGS_CREATE_LIMITS: Record<string, number> = {
  free: 0,
  pro: 1,
  team: 5,
};
export const TRAININGS_ACTIVATE_LIMITS: Record<string, number> = {
  free: 1,
  pro: 999,
  team: 999,
};

export function getTrainingsCreateLimit(planId: PlanId): number {
  return TRAININGS_CREATE_LIMITS[planId] ?? TRAININGS_CREATE_LIMITS.pro;
}
export function getTrainingsActivateLimit(planId: PlanId): number {
  return TRAININGS_ACTIVATE_LIMITS[planId] ?? TRAININGS_ACTIVATE_LIMITS.pro;
}

/**
 * Per-user resolver. Priority:
 *   1. (future) user.limitOverrides — not yet wired into AccountUser
 *   2. plan.limits.trainingsCreate
 *   3. legacy hardcoded TRAININGS_CREATE_LIMITS
 */
export function resolveUserTrainingsCreateLimit(
  user: { plan?: PlanId } | null | undefined,
  plans: Plan[] | null | undefined,
): number {
  const planId = user?.plan ?? "free";
  const plan = plans?.find((p) => p.id === planId);
  if (plan?.limits?.trainingsCreate !== undefined) {
    return plan.limits.trainingsCreate;
  }
  return getTrainingsCreateLimit(planId);
}
export function resolveUserTrainingsActivateLimit(
  user: { plan?: PlanId } | null | undefined,
  plans: Plan[] | null | undefined,
): number {
  const planId = user?.plan ?? "free";
  const plan = plans?.find((p) => p.id === planId);
  if (plan?.limits?.trainingsActivate !== undefined) {
    return plan.limits.trainingsActivate;
  }
  return getTrainingsActivateLimit(planId);
}

/**
 * Resolve the configurable feature label. Reads from the marketing
 * settings doc via the MarketingContent.featureLabels block, falling
 * back to the canonical default if unset/empty. Use this everywhere
 * the UI surfaces the word "Trainings" so a future rename is one
 * Firestore write.
 */
/* ---------------- Add-on defaults + resolver ---------------- */

/**
 * Default numeric caps for the Events add-on. Admin can override any
 * of these per user via /admin/users. 999 anywhere means "effectively
 * unlimited" — the UI displays it as ∞ and limit checks short-circuit.
 *
 * Defaults sized for safety, not stinginess:
 *   - 3 team spaces  → enough for "main team" + "sub-team" + "VIP"
 *   - 20 events/mo   → roughly 5/week, generous for active leaders
 *   - 500 members    → comfortable for most MLM downlines
 * Bigger uplines (1000+ downline) need admin to bump these.
 */
export const DEFAULT_ADDON_LIMITS = {
  teamSpaces: 3,
  eventsPerMonth: 20,
  membersPerTeam: 500,
} as const;

/**
 * Resolve a single add-on limit for a user. Per-user override wins;
 * otherwise the default. Returns a guaranteed number so callers can
 * do plain numeric comparisons without null-checks.
 */
export function resolveAddOnLimit(
  user: { addOnLimits?: { teamSpaces?: number; eventsPerMonth?: number; membersPerTeam?: number } } | null | undefined,
  key: keyof typeof DEFAULT_ADDON_LIMITS,
): number {
  const override = user?.addOnLimits?.[key];
  if (typeof override === "number" && override >= 0) return override;
  return DEFAULT_ADDON_LIMITS[key];
}

/**
 * Whether a user can access the Events add-on at all. Centralised so
 * sidebar + page guards stay consistent. Admin always passes through
 * — useful for debugging and support without granting an add-on.
 */
export function userHasEventsAddOn(
  user: { addOns?: { events?: boolean }; role?: string } | null | undefined,
): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;
  return user.addOns?.events === true;
}

/* ---------------- Dashboard nav resolver ---------------- */

/**
 * Nav keys the user can NEVER hide from the sidebar — removing them
 * would strand the user with no way to reach the home screen or
 * their settings/billing. Filter operates AFTER the admin's hidden
 * list, so even if these end up in `hidden`, they're forced back in.
 */
export const ALWAYS_VISIBLE_NAV_KEYS = ["home", "settings"] as const;

/**
 * Apply the admin's saved sidebar layout (order + hidden) on top of
 * the canonical DASHBOARD_NAV list. Returns a filtered + reordered
 * array of NavItems.
 *
 * Rules:
 *   - Unknown keys in saved data are ignored (graceful for renames /
 *     removals at the code level)
 *   - New nav items that ship in code but aren't in saved `order` fall
 *     in at the END in their original DASHBOARD_NAV position — so
 *     adding a new feature doesn't require admin to re-sort
 *   - ALWAYS_VISIBLE_NAV_KEYS bypass `hidden`
 */
export function resolveDashboardNav(
  layout: { order?: string[]; hidden?: string[] } | undefined,
): NavItem[] {
  const all = new Map(DASHBOARD_NAV.map((item) => [item.key, item]));
  const hidden = new Set(layout?.hidden ?? []);
  /* Force essentials back into the visible set. */
  for (const k of ALWAYS_VISIBLE_NAV_KEYS) hidden.delete(k);

  /* Start with the admin's order, dropping unknown keys + hidden. */
  const seen = new Set<string>();
  const ordered: NavItem[] = [];
  for (const key of layout?.order ?? []) {
    const item = all.get(key);
    if (!item) continue;
    if (hidden.has(key)) {
      seen.add(key);
      continue;
    }
    ordered.push(item);
    seen.add(key);
  }
  /* Append any nav items that weren't in saved order yet — they're
     either brand-new from a recent code update, or the admin has
     never saved a layout. Preserve their DASHBOARD_NAV order. */
  for (const item of DASHBOARD_NAV) {
    if (seen.has(item.key)) continue;
    if (hidden.has(item.key)) continue;
    ordered.push(item);
  }
  return ordered;
}

export function trainingsLabel(
  marketing: { featureLabels?: { trainingsPlural?: string; trainingsSingular?: string } } | null | undefined,
  form: "plural" | "singular" = "plural",
): string {
  const labels = marketing?.featureLabels;
  if (form === "singular") {
    const v = labels?.trainingsSingular?.trim();
    return v && v.length > 0 ? v : "Training";
  }
  const v = labels?.trainingsPlural?.trim();
  return v && v.length > 0 ? v : "Trainings";
}
