/* ============================================================
   Funnel template library
   ------------------------------------------------------------
   The original `FUNNEL_TEMPLATES` only carried step *types*, so
   every funnel created from a template opened with empty
   placeholders. These templates ship as fully-fleshed-out
   funnels — hero copy, benefits, lead forms, FAQ etc. — so the
   user only swaps their offer details and publishes.

   Each template is a builder function (not static data) so the
   IDs nested inside (section ids, button ids, item ids…) are
   generated fresh on every creation — two funnels built from
   the same template never share an id.

   Themes are pre-picked per template to match the funnel's mood
   (gold for opportunity, navy for webinar, mint for lead magnet,
   etc.) and only use FREE themes so every user can publish.
   ============================================================ */

import { uid } from "@/lib/utils";
import type {
  BenefitItem,
  BenefitsSection,
  CtaSection,
  CountdownSection,
  CTAButton,
  FaqItem,
  FaqSection,
  FunnelStep,
  FunnelStepType,
  HeroSection,
  LeadCaptureSection,
  PricingCardSection,
  PricingFeature,
  ProfileSection,
  RichTextNode,
  TextSection,
  Testimonial,
  TestimonialsSection,
  ThemeId,
  VideoSection,
} from "@/types";

/* ── Section builders ────────────────────────────────────────
   These wrap createSection-style logic with strong typing AND
   pre-filled copy. Importantly they return brand-new ids each
   call so templates are safe to instantiate multiple times. */

function hero(headline: string, subtext: string): HeroSection {
  return {
    id: uid("sec"),
    type: "hero",
    enabled: true,
    headline,
    subtext,
  };
}

function paragraphs(...lines: string[]): TextSection {
  const content: RichTextNode[] = lines
    .filter((l) => l.trim().length > 0)
    .map((line) => ({
      type: "paragraph",
      content: [{ type: "text", text: line.trim() }],
    }));
  if (content.length === 0) content.push({ type: "paragraph" });
  return {
    id: uid("sec"),
    type: "text",
    enabled: true,
    doc: { type: "doc", content },
  };
}

function headingAnd(headline: string, body: string): TextSection {
  const content: RichTextNode[] = [
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: headline }],
    },
  ];
  for (const para of body
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean)) {
    content.push({
      type: "paragraph",
      content: [{ type: "text", text: para }],
    });
  }
  return {
    id: uid("sec"),
    type: "text",
    enabled: true,
    doc: { type: "doc", content },
  };
}

function benefits(
  title: string,
  items: { title: string; detail?: string; icon?: string }[],
): BenefitsSection {
  const built: BenefitItem[] = items.map((it) => ({
    id: uid("bn"),
    title: it.title,
    detail: it.detail,
    icon: it.icon ?? "Check",
  }));
  return {
    id: uid("sec"),
    type: "benefits",
    enabled: true,
    title,
    items: built,
  };
}

function faq(
  title: string,
  items: { question: string; answer: string }[],
): FaqSection {
  const built: FaqItem[] = items.map((q) => ({
    id: uid("fq"),
    question: q.question,
    answer: q.answer,
  }));
  return {
    id: uid("sec"),
    type: "faq",
    enabled: true,
    title,
    items: built,
  };
}

function testimonials(
  title: string,
  items: { name: string; role?: string; quote: string; rating?: number }[],
): TestimonialsSection {
  const built: Testimonial[] = items.map((t) => ({
    id: uid("ts"),
    kind: "text",
    authorName: t.name,
    authorRole: t.role,
    quote: t.quote,
    rating: t.rating ?? 5,
  }));
  return {
    id: uid("sec"),
    type: "testimonials",
    enabled: true,
    title,
    testimonials: built,
  };
}

function leadCapture(
  headline: string,
  subtext: string,
  fields: ("name" | "email" | "phone")[] = ["name", "email", "phone"],
): LeadCaptureSection {
  return {
    id: uid("sec"),
    type: "leadCapture",
    enabled: true,
    title: "",
    headline,
    subtext,
    fields,
    channels: {},
  };
}

