/* ============================================================
   Credibly — Core domain types
   Shared across client, server, AI layer and Firestore models.
   ============================================================ */

/**
 * Plan identifier. The three built-in IDs ("free" / "pro" / "team") are
 * baked into the app and used as fallbacks for limits + Gumroad mapping.
 * Admins can additionally create custom plan IDs (e.g. "annual-special",
 * "affiliate-pro") via the admin subscriptions page, so anywhere this
 * type appears it should be treated as an open string with the three
 * built-ins as well-known constants.
 */
export type PlanId = string;
/** The three built-in plan IDs used as type-safe fallbacks. */
export const BUILT_IN_PLAN_IDS = ["free", "pro", "team"] as const;
export type BuiltInPlanId = (typeof BUILT_IN_PLAN_IDS)[number];

export type UserRole = "user" | "admin" | "affiliate";

/* ---------------- Account user ---------------- */

export interface AccountUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  /** Plan identifier — usually one of BUILT_IN_PLAN_IDS, but custom plans are allowed. */
  plan: PlanId;
  /** username of the user's primary profile, for quick links */
  username?: string;
  onboardingComplete: boolean;
  createdAt: number;
  updatedAt: number;
  /** Gumroad license key used to activate a paid plan */
  licenseKey?: string;
  /** Email associated with the Gumroad purchase */
  licenseEmail?: string;
  /**
   * If this user arrived via an affiliate referral link, the affiliate's
   * code (e.g. "DAN123") is stamped here at signup and stays forever.
   * Every commission record this user generates (signups + renewals) is
   * attributed back to this affiliate.
   */
  affiliateId?: string;
  /** Timestamp when the affiliate attribution was recorded. */
  affiliateAttributedAt?: number;
  /**
   * Subscription metadata for paid plans. Set when the admin upgrades
   * the user via /admin/users; `expiresAt` is computed from the plan's
   * `duration` (or billingPeriod as a fallback). Used by:
   *   - Admin users table: shows days-until-expiry per row.
   *   - Affiliate dashboard: surfaces upcoming renewal opportunities.
   *   - Renewal reminder cron (Phase 6C): emails customer + assistant.
   * Absent for users on the free plan.
   */
  subscription?: UserSubscription;
  /**
   * Per-user limit overrides — admin can grant extra funnel slots or
   * shared-build slots to a specific user without changing their plan.
   * Used for team members (e.g. a hired funnel-builder), beta testers,
   * or one-off arrangements. Override wins over plan default; absence
   * means "use whatever the plan grants".
   */
  limitOverrides?: UserLimitOverrides;
}

/** Per-user numeric overrides on top of plan-level limits. */
export interface UserLimitOverrides {
  /** Override the funnel count limit (0 = no funnels, undefined = use plan default). */
  funnels?: number;
  /** Override the shared-builds locker slot count. */
  sharedBuilds?: number;
}

/** Per-user subscription state — only present on paid plans. */
export interface UserSubscription {
  planId: PlanId;
  /** When the current cycle was activated (set on signup OR renewal). */
  activatedAt: number;
  /** When this cycle ends and a renewal becomes due. */
  expiresAt: number;
  /** How many times this user has been renewed (0 = original signup). */
  renewalCount: number;
}

/* ---------------- Feature flags (admin-controlled) ---------------- */

export interface FeatureFlags {
  /** When true, the standalone Template Marketplace tab is visible to users. */
  templateMarketplace: boolean;
}

/* ---------------- Profile sections ---------------- */

export type SectionType =
  | "cta"
  | "socials"
  | "about"
  | "credibility"
  | "testimonials"
  | "products"
  | "video"
  | "gallery"
  | "leadCapture"
  | "appointment"
  | "text"
  | "countdown"
  | "hero"
  | "benefits"
  | "faq"
  | "pricingCard";

