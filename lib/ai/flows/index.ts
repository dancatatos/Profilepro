/* ============================================================
   AI flows — orchestration layer.
   Every flow degrades gracefully: when no Gemini key is present
   it returns a high-quality templated mock so the product is
   fully demoable before credentials are wired.
   ============================================================ */

import {
  AINotConfiguredError,
  geminiJSON,
  geminiStream,
  geminiText,
} from "../client";
import { auditSchema, profileContentSchema } from "../schemas";
import {
  ASSISTANT_SYSTEM,
  BASE_SYSTEM,
  buildAuditPrompt,
  buildClonePrompt,
  buildProfilePrompt,
  buildRewritePrompt,
} from "../prompts";
import type {
  AICopyMode,
  AILanguage,
  AIChatMessage,
  AIOnboardingAnswers,
  GeneratedProfileContent,
  Profile,
  ProfileAudit,
} from "@/types";

export interface FlowResult<T> {
  data: T;
  usedAI: boolean;
}

/* ---------------- Profile generation ---------------- */

export async function generateProfileFlow(
  answers: AIOnboardingAnswers,
): Promise<FlowResult<GeneratedProfileContent>> {
  try {
    const data = await geminiJSON<GeneratedProfileContent>({
      system: BASE_SYSTEM,
      prompt: buildProfilePrompt(answers),
      schema: profileContentSchema,
      temperature: 0.85,
      maxOutputTokens: 2048,
    });
    return { data: normalizeContent(data), usedAI: true };
  } catch (err) {
    console.warn("[AI] generateProfileFlow failed, using mock:", err);
    return { data: mockProfileContent(answers), usedAI: false };
  }
}

/* ---------------- Clone rewrite ---------------- */

export async function cloneRewriteFlow(
  source: Profile,
  newName: string,
  mode: AICopyMode,
  language: AILanguage,
): Promise<FlowResult<GeneratedProfileContent>> {
  try {
    const data = await geminiJSON<GeneratedProfileContent>({
      system: BASE_SYSTEM,
      prompt: buildClonePrompt(source, newName, mode, language),
      schema: profileContentSchema,
      temperature: 0.9,
      maxOutputTokens: 2048,
    });
    return { data: normalizeContent(data), usedAI: true };
  } catch (err) {
    console.warn("[AI] cloneRewriteFlow failed, using mock:", err);
    return {
      data: mockProfileContent({
        niche: source.header.company || "",
        company: source.header.company || "",
        offer: "",
        targetMarket: "",
        tone: mode,
        language,
        brandingStyle: "",
        mission: source.header.bio,
        resultYouHelpAchieve: "",
      }),
      usedAI: false,
    };
  }
}

/* ---------------- Profile audit ---------------- */

export async function auditProfileFlow(
  profile: Profile,
): Promise<FlowResult<ProfileAudit>> {
  try {
    const raw = await geminiJSON<Omit<ProfileAudit, "generatedAt">>({
      system: BASE_SYSTEM,
      prompt: buildAuditPrompt(profile),
      schema: auditSchema,
      temperature: 0.4,
      maxOutputTokens: 1500,
    });
    return { data: { ...raw, generatedAt: Date.now() }, usedAI: true };
  } catch (err) {
    console.warn("[AI] auditProfileFlow failed, using heuristic:", err);
    return { data: heuristicAudit(profile), usedAI: false };
  }
}

/* ---------------- Rewrite / single-shot copy ---------------- */

export async function rewriteFlow(
  instruction: string,
  content: string,
  mode: AICopyMode,
  language: AILanguage,
): Promise<FlowResult<string>> {
  try {
    const data = await geminiText({
      system: ASSISTANT_SYSTEM,
      prompt: buildRewritePrompt(instruction, content, mode, language),
      temperature: 0.85,
      maxOutputTokens: 900,
    });
    return { data: data.trim(), usedAI: true };
  } catch (err) {
    console.warn("[AI] rewriteFlow failed, using mock:", err);
    return { data: mockRewrite(instruction, content, language), usedAI: false };
  }
}