function countdown(headline: string, days: number): CountdownSection {
  const target = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 16);
  return {
    id: uid("sec"),
    type: "countdown",
    enabled: true,
    headline,
    targetIso: target,
    expiredText: "This offer has ended — but reach out anyway!",
  };
}

function pricingCard(opts: {
  headline: string;
  price: string;
  priceNote?: string;
  features: string[];
  ctaLabel: string;
}): PricingCardSection {
  const features: PricingFeature[] = opts.features.map((f) => ({
    id: uid("pf"),
    text: f,
  }));
  return {
    id: uid("sec"),
    type: "pricingCard",
    enabled: true,
    headline: opts.headline,
    price: opts.price,
    priceNote: opts.priceNote,
    features,
    ctaLabel: opts.ctaLabel,
    ctaUrl: "",
  };
}

function ctaButtons(
  title: string,
  buttons: { label: string; icon: string; style: CTAButton["style"]; accent: CTAButton["accent"] }[],
): CtaSection {
  const built: CTAButton[] = buttons.map((b) => ({
    id: uid("btn"),
    label: b.label,
    url: "",
    icon: b.icon,
    style: b.style,
    accent: b.accent,
  }));
  return {
    id: uid("sec"),
    type: "cta",
    enabled: true,
    title,
    buttons: built,
  };
}

function video(title: string): VideoSection {
  return {
    id: uid("sec"),
    type: "video",
    enabled: true,
    title,
    /* Empty videos array — the user pastes their YouTube/TikTok link
       in the builder. The empty state in the renderer prompts them. */
    videos: [],
  };
}

/* ── Step builder ───────────────────────────────────────────── */

function step(
  type: FunnelStepType,
  name: string,
  sections: ProfileSection[],
  cta?: { label: string; action: "next" | "url"; url?: string },
): FunnelStep {
  const built: FunnelStep = {
    id: uid("fstep"),
    type,
    name,
    sections,
  };
  if (cta) {
    built.cta = {
      label: cta.label,
      action: cta.action,
      ...(cta.action === "url" ? { url: cta.url ?? "" } : {}),
    };
  }
  return built;
}

/* ── Public template interface ───────────────────────────────
   Every template carries its own theme + a builder that returns
   a freshly-id'd step array. Keep `accent` on the template so
   the picker can colour-code the swatch without loading the
   full theme config. */

export interface FunnelTemplateV2 {
  id: string;
  name: string;
  description: string;
  /** Theme id from THEME_CONFIGS — must be a free theme. */
  themeId: ThemeId;
  /** Short tag (e.g. "MLM", "Webinar") shown on the picker chip. */
  category: string;
  /** Number of steps — pre-computed so the picker doesn't run build(). */
  stepCount: number;
  /** Build a fresh set of steps with unique IDs every time. */
  build: () => FunnelStep[];
}

/* ============================================================
   THE TEMPLATES
   ============================================================ */

/* ─── 1. MLM Opportunity ──────────────────────────────────── */

