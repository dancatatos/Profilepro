/**
 * Follow-Up Pipeline templates — pre-built stage configurations for the
 * 5 industries we ship out of the box. Users pick a template when
 * creating their first pipeline; the stages are then editable per-user.
 *
 * Adding a new industry template:
 *   1. Append an entry to PIPELINE_TEMPLATES with a unique industry key.
 *   2. (Optional) Update the AI prompt context per stage for that
 *      industry so generated messages stay relevant.
 *   3. New template appears in the picker automatically.
 */

import type { Pipeline, PipelineIndustry, PipelineStage } from "@/types";
import { uid } from "./utils";

interface PipelineTemplate {
  industry: PipelineIndustry;
  name: string;
  description: string;
  /** Emoji icon shown on the template picker card. */
  icon: string;
  /** Stages without ids — ids generated at instantiation time. */
  stages: Omit<PipelineStage, "id">[];
}

export const PIPELINE_TEMPLATES: readonly PipelineTemplate[] = [
  /* ── Network Marketing / MLM ──────────────────────────────────── */
  {
    industry: "recruiting",
    name: "Network Marketing / Recruiting",
    description:
      "Classic 7-stage downline-building flow used by top MLM recruiters.",
    icon: "🤝",
    stages: [
      {
        name: "Cold contact",
        color: "bg-white/[0.04]",
        sortOrder: 10,
        daysBeforeNextTask: 1,
        aiContext: "first outreach to a cold prospect — no rapport yet",
      },
      {
        name: "Replied / Interested",
        color: "bg-electric-500/12",
        sortOrder: 20,
        daysBeforeNextTask: 1,
        aiContext: "they replied with interest — keep momentum without selling",
      },
      {
        name: "Watched intro",
        color: "bg-electric-500/15",
        sortOrder: 30,
        daysBeforeNextTask: 2,
        aiContext:
          "they finished watching the intro video — invite them to discovery",
      },
      {
        name: "Discovery call",
        color: "bg-gold-400/12",
        sortOrder: 40,
        daysBeforeNextTask: 2,
        aiContext:
          "they had a call with you — follow up with answers + next step",
      },
      {
        name: "Thinking about it",
        color: "bg-gold-400/15",
        sortOrder: 50,
        daysBeforeNextTask: 3,
        aiContext: "they're undecided — handle a specific objection gently",
      },
      {
        name: "Joined downline",
        color: "bg-jade-500/15",
        sortOrder: 60,
        aiContext: "they signed up — welcome them and set first action step",
      },
      {
        name: "Lost / cold again",
        color: "bg-red-500/[0.06]",
        sortOrder: 70,
        aiContext:
          "they went cold — one polite reactivation attempt then move on",
      },
    ],
  },

  /* ── Insurance ─────────────────────────────────────────────────── */
  {
    industry: "insurance",
    name: "Insurance Sales",
    description:
      "Compliant 8-stage flow for life / health / non-life insurance agents.",
    icon: "🛡️",
    stages: [
      {
        name: "Prospect identified",
        color: "bg-white/[0.04]",
        sortOrder: 10,
        daysBeforeNextTask: 2,
        aiContext: "new prospect just identified — no needs analysis yet",
      },
      {
        name: "Needs analysis booked",
        color: "bg-electric-500/12",
        sortOrder: 20,
        daysBeforeNextTask: 1,
        aiContext: "they agreed to a needs-analysis appointment — confirm date",
      },
      {
        name: "Needs analysis done",
        color: "bg-electric-500/15",
        sortOrder: 30,
        daysBeforeNextTask: 3,
        aiContext: "completed needs analysis — preparing proposal",
      },
      {
        name: "Proposal sent",
        color: "bg-gold-400/12",
        sortOrder: 40,
        daysBeforeNextTask: 3,
        aiContext: "they have the proposal — check questions, no hard sell",
      },
      {
        name: "Considering",
        color: "bg-gold-400/15",
        sortOrder: 50,
        daysBeforeNextTask: 5,
        aiContext: "evaluating options — address a specific concern",
      },
      {
        name: "Application submitted",
        color: "bg-electric-500/20",
        sortOrder: 60,
        daysBeforeNextTask: 7,
        aiContext: "application sent to underwriting — keep them informed",
      },
      {
        name: "Issued (client)",
        color: "bg-jade-500/15",
        sortOrder: 70,
        aiContext: "policy issued — onboard + ask for referrals",
      },
      {
        name: "Lost / not qualified",
        color: "bg-red-500/[0.06]",
        sortOrder: 80,
      },
    ],
  },

  /* ── Real Estate ───────────────────────────────────────────────── */
  {
    industry: "real_estate",
    name: "Real Estate Buyer",
    description: "Long-cycle 7-stage pipeline for property brokers and agents.",
    icon: "🏠",
    stages: [
      {
        name: "Inquiry",
        color: "bg-white/[0.04]",
        sortOrder: 10,
        daysBeforeNextTask: 1,
        aiContext: "new inquiry — qualify budget + intent quickly",
      },
      {
        name: "Qualified",
        color: "bg-electric-500/12",
        sortOrder: 20,
        daysBeforeNextTask: 3,
        aiContext:
          "budget + needs confirmed — share matching properties next",
      },
      {
        name: "Viewing scheduled",
        color: "bg-electric-500/15",
        sortOrder: 30,
        daysBeforeNextTask: 1,
        aiContext: "viewing on the calendar — send reminder + directions",
      },
      {
        name: "Considering options",
        color: "bg-gold-400/12",
        sortOrder: 40,
        daysBeforeNextTask: 5,
        aiContext: "weighing properties — recap pros / cons of top picks",
      },
      {
        name: "Offer made",
        color: "bg-gold-400/15",
        sortOrder: 50,
        daysBeforeNextTask: 2,
        aiContext: "offer submitted — keep them informed of seller response",
      },
      {
        name: "Reserved / closed",
        color: "bg-jade-500/15",
        sortOrder: 60,
        aiContext: "deal closed — thank you + ask for referrals",
      },
      {
        name: "Lost",
        color: "bg-red-500/[0.06]",
        sortOrder: 70,
      },
    ],
  },

  /* ── Coaching / Course Sales ──────────────────────────────────── */
  {
    industry: "coaching",
    name: "Coaching / Course Sales",
    description: "High-touch 8-stage flow for coaches and info-product sellers.",
    icon: "🎯",
    stages: [
      {
        name: "Free content viewer",
        color: "bg-white/[0.04]",
        sortOrder: 10,
        daysBeforeNextTask: 1,
        aiContext: "downloaded your lead magnet — keep value flowing",
      },
      {
        name: "Engaged",
        color: "bg-electric-500/12",
        sortOrder: 20,
        daysBeforeNextTask: 2,
        aiContext: "they replied to your DM / email — invite to discovery call",
      },
      {
        name: "Discovery call booked",
        color: "bg-electric-500/15",
        sortOrder: 30,
        daysBeforeNextTask: 1,
        aiContext: "call on calendar — send prep questions",
      },
      {
        name: "Discovery call done",
        color: "bg-gold-400/12",
        sortOrder: 40,
        daysBeforeNextTask: 1,
        aiContext: "call complete — send tailored proposal",
      },
      {
        name: "Proposal sent",
        color: "bg-gold-400/15",
        sortOrder: 50,
        daysBeforeNextTask: 3,
        aiContext: "they have the offer — check in, answer questions",
      },
      {
        name: "Considering",
        color: "bg-gold-400/20",
        sortOrder: 60,
        daysBeforeNextTask: 5,
        aiContext: "deciding — address a specific objection",
      },
      {
        name: "Enrolled (client)",
        color: "bg-jade-500/15",
        sortOrder: 70,
        aiContext: "enrolled — onboard them into the program",
      },
      {
        name: "Lost",
        color: "bg-red-500/[0.06]",
        sortOrder: 80,
      },
    ],
  },

  /* ── Simple Sales (catch-all) ─────────────────────────────────── */
  {
    industry: "sales",
    name: "Simple 4-stage Sales",
    description:
      "Minimal pipeline — perfect when you just want New → Talking → Closing → Closed.",
    icon: "💼",
    stages: [
      {
        name: "New lead",
        color: "bg-white/[0.04]",
        sortOrder: 10,
        daysBeforeNextTask: 1,
      },
      {
        name: "Talking",
        color: "bg-electric-500/15",
        sortOrder: 20,
        daysBeforeNextTask: 2,
        aiContext: "we're in active conversation — keep momentum",
      },
      {
        name: "Closing",
        color: "bg-gold-400/15",
        sortOrder: 30,
        daysBeforeNextTask: 2,
        aiContext: "pushing to close — clear call to action",
      },
      {
        name: "Closed (won)",
        color: "bg-jade-500/15",
        sortOrder: 40,
        aiContext: "deal won — thank them + ask for referrals",
      },
    ],
  },
] as const;