export interface CTAButton {
  id: string;
  label: string;
  url: string;
  icon: string; // lucide icon name or social key
  style: "solid" | "gradient" | "outline";
  accent: "blue" | "jade" | "gold" | "white";
}

export type SocialPlatform =
  | "facebook"
  | "instagram"
  | "tiktok"
  | "youtube"
  | "telegram"
  | "whatsapp"
  | "messenger"
  | "x"
  | "linkedin"
  | "website";

export interface SocialLink {
  id: string;
  platform: SocialPlatform;
  url: string;
}

export interface CredibilityItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: string; // lucide icon name
  imageUrl?: string;
}

export interface Testimonial {
  id: string;
  kind: "text" | "image" | "video";
  authorName: string;
  authorRole?: string;
  quote?: string;
  mediaUrl?: string; // image url or video embed url
  rating?: number;
}

export interface Product {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  price?: string;
  ctaLabel: string;
  ctaUrl: string;
}

export interface VideoEmbed {
  id: string;
  provider: "youtube" | "tiktok" | "facebook";
  url: string;
  title?: string;
}

export interface GalleryImage {
  id: string;
  url: string;
  caption?: string;
}

export type LeadFieldKey = "name" | "email" | "phone";

export interface LeadCaptureChannels {
  messengerUrl?: string;
  whatsappUrl?: string;
  telegramUrl?: string;
}

export interface SectionBase {
  id: string;
  enabled: boolean;
  /** heading shown above the section on the public profile */
  title?: string;
}

/**
 * A Tiptap-compatible rich-text document node — used by Text sections.
 * Stored as structured JSON so the format stays constrained (no arbitrary
 * HTML), which keeps it both on-brand and XSS-safe.
 */
export interface RichTextNode {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  content?: RichTextNode[];
}

export interface CtaSection extends SectionBase {
  type: "cta";
  buttons: CTAButton[];
}
export interface SocialsSection extends SectionBase {
  type: "socials";
  links: SocialLink[];
}
export interface AboutSection extends SectionBase {
  type: "about";
  body: string;
}
export interface TextSection extends SectionBase {
  type: "text";
  /** Tiptap rich-text document. */
  doc: RichTextNode;
}
export interface CountdownSection extends SectionBase {
  type: "countdown";
  headline: string;
  /** Target as a datetime-local value (YYYY-MM-DDTHH:MM, local time). */
  targetIso: string;
  /** Shown once the countdown reaches zero. */
  expiredText: string;
}
export interface HeroSection extends SectionBase {
  type: "hero";
  headline: string;
  subtext: string;
  /** Optional background image URL. */
  backgroundUrl?: string;
}
export interface BenefitItem {
  id: string;
  title: string;
  detail?: string;
  /** Lucide icon name — defaults to "Check". */
  icon?: string;
}
export interface BenefitsSection extends SectionBase {
  type: "benefits";
  items: BenefitItem[];
}
export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}
export interface FaqSection extends SectionBase {
  type: "faq";
  items: FaqItem[];
}
export interface PricingFeature {
  id: string;
  text: string;
}
export interface PricingCardSection extends SectionBase {
  type: "pricingCard";
  headline: string;
  price: string;
  priceNote?: string;
  features: PricingFeature[];
  ctaLabel: string;
  ctaUrl: string;
}
export interface CredibilitySection extends SectionBase {
  type: "credibility";
  items: CredibilityItem[];
}
export interface TestimonialsSection extends SectionBase {
  type: "testimonials";
  testimonials: Testimonial[];
}
export interface ProductsSection extends SectionBase {
  type: "products";
  products: Product[];
}
export interface VideoSection extends SectionBase {
  type: "video";
  videos: VideoEmbed[];
}
export interface GallerySection extends SectionBase {
  type: "gallery";
  images: GalleryImage[];
}
export interface LeadCaptureSection extends SectionBase {
  type: "leadCapture";
  headline: string;
  subtext?: string;
  fields: LeadFieldKey[];
  channels: LeadCaptureChannels;
}