function buildMlmOpportunity(): FunnelStep[] {
  return [
    step(
      "content",
      "Curiosity Hook",
      [
        hero(
          "Tired of trading time for money?",
          "A simple home-based business that thousands of Filipinos are using to build extra income — without quitting their job.",
        ),
        benefits("Why people are paying attention", [
          {
            title: "Work from your phone",
            detail: "No office, no inventory, no awkward home parties.",
            icon: "Smartphone",
          },
          {
            title: "Proven step-by-step system",
            detail: "You don't need experience — just the willingness to learn.",
            icon: "ListChecks",
          },
          {
            title: "Real community + mentorship",
            detail: "We win together — you'll never figure things out alone.",
            icon: "Users",
          },
        ]),
        testimonials("Real people, real results", [
          {
            name: "Maria S.",
            role: "Mom of 2 · Quezon City",
            quote:
              "I earned my first ₱20k in 6 weeks doing this on the side. Now it pays for our groceries every month.",
          },
          {
            name: "Rico D.",
            role: "Former call-center agent",
            quote:
              "I was skeptical at first. After 3 months I left my BPO job. Best decision I've made.",
          },
        ]),
      ],
      { label: "Show me how it works", action: "next" },
    ),
    step(
      "content",
      "Why Now",
      [
        hero(
          "Why this is the right move in 2026",
          "More Filipinos are building extra income online than ever before. Here's why timing matters.",
        ),
        headingAnd(
          "The income game has changed",
          "Side hustles aren't side hustles anymore — they're how smart families protect themselves from inflation, layoffs and the 9-to-5 trap. The people getting in NOW are building real assets while everyone else waits.\n\nYou don't need to be a salesperson. You don't need a big audience. You just need a simple system and someone to walk you through it.",
        ),
        video("Watch the 12-minute overview"),
        benefits("What you'll learn in the next step", [
          {
            title: "The full business model",
            icon: "BookOpen",
          },
          {
            title: "Real-life income examples",
            icon: "TrendingUp",
          },
          {
            title: "How to start in the next 48 hours",
            icon: "Rocket",
          },
        ]),
      ],
      { label: "I'm interested — show me more", action: "next" },
    ),
    step(
      "optin",
      "Apply",
      [
        hero(
          "Ready to take a closer look?",
          "Tell me a bit about you and I'll personally reach out within 24 hours.",
        ),
        leadCapture(
          "Send me your details",
          "I'll only contact you about this opportunity — no spam, ever.",
          ["name", "email", "phone"],
        ),
        paragraphs(
          "What happens next: I'll review your info, send you a private link to a deeper presentation, then jump on a quick call to answer your questions and see if it's a fit.",
        ),
      ],
      { label: "Send my application", action: "next" },
    ),
    step("thankyou", "Thank You", [
      hero(
        "We'll be in touch within 24 hours",
        "Check your messages — I'll send you a link to the full presentation shortly.",
      ),
      paragraphs(
        "In the meantime, you can connect with me on social so you don't miss the link when it lands.",
      ),
      ctaButtons("Connect with me", [
        {
          label: "Message me on Facebook",
          icon: "facebook",
          style: "gradient",
          accent: "blue",
        },
        {
          label: "WhatsApp me",
          icon: "whatsapp",
          style: "outline",
          accent: "jade",
        },
      ]),
    ]),
  ];
}

/* ─── 2. Free Training Webinar ────────────────────────────── */

function buildWebinar(): FunnelStep[] {
  return [
    step(
      "optin",
      "Register",
      [
        hero(
          "Free Training: How to Build a 6-Figure Online Business",
          "A 60-minute deep-dive showing you the exact system we use — with a live Q&A at the end.",
        ),
        countdown("Training starts in", 3),
        benefits("What you'll discover", [
          {
            title: "The 3-step framework",
            detail: "The simplest path from zero to your first ₱100k/month.",
            icon: "Target",
          },
          {
            title: "Mistakes to avoid",
            detail: "The 5 things that quietly kill 90% of online businesses.",
            icon: "ShieldAlert",
          },
          {
            title: "Live Q&A",
            detail: "Bring your questions — I'll answer as many as I can.",
            icon: "MessageCircle",
          },
        ]),
        leadCapture(
          "Reserve your free seat",
          "We'll send the join link and a reminder before it starts.",
          ["name", "email"],
        ),
      ],
      { label: "Save my seat (free)", action: "next" },
    ),
    step(
      "content",
      "Confirmation",
      [
        hero(
          "You're in! Here's what to do next",
          "Add the training to your calendar so you don't miss it — the replay window is limited.",
        ),
        countdown("Training starts in", 3),
        headingAnd(
          "Before the training",
          "1. Save the join link we just emailed you.\n2. Block out 60 minutes — no distractions, please.\n3. Have a pen and paper ready. The framework I share is implementable the same day.",
        ),
        ctaButtons("Add to calendar", [
          {
            label: "Add to Google Calendar",
            icon: "Calendar",
            style: "gradient",
            accent: "blue",
          },
          {
            label: "Message me a reminder",
            icon: "MessageCircle",
            style: "outline",
            accent: "white",
          },
        ]),
      ],
      { label: "Got it — see you on training day", action: "next" },
    ),
    step(
      "content",
      "Live / Replay",
      [
        hero(
          "The training is live now",
          "Settle in, get your notepad ready — this is the full thing.",
        ),
        video("Watch the full training"),
        benefits("Ready to take the next step?", [
          {
            title: "Get the implementation playbook",
            icon: "BookOpen",
          },
          {
            title: "Book a 1-on-1 strategy call",
            icon: "Calendar",
          },
          {
            title: "Apply for our coaching program",
            icon: "Crown",
          },
        ]),
      ],
      { label: "Show me the next step", action: "next" },
    ),
    step("thankyou", "Apply for Next Step", [
      hero(
        "Want help implementing what you just learned?",
        "Send your details and I'll personally reach out to see if you're a fit for our mentorship.",
      ),
      leadCapture(
        "Apply for mentorship",
        "We only take on a few people each month — first come, first served.",
        ["name", "email", "phone"],
      ),
    ]),
  ];
}