/**
 * Instantiate a fresh Pipeline from a template. Generates stage ids,
 * timestamps, and an owner reference. Caller persists the result.
 */
export function pipelineFromTemplate(
  template: PipelineTemplate,
  ownerId: string,
  options?: { isDefault?: boolean; name?: string },
): Pipeline {
  const now = Date.now();
  return {
    id: uid("pipe"),
    ownerId,
    name: options?.name ?? template.name,
    description: template.description,
    industry: template.industry,
    isDefault: options?.isDefault ?? false,
    stages: template.stages.map((s) => ({ ...s, id: uid("stage") })),
    createdAt: now,
    updatedAt: now,
  };
}

/** Build an empty custom pipeline scaffold — admin sets stages from scratch. */
export function emptyCustomPipeline(ownerId: string): Pipeline {
  const now = Date.now();
  return {
    id: uid("pipe"),
    ownerId,
    name: "My Pipeline",
    description: "",
    industry: "custom",
    isDefault: false,
    stages: [
      {
        id: uid("stage"),
        name: "New",
        color: "bg-white/[0.04]",
        sortOrder: 10,
        daysBeforeNextTask: 1,
      },
      {
        id: uid("stage"),
        name: "In progress",
        color: "bg-electric-500/15",
        sortOrder: 20,
        daysBeforeNextTask: 2,
      },
      {
        id: uid("stage"),
        name: "Done",
        color: "bg-jade-500/15",
        sortOrder: 30,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };
}

/** Look up a template by its industry key. */
export function getPipelineTemplate(
  industry: PipelineIndustry,
): PipelineTemplate | undefined {
  return PIPELINE_TEMPLATES.find((t) => t.industry === industry);
}