export interface AppointmentQuestion {
  id: string;
  question: string;
  enabled: boolean;
}
export interface AppointmentSection extends SectionBase {
  type: "appointment";
  headline: string;
  subtext?: string;
  /** Weekdays the owner is available — 0=Sun … 6=Sat */
  availableDays: number[];
  /** Daily window, "HH:MM" 24-hour */
  startTime: string;
  endTime: string;
  /** Length of each bookable slot, in minutes */
  slotMinutes: number;
  /** How many days ahead a visitor may book */
  bookingWindowDays: number;
  /** Custom intake questions — only enabled ones are shown, all optional */
  questions: AppointmentQuestion[];
}

export type ProfileSection =
  | CtaSection
  | SocialsSection
  | AboutSection
  | TextSection
  | CountdownSection
  | HeroSection
  | BenefitsSection
  | FaqSection
  | PricingCardSection
  | CredibilitySection
  | TestimonialsSection
  | ProductsSection
  | VideoSection
  | GallerySection
  | LeadCaptureSection
  | AppointmentSection;

/** One answer to a custom appointment question. */
export interface BookingAnswer {
  question: string;
  answer: string;
}

/** A confirmed appointment booking — owner-visible, holds visitor contact info. */
export interface Booking {
  id: string;
  profileId: string;
  ownerId: string;
  /** ISO date, "YYYY-MM-DD" */
  date: string;
  /** Start time, "HH:MM" 24-hour */
  time: string;
  durationMin: number;
  name: string;
  phone: string;
  email: string;
  answers: BookingAnswer[];
  createdAt: number;
}

/* ---------------- Profile ---------------- */

export interface SocialProofStat {
  id: string;
  label: string;
  value: string;
}

export interface ProfileHeader {
  displayName: string;
  headline: string;
  bio: string;
  avatarUrl?: string;
  coverUrl?: string;
  location?: string;
  company?: string;
  /** Contact phone — used on the business card & saved contact, not the public profile. */
  phone?: string;
  /** Contact email — used on the business card & saved contact, not the public profile. */
  email?: string;
  verified: boolean;
  socialProof: SocialProofStat[];
}

export type ThemeId =
  /* ── Original dark themes ── */
  | "midnight"
  | "navy-glass"
  | "emerald-lux"
  | "gold-elite"
  | "pure-mono"
  /* ── Vibrant / coloured ── */
  | "vivid-purple"
  | "rose-vibe"
  | "deep-red"
  | "sky-blue"
  | "warm-coral"
  | "purple-dusk"
  /* ── New free dark ── */
  | "neon-dark"
  | "carbon-pro"
  | "tropical-pop"
  | "aqua-energy"
  | "candy-ui"
  /* ── New free light ── */
  | "minimal-white"
  | "soft-gray-pro"
  | "mint-fresh"
  | "cream-beige"
  | "pastel-dream"
  | "lavender-mood"
  | "peach-soft"
  | "cloud-white"
  /* ── Premium themes ── */
  | "black-gold-empire"
  | "platinum-elite"
  | "royal-emerald"
  | "diamond-glass"
  | "executive-noir"
  | "neon-cyber"
  | "ai-matrix"
  | "hologram-pro"
  | "quantum-ui"
  | "hyperflow"
  | "influencer-studio"
  | "viral-creator"
  | "podcast-pro"
  | "video-funnel"
  | "streamer-mode"
  | "modern-ceo"
  | "startup-pitch"
  | "consultant-elite"
  | "financial-pro"
  | "realtor-luxe"
  | "soft-luxe"
  | "tokyo-nights"
  | "scandinavian"
  | "monochrome-art"
  | "velvet-rose"
  | "sales-funnel-pro"
  | "affiliate-machine"
  | "webinar-launch"
  | "mlm-authority"
  | "ai-personal-brand";