/* ─── 3. Lead Magnet (Free Guide) ─────────────────────────── */

function buildLeadMagnet(): FunnelStep[] {
  return [
    step(
      "content",
      "The Promise",
      [
        hero(
          "Free Guide: The 5-Day Profit Sprint",
          "A 14-page playbook that walks you through making your first online sale in 5 days — even if you have zero audience right now.",
        ),
        benefits("What's inside", [
          {
            title: "Day-by-day action plan",
            detail: "No fluff — just exactly what to do, in order, every day.",
            icon: "ListChecks",
          },
          {
            title: "Templates you can copy-paste",
            detail: "Captions, DMs, follow-up scripts — all ready to use.",
            icon: "Copy",
          },
          {
            title: "The 'no audience' chapter",
            detail: "Where to get your first 10 leads even if you're starting from zero.",
            icon: "Users",
          },
          {
            title: "Real income screenshots",
            detail: "See what's actually possible — no inflated numbers.",
            icon: "TrendingUp",
          },
        ]),
        paragraphs(
          "Built specifically for Filipino sellers, coaches and network marketers. No US-style fluff — only what works locally.",
        ),
      ],
      { label: "Send me the free guide", action: "next" },
    ),
    step(
      "optin",
      "Where to send it",
      [
        hero(
          "Where should I send it?",
          "Pop in your email and the guide is in your inbox in 30 seconds.",
        ),
        leadCapture(
          "Get your free copy",
          "No spam — I'll only send you occasional value-packed emails.",
          ["name", "email"],
        ),
        paragraphs(
          "100% free, no credit card. You can unsubscribe any time with one click.",
        ),
      ],
      { label: "Send the guide now", action: "next" },
    ),
    step("thankyou", "Check Your Inbox", [
      hero(
        "Check your inbox in the next 5 minutes",
        "If you don't see it, check Promotions or Spam — and add my email to your contacts so future ones land in your main inbox.",
      ),
      paragraphs(
        "While you wait, here's something most people don't know: the people who actually IMPLEMENT what's in the guide get 10x the results. Block 30 minutes on your calendar today to read it cover-to-cover.",
      ),
      ctaButtons("Stay connected", [
        {
          label: "Follow me on Facebook",
          icon: "facebook",
          style: "gradient",
          accent: "blue",
        },
        {
          label: "Subscribe on YouTube",
          icon: "youtube",
          style: "outline",
          accent: "white",
        },
      ]),
    ]),
  ];
}

/* ─── 4. Coaching Application ─────────────────────────────── */