/* ---------------- Streaming assistant chat ---------------- */

export async function assistantStreamFlow(
  messages: AIChatMessage[],
): Promise<ReadableStream<Uint8Array>> {
  const transcript = messages
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n");
  try {
    return await geminiStream({
      system: ASSISTANT_SYSTEM,
      prompt: `${transcript}\nAssistant:`,
      temperature: 0.85,
      maxOutputTokens: 1200,
    });
  } catch (err) {
    console.warn("[AI] assistantStreamFlow failed, using fallback:", err);
    const text =
      "I'm your Credibly AI assistant — I had trouble connecting right now, but I'm here to help. Try asking me to rewrite your bio, generate CTAs, write a recruiting pitch, or audit your profile.";
    return canChunkStream(text);
  }
}

/* ============================================================
   Helpers
   ============================================================ */

function normalizeContent(c: GeneratedProfileContent): GeneratedProfileContent {
  return {
    headline: c.headline || "",
    bio: c.bio || "",
    ctaButtons: (c.ctaButtons || []).slice(0, 6),
    aboutSection: c.aboutSection || "",
    credibilitySection: (c.credibilitySection || []).slice(0, 6),
    socialProof: (c.socialProof || []).slice(0, 4),
    products: (c.products || []).slice(0, 4),
    testimonials: (c.testimonials || []).slice(0, 4),
    leadMagnet: c.leadMagnet || "",
    suggestedSections: c.suggestedSections || [],
  };
}

/* ---- Mock generators (used when no Gemini key) ---- */

function mockProfileContent(
  a: AIOnboardingAnswers,
): GeneratedProfileContent {
  const audience = a.targetMarket || "people who want more";
  const result = a.resultYouHelpAchieve || "reach their goals";
  const taglish = a.language === "taglish";
  return {
    headline: taglish
      ? `Tinutulungan ko ang ${audience} na ${result}`
      : `I help ${audience} ${result}`,
    bio: taglish
      ? `${a.mission || "Nandito ako para tumulong."} Kasama ko ang ${a.company || "isang trusted brand"} sa ${a.niche || "industriyang ito"} — simple lang: gusto kitang makita na mag-succeed.`
      : `${a.mission || "I'm here to help people win."} I work with ${a.company || "a trusted brand"} in ${a.niche || "this space"} — and my goal is simple: to see you succeed.`,
    ctaButtons: [
      { label: taglish ? "Sumali sa Team" : "Join My Team", intent: "recruit" },
      { label: taglish ? "Libreng Training" : "Free Training", intent: "lead-magnet" },
      { label: taglish ? "Mag-book ng Call" : "Book A Call", intent: "consultation" },
    ],
    aboutSection: taglish
      ? `Hindi ako nagsimula bilang expert. May panahon na pagod na pagod ako at gusto ko ng pagbabago. Doon ko natuklasan ang ${a.company || "oportunidad na ito"}. Ngayon, ${a.mission || "tinutulungan ko ang iba na gawin din ito"} — at pwede ka ring sumunod.`
      : `I didn't start as an expert. There was a point where I was exhausted and craving change. That's when I found ${a.company || "this opportunity"}. Today, ${a.mission || "I help others do the same"} — and you can follow the same path.`,
    credibilitySection: [
      taglish ? "Aktibong gumagabay sa lumalagong team" : "Actively mentoring a growing team",
      taglish ? "Pinagkakatiwalaan ng mga kliyente" : "Trusted by real clients",
      taglish ? "Patuloy na natututo at umuunlad" : "Committed to continuous growth",
    ],
    socialProof: [
      { label: "Experience", value: "Growing" },
      { label: "People Helped", value: "Real results" },
    ],
    products: a.offer
      ? [{ title: a.offer, description: `Designed to help ${audience} ${result}.` }]
      : [],
    testimonials: [
      {
        authorName: "A happy client",
        quote: taglish
          ? "Sobrang supportive at professional. Worth it talaga!"
          : "So supportive and professional. Truly worth it!",
      },
    ],
    leadMagnet: taglish
      ? "Libreng starter guide para sa mga gustong magsimula"
      : "A free starter guide for anyone ready to begin",
    suggestedSections: [
      "cta",
      "socials",
      "about",
      "credibility",
      "testimonials",
      "leadCapture",
    ],
  };
}