export interface ProfileTheme {
  id: ThemeId;
  name: string;
  background: string; // css background
  accent: "blue" | "jade" | "gold" | "white";
  buttonStyle: "solid" | "gradient" | "outline";
}

export interface ProfileSEO {
  title: string;
  description: string;
  ogImageUrl?: string;
}

export type ProfileStatus = "draft" | "published";

export interface Profile {
  id: string;
  ownerId: string;
  username: string;
  status: ProfileStatus;
  themeId: ThemeId;
  header: ProfileHeader;
  sections: ProfileSection[];
  seo: ProfileSEO;
  /** id of the profile this was cloned from, if any */
  clonedFrom?: string;
  /** AI audit scores, populated by the audit flow */
  audit?: ProfileAudit;
  createdAt: number;
  updatedAt: number;
}

/* ---------------- Leads ---------------- */

export interface Lead {
  id: string;
  profileId: string;
  ownerId: string;
  name: string;
  email?: string;
  phone?: string;
  source: string; // section id or "lead-capture"
  createdAt: number;
}

/* ---------------- Analytics ---------------- */

export type AnalyticsEventType =
  | "profile_view"
  | "cta_click"
  | "social_click"
  | "lead_submit"
  | "share"
  | "funnel_step";

export interface AnalyticsEvent {
  id: string;
  profileId: string;
  ownerId: string;
  type: AnalyticsEventType;
  target?: string; // button id, social platform, etc.
  createdAt: number;
}

export interface AnalyticsSummary {
  views: number;
  ctaClicks: number;
  socialClicks: number;
  leads: number;
  shares: number;
  conversionRate: number; // leads / views
}

/* ---------------- Templates ---------------- */

export interface Template {
  id: string;
  name: string;
  description: string;
  niche: string;
  themeId: ThemeId;
  previewImageUrl?: string;
  header: ProfileHeader;
  sections: ProfileSection[];
  featured: boolean;
  isTeamTemplate?: boolean;
}

/* ---------------- Shared builds ---------------- */

/** The portable part of a profile build — copy + sections, no identity. */
export interface SharedBuildContent {
  headline: string;
  bio: string;
  sections: ProfileSection[];
}

/** A profile build published as a share-coded, reusable template. */
export interface SharedBuild {
  id: string;
  ownerId: string;
  ownerName: string;
  name: string;
  shareCode: string;
  themeId: ThemeId;
  build: SharedBuildContent;
  /** When true the code no longer resolves — publisher disabled it. */
  revoked: boolean;
  createdAt: number;
  updatedAt: number;
}

/** A shared build saved into a user's locker (the Shared Builds page). */
export interface SavedBuild {
  id: string;
  /** id of the SharedBuild this snapshot came from */
  sourceId: string;
  shareCode: string;
  name: string;
  ownerName: string;
  themeId: ThemeId;
  build: SharedBuildContent;
  savedAt: number;
}

/* ---------------- Funnels ---------------- */

/** A funnel step's role in the visitor flow. */
export type FunnelStepType = "optin" | "content" | "offer" | "thankyou";

/** The button that advances the visitor, or links out. */
export interface FunnelCta {
  label: string;
  /** "next" moves to the following step; "url" opens an external link. */
  action: "next" | "url";
  url?: string;
}

/** One page in a funnel — a section-based page with an advance action. */
export interface FunnelStep {
  id: string;
  type: FunnelStepType;
  name: string;
  /** Page content — reuses the profile section system. */
  sections: ProfileSection[];
  /** Advance button. Omitted on a final thank-you step. */
  cta?: FunnelCta;
}

export type FunnelStatus = "draft" | "published";

/** A mini sales funnel — an ordered sequence of steps. */
export interface Funnel {
  id: string;
  ownerId: string;
  name: string;
  /** URL slug — the funnel lives at /{username}/{slug}. */
  slug: string;
  themeId: ThemeId;
  status: FunnelStatus;
  steps: FunnelStep[];
  createdAt: number;
  updatedAt: number;
}