function buildCoachingApplication(): FunnelStep[] {
  return [
    step(
      "content",
      "My Story",
      [
        hero(
          "If you're stuck — I get it. I was too.",
          "Three years ago I was where you are. Here's the system that changed everything.",
        ),
        headingAnd(
          "What I help people with",
          "I work with motivated Filipinos who are tired of working hard for results that don't match the effort. My clients are coaches, consultants and online sellers who want a CLEAR plan instead of more random advice from YouTube.\n\nMy method is simple: cut the noise, focus on the 3 things that actually move the needle, and execute weekly with someone holding you accountable.",
        ),
        video("Watch my story (4 min)"),
      ],
      { label: "This sounds like me", action: "next" },
    ),
    step(
      "content",
      "Who This Is For",
      [
        hero(
          "Coaching is right for you if…",
          "Be honest — read these carefully. If 3 or more describe you, apply below.",
        ),
        benefits("This is for you if", [
          {
            title: "You already have an offer or business idea",
            detail: "Coaching multiplies what's working — it doesn't create from zero.",
            icon: "Check",
          },
          {
            title: "You're stuck on consistency, not knowledge",
            detail: "You don't need more information — you need a plan + accountability.",
            icon: "Check",
          },
          {
            title: "You can invest in yourself",
            detail: "Coaching isn't cheap. But neither is staying stuck for another year.",
            icon: "Check",
          },
          {
            title: "You'll show up every week",
            detail: "I work with action-takers. If you ghost, I refund and we part ways.",
            icon: "Check",
          },
        ]),
        faq("Common questions", [
          {
            question: "How long is the coaching program?",
            answer:
              "12 weeks of weekly 1-on-1 calls + unlimited chat support, then a graduation review.",
          },
          {
            question: "What's the investment?",
            answer:
              "I'll share pricing on our call once we've established it's a good fit. Most clients see ROI within the first 4 weeks.",
          },
          {
            question: "Is there a refund?",
            answer:
              "Yes — if you complete the first 4 weeks of homework and don't see progress, I refund you in full.",
          },
        ]),
      ],
      { label: "Apply now", action: "next" },
    ),
    step(
      "optin",
      "Application",
      [
        hero(
          "Tell me about you",
          "I read every application personally. Be honest — that's how I can actually help.",
        ),
        leadCapture(
          "Apply for 1-on-1 coaching",
          "I'll review your application within 48 hours and reply with next steps.",
          ["name", "email", "phone"],
        ),
        paragraphs(
          "If we're a fit, I'll send you a link to book a 30-minute strategy call. No pressure, no hard sell — it's a real conversation to see if I can actually help you.",
        ),
      ],
      { label: "Submit my application", action: "next" },
    ),
    step("thankyou", "Application Received", [
      hero(
        "Got it — talk soon",
        "I'll read your application personally within 48 hours and email you back with next steps.",
      ),
      paragraphs(
        "If you're accepted, I'll send you a calendar link to book a strategy call. Until then, follow me below — I share my best free content there.",
      ),
      ctaButtons("Follow me", [
        {
          label: "Instagram",
          icon: "instagram",
          style: "gradient",
          accent: "blue",
        },
        {
          label: "YouTube",
          icon: "youtube",
          style: "outline",
          accent: "white",
        },
      ]),
    ]),
  ];
}

/* ─── 5. Product Pre-Order / Launch ──────────────────────── */

