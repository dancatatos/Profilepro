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
  url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
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
  { key: "templates", label: "Template Marketplace", href: "/templates", icon: "LayoutTemplate" },
  { key: "shared-builds", label: "Shared Builds", href: "/shared-builds", icon: "Package" },
  { key: "qr", label: "QR Codes", href: "/qr", icon: "QrCode" },
  { key: "card", label: "Digital Card", href: "/card", icon: "CreditCard" },
  { key: "appointments", label: "Appointments", href: "/appointments", icon: "CalendarDays" },
  { key: "leads", label: "Leads", href: "/leads", icon: "Users" },
  { key: "analytics", label: "Analytics", href: "/analytics", icon: "BarChart3" },
  { key: "ai", label: "AI Assistant", href: "/ai-assistant", icon: "Sparkles" },
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
    type: "text",
    label: "Text Block",
    description: "Formatted text — bold, lists, headings, alignment",
    icon: "Type",
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

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    price: 0,
    billingPeriod: "monthly",
    tagline: "Get online and look professional.",
    features: [
      { label: "1 credibility profile", included: true },
      { label: "Core profile sections", included: true },
      { label: "QR code (standard)", included: true },
      { label: "Credibly branding", included: true },
      { label: "AI generation", included: false },
      { label: "Analytics dashboard", included: false },
      { label: "Clone profile system", included: false },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 499,
    billingPeriod: "monthly",
    highlighted: true,
    tagline: "AI-powered profile that converts.",
    features: [
      { label: "Everything in Free", included: true },
      { label: "Unlimited links & sections", included: true },
      { label: "Full AI generation suite", included: true },
      { label: "AI profile audit & scoring", included: true },
      { label: "Analytics dashboard", included: true },
      { label: "Branded HD QR export", included: true },
      { label: "Shared build templates", included: true },
      { label: "Remove Credibly branding", included: true },
    ],
  },
  {
    id: "team",
    name: "Team",
    price: 14990,
    billingPeriod: "annual",
    tagline: "Scale your downline with cloning.",
    features: [
      { label: "Everything in Pro", included: true },
      { label: "Clone profile system", included: true },
      { label: "Team templates", included: true },
      { label: "Advanced team analytics", included: true },
      { label: "Lead tracking & export", included: true },
      { label: "Priority AI generation", included: true },
      { label: "Team member management", included: true },
    ],
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

/** How many shared builds each plan can keep saved in their locker. */
export const TEMPLATE_LOCKER_SLOTS: Record<PlanId, number> = {
  free: 0,
  pro: 5,
  team: 15,
};