/** The portable part of a funnel — theme + steps, links and ids stripped. */
export interface SharedFunnelContent {
  themeId: ThemeId;
  steps: FunnelStep[];
}

/** A funnel published as a share-coded, cloneable template. */
export interface SharedFunnel {
  id: string;
  ownerId: string;
  ownerName: string;
  name: string;
  shareCode: string;
  funnel: SharedFunnelContent;
  /** When true the code no longer resolves. */
  revoked: boolean;
  createdAt: number;
  updatedAt: number;
}

/* ---------------- Subscription ---------------- */

export type BillingPeriod = "monthly" | "annual";

export interface PlanFeature {
  label: string;
  included: boolean;
}

/** Where this plan can be purchased / who can see it. */
export type PlanVisibility = "public" | "affiliate";
export type PlanDurationUnit = "days" | "months" | "years";
export interface PlanDuration {
  value: number;
  unit: PlanDurationUnit;
}

/** Numeric caps granted by a plan. Admin-editable in /admin/subscriptions. */
export interface PlanLimits {
  /** Maximum number of funnels a user on this plan can create. */
  funnels?: number;
  /** Number of saved-build slots in the shared-build locker. */
  sharedBuilds?: number;
}

export interface Plan {
  /** Plan id — built-ins are "free" / "pro" / "team", custom ones are arbitrary slugs. */
  id: PlanId;
  name: string;
  /** Price for one billing period — monthly amount, or yearly amount when annual. */
  price: number;
  billingPeriod: BillingPeriod;
  tagline: string;
  /**
   * Display-only feature rows shown on the pricing card. Legacy free-text
   * format kept for plans created before the canonical catalogue was
   * introduced. New plans should prefer `featureKeys` for both display
   * AND functional gating; this field becomes a vestigial fallback that
   * the pricing display merges in.
   */
  features: PlanFeature[];
  /**
   * Canonical feature flags this plan includes — references stable keys
   * from FEATURE_CATALOG (lib/features.ts). Source of truth for both
   * pricing display AND code-level access checks via userHasFeature().
   * When the catalogue gains a new feature, every plan defaults to it
   * being off; admins flip it on per plan in /admin/subscriptions.
   */
  featureKeys?: string[];
  highlighted?: boolean;
  /**
   * Where this plan is sold:
   *   "public"    — shown on the website / billing page
   *   "affiliate" — hidden from the public, only assignable via admin / affiliate flow
   * Defaults to "public" if unset.
   */
  visibility?: PlanVisibility;
  /**
   * External checkout URL (e.g. Gumroad). When the user clicks "Buy" on the
   * billing page they're sent here. Each plan can point to its own Gumroad
   * product, so changing a URL never needs a code deploy.
   * Optional — affiliate plans usually have no checkout URL because the
   * affiliate collects payment manually.
   */
  checkoutUrl?: string;
  /**
   * How much the referring affiliate earns per sale AND per renewal of this
   * plan, in the same currency as `price` (PHP). 0 / undefined = no
   * affiliate commission.
   */
  commission?: number;
  /**
   * How long an activation lasts before renewal is due. Used to compute
   * upcoming-renewal reminders for affiliates. Optional — falls back to
   * `billingPeriod` (monthly → 1 month, annual → 1 year) when absent.
   */
  duration?: PlanDuration;
  /**
   * Numeric caps for the plan (funnel count, shared-build slots, etc.).
   * Admin-editable in /admin/subscriptions. When unset, the legacy
   * FUNNEL_LIMITS / TEMPLATE_LOCKER_SLOTS hardcoded maps are used as
   * fallback so existing plans don't break before being re-saved.
   */
  limits?: PlanLimits;
}

/* ---------------- Credibly University ---------------- */