function buildProductLaunch(): FunnelStep[] {
  return [
    step(
      "content",
      "Teaser",
      [
        hero(
          "Something new is coming",
          "Be first in line for early-bird pricing — limited to the first 100 orders.",
        ),
        countdown("Doors open in", 5),
        benefits("Why early-bird matters", [
          {
            title: "Lowest price we'll ever offer",
            detail: "Goes up by 30% after launch week.",
            icon: "BadgePercent",
          },
          {
            title: "First-in-line bonus",
            detail: "Free 1-on-1 onboarding call (₱2,500 value).",
            icon: "Gift",
          },
          {
            title: "Lifetime access",
            detail: "Pay once, own it forever — including future updates.",
            icon: "Infinity",
          },
        ]),
      ],
      { label: "Get on the early-bird list", action: "next" },
    ),
    step(
      "content",
      "Reveal",
      [
        hero(
          "It's here.",
          "Here's exactly what you get when you join today.",
        ),
        video("Watch the 5-minute walkthrough"),
        benefits("Everything you get", [
          {
            title: "The core program",
            detail: "12 lessons, mobile-friendly, watch at your own pace.",
            icon: "BookOpen",
          },
          {
            title: "Workbook + templates",
            detail: "Fill-in-the-blank tools to implement as you watch.",
            icon: "FileText",
          },
          {
            title: "Private community",
            detail: "Get help, share wins, and never feel stuck again.",
            icon: "Users",
          },
          {
            title: "Monthly Q&A calls",
            detail: "Live with me, recorded if you can't make it.",
            icon: "Video",
          },
        ]),
        testimonials("From people who joined our beta", [
          {
            name: "Anna L.",
            role: "Online seller",
            quote:
              "I made back the cost in my first week. The templates alone are worth 5x the price.",
          },
          {
            name: "Jay R.",
            role: "Coach",
            quote:
              "The community is gold. Worth joining for that alone.",
          },
        ]),
      ],
      { label: "I'm in — let me order", action: "next" },
    ),
    step(
      "offer",
      "Order",
      [
        hero(
          "Join today — early-bird pricing",
          "Only available for the first 100 orders.",
        ),
        pricingCard({
          headline: "Lifetime access",
          price: "₱2,997",
          priceNote: "one-time · save ₱2,000 vs. launch price",
          features: [
            "Full course (12 lessons + workbook)",
            "Lifetime updates",
            "Private community access",
            "Monthly live Q&A calls",
            "BONUS: 1-on-1 onboarding (₱2,500 value)",
          ],
          ctaLabel: "Order now (₱2,997)",
        }),
        faq("Last-minute questions", [
          {
            question: "Is there a refund?",
            answer:
              "Yes — 30-day money-back guarantee. If it's not for you, email us and we refund in full.",
          },
          {
            question: "How long do I have access?",
            answer:
              "Forever. Pay once, own it for life, including all future updates.",
          },
          {
            question: "What if I'm a complete beginner?",
            answer:
              "Perfect — the course assumes zero experience and walks you through everything step by step.",
          },
        ]),
      ],
      { label: "Complete my order", action: "url", url: "" },
    ),
    step("thankyou", "Order Received", [
      hero(
        "You're in — welcome aboard!",
        "Check your email for your login details and the community invite.",
      ),
      paragraphs(
        "Your access is being set up now. Within the next 10 minutes you'll get an email with your login, a link to the community, and a calendar link to book your free onboarding call.",
        "If you don't see it, check your spam folder — and message me directly if you need help.",
      ),
      ctaButtons("Join the community now", [
        {
          label: "Join the Facebook group",
          icon: "facebook",
          style: "gradient",
          accent: "blue",
        },
      ]),
    ]),
  ];
}

/* ─── 6. Event Registration ──────────────────────────────── */

function buildEventRegistration(): FunnelStep[] {
  return [
    step(
      "content",
      "Event Details",
      [
        hero(
          "Mark your calendar — this is the one",
          "Join us for a powerful one-day in-person event built for serious action-takers.",
        ),
        countdown("Doors open in", 14),
        headingAnd(
          "What to expect",
          "Six hours. Three speakers. One mission — to give you a clear plan to scale your business in the next 90 days.\n\nLocation, schedule and parking details are sent the moment you register.",
        ),
        benefits("What's covered", [
          {
            title: "Opening keynote",
            detail: "The state of the industry in 2026 — what's working right now.",
            icon: "Mic",
          },
          {
            title: "Live workshops",
            detail: "Build your 90-day plan with our team coaching you in person.",
            icon: "PenTool",
          },
          {
            title: "Networking lunch",
            detail: "Connect with 50+ ambitious entrepreneurs in your market.",
            icon: "Users",
          },
          {
            title: "Closing fireside chat",
            detail: "Q&A with leaders who've already done what you're trying to do.",
            icon: "Flame",
          },
        ]),
      ],
      { label: "Register my seat", action: "next" },
    ),
    step(
      "optin",
      "Register",
      [
        hero(
          "Reserve your seat",
          "Seats are limited — registration closes when we hit capacity.",
        ),
        leadCapture(
          "Confirm my attendance",
          "We'll email your ticket and the full event details right away.",
          ["name", "email", "phone"],
        ),
        paragraphs(
          "Registration is free, but seats are first-come-first-served. We'll send a reminder 24 hours before the event and a map the morning of.",
        ),
      ],
      { label: "Confirm my seat", action: "next" },
    ),
    step("thankyou", "You're In", [
      hero(
        "See you there!",
        "Check your email for your ticket, the schedule and venue details.",
      ),
      headingAnd(
        "What to bring",
        "Just yourself, a notepad, and an open mind. Refreshments are provided. Bring a friend who'd benefit — there's a +1 discount in your confirmation email.",
      ),
      ctaButtons("Get in touch", [
        {
          label: "Message us on Messenger",
          icon: "facebook",
          style: "gradient",
          accent: "blue",
        },
        {
          label: "WhatsApp the team",
          icon: "whatsapp",
          style: "outline",
          accent: "jade",
        },
      ]),
    ]),
  ];
}

