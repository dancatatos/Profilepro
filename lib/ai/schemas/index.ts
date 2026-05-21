/* ============================================================
   Gemini structured-output schemas (OpenAPI subset).
   Passed as `responseSchema` so the model returns strict JSON.
   ============================================================ */

export const profileContentSchema: Record<string, unknown> = {
  type: "OBJECT",
  properties: {
    headline: { type: "STRING" },
    bio: { type: "STRING" },
    ctaButtons: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          label: { type: "STRING" },
          intent: { type: "STRING" },
        },
        required: ["label", "intent"],
      },
    },
    aboutSection: { type: "STRING" },
    credibilitySection: { type: "ARRAY", items: { type: "STRING" } },
    socialProof: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          label: { type: "STRING" },
          value: { type: "STRING" },
        },
        required: ["label", "value"],
      },
    },
    products: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          title: { type: "STRING" },
          description: { type: "STRING" },
        },
        required: ["title", "description"],
      },
    },
    testimonials: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          authorName: { type: "STRING" },
          quote: { type: "STRING" },
        },
        required: ["authorName", "quote"],
      },
    },
    leadMagnet: { type: "STRING" },
    suggestedSections: { type: "ARRAY", items: { type: "STRING" } },
  },
  required: [
    "headline",
    "bio",
    "ctaButtons",
    "aboutSection",
    "credibilitySection",
    "socialProof",
    "leadMagnet",
    "suggestedSections",
  ],
};

export const auditSchema: Record<string, unknown> = {
  type: "OBJECT",
  properties: {
    scores: {
      type: "OBJECT",
      properties: {
        credibility: { type: "NUMBER" },
        conversion: { type: "NUMBER" },
        branding: { type: "NUMBER" },
        clarity: { type: "NUMBER" },
        overall: { type: "NUMBER" },
      },
      required: ["credibility", "conversion", "branding", "clarity", "overall"],
    },
    suggestions: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          area: { type: "STRING" },
          severity: { type: "STRING" },
          suggestion: { type: "STRING" },
        },
        required: ["area", "severity", "suggestion"],
      },
    },
    headlineIdeas: { type: "ARRAY", items: { type: "STRING" } },
    ctaIdeas: { type: "ARRAY", items: { type: "STRING" } },
  },
  required: ["scores", "suggestions", "headlineIdeas", "ctaIdeas"],
};