/**
 * One topic card on the Credibly University page. Admins curate the
 * library via /admin/university; users browse via /university.
 * Each card links out to a funnel (or any URL) the admin specifies.
 *
 * Plan-gating: an empty `allowedPlans` array means the topic is
 * visible to every user. A non-empty array restricts visibility to
 * users on one of the listed plan ids — useful for "Pro-only" deep
 * dives or affiliate-only training material.
 */
export interface UniversityTopic {
  id: string;
  title: string;
  description: string;
  /** Public storage URL of the banner image (16:9 recommended). */
  bannerUrl: string;
  /** Free-text grouping label, e.g. "Getting Started", "Funnels". */
  category: string;
  /** Lower numbers appear first within their category. */
  sortOrder: number;
  /** CTA button label — defaults to "Start Lessons" via the admin form. */
  buttonText: string;
  /** Where the CTA points — typically a funnel URL. */
  buttonUrl: string;
  /**
   * Plan ids this topic is visible to. Empty = visible to all plans
   * (the typical case for general training). Admins can scope deeper
   * lessons to paid tiers by listing those plan ids here.
   */
  allowedPlans: PlanId[];
  /** Off = hidden from the user page without losing the record. */
  active: boolean;
  createdAt: number;
  updatedAt: number;
}

/* ---------------- Affiliate system ---------------- */

/** Lifecycle status for an affiliate account. */
export type AffiliateStatus = "active" | "paused";

/** How the affiliate wants to receive their payouts. */
export type AffiliatePayoutMethod = "gcash" | "bank" | "paypal" | "other";

export interface AffiliatePayout {
  type: AffiliatePayoutMethod;
  /** Free-text payout destination (e.g. account number, GCash mobile). */
  details: string;
}

/**
 * Affiliate account record. Doc id matches the affiliate's Firebase Auth
 * uid — i.e. /affiliates/{uid} mirrors /users/{uid} for users who have
 * `role: "affiliate"`. Stats are cached for cheap dashboard reads and
 * recomputed on commission events.
 */
export interface Affiliate {
  uid: string;
  /**
   * Unique referral code (e.g. "DAN123") shared in their `/r/<code>`
   * link. Uppercase, 3-32 chars, alphanumeric + dash/underscore.
   */
  code: string;
  email: string;
  displayName: string;
  status: AffiliateStatus;
  payout?: AffiliatePayout;
  /** Admin-only notes — not visible to the affiliate. */
  adminNotes?: string;
  createdAt: number;
  updatedAt: number;
  /**
   * Cached rollups so the dashboard doesn't have to scan the commissions
   * collection on every page load. Maintained by the commission helpers
   * in Step 5.
   */
  stats?: {
    totalReferrals: number;
    activeReferrals: number;
    totalEarned: number;
    pendingPayout: number;
    paidOut: number;
  };
}

/**
 * Pending invite token. Admin creates one of these per new affiliate;
 * the prospective affiliate clicks the link, sets a password, and the
 * invite is consumed (deleted or marked used).
 */
export interface AffiliateInvite {
  /** Random token used as the invite link's slug — also the doc id. */
  token: string;
  /** Email the invite was issued for (the affiliate's signup email). */
  email: string;
  /** Display name the admin entered when sending the invite. */
  displayName: string;
  /** Referral code reserved for this affiliate on accept. */
  code: string;
  /** Status — "pending" until accepted, then we delete the doc. */
  status: "pending" | "accepted" | "revoked";
  /** Optional admin note carried over to the affiliate's adminNotes. */
  adminNotes?: string;
  /** When this invite was issued. */
  createdAt: number;
  /** Optional expiry — invites older than this can't be accepted. */
  expiresAt?: number;
  /** When the invite was consumed (Firebase Auth uid of the new affiliate). */
  acceptedAt?: number;
  acceptedByUid?: string;
}

/* ---------------- Commission ledger ---------------- */

/** What kind of event generated this commission. */
export type CommissionType = "signup" | "renewal" | "adjustment";