/* ─── Blank — kept as a clean-slate starter ─────────────── */

function buildBlank(): FunnelStep[] {
  return [
    step(
      "optin",
      "Opt-In",
      [
        hero(
          "Your bold headline goes here",
          "A short subhead that explains who this is for and what they get.",
        ),
        leadCapture(
          "Get instant access",
          "Pop in your details and we'll be in touch.",
          ["name", "email"],
        ),
      ],
      { label: "Get Instant Access", action: "next" },
    ),
    step("thankyou", "Thank You", [
      hero(
        "Thanks — we'll be in touch",
        "Check your messages for next steps.",
      ),
      paragraphs("Customize this page with whatever you'd like."),
    ]),
  ];
}

/* ============================================================
   Registry — single source of truth for the picker AND the AI
   ============================================================ */

export const FUNNEL_TEMPLATES_V2: FunnelTemplateV2[] = [
  {
    id: "mlm-opportunity",
    name: "MLM Opportunity",
    description:
      "Recruit warm leads into your home-based business. Curiosity → story → application.",
    themeId: "gold-elite",
    category: "Network Marketing",
    stepCount: 4,
    build: buildMlmOpportunity,
  },
  {
    id: "webinar",
    name: "Free Training Webinar",
    description:
      "Drive registrations to a free training, then convert attendees into applications.",
    themeId: "navy-glass",
    category: "Webinar",
    stepCount: 4,
    build: buildWebinar,
  },
  {
    id: "lead-magnet",
    name: "Lead Magnet (Free Guide)",
    description:
      "Trade a high-value freebie for an email. Perfect for coaches and consultants.",
    themeId: "mint-fresh",
    category: "List Building",
    stepCount: 3,
    build: buildLeadMagnet,
  },
  {
    id: "coaching-application",
    name: "Coaching Application",
    description:
      "Qualify serious leads for your 1-on-1 program with a story + application flow.",
    themeId: "cloud-white",
    category: "Coaching",
    stepCount: 4,
    build: buildCoachingApplication,
  },
  {
    id: "product-launch",
    name: "Product Pre-Order / Launch",
    description:
      "Teaser → reveal → order. Perfect for course launches and physical product drops.",
    themeId: "deep-red",
    category: "Sales",
    stepCount: 4,
    build: buildProductLaunch,
  },
  {
    id: "event-registration",
    name: "Event Registration",
    description:
      "Drive free or paid registrations to a live event — in-person or virtual.",
    themeId: "vivid-purple",
    category: "Events",
    stepCount: 3,
    build: buildEventRegistration,
  },
  {
    id: "blank",
    name: "Blank Funnel",
    description:
      "A clean slate — just opt-in and thank-you. For users who want to build from scratch.",
    themeId: "navy-glass",
    category: "Custom",
    stepCount: 2,
    build: buildBlank,
  },
];

export function getTemplate(id: string): FunnelTemplateV2 | undefined {
  return FUNNEL_TEMPLATES_V2.find((t) => t.id === id);
}

/**
 * Map an AI funnel type id to a starting template. The AI generator
 * uses the template's section structure as the blueprint and rewrites
 * the headline/body of each text/hero section in the user's voice —
 * so the user gets a proven structure with custom copy.
 */
export function templateForAiFunnelType(typeId: string): FunnelTemplateV2 {
  switch (typeId) {
    case "lead-capture":
      return getTemplate("lead-magnet")!;
    case "opportunity":
      return getTemplate("mlm-opportunity")!;
    case "webinar":
      return getTemplate("webinar")!;
    case "product":
      return getTemplate("product-launch")!;
    default:
      return getTemplate("blank")!;
  }
}