function mockRewrite(
  instruction: string,
  content: string,
  language: AILanguage,
): string {
  const base = content.trim();
  if (base) {
    return language === "taglish"
      ? `${base}\n\n(Connect a Gemini key sa .env.local para i-rewrite ito ng AI — "${instruction.slice(0, 60)}".)`
      : `${base}\n\n(Connect a Gemini key in .env.local so the AI can rewrite this — "${instruction.slice(0, 60)}".)`;
  }
  return "Add your Gemini API key to .env.local to generate copy here. See README.md for the 2-minute setup.";
}

function heuristicAudit(profile: Profile): ProfileAudit {
  const h = profile.header;
  const enabled = profile.sections.filter((s) => s.enabled);
  const has = (t: string) => enabled.some((s) => s.type === t);

  const credibility = clampScore(
    35 +
      (h.verified ? 18 : 0) +
      (h.socialProof.length >= 2 ? 17 : h.socialProof.length * 8) +
      (has("credibility") ? 18 : 0) +
      (has("testimonials") ? 12 : 0),
  );
  const conversion = clampScore(
    30 +
      (has("cta") ? 28 : 0) +
      (has("leadCapture") ? 24 : 0) +
      (has("products") ? 10 : 0) +
      (h.headline.length > 12 ? 8 : 0),
  );
  const branding = clampScore(
    40 +
      (h.avatarUrl ? 20 : 0) +
      (h.company ? 12 : 0) +
      (has("gallery") ? 10 : 0) +
      (h.headline.length > 12 ? 10 : 0),
  );
  const clarity = clampScore(
    45 +
      (h.headline.length > 12 && h.headline.length < 90 ? 22 : 5) +
      (h.bio.length > 40 ? 20 : 8) +
      (has("about") ? 13 : 0),
  );
  const overall = Math.round(
    (credibility + conversion + branding + clarity) / 4,
  );

  const suggestions: ProfileAudit["suggestions"] = [];
  if (!h.verified)
    suggestions.push({
      area: "Credibility",
      severity: "medium",
      suggestion: "Turn on the verification badge style to build instant trust.",
    });
  if (!has("cta"))
    suggestions.push({
      area: "Conversion",
      severity: "high",
      suggestion: "Add a CTA Buttons section so prospects know what to do next.",
    });
  if (!has("leadCapture"))
    suggestions.push({
      area: "Conversion",
      severity: "high",
      suggestion: "Add a Lead Capture section to collect prospect details.",
    });
  if (!has("testimonials"))
    suggestions.push({
      area: "Social proof",
      severity: "medium",
      suggestion: "Add testimonials — social proof dramatically lifts trust.",
    });
  if (!h.avatarUrl)
    suggestions.push({
      area: "Branding",
      severity: "medium",
      suggestion: "Upload a clear, friendly profile photo.",
    });

  return {
    scores: { credibility, conversion, branding, clarity, overall },
    suggestions,
    headlineIdeas: [
      `I help ${h.company || "people"} get real results`,
      "Trusted guidance for your next big step",
      "Your partner for growth that actually lasts",
    ],
    ctaIdeas: ["Join My Team", "Book A Free Call", "Get The Free Guide"],
    generatedAt: Date.now(),
  };
}

function clampScore(n: number): number {
  return Math.max(10, Math.min(99, Math.round(n)));
}

function canChunkStream(text: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const words = text.split(" ");
  let i = 0;
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (i >= words.length) {
        controller.close();
        return;
      }
      controller.enqueue(encoder.encode(words[i] + (i < words.length - 1 ? " " : "")));
      i += 1;
      await new Promise((r) => setTimeout(r, 18));
    },
  });
}
