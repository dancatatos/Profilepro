import { uid } from "@/lib/utils";
import type { Profile, ProfileSection, SectionType } from "@/types";

/** Build a fresh, empty section of the requested type. */
export function createSection(type: SectionType): ProfileSection {
  const base = { id: uid("sec"), enabled: true };
  switch (type) {
    case "cta":
      /* Generic, non-opinionated starter — one neutral button the
         owner can rename + point anywhere. Was previously pre-filled
         with "Join My Team" + "Book A Call" which assumed a specific
         use case (network marketing recruiting); for a general
         website-builder block, that's too prescriptive. Users who
         actually want a call-booking flow have the Appointment
         section; users who want lead capture have the Lead Capture
         section. This block is just buttons. */
      return {
        ...base,
        type: "cta",
        title: "Buttons",
        buttons: [
          {
            id: uid("btn"),
            label: "New button",
            url: "",
            icon: "Link",
            style: "gradient",
            accent: "blue",
          },
        ],
      };
    case "socials":
      return { ...base, type: "socials", title: "Connect With Me", links: [] };
    case "about":
      return {
        ...base,
        type: "about",
        title: "About Me",
        body: "Share your story, your mission and the journey that brought you here.",
      };
    case "text":
      return {
        ...base,
        type: "text",
        doc: { type: "doc", content: [{ type: "paragraph" }] },
      };
    case "countdown":
      return {
        ...base,
        type: "countdown",
        headline: "Hurry — offer ends in",
        targetIso: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 16),
        expiredText: "This offer has ended.",
      };
    case "hero":
      return {
        ...base,
        type: "hero",
        headline: "Your bold headline goes here",
        subtext:
          "A short subhead that explains who this is for and what they get.",
      };
    case "benefits":
      return {
        ...base,
        type: "benefits",
        title: "What you'll get",
        items: [
          { id: uid("bn"), title: "First key benefit", icon: "Check" },
          { id: uid("bn"), title: "Second key benefit", icon: "Check" },
          { id: uid("bn"), title: "Third key benefit", icon: "Check" },
        ],
      };
    case "faq":
      return {
        ...base,
        type: "faq",
        title: "Frequently asked",
        items: [
          {
            id: uid("fq"),
            question: "Is this for me?",
            answer: "Yes — if you want a clear next step.",
          },
          {
            id: uid("fq"),
            question: "How does it work?",
            answer: "Sign up, get instant access and follow the steps.",
          },
        ],
      };
    case "pricingCard":
      return {
        ...base,
        type: "pricingCard",
        headline: "Get instant access",
        price: "₱1,997",
        priceNote: "one-time payment",
        features: [
          { id: uid("pf"), text: "Full course access" },
          { id: uid("pf"), text: "Lifetime updates" },
          { id: uid("pf"), text: "Community support" },
        ],
        ctaLabel: "Get it now",
        ctaUrl: "",
      };
    case "credibility":
      return {
        ...base,
        type: "credibility",
        title: "Credibility & Achievements",
        items: [],
      };
    case "testimonials":
      return {
        ...base,
        type: "testimonials",
        title: "What People Say",
        testimonials: [],
      };
    case "products":
      return {
        ...base,
        type: "products",
        title: "Products & Services",
        products: [],
      };
    case "video":
      return { ...base, type: "video", title: "Watch My Story", videos: [] };
    case "gallery":
      return { ...base, type: "gallery", title: "Gallery", images: [] };
    case "image":
      return {
        ...base,
        type: "image",
        url: "",
        caption: "",
        align: "center",
        maxWidth: "md",
      };
    case "embedHtml":
      return {
        ...base,
        type: "embedHtml",
        title: "Embed",
        html: "",
        height: "md",
      };
    case "leadCapture":
      return {
        ...base,
        type: "leadCapture",
        title: "Let's Connect",
        headline: "Interested? Send me your details",
        subtext: "I'll personally reach out to you.",
        fields: ["name", "email"],
        channels: {},
      };
    case "payment":
      return {
        ...base,
        type: "payment",
        title: "Reserve Your Spot",
        headline: "Secure your seat — one-time ₱500",
        subtext:
          "Send ₱500 via any of the methods below, then upload your receipt. We'll confirm within 24 hours.",
        amount: 500,
        currency: "PHP",
        allowCustomAmount: false,
        /* Empty = show all enabled methods from the profile. Owner
           can narrow this later if a specific funnel should only
           accept one payment channel. */
        enabledMethodIds: [],
        fields: ["name", "email", "phone"],
        successMessage:
          "Got it! We received your payment proof and will confirm within 24 hours. You'll get an email once you're enrolled.",
      };
    case "appointment":
      return {
        ...base,
        type: "appointment",
        title: "Book an Appointment",
        headline: "Schedule a call with me",
        subtext: "Pick a day and time that works for you.",
        availableDays: [1, 3, 5],
        startTime: "14:00",
        endTime: "16:00",
        slotMinutes: 30,
        bookingWindowDays: 30,
        questions: [
          {
            id: uid("q"),
            question: "What would you like to discuss?",
            enabled: true,
          },
        ],
      };
  }
}