/** Whether the affiliate has been paid out for this commission yet. */
export type CommissionStatus = "pending" | "paid" | "reversed";

/**
 * One row in the commission ledger. Created when an admin upgrades or
 * renews a user on a plan with a non-zero commission. Snapshots most
 * display fields (plan name, masked user email) so the affiliate's
 * dashboard can render the row without needing a Firestore join AND
 * without needing read access to other users' docs.
 *
 * `affiliateId` deliberately holds the affiliate's UID (not their
 * referral code) so Firestore rules can use
 * `resource.data.affiliateId == request.auth.uid` for read auth.
 * `affiliateCode` is the snapshot of the code at sale time, for display.
 */
export interface Commission {
  id: string;
  affiliateId: string;
  affiliateCode: string;
  /** The referred user this commission is for. */
  userId: string;
  /** Masked display fields snapshotted at write time. */
  userDisplayName: string;
  userEmailMasked: string;
  /** Plan that triggered this commission. */
  planId: PlanId;
  planName: string;
  /** Commission amount in PHP. */
  amount: number;
  type: CommissionType;
  status: CommissionStatus;
  earnedAt: number;
  paidAt?: number;
  /** Free-text note (e.g. admin reason for an adjustment). */
  notes?: string;
}

/* ---------------- AI layer ---------------- */

export type AICopyMode =
  | "professional"
  | "luxury"
  | "friendly"
  | "corporate"
  | "energetic"
  | "genz"
  | "recruiting"
  | "sales"
  | "personal-brand"
  | "authority";

export type AILanguage = "english" | "taglish";

export interface AIOnboardingAnswers {
  niche: string;
  company: string;
  offer: string;
  targetMarket: string;
  tone: AICopyMode;
  language: AILanguage;
  brandingStyle: string;
  mission: string;
  resultYouHelpAchieve: string;
}

/** Structured JSON the Gemini profile generator returns. */
export interface GeneratedProfileContent {
  headline: string;
  bio: string;
  ctaButtons: { label: string; intent: string }[];
  aboutSection: string;
  credibilitySection: string[];
  socialProof: { label: string; value: string }[];
  products: { title: string; description: string }[];
  testimonials: { authorName: string; quote: string }[];
  leadMagnet: string;
  suggestedSections: SectionType[];
}

/** Inputs collected by the AI funnel generator wizard. */
export interface AIFunnelAnswers {
  funnelType: string;
  goal: string;
  audience: string;
  result: string;
  tone: AICopyMode;
  language: AILanguage;
}

/** One AI-generated funnel step — copy only. */
export interface GeneratedFunnelStep {
  type: FunnelStepType;
  name: string;
  headline: string;
  body: string;
  ctaLabel: string;
}

/** Structured JSON the Gemini funnel generator returns. */
export interface GeneratedFunnelContent {
  funnelName: string;
  steps: GeneratedFunnelStep[];
}

export interface ProfileAuditScores {
  credibility: number;
  conversion: number;
  branding: number;
  clarity: number;
  overall: number;
}

export interface ProfileAuditSuggestion {
  area: string;
  severity: "low" | "medium" | "high";
  suggestion: string;
}

export interface ProfileAudit {
  scores: ProfileAuditScores;
  suggestions: ProfileAuditSuggestion[];
  headlineIdeas: string[];
  ctaIdeas: string[];
  generatedAt: number;
}

export type AIActionType =
  | "generate-profile"
  | "generate-headline"
  | "generate-bio"
  | "generate-cta"
  | "generate-recruiting-copy"
  | "generate-testimonials"
  | "generate-lead-magnet"
  | "rewrite-section"
  | "audit-profile"
  | "optimize-conversion";

export interface AIGenerationRecord {
  id: string;
  ownerId: string;
  action: AIActionType;
  mode: AICopyMode;
  language: AILanguage;
  promptSummary: string;
  createdAt: number;
  tokensApprox?: number;
}

export interface AIChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
}
