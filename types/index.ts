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
  /**
   * Consent record stamped at signup. Required for new users (DPA /
   * GDPR compliance); absent for users created before the consent
   * checkbox shipped — those are grandfathered in.
   */
  consent?: ConsentRecord;
  /**
   * Admin-granted feature add-ons that live OUTSIDE the plan system.
   * Set via /admin/users → Add-ons section. Used for capabilities we
   * want to comp to specific users (top affiliates, beta testers,
   * top MLM uplines) without changing their plan tier. Each flag is
   * a boolean gate; sizing limits live in `addOnLimits`.
   */
  addOns?: AccountAddOns;
  /**
   * Per-add-on numeric caps. Defaults live in DEFAULT_ADDON_LIMITS
   * (lib/constants.ts) — set a field here to override for a specific
   * user. 0 = blocked, 999 = effectively unlimited.
   */
  addOnLimits?: AccountAddOnLimits;
}

/** Add-on capability flags. Each is binary — granted or not. */
export interface AccountAddOns {
  /** Lets the user create team spaces + events with notifications. */
  events?: boolean;
}

/**
 * Per-add-on numeric caps. All optional — when unset, the resolver
 * falls back to DEFAULT_ADDON_LIMITS so admins only need to type a
 * number for the users they want to specifically override.
 */
export interface AccountAddOnLimits {
  /** Max team spaces this leader can own. Default 3. */
  teamSpaces?: number;
  /** Rolling-30-day cap on events this leader can create. Default 20. */
  eventsPerMonth?: number;
  /** Max members per team space. Default 500. */
  membersPerTeam?: number;
}

/**
 * Privacy / Terms consent record stamped onto the user doc at signup.
 * Proves the user actively agreed when their account was created — the
 * timestamp + version are the legal evidence in case of a future DPA
 * complaint or audit. Existing users (signed up before consent was
 * required) have this field unset; we treat them as grandfathered.
 */
export interface ConsentRecord {
  /** Epoch ms when the user ticked the consent checkbox. */
  agreedAt: number;
  /**
   * Version of the Terms + Privacy Policy they agreed to. Bump this
   * whenever the policy changes materially so we can detect stale
   * consents and re-prompt those users.
   */
  version: string;
  /** Separate marketing opt-in (optional under DPA — keeps it auditable). */
  marketingOptIn: boolean;
}