/** A brand-new profile for a freshly signed-up user. */
export function createDefaultProfile(
  ownerId: string,
  username: string,
  displayName: string,
): Profile {
  const now = Date.now();
  return {
    id: ownerId,
    ownerId,
    username: username.toLowerCase(),
    status: "draft",
    themeId: "midnight",
    header: {
      displayName: displayName || "Your Name",
      headline: "Add a headline that builds instant trust",
      bio: "Write a short bio that tells prospects who you help and how.",
      avatarUrl: "",
      coverUrl: "",
      location: "",
      company: "",
      verified: false,
      socialProof: [
        { id: uid("st"), label: "Years Experience", value: "1+" },
        { id: uid("st"), label: "People Helped", value: "50+" },
      ],
    },
    sections: [
      createSection("cta"),
      createSection("socials"),
      createSection("about"),
      { ...createSection("credibility"), enabled: false },
      { ...createSection("leadCapture") },
    ],
    seo: {
      title: `${displayName || "My"} | Credibility Profile`,
      description: "Connect with me and learn how I can help you.",
    },
    createdAt: now,
    updatedAt: now,
  };
}

/** Fully-populated example profile — powers /demo and builder previews. */
export const DEMO_PROFILE: Profile = {
  id: "demo",
  ownerId: "demo",
  username: "demo",
  status: "published",
  themeId: "navy-glass",
  header: {
    displayName: "Jasmine Cruz",
    headline: "I help busy moms build extra income from home",
    bio: "Wellness entrepreneur & team leader. 6 years helping families create freedom through a proven home-based business.",
    avatarUrl:
      "https://ui-avatars.com/api/?name=Jasmine+Cruz&background=2e6bff&color=fff&size=256&bold=true",
    coverUrl: "",
    location: "Manila, Philippines",
    company: "Vital Living Co.",
    verified: true,
    socialProof: [
      { id: uid("st"), label: "Years Experience", value: "6+" },
      { id: uid("st"), label: "People Mentored", value: "320+" },
      { id: uid("st"), label: "Team Rank", value: "Diamond" },
    ],
  },
  sections: [
    {
      id: uid("sec"),
      type: "cta",
      enabled: true,
      title: "Work With Me",
      buttons: [
        { id: uid("btn"), label: "Join My Team", url: "https://example.com/join", icon: "Users", style: "gradient", accent: "blue" },
        { id: uid("btn"), label: "Free Training", url: "https://example.com/training", icon: "GraduationCap", style: "solid", accent: "jade" },
        { id: uid("btn"), label: "Book A Call", url: "https://example.com/call", icon: "Phone", style: "outline", accent: "white" },
      ],
    },
    {
      id: uid("sec"),
      type: "socials",
      enabled: true,
      title: "Connect With Me",
      links: [
        { id: uid("ln"), platform: "facebook", url: "https://facebook.com" },
        { id: uid("ln"), platform: "instagram", url: "https://instagram.com" },
        { id: uid("ln"), platform: "tiktok", url: "https://tiktok.com" },
        { id: uid("ln"), platform: "whatsapp", url: "https://wa.me/63" },
      ],
    },
    {
      id: uid("sec"),
      type: "about",
      enabled: true,
      title: "About Me",
      body: "Six years ago I was a full-time employee with zero time freedom. Today I lead a team of 300+ and help ordinary people build extraordinary income — without leaving their families behind. My mission is simple: prove that you don't have to choose between income and time at home.",
    },
    {
      id: uid("sec"),
      type: "credibility",
      enabled: true,
      title: "Credibility & Achievements",
      items: [
        { id: uid("cr"), title: "Diamond Leader Rank", subtitle: "Top 2% company-wide", icon: "Crown" },
        { id: uid("cr"), title: "Top Recruiter 2024", subtitle: "National recognition", icon: "Award" },
        { id: uid("cr"), title: "Certified Wellness Coach", subtitle: "Accredited program", icon: "BadgeCheck" },
        { id: uid("cr"), title: "₱2M+ Team Commissions", subtitle: "Paid out in 2024", icon: "TrendingUp" },
      ],
    },
    {
      id: uid("sec"),
      type: "testimonials",
      enabled: true,
      title: "What People Say",
      testimonials: [
        { id: uid("ts"), kind: "text", authorName: "Maria S.", authorRole: "Team member", quote: "Jasmine's mentorship changed everything. I earned my first ₱20k in 6 weeks.", rating: 5 },
        { id: uid("ts"), kind: "text", authorName: "Rico D.", authorRole: "New recruit", quote: "Professional, patient and genuinely cares. Best decision I made this year.", rating: 5 },
      ],
    },
    {
      id: uid("sec"),
      type: "products",
      enabled: true,
      title: "Products & Services",
      products: [
        { id: uid("pr"), title: "Wellness Starter Pack", description: "Everything you need to begin your health journey.", price: "₱2,500", ctaLabel: "Order Now", ctaUrl: "https://example.com/shop", imageUrl: "" },
        { id: uid("pr"), title: "Business Mentorship", description: "1-on-1 coaching to launch your home business.", price: "Free for team", ctaLabel: "Apply", ctaUrl: "https://example.com/mentor", imageUrl: "" },
      ],
    },
    {
      id: uid("sec"),
      type: "leadCapture",
      enabled: true,
      title: "Let's Connect",
      headline: "Curious how this could work for you?",
      subtext: "Send your details and I'll personally reach out — no pressure.",
      fields: ["name", "email", "phone"],
      channels: {
        messengerUrl: "https://m.me/example",
        whatsappUrl: "https://wa.me/63",
        telegramUrl: "https://t.me/example",
      },
    },
  ],
  seo: {
    title: "Jasmine Cruz | Credibility Profile",
    description:
      "Wellness entrepreneur helping busy moms build extra income from home.",
  },
  createdAt: Date.now(),
  updatedAt: Date.now(),
};
