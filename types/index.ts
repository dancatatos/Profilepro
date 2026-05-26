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

export type UserRole = "user" | "admin";

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

export interface Plan {
  /** Plan id — built-ins are "free" / "pro" / "team", custom ones are arbitrary slugs. */
  id: PlanId;
  name: string;
  /** Price for one billing period — monthly amount, or yearly amount when annual. */
  price: number;
  billingPeriod: BillingPeriod;
  tagline: string;
  features: PlanFeature[];
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