/** Per-user numeric overrides on top of plan-level limits. */
export interface UserLimitOverrides {
  /** Override the funnel count limit (0 = no funnels, undefined = use plan default). */
  funnels?: number;
  /** Override the shared-builds locker slot count. */
  sharedBuilds?: number;
  /** Override the follow-up pipeline count limit. */
  pipelines?: number;
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

/* ---------------- Marketing site content ---------------- */
/* All content the admin can edit from /admin/marketing without
   touching code. Stored as a single doc at settings/marketing
   (public-read so the homepage can render it anonymously,
   admin-write enforced by Firestore rules on the settings doc).
   Each section has an `enabled` flag so the admin can hide
   half-finished sections rather than ship placeholder copy. */

export interface MarketingStat {
  id: string;
  /** Big number or phrase, e.g. "200+", "₱0", "24h". */
  value: string;
  /** Small label under the value, e.g. "Profiles built". */
  label: string;
}

export interface MarketingTestimonial {
  id: string;
  name: string;
  /** e.g. "Wellness Coach · Manila" */
  role: string;
  quote: string;
  /** Optional public avatar URL — falls back to initials when missing. */
  avatarUrl?: string;
  /** 1-5 stars, 0/undefined hides the rating row. */
  rating?: number;
}

export interface MarketingVideoTestimonial {
  id: string;
  /** Display title under the video. */
  title: string;
  /** YouTube, Vimeo, or Adilo URL — normalised on render. */
  videoUrl: string;
  /** Speaker name shown under the title. */
  authorName?: string;
}

export interface MarketingFaqItem {
  id: string;
  question: string;
  answer: string;
}

/**
 * Everything on the public homepage that the admin can edit without
 * shipping code. Each editable section has its own `enabled` flag so
 * the admin can hide a section (e.g. "Testimonials") until they have
 * real content to put in, rather than show empty placeholders.
 */
export interface MarketingContent {
  hero: {
    badge: string;
    /** Two-line headline + a gradient phrase in between. */
    headlineLine1: string;
    headlineGradient: string;
    headlineLine2: string;
    subheadline: string;
    primaryCta: string;
    secondaryCta: string;
    /** Audience pills shown under the CTAs. */
    audiences: string[];
  };
  socialProof: {
    enabled: boolean;
    stats: MarketingStat[];
  };
  testimonials: {
    enabled: boolean;
    title: string;
    subtitle?: string;
    items: MarketingTestimonial[];
  };
  testimonialVideos: {
    enabled: boolean;
    title: string;
    subtitle?: string;
    items: MarketingVideoTestimonial[];
  };
  faq: {
    enabled: boolean;
    title: string;
    items: MarketingFaqItem[];
  };
  finalCta: {
    title: string;
    subtitle: string;
    primaryCta: string;
    secondaryCta: string;
  };
  /**
   * Configurable display labels for in-app feature names. Lets the
   * admin rebrand "Trainings" to "Programs", "Academy", "Trainings",
   * etc. from /admin/marketing without a code deploy. Each entry has
   * sensible defaults baked into the UI — empty/unset values fall
   * through to the default. Singular + plural so empty states and
   * counts read naturally.
   */
  featureLabels?: {
    /** What we call the "Trainings" feature in nav + copy. Default: "Trainings". */
    trainingsPlural?: string;
    /** Singular form, used in empty states and confirm dialogs. Default: "Training". */
    trainingsSingular?: string;
  };
  /**
   * The photo that fills the background of the "Made in PH for PH"
   * trust section on the homepage. When unset, the section uses a
   * curated default URL (or hides the section entirely if a hard
   * fallback is missing). Admin uploads from /admin/marketing.
   */
  trustPhotoUrl?: string;
  /** Alt text for the trust photo — accessibility + SEO. */
  trustPhotoAlt?: string;
  /**
   * Admin-configurable dashboard sidebar layout. When unset, the
   * sidebar renders DASHBOARD_NAV in its hardcoded order. Admin can
   * override the order + hide items in /admin/marketing.
   *
   * Stored as nav keys (matching DASHBOARD_NAV[].key) so a future
   * rename or removal of a code-level nav item gracefully falls
   * through — unknown keys in saved data are ignored, new items not
   * in saved data fall in at the end.
   *
   * `hidden` cannot remove "always-visible" keys ("home", "settings")
   * — those are filtered back in by the resolver so users can never
   * be stranded without a way home.
   */
  dashboardNav?: {
    /** Nav keys in the desired display order. */
    order?: string[];
    /** Nav keys the admin has explicitly hidden from the sidebar. */
    hidden?: string[];
  };
  /**
   * Homepage-only settings, edited from /admin/marketing under
   * "Homepage". Holds branding (logo + favicon), SEO meta, and the
   * 4 deep-dive feature sections rendered between the features grid
   * and pricing. Each deep-dive can embed a real Credibly funnel or
   * training URL inside the phone frame (LIVE marketing showcase).
   */
  homepage?: {
    branding?: {
      logoUrl?: string;
      faviconUrl?: string;
    };
    seo?: {
      title?: string;
      description?: string;
      ogImageUrl?: string;
    };
    deepDives?: HomepageDeepDive[];
  };
}

/** Stable ids for the 4 homepage deep-dive slots. Used so saved
 *  admin overrides survive future code-level renames. */
export type HomepageDeepDiveId =
  | "teamOnboarding"
  | "followUp"
  | "recruitmentFunnel"
  | "productFunnels";

/** Pastel blob colour behind the phone in a deep-dive. */
export type HomepageDeepDiveBlob = "lavender" | "mint" | "cream" | "butter";

/**
 * One feature deep-dive section on the homepage. Renders as a
 * LightDeepDive with the optional `embedUrl` shown inside the phone
 * frame via a sandboxed iframe. When `embedUrl` is empty the section
 * falls back to a static placeholder so the homepage never breaks.
 */
export interface HomepageDeepDive {
  id: HomepageDeepDiveId;
  eyebrow: string;
  title: string;
  body: string;
  bullets: string[];
  /** Credibly URL (funnel / training / profile) embedded in the phone. */
  embedUrl?: string;
  blob: HomepageDeepDiveBlob;
}

export interface FeatureFlags {
  /** When true, the standalone Template Marketplace tab is visible to users. */
  templateMarketplace: boolean;
  /**
   * Username of the user whose live profile is showcased in the
   * marketing landing page hero (the phone mockup). When unset, the
   * homepage falls back to the hardcoded DEMO_PROFILE. Admin picks
   * this from /admin so the showcase can rotate without code changes
   * — perfect for highlighting real customer profiles that have
   * actual photos and credibility content.
   */
  featuredProfileUsername?: string;
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
  | "image"
  | "embedHtml"
  | "leadCapture"
  | "appointment"
  | "text"
  | "countdown"
  | "hero"
  | "cover"
  | "benefits"
  | "faq"
  | "pricingCard"
  | "payment";

/**
 * How a CTA button row is laid out horizontally. Defaults to "stretch"
 * for back-compat with every CTA shipped before the alignment control
 * existed — that's the current full-width-button behaviour. The other
 * three sizes the button to its content and positions it at the
 * left / center / right of the section.
 */
export type CtaAlignment = "stretch" | "left" | "center" | "right";

/**
 * Manual payment method the owner accepts (GCash, Maya, BPI, etc.).
 * Stored on the Profile so any payment section in any funnel can
 * reuse them — set once, accept payments everywhere.
 */
export type PaymentMethodType =
  | "gcash"
  | "maya"
  | "bpi"
  | "bdo"
  | "unionbank"
  | "metrobank"
  | "landbank"
  | "other";

export interface PaymentMethod {
  id: string;
  type: PaymentMethodType;
  /** Display label, e.g. "Main GCash" or "Business BPI". */
  label: string;
  /** Phone number for e-wallets, account number for banks. */
  accountNumber: string;
  /** Name on the account — visitors verify it matches before sending. */
  accountName: string;
  /**
   * Optional QR code image URL (Firebase Storage). For GCash/Maya QR
   * codes that visitors can scan with their banking app.
   */
  qrImageUrl?: string;
  enabled: boolean;
  sortOrder: number;
}

/**
 * What a button does after the click:
 *   "url"  → open the configured URL in a new tab (current default)
 *   "next" → advance to the next funnel step (no-op outside funnels)
 *   "none" → do nothing extra — just visual, useful for analytics tracking
 *
 * Optional + defaults to "url" everywhere so existing CTAs keep
 * working without migration.
 */
export type CtaActionKind = "url" | "next" | "none";

export interface CTAButton {
  id: string;
  label: string;
  url: string;
  icon: string; // lucide icon name or social key
  style: "solid" | "gradient" | "outline";
  accent: "blue" | "jade" | "gold" | "white";
  /** What happens when this button is clicked. Defaults to "url". */
  action?: CtaActionKind;
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

/**
 * Per-section background override. Owners can paint either the
 * section's inner CARD tile (cardBg) or the full-width SECTION
 * CONTAINER stripe behind it (containerBg) — or both. Either field
 * accepts:
 *   - A CSS color string ("#FFB800", "rgba(0,0,0,0.6)", "transparent")
 *   - One of the curated swatches resolved by the renderer
 *     ("accent" | "soft" | "subtle" | "inverse") — these read from
 *     theme CSS vars so they always stay on-brand even when the
 *     owner switches themes.
 *   - Undefined → no override (theme default).
 *
 * Text color auto-flips for readability based on the resolved
 * background luminance, so owners can't accidentally make a section
 * unreadable.
 */
export type SectionBgValue =
  | "accent"
  | "soft"
  | "subtle"
  | "inverse"
  | string;

export interface SectionBase {
  id: string;
  enabled: boolean;
  /** heading shown above the section on the public profile */
  title?: string;
  /** Override for the section's inner card tile colour. */
  cardBg?: SectionBgValue;
  /** Override for the full-width section container stripe colour. */
  containerBg?: SectionBgValue;
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
  /** Horizontal layout for the button row. Defaults to "stretch". */
  align?: CtaAlignment;
}

/**
 * Single image block — a quick way to drop one photo, banner or
 * graphic into a profile or funnel step without spinning up a full
 * gallery grid. Common uses: a product shot, a results screenshot,
 * a workshop poster, a hand-drawn brand graphic.
 *
 * Optional `linkUrl` turns the image into a clickable link. `align`
 * + `maxWidth` let the owner control how prominent the image feels
 * on the page without needing CSS knowledge.
 */
export interface ImageSection extends SectionBase {
  type: "image";
  /** Public URL of the uploaded image. */
  url?: string;
  /** Small caption shown under the image. */
  caption?: string;
  /** Optional click-through — when set, the image becomes a link. */
  linkUrl?: string;
  /** Horizontal position. Defaults to "center". */
  align?: "left" | "center" | "right";
  /** Visual width cap. Defaults to "md" — a comfortable mobile-first size. */
  maxWidth?: "sm" | "md" | "lg" | "full";
}

/**
 * Embed third-party HTML — Calendly, Tally forms, ManyChat widgets,
 * Stripe pricing tables, Google Maps, custom calculators, etc.
 *
 * SECURITY: The HTML runs inside a sandboxed iframe via the srcdoc
 * attribute, with `sandbox="allow-scripts allow-popups allow-forms"`
 * and NO `allow-same-origin`. That means embedded scripts execute
 * with a null origin — they can fetch external resources (so Calendly,
 * GA, Pixel, etc. all work) but CANNOT touch the parent page's DOM,
 * cookies, or localStorage. This is the same boundary Linktree,
 * Beacons, and Carrd use. Owners can paste arbitrary embed code
 * without any risk to other users or to the Credibly domain.
 *
 * Height is preset (sm/md/lg/xl → 320/480/720/1000 px) rather than
 * a free-text number, both for visual consistency and because
 * letting users type pixel values is a common foot-gun.
 */
export interface EmbedHtmlSection extends SectionBase {
  type: "embedHtml";
  /** Raw HTML the owner pasted from the embed provider. */
  html: string;
  /**
   * Iframe height behaviour.
   *   "auto" (default for new embeds) → iframe grows to fit content
   *                                     via postMessage ResizeObserver.
   *                                     No scrollbar, no empty space.
   *                                     Card framing is dropped so the
   *                                     embed visually merges with the
   *                                     page.
   *   "sm" | "md" | "lg" | "xl"       → fixed pixel height presets.
   *                                     Content taller than the preset
   *                                     scrolls inside the iframe; content
   *                                     shorter leaves empty space. Kept
   *                                     for back-compat and cases where
   *                                     the owner wants a specific size
   *                                     (e.g. small contact widget).
   *   Undefined reads as "md" so heroes created before "auto" existed
   *   stay visually identical.
   */
  height?: "auto" | "sm" | "md" | "lg" | "xl";
  /** Small caption shown under the embed (optional). */
  caption?: string;
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
/**
 * Where the headline / subhead / CTA sit over the hero image when
 * layout is "overlay". 9-position grid — first letter is vertical
 * (top / center / bottom), second is horizontal (left / center / right).
 */
export type HeroAlign =
  | "tl" | "tc" | "tr"
  | "cl" | "cc" | "cr"
  | "bl" | "bc" | "br";

/** Darkness of the gradient overlay applied over the hero image so
 *  text stays readable on busy backgrounds. */
export type HeroOverlay = "none" | "light" | "medium" | "dark";

/** Image aspect ratio for the hero. Defaults to 16:9. */
export type HeroAspect = "16:9" | "4:3" | "1:1" | "21:9" | "3:4";

/**
 * Cover — full-container-width image-as-background section with
 * optional headline / subhead / CTA overlay. Distinct from Hero:
 *
 *   Hero   → opt-in card with image+text in stacked or overlay mode.
 *            Lives inside the section's normal width.
 *   Cover  → image spans the FULL width of the funnel/profile
 *            content container at every breakpoint (mobile = full
 *            mobile width, tablet = full tablet container, desktop =
 *            full desktop container). Aspect ratio drives height.
 *            Use for landing-page hero banners.
 *
 * Same field shape as Hero overlay so owners can switch between them
 * intuitively. Behaviour difference is purely the render: Cover
 * escapes the section card padding and bleeds to its parent
 * container's edges; Hero stays inside the section card.
 */
export interface CoverSection extends SectionBase {
  type: "cover";
  imageUrl?: string;
  headline?: string;
  subhead?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  overlay?: HeroOverlay;
  align?: HeroAlign;
  textColor?: "light" | "dark";
  aspectRatio?: HeroAspect;
}

export interface HeroSection extends SectionBase {
  type: "hero";
  headline: string;
  subtext: string;
  /** Optional background image URL. */
  backgroundUrl?: string;
  /**
   * Layout mode.
   *   "stacked" (default for existing data) — image on top, text in a card below
   *   "overlay" (default for new hero sections) — image is full-bleed, text
   *      overlays on top with optional gradient. If all text fields + CTA are
   *      empty, renders as a clean full-bleed image with no overlay.
   * Undefined reads as "stacked" so heroes created before this change
   * look exactly the same — owners opt in to overlay by switching it.
   */
  layout?: "stacked" | "overlay";
  /** Optional CTA button label (overlay mode only). */
  ctaLabel?: string;
  /** Optional CTA destination URL (overlay mode only). */
  ctaUrl?: string;
  /** Gradient darkness over the hero image. Defaults to "medium". */
  overlay?: HeroOverlay;
  /** Where text sits over the image. Defaults to "cc" (centered). */
  align?: HeroAlign;
  /** Force-pick text color when image brightness is unpredictable. */
  textColor?: "light" | "dark";
  /** Image aspect ratio. Defaults to "16:9". */
  aspectRatio?: HeroAspect;
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
  /** What the CTA button does. Defaults to "url" for back-compat. */
  ctaAction?: CtaActionKind;
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
/**
 * How the video section lays out its embeds in the public renderer.
 *   auto   → renderer picks based on count:
 *              1 video  → "hero"
 *              2-3      → "row"
 *              4+       → "grid"
 *   hero   → first video full-width, any remaining videos in a 2-col grid below
 *   row    → every video at full container width, stacked vertically
 *   grid   → responsive 2-3 col grid (best for short clips)
 *   reels  → portrait 9:16 aspect, horizontal scrollable strip (TikTok/IG-style)
 */
export type VideoLayout = "auto" | "hero" | "row" | "grid" | "reels";

export interface VideoSection extends SectionBase {
  type: "video";
  videos: VideoEmbed[];
  /** Optional layout override. Defaults to "auto" when unset. */
  layout?: VideoLayout;
}
export interface GallerySection extends SectionBase {
  type: "gallery";
  images: GalleryImage[];
}
/**
 * What happens after a visitor successfully submits the lead form.
 * The lead is ALWAYS saved first; this only controls the navigation
 * that fires after the save resolves.
 *   "next" → auto-advance to the next funnel step (default, current behavior)
 *   "url"  → redirect to a custom URL (e.g. an external checkout)
 *   "stay" → keep them on the current page and just show success
 */
export type LeadCapturePostSubmitAction = "next" | "url" | "stay";

/**
 * One custom intake question on a Lead Capture form. Mirrors
 * AppointmentQuestion: owner adds any number, toggles each on/off
 * independently, and the public renderer shows one labeled textarea
 * per enabled question below the standard Name/Email/Phone fields.
 * The answer is stored on the Lead doc as a snapshot so renaming the
 * question later doesn't lose context for already-captured leads.
 */
export interface LeadQuestion {
  id: string;
  question: string;
  enabled: boolean;
}

export interface LeadCaptureSection extends SectionBase {
  type: "leadCapture";
  headline: string;
  subtext?: string;
  fields: LeadFieldKey[];
  /** Custom intake questions — only enabled ones appear on the form. */
  questions?: LeadQuestion[];
  channels: LeadCaptureChannels;
  /** Post-save navigation. Defaults to "next". */
  postSubmitAction?: LeadCapturePostSubmitAction;
  /** Target URL when postSubmitAction === "url". */
  postSubmitUrl?: string;
}

/**
 * Manual payment collection — visitors send GCash / Maya / bank
 * transfers externally, then upload a receipt screenshot to prove
 * they paid. Owner reviews + approves in their /payments dashboard.
 *
 * Works without any payment processor — perfect for the PH market
 * where most SMBs don't have card processing set up. The owner
 * collects through their personal accounts, Credibly just facilitates
 * the receipt-upload + verification workflow.
 */
export interface PaymentSection extends SectionBase {
  type: "payment";
  headline: string;
  subtext?: string;
  /** Fixed amount, e.g. 500 PHP. */
  amount: number;
  currency: "PHP" | "USD";
  /**
   * When true, the amount field becomes user-editable on the form
   * (the configured `amount` becomes a default). Use for donations
   * or pay-what-you-want scenarios.
   */
  allowCustomAmount?: boolean;
  /**
   * Which payment methods from the profile to show in this section.
   * Empty array = show all enabled methods. Lets owners limit a
   * specific funnel to only GCash, for example.
   */
  enabledMethodIds: string[];
  /** Fields to collect from the visitor along with the receipt. */
  fields: LeadFieldKey[];
  /**
   * After the owner approves the payment, auto-route the lead into
   * this pipeline. Pulled from the owner's existing pipeline list.
   * Optional — owner can manage manually if unset.
   */
  approvalPipelineId?: string;
  /**
   * Shown to visitor after they successfully submit. Customizable
   * so owner can include payment instructions, expected timeline,
   * or thank-you copy.
   */
  successMessage?: string;
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
  | CoverSection
  | BenefitsSection
  | FaqSection
  | PricingCardSection
  | CredibilitySection
  | TestimonialsSection
  | ProductsSection
  | VideoSection
  | GallerySection
  | ImageSection
  | EmbedHtmlSection
  | LeadCaptureSection
  | AppointmentSection
  | PaymentSection;

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
  | "ai-personal-brand"
  /* ── Premium themes (Session 4) ── */
  | "honey-editorial"
  | "midnight-platinum"
  | "sage-organic"
  | "brutalist-press"
  | "sunset-coral"
  | "obsidian-emerald"
  /* ── Premium themes (Session 5) ── */
  | "citrus-pop"
  | "clay-terracotta"
  | "inkwell-zen"
  | "vapor-violet"
  | "mocha-bean"
  | "cobalt-forge"
  | "paper-rose"
  | "archive-navy"
  | "prairie-burnt"
  | "canvas-gallery"
  | "glacier-arctic"
  /* ── Premium themes (Session 6 — orange lineup) ── */
  | "persimmon-modern"
  | "amber-glow"
  | "marigold-festival"
  | "ember-luxe"
  | "safran-spice";

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
  /**
   * Optional override: which follow-up pipeline leads captured from
   * this profile's lead-capture section route into. Falls back to the
   * user's default pipeline when unset. Symmetric with `Funnel.pipelineId`.
   */
  pipelineId?: string;
  /**
   * Manual payment methods (GCash, Maya, BPI, etc.) the owner accepts.
   * Set once on the profile, reused across any payment section in any
   * funnel. PaymentSection.enabledMethodIds references these by id.
   */
  paymentMethods?: PaymentMethod[];
  createdAt: number;
  updatedAt: number;
}

/* ---------------- Leads ---------------- */

/**
 * Log entry for a follow-up template the user has marked as "sent" to a
 * lead. Kept inline on the Lead doc as a flat list so reading the lead
 * also tells you which messages they've received — no extra Firestore
 * query needed for the "Sent" badge in the lead detail modal.
 *
 * Identity = `${stageId}:${messageId}` (composite key). A message
 * appears at most once per lead; re-sending replaces the prior entry's
 * timestamp so the user always sees the most recent send.
 */
export interface SentMessageLog {
  /** Stage the message belongs to (so re-shuffling stages doesn't lose history). */
  stageId: string;
  /** ID of the FollowUpMessage that was sent. */
  messageId: string;
  /** Which language version was sent — for analytics + future per-lang sequencing. */
  language: "english" | "taglish";
  /** Epoch ms when the user marked it as sent. */
  sentAt: number;
}

export interface Lead {
  id: string;
  profileId: string;
  ownerId: string;
  name: string;
  email?: string;
  phone?: string;
  source: string; // section id or "lead-capture"
  createdAt: number;
  /* Follow-up pipeline tracking. Set when the lead is enrolled in a
     pipeline (either auto-enrolled on capture or manually added). The
     daily task system surfaces leads whose nextTaskAt is in the past. */
  pipelineId?: string;
  stageId?: string;
  /** When the lead entered the current stage. Used to compute "stuck" leads. */
  stageEnteredAt?: number;
  /** When the next follow-up task is due — surfaced in daily task list. */
  nextTaskAt?: number;
  /** Free-text task note the user can add when scheduling next follow-up. */
  taskNotes?: string;
  /**
   * Per-message "sent" log so the user knows which template they've
   * already pasted into Messenger for this lead. Surfaced as a green
   * "Sent X ago" badge on each template card in the Lead Detail modal.
   */
  sentMessages?: SentMessageLog[];
  /**
   * Snapshots of any custom Lead Capture questions the visitor
   * answered. `question` is denormalised so later renames don't lose
   * context on historical leads. Empty / absent when the form had no
   * custom questions or the visitor skipped them all.
   */
  customAnswers?: LeadCustomAnswer[];
}

export interface LeadCustomAnswer {
  questionId: string;
  /** Snapshot of the question text at submit time. */
  question: string;
  answer: string;
}

/* ---------------- Manual Payment Submissions ---------------- */

/**
 * A receipt-upload submitted by a visitor through a payment section.
 * Created with status="pending"; owner reviews + approves in
 * /payments. Approval optionally moves a derived lead into a pipeline
 * stage and sends the visitor a confirmation email.
 */
export interface PaymentSubmission {
  id: string;
  ownerId: string;
  profileId: string;
  /** Where the submission came from — "funnel:<slug>" or "profile". */
  source: string;
  /** Section id that triggered the submission, for analytics + routing. */
  sectionId: string;

