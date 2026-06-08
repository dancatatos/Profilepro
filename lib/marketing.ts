/**
 * Marketing homepage content — defaults baked into code so the page
 * always renders well even before the admin saves any overrides.
 *
 * Tone: outcome-focused for PH MLM / recruiting / coaching audience.
 * Bias for "what does this do FOR ME" over "what features are inside."
 *
 * Editable from /admin/marketing → persisted to settings/marketing
 * Firestore doc → merged on top of these defaults at render time.
 */

import type {
  MarketingContent,
  MarketingFaqItem,
  MarketingStat,
  MarketingTestimonial,
  MarketingVideoTestimonial,
} from "@/types";

export const DEFAULT_MARKETING_CONTENT: MarketingContent = {
  hero: {
    badge: "Built for PH recruiters, coaches & online sellers",
    headlineLine1: "Recruit faster.",
    headlineGradient: "Follow up smarter.",
    headlineLine2: "Get paid easier.",
    subheadline:
      "The complete platform for network marketers, coaches and online sellers — credibility profiles, daily follow-up tasks, mini-funnels and manual payment collection, all in one tool. Built in PH, for PH.",
    primaryCta: "Start free",
    secondaryCta: "See live example",
    audiences: [
      "Network Marketers",
      "Affiliate Marketers",
      "Insurance Agents",
      "Coaches",
      "Recruiters",
      "Online Sellers",
    ],
  },

  socialProof: {
    /* Disabled by default — admin turns this on once they have real
       numbers worth bragging about. Defaults below are starter copy
       the admin can edit. */
    enabled: false,
    stats: [
      { id: "stat-1", value: "200+", label: "Profiles built" },
      { id: "stat-2", value: "1,000+", label: "Leads captured" },
      { id: "stat-3", value: "₱0", label: "Payment processor fees" },
      { id: "stat-4", value: "24h", label: "Average follow-up time" },
    ],
  },

  testimonials: {
    /* Disabled until admin adds real testimonials. The defaults below
       are placeholders so the admin can see how the section looks. */
    enabled: false,
    title: "Recruiters & coaches choosing Credibly",
    subtitle: "Real Filipinos using Credibly to grow their business.",
    items: [],
  },

  testimonialVideos: {
    enabled: false,
    title: "Hear it from real users",
    subtitle: "Short clips from people running their business on Credibly.",
    items: [],
  },

  faq: {
    enabled: true,
    title: "Frequently asked questions",
    items: [
      {
        id: "faq-1",
        question: "Is there a free trial?",
        answer:
          "Yes — you can build and publish a full credibility profile on the free plan. Upgrade to Pro when you want the daily task dashboard, AI message templates, manual payments, and unlimited funnels.",
      },
      {
        id: "faq-2",
        question: "Do I need a credit card to sign up?",
        answer:
          "No. Free accounts don't require any payment details. We also support manual payment via GCash, Maya, and bank transfer for Pro plans — no card needed if you're in the Philippines.",
      },
      {
        id: "faq-3",
        question: "Is my data safe?",
        answer:
          "Yes. Credibly stores all data on Google Firebase with industry-standard encryption. We follow the Philippine Data Privacy Act of 2012 and never sell your data. See our Privacy Policy for the full breakdown.",
      },
      {
        id: "faq-4",
        question: "Can I cancel anytime?",
        answer:
          "Yes. Cancel from /settings → Billing at any time. You keep access until the end of your billing cycle, then revert to the free plan — your profile and data stay intact.",
      },
      {
        id: "faq-5",
        question: "Will this work for my niche?",
        answer:
          "Credibly is built for any business that captures leads and follows up with them — network marketing, coaching, insurance, real estate, online courses, freelancing, services. If you talk to prospects regularly, Credibly fits.",
      },
      {
        id: "faq-6",
        question: "Do you support Tagalog / Taglish?",
        answer:
          "Yes — the AI message generator has a native Taglish mode, and our follow-up message templates ship with both English and Taglish versions ready to use.",
      },
      {
        id: "faq-7",
        question: "How do I accept payments?",
        answer:
          "You set your GCash / Maya / bank account once in your profile. When a customer lands on your funnel's payment step, they see your accounts, send payment outside the app, then upload a receipt. You approve from /payments — no Stripe, no PayMongo, no 3% processor fees.",
      },
      {
        id: "faq-8",
        question: "Can I use Credibly as a business?",
        answer:
          "Absolutely. The Team plan is built for agencies, coaching businesses, and multi-funnel operators. Talk to support@crediblyai.com about custom limits or enterprise pricing.",
      },
    ],
  },

  finalCta: {
    title: "Ready to look more professional and close more prospects?",
    subtitle:
      "Free to start. No credit card required. Build your profile in under 10 minutes.",
    primaryCta: "Create your free account",
    secondaryCta: "See live example",
  },
};

/**
 * Merge admin-saved content over the defaults so a missing field never
 * crashes the homepage. Used both client-side (on render) and admin-side
 * (when initialising the editor). Shallow merge per top-level section.
 */
export function mergeMarketingContent(
  override?: Partial<MarketingContent> | null,
): MarketingContent {
  if (!override) return DEFAULT_MARKETING_CONTENT;
  const base = DEFAULT_MARKETING_CONTENT;
  return {
    hero: { ...base.hero, ...(override.hero ?? {}) },
    socialProof: {
      ...base.socialProof,
      ...(override.socialProof ?? {}),
      stats:
        override.socialProof?.stats ?? base.socialProof.stats,
    },
    testimonials: {
      ...base.testimonials,
      ...(override.testimonials ?? {}),
      items: override.testimonials?.items ?? base.testimonials.items,
    },
    testimonialVideos: {
      ...base.testimonialVideos,
      ...(override.testimonialVideos ?? {}),
      items:
        override.testimonialVideos?.items ?? base.testimonialVideos.items,
    },
    faq: {
      ...base.faq,
      ...(override.faq ?? {}),
      items: override.faq?.items ?? base.faq.items,
    },
    finalCta: { ...base.finalCta, ...(override.finalCta ?? {}) },
    /* Carry through the (optional) admin-configured feature labels.
       Not in DEFAULT_MARKETING_CONTENT because the consumers default
       gracefully when the field is absent — keeps the defaults tight. */
    ...(override.featureLabels
      ? { featureLabels: { ...override.featureLabels } }
      : {}),
  };
}

/** Factory: blank item with a fresh id — used by the admin "Add" buttons. */
export function blankStat(): MarketingStat {
  return { id: makeId("stat"), value: "", label: "" };
}

export function blankTestimonial(): MarketingTestimonial {
  return {
    id: makeId("tst"),
    name: "",
    role: "",
    quote: "",
    rating: 5,
  };
}

export function blankVideoTestimonial(): MarketingVideoTestimonial {
  return {
    id: makeId("vid"),
    title: "",
    videoUrl: "",
    authorName: "",
  };
}

export function blankFaqItem(): MarketingFaqItem {
  return { id: makeId("faq"), question: "", answer: "" };
}

function makeId(prefix: string): string {
  /* Same shape as `uid()` in lib/utils — we duplicate inline rather
     than import to keep this module light and SSR-safe. */
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}