  /* ── Visitor details ── */
  visitorName: string;
  visitorEmail?: string;
  visitorPhone?: string;

  /* ── Payment details ── */
  amount: number;
  currency: "PHP" | "USD";
  /** Which of the owner's methods the visitor used. */
  paymentMethodId: string;
  /** Snapshot of the method label at submit time (in case owner renames later). */
  paymentMethodLabel: string;
  /** Bank/e-wallet reference number the visitor typed in. */
  referenceNumber?: string;
  /** Optional free-text note from the visitor ("First-time customer!"). */
  userNote?: string;

  /* ── Receipt ── */
  /** Public URL of the uploaded receipt image in Firebase Storage. */
  receiptUrl: string;

  /* ── Review state ── */
  status: "pending" | "approved" | "rejected";
  submittedAt: number;
  reviewedAt?: number;
  /** Admin / owner uid who reviewed it. */
  reviewerId?: string;
  /** Reason text shown to the visitor when rejected. */
  rejectionReason?: string;
  /** Free-text private notes from the owner. */
  adminNotes?: string;

  /**
   * If approval routed the visitor into a pipeline, this is the lead
   * doc id created/touched by the approval action. Lets us link
   * back from the payment list to the corresponding lead.
   */
  linkedLeadId?: string;

  /**
   * When the submission originated from a paid-mode training (vs. a
   * generic funnel payment section), this carries the training id so
   * the /payments review flow can offer a "Grant training access"
   * one-tap button on approval. Optional — funnel payments never set it.
   */
  trainingId?: string;
}

/* ---------------- Follow-Up Pipeline ---------------- */

/** Industry presets used to seed a new pipeline with sensible defaults. */
export type PipelineIndustry =
  | "recruiting"
  | "insurance"
  | "real_estate"
  | "coaching"
  | "sales"
  | "custom";

/**
 * One pre-written follow-up message in a stage's sequence.
 * The pipeline owner writes these once; users copy them when
 * a follow-up task comes due.
 */
export interface FollowUpMessage {
  id: string;
  /** Short label for this message — e.g. "Day 1", "Day 3 check-in". */
  label: string;
  /** The full message body the user will copy and paste. */
  body: string;
}

/** One column in a pipeline (e.g. "Cold", "Interested", "Joined"). */
export interface PipelineStage {
  id: string;
  name: string;
  /** Optional tailwind color class (e.g. "bg-electric-500/15") — drives the column tint. */
  color?: string;
  sortOrder: number;
  /** Suggested days between this stage and the next — used to set default
   *  nextTaskAt when a lead moves into this stage. */
  daysBeforeNextTask?: number;
  /** Optional AI-prompt context unique to this stage, used by the message
   *  generator (e.g. "the lead just watched the intro video"). */
  aiContext?: string;
  /**
   * The desired outcome for this stage — shown as a goal banner in the
   * lead detail modal so the user knows what they're trying to achieve.
   * e.g. "Book a discovery call", "Get them to watch the intro video".
   */
  followUpGoal?: string;
  /**
   * Pre-written follow-up message sequence for this stage (English).
   * Pipeline owners write these once; users copy the relevant message
   * when a follow-up task comes due — no AI needed.
   * Ordered: first message is the earliest in the sequence (Day 1, etc.).
   */
  followUpMessages?: FollowUpMessage[];
  /**
   * Parallel Taglish sequence — same purpose as `followUpMessages` but
   * in Tagalog-English code-switched copy. Users toggle between EN/TL
   * in the lead modal; each stage can have either, both, or neither.
   */
  followUpMessagesTaglish?: FollowUpMessage[];
}

/**
 * A user's follow-up pipeline definition. Pipelines are user-owned —
 * each user can have multiple (one for each niche / use case). The
 * default pipeline is where new leads auto-enroll.
 */
export interface Pipeline {
  id: string;
  ownerId: string;
  name: string;
  description?: string;
  industry: PipelineIndustry;
  /** When true, new leads automatically enrol here. Only one default per user. */
  isDefault: boolean;
  stages: PipelineStage[];
  /** Shareable code (e.g. "PIPE-AB12CD") — present once the user "Shares" the pipeline. */
  shareCode?: string;
  /** Tracking: how many other users have cloned this via the share code. */
  cloneCount?: number;
  /**
   * Set when this pipeline was cloned into the owner's account by a
   * team onboarding bundle. Holds the id of the leader's source
   * pipeline so re-running the bundle (e.g. recruit re-scans the team
   * QR) can detect the existing clone and skip instead of duplicating.
   * Absent on pipelines the user created themselves.
   */
  clonedFromBundleSource?: string;
  createdAt: number;
  updatedAt: number;
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
  /**
   * Optional URL slug used for deep-linking directly to this step
   * from outside the funnel:
   *   /{username}/{funnel-slug}?step={this-slug}
   * Falls back to the step's 1-based index when unset (e.g. ?step=2).
   * Slug-style values like "watch-training" are nicer to share than
   * numeric indices; absent values still get a deep link via index.
   */
  slug?: string;
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
  /**
   * Optional override: which follow-up pipeline this funnel's leads
   * route into. When unset, leads fall back to the user's default
   * pipeline (the one marked `isDefault: true`). Lets owners run
   * multiple funnels (e.g. "Free Training", "Insurance Quote") and
   * have each one land in a separate, niche-appropriate pipeline.
   */
  pipelineId?: string;
  /**
   * Set when this funnel was cloned into the owner's account by a
   * team onboarding bundle. Holds the id of the leader's source
   * funnel so re-running the bundle (e.g. recruit re-scans the team
   * QR) can detect the existing clone and skip instead of duplicating.
   * Absent on funnels the user created themselves.
   */
  clonedFromBundleSource?: string;
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
  /**
   * Maximum number of follow-up pipelines this plan can create. Soft cap
   * to keep the pipeline-switcher useful and prevent accidental
   * duplicates from the template picker. Unset = unlimited.
   */
  pipelines?: number;
  /**
   * Maximum number of trainings this user can author (originals OR
   * clones — they share the same slot pool). Free typically 0,
   * Pro 1, Team 5. 0 blocks the create button outright.
   */
  trainingsCreate?: number;
  /**
   * Maximum number of trainings the user can have unlocked / active
   * in their library at once. Drives the freemium upgrade nudge:
   * free=1, paid plans effectively unlimited. When the cap is hit,
   * the activation flow shows a "remove one to make room" prompt.
   */
  trainingsActivate?: number;
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
 * Optional downloadable resource attached to a lesson — script PDF,
 * slide deck, spreadsheet template, etc. Stored as a list of typed
 * URLs so the player can render them as a uniform group.
 */
export interface UniversityResource {
  id: string;
  label: string;
  /** Public URL — Firebase Storage, Google Drive share link, etc. */
  url: string;
}

/**
 * One lesson inside a University topic. Lessons are stored inline on
 * the topic document (not a subcollection) — at the typical 5-10
 * lessons per topic, embedding keeps the Firestore read count to 1
 * for the entire course, which is the right trade-off for a
 * read-heavy / write-rare resource like training content.
 */
export interface UniversityLesson {
  id: string;
  title: string;
  /** 1-2 line summary shown next to the lesson title. */
  description?: string;
  /**
   * Video URL — YouTube, Adilo, Vimeo, or direct MP4. The player
   * normalizes common share-URL formats into the right embed shape
   * at render time, so admins can paste whatever the host gave them.
   */
  videoUrl?: string;
  /** Lesson notes / transcript — Markdown-ish, rendered as styled text. */
  body?: string;
  /** Optional, drives the "[12:48]" badge next to the lesson row. */
  durationMinutes?: number;
  /** Optional downloads — slide deck, script PDF, swipe file. */
  resources?: UniversityResource[];
  /**
   * Free-preview flag. When true, this lesson is unlocked for every
   * user regardless of plan — even if the parent topic is gated.
   * The convention is "lesson 1 free, rest gated" to drive upgrades.
   */
  freePreview: boolean;
  /** Lower numbers appear first in the lesson list. */
  sortOrder: number;
}

/**
 * One topic card on the Credibly University page. Admins curate the
 * library via /admin/university; users browse via /university.
 *
 * Each topic now hosts a sequence of in-app lessons (video + notes +
 * downloads). The previous "buttonText / buttonUrl" external-link
 * pattern is kept for backwards-compatibility with existing rows
 * that haven't been migrated yet — when both lessons and a button
 * URL exist, lessons win and the button URL is ignored.
 *
 * Plan-gating: an empty `allowedPlans` array means the topic is
 * visible to every user. A non-empty array restricts visibility to
 * users on one of the listed plan ids — useful for "Pro-only" deep
 * dives or affiliate-only training material. The per-lesson
 * `freePreview` flag overrides this for individual lessons.
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
  /**
   * Legacy CTA — when no lessons exist, the user-facing card falls
   * back to this external link so existing topics keep working
   * during the rollout. New topics created via the lesson editor
   * leave these blank.
   */
  buttonText: string;
  buttonUrl: string;
  /** In-app lessons. When present, the card opens the player instead of buttonUrl. */
  lessons?: UniversityLesson[];
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

/**
 * Per-user lesson completion log. One doc per (user, lesson) pair,
 * stored in a flat collection so the user's full progress can be
 * fetched in a single query.
 *
 * Doc id format: `${userId}__${lessonId}` — composite key prevents
 * duplicate completions and lets us upsert with a deterministic ref.
 */
export interface UniversityProgress {
  id: string;
  userId: string;
  topicId: string;
  lessonId: string;
  completedAt: number;
}

/* ---------------- Trainings (user-owned courses) ---------------- */

/**
 * Distribution mode determines who can unlock and watch a training.
 *   "public" — anyone with the URL can watch, no code needed
 *   "team"   — code-gated, free; learners pay nothing, owner just
 *              wants to limit access to their team / list
 *   "paid"   — code-gated AND payment-gated; visitor pays via the
 *              owner's manual-payment receipt flow, owner approves
 *              from /payments, access granted
 *
 * The same training data structure supports all three — the owner
 * just flips the switch in the Distribution tab.
 */
export type TrainingDistribution = "public" | "team" | "paid";

export type TrainingStatus = "draft" | "published";

/**
 * One lesson inside a training. Mirrors UniversityLesson nearly 1:1
 * so the lesson editor + player can be ported cleanly. Kept inline
 * on the training doc (not a subcollection) for the same reason —
 * 5-15 lessons per training means a single Firestore read returns
 * the whole curriculum.
 */
export interface TrainingLesson {
  id: string;
  title: string;
  description?: string;
  /** Video URL — YouTube, Adilo, Vimeo or direct MP4. */
  videoUrl?: string;
  /** Notes / transcript. Plain text with newlines preserved. */
  body?: string;
  durationMinutes?: number;
  resources?: UniversityResource[];
  /**
   * When true, this lesson is unlocked even for visitors who haven't
   * activated the training — a "free preview" to drive activations
   * on the public landing page.
   */
  freePreview: boolean;
  sortOrder: number;
}

/**
 * A training the user authored or cloned. Hard cap of 15 lessons
 * per training (enforced in the editor) so the in-app player stays
 * scannable on mobile.
 *
 * Two codes:
 *   `shareCode`      — used by OTHER LEADERS to clone the training
 *                       into their own account so they can monitor
 *                       their own downline separately
 *   `activationCode` — used by LEARNERS to unlock watching access;
 *                       their progress reports to THIS training's
 *                       owner, not the upstream original
 *
 * Cloning produces a fully independent copy — the cloned training
 * gets its own pair of codes and its own learner list. Editing the
 * original does NOT propagate to clones (same model as SharedBuild).
 */
export interface Training {
  id: string;
  ownerId: string;
  /** URL slug — public training lives at /{username}/t/{slug}. */
  slug: string;
  title: string;
  description: string;
  bannerUrl?: string;
  lessons: TrainingLesson[];
  status: TrainingStatus;
  distribution: TrainingDistribution;
  /** Code other leaders use to clone this training. */
  shareCode: string;
  /** Code learners use to activate / unlock watching access. */
  activationCode: string;
  /** Set when this training was cloned from another. Vanity field
   *  for "where did this come from" attribution + future analytics. */
  clonedFrom?: string;
  /** How many other leaders have cloned this training. Maintained
   *  on the original whenever a clone is created. */
  cloneCount?: number;
  /* ── Paid-mode settings ── */
  /** Price in PHP. Only meaningful when distribution === "paid". */
  price?: number;
  /**
   * Which of the owner's payment methods (from Profile.paymentMethods)
   * to accept for this training. Empty = all enabled methods.
   */
  paymentMethodIds?: string[];
  /* ── Pipeline auto-grant (optional) ── */
  /** When set, learners moved into the configured pipeline+stage
   *  automatically receive activation for this training. */
  autoGrantPipelineId?: string;
  autoGrantStageId?: string;
  /** Send the auto-granted learner an unlock email. */
  autoGrantSendEmail?: boolean;
  createdAt: number;
  updatedAt: number;
}

/**
 * Per-(user, training) access record. Created when a learner
 * activates with a code, gets pipeline-auto-granted, or buys
 * the training. The doc id is `${userId}__${trainingId}` so the
 * uniqueness constraint is enforced at the storage layer.
 *
 * Counts against the user's `trainingsActivate` plan cap — the
 * free-tier "1 training only" gate reads this collection.
 */
export interface TrainingAccess {
  id: string;
  userId: string;
  trainingId: string;
  /** Owner of the training (denormalised for cheap dashboard reads). */
  ownerId: string;
  unlockedAt: number;
  unlockedVia: "activation" | "purchase" | "public" | "pipeline";
  /** Code used at activation time (for audit). */
  activationCode?: string;
}

/**
 * Per-(user, lesson) progress log. One doc per completed lesson.
 * Doc id format `${userId}__${lessonId}` to prevent duplicates.
 * Reuses the same shape as UniversityProgress for consistency.
 */
export interface TrainingProgress {
  id: string;
  userId: string;
  trainingId: string;
  lessonId: string;
  completedAt: number;
}

/* ---------------- Team Events (admin-granted add-on) ---------------- */

/**
 * A "team space" — a leader-owned container for team events. Members
 * join via a share/activation code (link or QR) and start seeing the
 * leader's events in their /my-events page + dashboard widget.
 *
 * NOT part of the plan system — only users with addOns.events === true
 * can create these. Per-user limits in addOnLimits cap how many spaces
 * each leader can own.
 *
 * Members never need the add-on; they just join + consume.
 */
export interface TeamSpace {
  id: string;
  ownerId: string;
  name: string;
  /** URL slug — public team landing at /{username}/team/{slug} (Tier 2). */
  slug: string;
  description?: string;
  bannerUrl?: string;
  /** Code other leaders could use to clone (parity with trainings — Tier 2). */
  shareCode: string;
  /** Code members use to join via /join/team/{code}. */
  activationCode: string;
  /** Cached member count for cheap dashboard reads. Maintained by helpers. */
  memberCount?: number;
  /**
   * "Team-in-a-box" onboarding bundle. When a recruit joins this team
   * (link, QR or manual code), each of the four slots fires
   * automatically after the TeamMembership is created:
   *   - trainings  → TrainingAccess records granted
   *   - funnels    → cloned into the recruit's own account
   *   - pipelines  → cloned into the recruit's own account (never default)
   *   - events     → EventRsvp "going" auto-created (future events only)
   *
   * Plan caps short-circuit per item — over-cap items are silently
   * skipped and surfaced on the post-join summary screen with an
   * upgrade nudge. Bundle changes are NOT retroactive: items only
   * apply at the moment of join. All four arrays are optional, empty
   * = nothing happens for that slot.
   */
  autoGrantTrainingIds?: string[];
  autoGrantFunnelIds?: string[];
  autoGrantPipelineIds?: string[];
  autoGrantEventIds?: string[];
  createdAt: number;
  updatedAt: number;
}

/**
 * Per-(user, team) membership record. Doc id = `${userId}__${teamSpaceId}`
 * for uniqueness + idempotent re-joins.
 */
export interface TeamMembership {
  id: string;
  userId: string;
  teamSpaceId: string;
  /** Denormalised owner for cheap read-side access checks. */
  ownerId: string;
  joinedAt: number;
  /** Which channel they joined through — useful for the leader's stats. */
  joinedVia: "link" | "qr" | "event-qr" | "manual";
  /** Future-proofing for moderator / co-host roles. */
  role: "owner" | "member";
  /**
   * Display fields denormalised at join time so the team owner can
   * render the Members tab without reading other users' /users docs
   * (which Firestore rules wouldn't allow anyway). Set by the
   * joining user from their own account on every join — refreshed
   * on re-join so a renamed account propagates.
   */
  userDisplayName?: string;
  userEmail?: string;
  userPhotoURL?: string;
}

/** Where an event happens. */
export type EventLocationType =
  | "in-person"
  | "zoom"
  | "meet"
  | "other";

/**
 * One event hosted inside a team space. Multi-timezone-aware: startAt
 * is stored as an epoch ms (UTC), timezone is the IANA zone the
 * leader entered — the renderer converts to the viewer's local time
 * with the original timezone shown alongside for clarity.
 */
export interface TeamEvent {
  id: string;
  teamSpaceId: string;
  /** Denormalised — saves a join when listing events across teams. */
  ownerId: string;
  title: string;
  description?: string;
  bannerUrl?: string;
  /** Epoch ms (UTC). */
  startAt: number;
  /** Epoch ms (UTC). */
  endAt: number;
  /** IANA timezone string, e.g. "Asia/Manila". */
  timezone: string;
  locationType: EventLocationType;
  /** Display label, e.g. "Cebu Coliseum" or "Zoom meeting". */
  locationLabel?: string;
  /** Actual URL or address (the meeting link, or street address). */
  locationUrl?: string;
  /** Paid event metadata — Tier 1.5, fields ready but UI defers. */
  paid?: boolean;
  price?: number;
  paymentMethodIds?: string[];
  /** Notification preferences — chosen at create time. */
  notifyOnCreate?: boolean;
  notifyDayBefore?: boolean;
  pushDayBefore?: boolean;
  /** Status — "canceled" hides from member views and notifies RSVPs. */
  status?: "active" | "canceled";
  createdAt: number;
  updatedAt: number;
}

/** Per-(user, event) RSVP. Doc id = `${userId}__${eventId}`. */
export interface EventRsvp {
  id: string;
  userId: string;
  eventId: string;
  teamSpaceId: string;
  status: "going" | "maybe" | "declined";
  /** Set when a member scans the event QR or the leader checks them in. */
  checkedInAt?: number;
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
  /**
   * Alternative headline phrasings the model produced for the user to
   * pick from. The primary `headline` above is always set (= the
   * user's currently-chosen variant); `headlineVariants` is the wider
   * shortlist surfaced in the modal's picker step. Optional so older
   * generations / mocks without variants still type-check.
   */
  headlineVariants?: string[];
  /** Same idea as headlineVariants — alternative bio phrasings. */
  bioVariants?: string[];
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
