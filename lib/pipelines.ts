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

/** Template-side message — id is generated at instantiation time. */
type TemplateMessage = { label: string; body: string };

/** Template-side stage — stage id AND message ids (both EN + TL arrays) are
 *  generated when a real pipeline is built from this template. */
type TemplateStage = Omit<
  PipelineStage,
  "id" | "followUpMessages" | "followUpMessagesTaglish"
> & {
  followUpMessages?: TemplateMessage[];
  followUpMessagesTaglish?: TemplateMessage[];
};

interface PipelineTemplate {
  industry: PipelineIndustry;
  name: string;
  description: string;
  /** Emoji icon shown on the template picker card. */
  icon: string;
  stages: TemplateStage[];
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
        followUpGoal: "Spark a conversation — get them to reply once",
        followUpMessages: [
          {
            label: "Day 1 — First touch",
            body: "Hey {name}! 👋\n\nCame across your profile and we seem to have a lot in common. Quick reason for reaching out — I work with people who are open to creating an extra stream of income from home (totally optional, no pressure).\n\nIf you're ever curious how, just say the word. If not, all good — wishing you the best either way 🙌",
          },
          {
            label: "Day 3 — Soft check-in",
            body: "Hey {name}, just checking in 😊\n\nNot pitching anything — just wanted to say hi properly. How's your week going?",
          },
          {
            label: "Day 7 — Permission close",
            body: "Hey {name}, this'll be my last message I promise 🙏\n\nIf the timing's not right that's totally fine — just wanted to leave the door open. If you ever want to explore what we do, I'm a message away.\n\nTake care!",
          },
        ],
        followUpMessagesTaglish: [
          {
            label: "Day 1 — First touch",
            body: "Hi {name}! 👋\n\nNakita ko yung profile mo at parang may pagkakapareho tayo ng interests. Quick lang naman — I'm working with people na open mag-build ng extra income from home (walang pressure, totally optional).\n\nIf curious ka kung paano, message me lang. Kung hindi naman, all good — ingat ka palagi 🙌",
          },
          {
            label: "Day 3 — Soft check-in",
            body: "Hey {name}, just checking in 😊\n\nWala akong pino-pitch — just wanted to say hi properly. Kumusta ang week mo so far?",
          },
          {
            label: "Day 7 — Permission close",
            body: "Hi {name}, last message ko na promise 🙏\n\nKung hindi pa siya right time, totally fine. Iniiwan ko lang yung door open — kapag ready ka or curious ka kung anong ginagawa namin, message me lang.\n\nIngat!",
          },
        ],
      },
      {
        name: "Replied / Interested",
        color: "bg-electric-500/12",
        sortOrder: 20,
        daysBeforeNextTask: 1,
        aiContext: "they replied with interest — keep momentum without selling",
        followUpGoal: "Get them to watch the intro video",
        followUpMessages: [
          {
            label: "Reply 1 — Send video",
            body: "Awesome {name}, thanks for getting back to me! 🙌\n\nHere's a short 7-minute video that breaks down exactly what we do and who it's for:\n👉 [paste your video link here]\n\nAfter watching, hit me back and let me know your honest reaction — even if it's a 'not for me'. Saves us both time 😊",
          },
          {
            label: "Day 2 — Did you watch?",
            body: "Hey {name}! Just checking — did you get a chance to watch the video?\n\nNo rush, just making sure it didn't get buried in your notifications 📬",
          },
          {
            label: "Day 4 — Pattern interrupt",
            body: "Hey {name}, totally get if life's been busy 😊\n\nQuick question to make the video land better — what's your #1 goal for the next 6 months? When I know what you're actually after, I can tell you in 30 seconds whether this is a fit.",
          },
        ],
        followUpMessagesTaglish: [
          {
            label: "Reply 1 — Send video",
            body: "Salamat sa pag-reply {name}! 🙌\n\nHeto yung short 7-min video na nag-eexplain kung ano ginagawa namin at kung para kanino siya:\n👉 [paste your video link here]\n\nPagkatapos mong panoorin, message me lang kung ano honest reaction mo — kahit 'not for me' okay lang. Saves us both time 😊",
          },
          {
            label: "Day 2 — Did you watch?",
            body: "Hey {name}! Just checking — napanood mo na ba yung video?\n\nWalang rush, just making sure hindi siya nakalubog sa notifications mo 📬",
          },
          {
            label: "Day 4 — Pattern interrupt",
            body: "Hey {name}, gets ko kung busy ka 😊\n\nIsang tanong lang para mas magiging useful yung video — anong #1 goal mo for the next 6 months? Pag alam ko kung ano talaga gusto mo, sasabihin ko in 30 seconds kung fit ba ito sayo.",
          },
        ],
      },
      {
        name: "Watched intro",
        color: "bg-electric-500/15",
        sortOrder: 30,
        daysBeforeNextTask: 2,
        aiContext:
          "they finished watching the intro video — invite them to discovery",
        followUpGoal: "Book a 15-minute discovery call",
        followUpMessages: [
          {
            label: "Day 1 — Ask reaction",
            body: "{name}! Saw you finished the video — what was your biggest takeaway? 🎯\n\nWant to jump on a quick 15-min Zoom so I can answer your questions and we can see if there's an actual fit?\n\nHere's my calendar — Tuesday or Thursday works:\n👉 [paste calendar link]",
          },
          {
            label: "Day 3 — Scarcity nudge",
            body: "Hey {name}, my calendar's filling up this week — wanted to make sure you grab a slot before it gets crazy.\n\nZero obligation on the call, just an honest convo 🗓️\n👉 [paste calendar link]",
          },
          {
            label: "Day 5 — Last invite",
            body: "Hi {name}! Last nudge on the call 😊\n\nIf it doesn't feel right that's totally cool. But if you're even a little curious, it's the fastest way to get clear answers.\n👉 [paste calendar link]",
          },
        ],
        followUpMessagesTaglish: [
          {
            label: "Day 1 — Ask reaction",
            body: "{name}! Napanood mo na pala yung video — ano biggest takeaway mo? 🎯\n\nGusto mo bang mag-quick 15-min Zoom para ma-answer ko lahat ng questions mo at makita natin kung fit ba talaga?\n\nHeto calendar ko — Tuesday or Thursday available ako:\n👉 [paste calendar link]",
          },
          {
            label: "Day 3 — Scarcity nudge",
            body: "Hey {name}, mapupuno na yung calendar ko this week — gusto kong ma-secure mo na yung slot bago mag-busy lahat.\n\nZero obligation sa call, honest convo lang talaga 🗓️\n👉 [paste calendar link]",
          },
          {
            label: "Day 5 — Last invite",
            body: "Hi {name}! Last nudge ko na sa call 😊\n\nKung hindi mo feel okay lang naman. Pero kung kahit konting curious ka lang, ito yung pinakamabilis na way to get answers.\n👉 [paste calendar link]",
          },
        ],
      },
      {
        name: "Discovery call",
        color: "bg-gold-400/12",
        sortOrder: 40,
        daysBeforeNextTask: 2,
        aiContext:
          "they had a call with you — follow up with answers + next step",
        followUpGoal: "Get a clear yes, no, or 'still thinking'",
        followUpMessages: [
          {
            label: "Post-call — Recap",
            body: "{name}, great chatting earlier! 🙌\n\nAs promised, here's everything we covered:\n👉 [paste link / doc / starter pack]\n\nTake your time going through it. When you've digested it, just let me know if it's a yes, no, or you need to think — all three answers help me know how to support you best 💯",
          },
          {
            label: "Day 2 — Open question",
            body: "Hey {name}! Any questions come up after our call?\n\nI know it's a lot to take in — happy to answer anything at all, even the smallest stuff 😊",
          },
          {
            label: "Day 5 — Direct ask",
            body: "{name}, want to make sure I'm respecting your time and decision 🙏\n\nWhere are you at — yes, no, or still considering? Whatever it is, I appreciate the honesty.",
          },
        ],
        followUpMessagesTaglish: [
          {
            label: "Post-call — Recap",
            body: "{name}, nakaka-enjoy yung usap natin kanina! 🙌\n\nAs promised, heto lahat ng pinag-usapan natin:\n👉 [paste link / doc / starter pack]\n\nTake your time basahin lahat. Kapag na-digest mo na, message me lang kung yes, no, or kailangan mo pa mag-isip — okay lang lahat ng sagot, makakatulong yun para malaman ko paano kita susuportahan 💯",
          },
          {
            label: "Day 2 — Open question",
            body: "Hey {name}! May na-isip ka bang tanong pagkatapos ng call natin?\n\nAlam ko marami ang in-absorb mo — happy to answer kahit anong tanong, kahit yung small lang 😊",
          },
          {
            label: "Day 5 — Direct ask",
            body: "{name}, gusto ko lang i-respeto yung oras at decision mo 🙏\n\nNasaan ka na — yes, no, or still considering pa? Kahit ano sagot mo, salamat sa honesty.",
          },
        ],
      },
      {
        name: "Thinking about it",
        color: "bg-gold-400/15",
        sortOrder: 50,
        daysBeforeNextTask: 3,
        aiContext: "they're undecided — handle a specific objection gently",
        followUpGoal: "Surface the real objection and address it gently",
        followUpMessages: [
          {
            label: "Day 3 — Surface objection",
            body: "Hey {name} 😊\n\nNo pressure at all — but I'm curious, what's the one thing you're weighing the most right now? Sometimes talking it out makes the answer obvious.\n\nI promise I won't push, just want to understand.",
          },
          {
            label: "Day 7 — Social proof",
            body: "Hi {name}! Thought this might help 💡\n\nMeet [name of success story] — they were in a similar spot to you 6 months ago:\n👉 [paste testimonial / case study link]\n\nNot saying their path is yours, just thought their story might give you clarity.",
          },
          {
            label: "Day 14 — Final close",
            body: "Hey {name}, this is my final touch base 🙏\n\nTotally fine if the answer is no or 'not now' — just let me know one way or the other so I can either welcome you in properly or close the loop respectfully.\n\nWhatever you decide is the right call!",
          },
        ],
        followUpMessagesTaglish: [
          {
            label: "Day 3 — Surface objection",
            body: "Hey {name} 😊\n\nWala talagang pressure — pero curious lang ako, ano yung pinaka-pinag-iisipan mo ngayon? Minsan kapag napag-usapan, mas nagiging clear yung sagot.\n\nPromise hindi kita pipilitin, gusto ko lang maintindihan.",
          },
          {
            label: "Day 7 — Social proof",
            body: "Hi {name}! Baka makatulong sayo ito 💡\n\nIto si [name of success story] — same situation niya 6 months ago:\n👉 [paste testimonial / case study link]\n\nHindi naman ako nagsasabing same yung path niyo, baka makatulong lang yung kwento niya para mas maging clear sayo.",
          },
          {
            label: "Day 14 — Final close",
            body: "Hey {name}, last message ko na ito 🙏\n\nTotally fine kung no or 'not now' yung sagot — pa-message lang kung alin sa dalawa para either ma-welcome kita properly or maisara natin yung loop ng maayos.\n\nKahit ano decision mo, tama yun!",
          },
        ],
      },
      {
        name: "Joined downline",
        color: "bg-jade-500/15",
        sortOrder: 60,
        aiContext: "they signed up — welcome them and set first action step",
        followUpGoal: "Get them to take their first income-producing action",
        followUpMessages: [
          {
            label: "Day 1 — Welcome",
            body: "🎉 {name} WELCOME to the team!!\n\nSo pumped to have you in. Your first step is here:\n👉 [paste onboarding / fast-start link]\n\nBlock 30 minutes today or tomorrow to go through it — that's how everyone successful starts. I'm in your corner 100% 💪",
          },
          {
            label: "Day 3 — Onboarding check",
            body: "Hey {name}! How's the onboarding going?\n\nHave you completed [first action step]? Don't overthink it — done is better than perfect at this stage. Message me if you're stuck on anything!",
          },
          {
            label: "Day 7 — Set 30-day goal",
            body: "{name}, you've been with us a week 🎊\n\nQuick question — what's your ONE specific goal for the next 30 days? Doesn't have to be huge, just one clear thing.\n\nOnce you tell me, I'll plug you into the exact resources to hit it.",
          },
        ],
        followUpMessagesTaglish: [
          {
            label: "Day 1 — Welcome",
            body: "🎉 {name} WELCOME sa team!!\n\nSobrang excited na nandito ka na. First step mo eto:\n👉 [paste onboarding / fast-start link]\n\nMag-block ka ng 30 minutes today or bukas para magawan mo ito — yan yung start ng mga successful na members. I got your back 100% 💪",
          },
          {
            label: "Day 3 — Onboarding check",
            body: "Hey {name}! Kumusta yung onboarding mo?\n\nNagawa mo na ba yung [first action step]? Huwag mong i-overthink — done is better than perfect sa stage na ito. Message me lang kapag may natigilan ka!",
          },
          {
            label: "Day 7 — Set 30-day goal",
            body: "{name}, isang linggo ka na samin 🎊\n\nQuick question — ano yung ISANG specific goal mo for the next 30 days? Hindi kelangan malaki, basta isa lang na malinaw.\n\nPag sinabi mo sa akin, ipa-plug kita sa exact resources para ma-hit mo yan.",
          },
        ],
      },
      {
        name: "Lost / cold again",
        color: "bg-red-500/[0.06]",
        sortOrder: 70,
        aiContext:
          "they went cold — one polite reactivation attempt then move on",
        followUpGoal: "One respectful reactivation, then close the loop",
        followUpMessages: [
          {
            label: "Day 1 — Close loop",
            body: "Hey {name}, completely respect that the timing wasn't right 🙏\n\nJust want you to know the door's never closed. If anything changes in the next 3-6 months, shoot me a message anytime.\n\nWishing you nothing but success!",
          },
          {
            label: "Day 60 — Reactivation",
            body: "{name} — random check-in, no agenda 😊\n\nJust thought of you today and wanted to see how everything's going. Hope life's treating you well!",
          },
        ],
        followUpMessagesTaglish: [
          {
            label: "Day 1 — Close loop",
            body: "Hey {name}, naiintindihan ko na hindi pa right time 🙏\n\nGusto ko lang malaman mo na hindi sarado yung pinto. Kung may magbago in the next 3-6 months, message me lang anytime.\n\nWishing you nothing but success!",
          },
          {
            label: "Day 60 — Reactivation",
            body: "{name} — random check-in lang, walang agenda 😊\n\nNaalala lang kita today, gusto ko lang i-check kung kumusta na ang lahat. Sana okay ang buhay sayo!",
          },
        ],
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
        followUpGoal: "Book a needs-analysis appointment",
        followUpMessages: [
          {
            label: "Day 1 — Soft intro",
            body: "Hi {name}, hope your week's going well 👋\n\nQuick intro — I'm a licensed financial advisor and I help families protect what matters most. Most clients are surprised at how affordable proper coverage actually is.\n\nWould you be open to a free 20-min needs analysis? No obligation — just clarity on where you stand.",
          },
          {
            label: "Day 3 — Value reminder",
            body: "Hey {name} 😊\n\nJust circling back — most of my clients tell me they wished they'd done a needs analysis years earlier. It's free, takes 20 min, and you walk away with a clear picture.\n\nLet me know if this week or next works better for you.",
          },
          {
            label: "Day 7 — Permission close",
            body: "Hi {name}, last check-in 🙏\n\nIf the timing's not right that's totally fine. Just shoot me a message anytime — I'll be here when you're ready to look at things properly.",
          },
        ],
        followUpMessagesTaglish: [
          {
            label: "Day 1 — Soft intro",
            body: "Hi {name}, sana okay ang week mo 👋\n\nQuick intro lang — licensed financial advisor ako, tumutulong sa mga families na ma-protect yung mga importante sa kanila. Most clients namin, nagulat na affordable pala yung proper coverage.\n\nOpen ka ba sa free 20-min needs analysis? Walang obligation — just clarity sa current standing mo.",
          },
          {
            label: "Day 3 — Value reminder",
            body: "Hey {name} 😊\n\nJust circling back — sinasabi ng karamihan ng clients ko na sana nag-needs analysis na sila years earlier. Libre lang siya, 20 mins, at malinaw na yung picture mo pagkatapos.\n\nPa-message lang kung this week or next week kaya mo.",
          },
          {
            label: "Day 7 — Permission close",
            body: "Hi {name}, last check-in ko na 🙏\n\nKung hindi pa right time okay lang naman. Message me lang anytime — nandito lang ako kapag ready ka na talaga.",
          },
        ],
      },
      {
        name: "Needs analysis booked",
        color: "bg-electric-500/12",
        sortOrder: 20,
        daysBeforeNextTask: 1,
        aiContext: "they agreed to a needs-analysis appointment — confirm date",
        followUpGoal: "Confirm appointment & prep them with the right info",
        followUpMessages: [
          {
            label: "Confirmation",
            body: "Hi {name}, just confirming our needs analysis is set for [date / time] 📅\n\nTo make the most of our 20 minutes, please have ready:\n• Your monthly income (rough is fine)\n• Any existing insurance policies\n• A list of your dependents\n\nLooking forward to it!",
          },
          {
            label: "Day before — Reminder",
            body: "Hey {name}! Just a friendly reminder we're meeting tomorrow at [time] 😊\n\nIf anything's come up and you need to reschedule, just let me know. Otherwise — see you soon!",
          },
        ],
        followUpMessagesTaglish: [
          {
            label: "Confirmation",
            body: "Hi {name}, just confirming na set tayo for needs analysis sa [date / time] 📅\n\nPara ma-maximize natin yung 20 minutes, please have ready:\n• Monthly income mo (rough estimate okay lang)\n• Existing insurance policies, kung meron\n• List ng dependents mo\n\nSee you soon!",
          },
          {
            label: "Day before — Reminder",
            body: "Hey {name}! Friendly reminder lang — tomorrow yung meeting natin sa [time] 😊\n\nKung may pumasok at kailangang mag-reschedule, message me lang. Otherwise — see you tomorrow!",
          },
        ],
      },
      {
        name: "Needs analysis done",
        color: "bg-electric-500/15",
        sortOrder: 30,
        daysBeforeNextTask: 3,
        aiContext: "completed needs analysis — preparing proposal",
        followUpGoal: "Move them confidently into receiving the proposal",
        followUpMessages: [
          {
            label: "Day 1 — Thank you",
            body: "{name}, thank you for the open conversation today 🙌\n\nI'll be putting together your custom proposal over the next couple of days. It'll cover the gaps we discussed plus 2-3 options at different price points so you can choose what works for you.\n\nTalk soon!",
          },
          {
            label: "Day 3 — Proposal update",
            body: "Hi {name}! Quick update — your proposal is almost ready ✅\n\nI'm finalising the numbers to make sure you get the best possible options. Should land in your inbox by [date].",
          },
        ],
        followUpMessagesTaglish: [
          {
            label: "Day 1 — Thank you",
            body: "{name}, salamat sa open na conversation natin earlier 🙌\n\nGagawin ko yung custom proposal mo sa susunod na ilang araw. Covered yung gaps na pinag-usapan natin plus 2-3 options sa iba't ibang price points para makapili ka ng tamang fit.\n\nTalk soon!",
          },
          {
            label: "Day 3 — Proposal update",
            body: "Hi {name}! Quick update — almost ready na yung proposal mo ✅\n\nFinalizing ko lang yung numbers para best possible options ang makuha mo. Dadating na siya sa inbox mo by [date].",
          },
        ],
      },
      {
        name: "Proposal sent",
        color: "bg-gold-400/12",
        sortOrder: 40,
        daysBeforeNextTask: 3,
        aiContext: "they have the proposal — check questions, no hard sell",
        followUpGoal: "Get them to read it, then book a walk-through",
        followUpMessages: [
          {
            label: "Day 1 — Confirm receipt",
            body: "Hi {name}, just confirming you received the proposal? 📧\n\nTake your time going through it. Happy to jump on a 15-min walk-through whenever you're ready — sometimes it's easier to talk than read!",
          },
          {
            label: "Day 3 — Open for questions",
            body: "Hey {name}, how's the review going?\n\nMost of my clients have 2-3 questions after the first read — totally normal. Just message them through and I'll explain in plain English, no jargon 😊",
          },
          {
            label: "Day 5 — Soft nudge",
            body: "Hi {name}, no pressure — just wanted to circle back.\n\nWhich of the 3 options resonated most — A, B, or C? Or did none quite fit? Either way I want to make sure we land on something that genuinely works for you.",
          },
        ],
        followUpMessagesTaglish: [
          {
            label: "Day 1 — Confirm receipt",
            body: "Hi {name}, na-receive mo na ba yung proposal? 📧\n\nTake your time basahin lahat. Happy to jump on a 15-min walk-through anytime — minsan mas madali kapag pinag-usapan than pagbabasa lang!",
          },
          {
            label: "Day 3 — Open for questions",
            body: "Hey {name}, kumusta yung review mo?\n\nMost clients ko may 2-3 questions after the first read — normal yan. Just message them through and ipapaliwanag ko in plain English, walang jargon 😊",
          },
          {
            label: "Day 5 — Soft nudge",
            body: "Hi {name}, no pressure — gusto ko lang mag-circle back.\n\nAlin sa 3 options yung pinaka-resonated sayo — A, B, or C? Or wala talagang fit? Either way, gusto kong mahanap natin yung tamang option para sayo.",
          },
        ],
      },
      {
        name: "Considering",
        color: "bg-gold-400/15",
        sortOrder: 50,
        daysBeforeNextTask: 5,
        aiContext: "evaluating options — address a specific concern",
        followUpGoal: "Surface the real concern and address it with proof",
        followUpMessages: [
          {
            label: "Day 3 — Open question",
            body: "Hey {name} 😊\n\nNo pressure — but I'm curious, what's the main thing holding you back right now? Cost? Timing? Coverage details? Doesn't matter what it is, I just want to address it properly.",
          },
          {
            label: "Day 7 — Social proof",
            body: "Hi {name}, thought this might help 💡\n\nHere's a quick story from a client in a similar spot to yours:\n👉 [paste testimonial / case study]\n\nNot saying their answer is yours — just sometimes another perspective makes the path clearer.",
          },
        ],
        followUpMessagesTaglish: [
          {
            label: "Day 3 — Open question",
            body: "Hey {name} 😊\n\nNo pressure — pero curious lang ako, ano talaga yung nakakapigil sayo ngayon? Cost? Timing? Coverage details? Kahit ano yan, gusto ko lang ma-address ng tama.",
          },
          {
            label: "Day 7 — Social proof",
            body: "Hi {name}, baka makatulong sayo ito 💡\n\nHeto yung kwento ng client ko na same situation mo:\n👉 [paste testimonial / case study]\n\nHindi naman ako nagsasabing same ang sagot niyo — pero minsan, ibang perspective lang yung kailangan para maging clear yung path.",
          },
        ],
      },
      {
        name: "Application submitted",
        color: "bg-electric-500/20",
        sortOrder: 60,
        daysBeforeNextTask: 7,
        aiContext: "application sent to underwriting — keep them informed",
        followUpGoal: "Keep them informed & reassured during underwriting",
        followUpMessages: [
          {
            label: "Day 1 — Submission confirmation",
            body: "{name}, your application has officially been submitted to underwriting ✅\n\nTypical timeline from here:\n• Days 1-7: Initial review\n• Days 7-14: Medical / financial verification\n• Days 14-21: Final approval\n\nI'll update you at every step — no need to chase me!",
          },
          {
            label: "Day 7 — Status update",
            body: "Hi {name}! Quick underwriting update 📋\n\n[paste current status — \"still under review\" / \"need a small extra doc\" / \"on track\"]\n\nNothing for you to do right now — just keeping you in the loop. Talk soon!",
          },
        ],
        followUpMessagesTaglish: [
          {
            label: "Day 1 — Submission confirmation",
            body: "{name}, officially na-submit na yung application mo sa underwriting ✅\n\nTypical timeline from here:\n• Days 1-7: Initial review\n• Days 7-14: Medical / financial verification\n• Days 14-21: Final approval\n\nI'll update you at every step — hindi mo na ako kailangang habulin!",
          },
          {
            label: "Day 7 — Status update",
            body: "Hi {name}! Quick underwriting update 📋\n\n[paste current status — \"still under review\" / \"need a small extra doc\" / \"on track\"]\n\nWalang kelangang gawin sayo right now — keeping you in the loop lang. Talk soon!",
          },
        ],
      },
      {
        name: "Issued (client)",
        color: "bg-jade-500/15",
        sortOrder: 70,
        aiContext: "policy issued — onboard + ask for referrals",
        followUpGoal: "Onboard them properly and earn referrals",
        followUpMessages: [
          {
            label: "Day 1 — Welcome",
            body: "🎉 {name}, congratulations — your policy is officially ISSUED!\n\nI'll deliver the policy documents [in person / digitally] this week. In the meantime, save my number — I'm your dedicated agent for anything insurance-related, ever.\n\nThank you for trusting me with your family's protection 🙏",
          },
          {
            label: "Day 30 — First check-in",
            body: "Hey {name}! Just checking in — any questions about your coverage so far?\n\nI also do free family policy reviews once a year so everything stays aligned with your life. Doesn't cost anything — just say the word.",
          },
          {
            label: "Day 90 — Referral ask",
            body: "Hi {name}! Quick ask 😊\n\nIf you know 1-2 friends or family members who'd benefit from the same kind of conversation we had, I'd be honoured if you'd introduce us. I don't pitch hard — just have a real conversation, same as I did with you.\n\nNo pressure of course!",
          },
        ],
        followUpMessagesTaglish: [
          {
            label: "Day 1 — Welcome",
            body: "🎉 {name}, congratulations — officially ISSUED na yung policy mo!\n\nI'll deliver the policy documents [in person / digitally] this week. In the meantime, i-save mo number ko — I'm your dedicated agent for anything insurance-related, anytime.\n\nSalamat sa tiwala mo sa akin para sa proteksyon ng pamilya mo 🙏",
          },
          {
            label: "Day 30 — First check-in",
            body: "Hey {name}! Just checking in — may tanong ka ba about sa coverage mo?\n\nGumagawa rin ako ng free family policy reviews once a year para naka-aligned lahat sa current life mo. Libre lang yan — say the word lang.",
          },
          {
            label: "Day 90 — Referral ask",
            body: "Hi {name}! Quick ask 😊\n\nKung may 1-2 friends or family ka na pwedeng makinabang sa same convo na meron tayo, malaking bagay sa akin kung i-introduce mo sila. Hindi naman ako nagpi-pitch ng malakas — same real conversation lang like what we had.\n\nNo pressure kung wala namang naiisip 😊",
          },
        ],
      },
      {
        name: "Lost / not qualified",
        color: "bg-red-500/[0.06]",
        sortOrder: 80,
        followUpGoal: "Close the loop respectfully — leave the door open",
        followUpMessages: [
          {
            label: "Close-out",
            body: "Hi {name}, totally understand the timing or fit wasn't right this time 🙏\n\nNo hard feelings at all. If anything changes — new baby, new job, new home — you know where to find me. I'll be here.\n\nTake care!",
          },
        ],
        followUpMessagesTaglish: [
          {
            label: "Close-out",
            body: "Hi {name}, naiintindihan ko kung hindi pa right time or right fit ngayon 🙏\n\nWalang hard feelings. Kung may magbago — new baby, new job, new home — alam mo kung saan ako hahanapin. Nandito lang ako.\n\nIngat!",
          },
        ],
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
        followUpGoal: "Qualify budget, timeline, and intent",
        followUpMessages: [
          {
            label: "Day 1 — Welcome",
            body: "Hi {name}! Thanks for reaching out 🏠\n\nI'd love to help you find the right property. To send you the best matches, can I ask 3 quick questions?\n\n1️⃣ What's your budget range?\n2️⃣ When are you looking to move?\n3️⃣ Any specific location or property type in mind?\n\nReply whenever you can — no rush!",
          },
          {
            label: "Day 2 — Friendly nudge",
            body: "Hey {name}! Just following up 😊\n\nOnce I know your budget and timeline, I can send you 3-5 hand-picked listings that actually match what you're after — much better than browsing endlessly online.\n\nLet me know whenever you have a sec!",
          },
        ],
        followUpMessagesTaglish: [
          {
            label: "Day 1 — Welcome",
            body: "Hi {name}! Salamat sa pag-reach out 🏠\n\nGusto kong tulungan kang mahanap yung tamang property. Para makapagpadala ng best matches, pwede ba 3 quick questions?\n\n1️⃣ Anong budget range mo?\n2️⃣ Kailan ka planong lumipat?\n3️⃣ May specific na location or type ka ba na hinahanap?\n\nReply ka lang anytime — walang rush!",
          },
          {
            label: "Day 2 — Friendly nudge",
            body: "Hey {name}! Just following up 😊\n\nPag alam ko na budget at timeline mo, makakapagpadala ako ng 3-5 hand-picked listings na actual na fit sa hinahanap mo — much better kaysa mag-browse online ng walang katapusan.\n\nMessage me lang kapag may free time ka!",
          },
        ],
      },
      {
        name: "Qualified",
        color: "bg-electric-500/12",
        sortOrder: 20,
        daysBeforeNextTask: 3,
        aiContext:
          "budget + needs confirmed — share matching properties next",
        followUpGoal: "Get them to react to listings and book a viewing",
        followUpMessages: [
          {
            label: "Day 1 — Send matches",
            body: "{name}, here are 3 properties I think you'll love based on what you told me 🏡\n\n👉 [paste listing 1]\n👉 [paste listing 2]\n👉 [paste listing 3]\n\nWhich one stands out the most? I can book a viewing this week!",
          },
          {
            label: "Day 3 — Check reaction",
            body: "Hey {name}! Did any of the 3 listings catch your eye?\n\nIf none felt right, let me know what's missing — too small, wrong location, layout? — and I'll send a fresh batch 💯",
          },
          {
            label: "Day 7 — New listings",
            body: "Hi {name}! Just curating fresh listings for you this week 🔍\n\nAny update on your search? Markets moving fast right now — the good ones are gone within days. Let me know when you're ready to view!",
          },
        ],
        followUpMessagesTaglish: [
          {
            label: "Day 1 — Send matches",
            body: "{name}, heto 3 properties na sa tingin ko magugustuhan mo based sa sinabi mo 🏡\n\n👉 [paste listing 1]\n👉 [paste listing 2]\n👉 [paste listing 3]\n\nAlin yung pinaka-stand out sayo? Pwede ko i-book viewing this week!",
          },
          {
            label: "Day 3 — Check reaction",
            body: "Hey {name}! May na-eye ka ba sa 3 listings na pinadala ko?\n\nKung wala talagang fit, sabihin mo lang kung anong kulang — masyado maliit, mali ang location, layout? — and magpapadala ako ng fresh batch 💯",
          },
          {
            label: "Day 7 — New listings",
            body: "Hi {name}! Curating fresh listings para sayo this week 🔍\n\nAny update on your search? Mabilis ang market ngayon — yung mga magagandang options ubos within days. Message me lang kapag ready ka na mag-viewing!",
          },
        ],
      },
      {
        name: "Viewing scheduled",
        color: "bg-electric-500/15",
        sortOrder: 30,
        daysBeforeNextTask: 1,
        aiContext: "viewing on the calendar — send reminder + directions",
        followUpGoal: "Make sure they show up and feel prepared",
        followUpMessages: [
          {
            label: "Confirmation",
            body: "{name}, your viewing is confirmed for [date / time] 📅\n\n📍 [paste address + directions]\n🚗 Parking: [parking info]\n\nI'll meet you at the entrance. Bring any questions — I'll have all the details on price, fees, and the area ready to go!",
          },
          {
            label: "Day before — Reminder",
            body: "Hey {name}! Reminder we're meeting at [time] tomorrow for the viewing 😊\n\nWeather looks [good / a bit wet], so [dress comfy / bring an umbrella]. See you there!",
          },
        ],
        followUpMessagesTaglish: [
          {
            label: "Confirmation",
            body: "{name}, confirmed na yung viewing mo for [date / time] 📅\n\n📍 [paste address + directions]\n🚗 Parking: [parking info]\n\nSasalubungin kita sa entrance. Bring any questions — handa na lahat ng details about price, fees, at neighborhood!",
          },
          {
            label: "Day before — Reminder",
            body: "Hey {name}! Reminder may meeting tayo bukas at [time] for the viewing 😊\n\nWeather forecast — [maganda / medyo umuulan], so [dress comfy / bring umbrella]. See you there!",
          },
        ],
      },
      {
        name: "Considering options",
        color: "bg-gold-400/12",
        sortOrder: 40,
        daysBeforeNextTask: 5,
        aiContext: "weighing properties — recap pros / cons of top picks",
        followUpGoal: "Help them narrow down and make an offer",
        followUpMessages: [
          {
            label: "Day 2 — Recap top picks",
            body: "Hi {name}! Now that you've seen a few, let's recap your top 2 choices:\n\n🏡 [Property A]\n✅ Pros: [list]\n❌ Cons: [list]\n\n🏡 [Property B]\n✅ Pros: [list]\n❌ Cons: [list]\n\nWhich one feels more like home? Happy to schedule a second viewing if you want to look again with fresh eyes.",
          },
          {
            label: "Day 7 — Urgency check",
            body: "Hey {name}! Quick heads up — the [property name] I think you liked most just had another offer come in 😬\n\nNothing accepted yet, but if you're seriously considering, let's chat asap so we don't miss the window.",
          },
        ],
        followUpMessagesTaglish: [
          {
            label: "Day 2 — Recap top picks",
            body: "Hi {name}! Ngayong nakapag-view ka na ng ilan, let's recap yung top 2 choices mo:\n\n🏡 [Property A]\n✅ Pros: [list]\n❌ Cons: [list]\n\n🏡 [Property B]\n✅ Pros: [list]\n❌ Cons: [list]\n\nAlin yung mas pakiramdam mo na 'home'? I can schedule a second viewing kung gusto mo titignan ulit with fresh eyes.",
          },
          {
            label: "Day 7 — Urgency check",
            body: "Hey {name}! Quick heads up — yung [property name] na sa tingin ko paborito mo, may bagong offer 😬\n\nWala pang in-aaccept, pero kung seryoso ka talaga, let's chat asap so hindi tayo mahuhuli.",
          },
        ],
      },
      {
        name: "Offer made",
        color: "bg-gold-400/15",
        sortOrder: 50,
        daysBeforeNextTask: 2,
        aiContext: "offer submitted — keep them informed of seller response",
        followUpGoal: "Keep them informed during negotiation",
        followUpMessages: [
          {
            label: "Day 1 — Offer submitted",
            body: "{name}, your offer has been formally submitted to the seller ✉️\n\nWe should hear back within [timeframe]. I'll loop you in the second I hear anything — accepted, counter, or rejected — so you're never in the dark.\n\nHang tight! 🤞",
          },
          {
            label: "Day 3 — Status update",
            body: "Hey {name}! Quick update on the offer 📋\n\n[paste current status — \"seller is reviewing\" / \"countered at X\" / \"strong signals it'll be accepted\"]\n\nLet me know your thoughts when you've had a chance to read this!",
          },
        ],
        followUpMessagesTaglish: [
          {
            label: "Day 1 — Offer submitted",
            body: "{name}, na-submit na officially yung offer mo sa seller ✉️\n\nMakaka-receive tayo ng sagot within [timeframe]. I'll update you sa second na may marinig ako — accepted, counter, or rejected — para alam mo lagi yung status.\n\nHang tight! 🤞",
          },
          {
            label: "Day 3 — Status update",
            body: "Hey {name}! Quick update sa offer 📋\n\n[paste current status — \"seller is reviewing\" / \"countered at X\" / \"strong signals it'll be accepted\"]\n\nMessage me lang once nabasa mo na ito!",
          },
        ],
      },
      {
        name: "Reserved / closed",
        color: "bg-jade-500/15",
        sortOrder: 60,
        aiContext: "deal closed — thank you + ask for referrals",
        followUpGoal: "Celebrate the close & earn referrals",
        followUpMessages: [
          {
            label: "Closing day — Congrats",
            body: "🎉 {name}, CONGRATULATIONS — the keys are officially yours!\n\nIt's been an absolute pleasure walking through this with you. Save my number — anything property-related down the line (refinancing, renovations, reselling), I've got you.\n\nEnjoy your new home! 🏡",
          },
          {
            label: "Day 14 — Settle-in check",
            body: "Hey {name}! How's the move going? 😊\n\nIf you know anyone else looking to buy or sell in the next 6-12 months, I'd be honoured if you sent them my way — same straight-up service you got.",
          },
        ],
        followUpMessagesTaglish: [
          {
            label: "Closing day — Congrats",
            body: "🎉 {name}, CONGRATULATIONS — officially sayo na yung keys!\n\nSobrang saya kong nakasama sa journey na ito. Save mo number ko — anything property-related in the future (refinancing, renovations, reselling), I got you.\n\nEnjoy your new home! 🏡",
          },
          {
            label: "Day 14 — Settle-in check",
            body: "Hey {name}! Kumusta yung paglipat? 😊\n\nKung may kakilala ka na naghahanap din ng bahay or magbebenta in the next 6-12 months, malaking bagay kung i-refer mo sila sakin — same straight-up service na binigay ko sayo.",
          },
        ],
      },
      {
        name: "Lost",
        color: "bg-red-500/[0.06]",
        sortOrder: 70,
        followUpGoal: "Stay top of mind for the future",
        followUpMessages: [
          {
            label: "Day 30 — Stay-in-touch",
            body: "Hi {name}, hope the home search is going well 🏠\n\nNo pressure at all — just wanted to stay on your radar. If you ever want a fresh set of listings, even just to compare against what you're seeing, I'm one message away.\n\nWishing you the best find!",
          },
        ],
        followUpMessagesTaglish: [
          {
            label: "Day 30 — Stay-in-touch",
            body: "Hi {name}, sana okay yung property search mo 🏠\n\nNo pressure — gusto ko lang maging visible sayo. Kung gusto mo ng fresh listings, kahit pang-compare lang sa mga nakikita mo, message me lang.\n\nWishing you the best find!",
          },
        ],
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
        followUpGoal: "Move them from passive consumer to active reply",
        followUpMessages: [
          {
            label: "Day 1 — Welcome",
            body: "Hey {name}! 👋\n\nThanks for grabbing [lead magnet name] — hope you find it useful!\n\nQuick question while you're going through it: what's the #1 thing you're hoping to figure out right now? When I know, I can point you to the exact part that'll help most.",
          },
          {
            label: "Day 3 — Value drop",
            body: "Hi {name}! Bonus resource for you 🎁\n\nIf [lead magnet topic] hit home, you'll love this:\n👉 [paste link to next piece of content]\n\nLet me know what stands out — even small reactions help me share what's actually useful.",
          },
          {
            label: "Day 7 — Open question",
            body: "Hey {name}, real talk — what's the biggest thing standing in your way right now around [problem your coaching solves]?\n\nNo pitch, genuinely curious. Sometimes naming it is half the battle 💭",
          },
        ],
        followUpMessagesTaglish: [
          {
            label: "Day 1 — Welcome",
            body: "Hey {name}! 👋\n\nSalamat sa pag-grab ng [lead magnet name] — sana useful sayo!\n\nQuick question habang binabasa mo: ano yung #1 na gusto mong ma-figure out right now? Pag alam ko, ituturo ko sayo yung exact part na pinakamakakatulong.",
          },
          {
            label: "Day 3 — Value drop",
            body: "Hi {name}! Bonus resource para sayo 🎁\n\nKung naka-relate ka sa [lead magnet topic], magugustuhan mo rin ito:\n👉 [paste link to next piece of content]\n\nMessage me lang kung ano natatandaan mo — kahit small reactions lang, makakatulong sa akin para ma-share ko yung talagang useful.",
          },
          {
            label: "Day 7 — Open question",
            body: "Hey {name}, real talk — ano yung biggest hadlang sayo ngayon about sa [problem your coaching solves]?\n\nWalang pitch, genuinely curious lang. Minsan, kapag napangalanan na yung problem, half the battle na yun 💭",
          },
        ],
      },
      {
        name: "Engaged",
        color: "bg-electric-500/12",
        sortOrder: 20,
        daysBeforeNextTask: 2,
        aiContext: "they replied to your DM / email — invite to discovery call",
        followUpGoal: "Book a 30-minute discovery / strategy call",
        followUpMessages: [
          {
            label: "Reply 1 — Invite",
            body: "{name}, love this — you're way more clear on what you want than most people I talk to 🙌\n\nWant to jump on a quick 30-min strategy call? I'll give you 2-3 specific things you can do this week, even if we never work together. Sound good?\n\n👉 [paste calendar link]",
          },
          {
            label: "Day 2 — Light reminder",
            body: "Hey {name}! Did you have a chance to grab a time?\n\nIf scheduling's tricky, just tell me what days/times generally work for you and I'll send a Calendly slot directly 😊",
          },
          {
            label: "Day 4 — Reframe value",
            body: "Hi {name}, no pressure on the call — but worth mentioning:\n\nMost people on these chats walk away with at least one breakthrough, even if they don't enroll. It's literally free strategy. 30 min of your time.\n👉 [paste calendar link]",
          },
        ],
        followUpMessagesTaglish: [
          {
            label: "Reply 1 — Invite",
            body: "{name}, love this — mas clear ka pa sa gusto mo kumpara sa karamihan ng nakakausap ko 🙌\n\nGusto mo bang mag-quick 30-min strategy call? Bibigyan kita ng 2-3 specific na pwede mong gawin this week, kahit hindi tayo magtrabaho together. Sound good?\n\n👉 [paste calendar link]",
          },
          {
            label: "Day 2 — Light reminder",
            body: "Hey {name}! Nakakuha ka na ba ng time slot?\n\nKung mahirap mag-schedule, sabihin mo lang anong days/times generally available ka and ipapadala ko yung Calendly slot directly 😊",
          },
          {
            label: "Day 4 — Reframe value",
            body: "Hi {name}, no pressure sa call — pero worth mentioning:\n\nKaramihan ng nakakausap ko sa chats na ito, may natutunan na breakthrough, kahit hindi sila nag-enroll. Free strategy session. 30 mins lang ng oras mo.\n👉 [paste calendar link]",
          },
        ],
      },
      {
        name: "Discovery call booked",
        color: "bg-electric-500/15",
        sortOrder: 30,
        daysBeforeNextTask: 1,
        aiContext: "call on calendar — send prep questions",
        followUpGoal: "Ensure they show up prepared and engaged",
        followUpMessages: [
          {
            label: "Confirmation",
            body: "{name}, your strategy call is booked for [date / time] 🎯\n\nTo make it max value, can you reply with:\n1️⃣ Your biggest goal in the next 90 days\n2️⃣ The #1 thing currently blocking you\n3️⃣ What you've already tried\n\nThis lets me prep specifically for YOU instead of giving generic advice.",
          },
          {
            label: "Day before — Hype reminder",
            body: "Hey {name}! Excited for our call tomorrow at [time] 🔥\n\nZoom link is in your calendar invite. Come ready with anything you want to dig into — this is YOUR session.\n\nSee you soon!",
          },
        ],
        followUpMessagesTaglish: [
          {
            label: "Confirmation",
            body: "{name}, naka-book na yung strategy call mo for [date / time] 🎯\n\nPara max value, pakireply mo:\n1️⃣ Yung pinakamalaking goal mo for the next 90 days\n2️⃣ Yung #1 na nakakapigil sayo ngayon\n3️⃣ Anong na-try mo na\n\nMakakatulong ito para ma-prep ko specifically para sa YO, hindi yung generic na advice.",
          },
          {
            label: "Day before — Hype reminder",
            body: "Hey {name}! Excited ako sa call natin bukas at [time] 🔥\n\nNasa calendar invite mo yung Zoom link. Come ready sa kahit anong gusto mong i-dig into — YOUR session ito.\n\nSee you soon!",
          },
        ],
      },
      {
        name: "Discovery call done",
        color: "bg-gold-400/12",
        sortOrder: 40,
        daysBeforeNextTask: 1,
        aiContext: "call complete — send tailored proposal",
        followUpGoal: "Deliver the proposal & invite them to enroll",
        followUpMessages: [
          {
            label: "Same day — Recap",
            body: "{name}, that was an amazing convo 🙌\n\nHere's the recap of what we discussed + the path I think makes most sense for you:\n👉 [paste proposal / sales page link]\n\nTake 24-48 hours, read it carefully, and reply with your honest reaction — yes, no, or any questions.",
          },
          {
            label: "Day 2 — Open questions",
            body: "Hey {name}! Did you get a chance to read through the proposal?\n\nWhat questions came up? Even the tiny 'this is probably silly but…' ones — I'd rather answer 10 than have you hesitate on something easy 😊",
          },
        ],
        followUpMessagesTaglish: [
          {
            label: "Same day — Recap",
            body: "{name}, ang ganda ng usap natin kanina 🙌\n\nHeto yung recap ng pinag-usapan natin + yung path na sa tingin ko pinaka-makakatulong sayo:\n👉 [paste proposal / sales page link]\n\nTake 24-48 hours, basahin mo carefully, then reply ka with your honest reaction — yes, no, or any questions.",
          },
          {
            label: "Day 2 — Open questions",
            body: "Hey {name}! Nabasa mo na ba yung proposal?\n\nAno mga tanong mo? Kahit yung tipong 'baka silly ito pero…' — mas okay sa akin na sumagot ng 10 questions kaysa mag-hesitate ka sa isang bagay na madaling ma-resolve 😊",
          },
        ],
      },
      {
        name: "Proposal sent",
        color: "bg-gold-400/15",
        sortOrder: 50,
        daysBeforeNextTask: 3,
        aiContext: "they have the offer — check in, answer questions",
        followUpGoal: "Address questions & move them toward decision",
        followUpMessages: [
          {
            label: "Day 1 — Walk-through offer",
            body: "Hi {name}! Want me to do a quick 10-min walk-through of the proposal? Sometimes it's easier than reading 📄\n\nLet me know — I can record a Loom or hop on a quick Zoom, whichever works.",
          },
          {
            label: "Day 3 — Soft check",
            body: "Hey {name}, no pressure — just checking in.\n\nHow are you feeling about everything? Lean yes, lean no, or middle? Whatever it is, I can help from there 💯",
          },
        ],
        followUpMessagesTaglish: [
          {
            label: "Day 1 — Walk-through offer",
            body: "Hi {name}! Gusto mo bang i-quick 10-min walk-through ko yung proposal? Minsan, mas madali kapag pinag-usapan than basahin lang 📄\n\nLet me know — pwede ako mag-record ng Loom or mag-quick Zoom, kung alin yung gusto mo.",
          },
          {
            label: "Day 3 — Soft check",
            body: "Hey {name}, no pressure — checking in lang.\n\nKumusta yung feeling mo about everything? Lean yes, lean no, or middle? Kahit ano yan, makakatulong ako from there 💯",
          },
        ],
      },
      {
        name: "Considering",
        color: "bg-gold-400/20",
        sortOrder: 60,
        daysBeforeNextTask: 5,
        aiContext: "deciding — address a specific objection",
        followUpGoal: "Surface the real objection and address it directly",
        followUpMessages: [
          {
            label: "Day 3 — Surface concern",
            body: "Hey {name} 😊\n\nQuick honest question — what's the ONE thing making you hesitate? Money, time, fear it won't work, something else? Whatever it is I want to address it head-on, not dance around it.",
          },
          {
            label: "Day 7 — Proof / story",
            body: "Hi {name}! Thought of you when I saw this 💡\n\nMeet [past client] — they had the same hesitation you mentioned:\n👉 [paste case study or video testimonial]\n\nHere's where they are now. Not magic — just a real path with real work.",
          },
          {
            label: "Day 14 — Decision deadline",
            body: "Hey {name}, gentle final nudge 🙏\n\nI'll be closing out this round of enrollments [date]. No drama — just want to make sure if you DO want in, you don't miss the window. If it's a no for now, that's also totally fine — just let me know either way.",
          },
        ],
        followUpMessagesTaglish: [
          {
            label: "Day 3 — Surface concern",
            body: "Hey {name} 😊\n\nQuick honest question — ano yung ISANG bagay na nakakapag-hesitate sayo? Pera, oras, takot na hindi gagana, or iba pa? Kahit ano yan, gusto ko ma-address ng deretsahan, hindi yung paligoy-ligoy lang.",
          },
          {
            label: "Day 7 — Proof / story",
            body: "Hi {name}! Naalala kita pagkakita ko nito 💡\n\nIto si [past client] — same hesitation yung naramdaman niya:\n👉 [paste case study or video testimonial]\n\nHeto kung nasaan na siya. Hindi magic — real path with real work lang.",
          },
          {
            label: "Day 14 — Decision deadline",
            body: "Hey {name}, gentle final nudge 🙏\n\nIsasara ko na yung enrollments sa [date]. No drama — gusto ko lang siguraduhin na kung gusto MO talagang pumasok, hindi mo mami-miss yung window. Kung no for now, okay lang din — message me lang kung alin.",
          },
        ],
      },
      {
        name: "Enrolled (client)",
        color: "bg-jade-500/15",
        sortOrder: 70,
        aiContext: "enrolled — onboard them into the program",
        followUpGoal: "Get them started fast and create early momentum",
        followUpMessages: [
          {
            label: "Day 1 — Welcome",
            body: "🎉 {name}, WELCOME to the program!!\n\nYour onboarding starts here:\n👉 [paste portal / welcome video / first lesson]\n\nWatch the intro video tonight or first thing tomorrow — then book your kickoff call here:\n👉 [paste calendar link]\n\nLet's go!! 🔥",
          },
          {
            label: "Day 7 — First-week check",
            body: "Hey {name}! Quick first-week check-in 📊\n\n• Have you watched [first 2 lessons]?\n• Any wins so far, even tiny ones?\n• What's confusing or where are you stuck?\n\nThe people who win in this program are the ones who reach out EARLY when something's unclear — so don't be a hero, just message me!",
          },
        ],
        followUpMessagesTaglish: [
          {
            label: "Day 1 — Welcome",
            body: "🎉 {name}, WELCOME sa program!!\n\nNandito yung onboarding mo:\n👉 [paste portal / welcome video / first lesson]\n\nPanoorin mo yung intro video ngayong gabi or first thing bukas — then i-book mo yung kickoff call mo dito:\n👉 [paste calendar link]\n\nLet's go!! 🔥",
          },
          {
            label: "Day 7 — First-week check",
            body: "Hey {name}! Quick first-week check-in 📊\n\n• Napanood mo na ba yung [first 2 lessons]?\n• May wins na ba, kahit maliit?\n• Anong confusing or saan ka stuck?\n\nYung mga successful sa program na ito, sila yung nag-message ng EARLY pag may hindi gets — so huwag kang mag-hero, message me agad!",
          },
        ],
      },
      {
        name: "Lost",
        color: "bg-red-500/[0.06]",
        sortOrder: 80,
        followUpGoal: "Leave the door open for a future yes",
        followUpMessages: [
          {
            label: "Day 1 — Respectful close",
            body: "Totally hear you {name} 🙏\n\nIf the timing changes or you ever want to revisit, the door's always open. I'm rooting for you regardless. Take care!",
          },
          {
            label: "Day 90 — Re-engagement",
            body: "Hey {name}, random check-in 😊\n\nNo pitch — just wondering how things are going with [their original goal]? Hope you've been crushing it!",
          },
        ],
        followUpMessagesTaglish: [
          {
            label: "Day 1 — Respectful close",
            body: "Naiintindihan kita {name} 🙏\n\nKung magbabago yung timing or gusto mo ulit ma-revisit, lagi nakabukas yung pinto. Rooting for you kahit anong mangyari. Ingat!",
          },
          {
            label: "Day 90 — Re-engagement",
            body: "Hey {name}, random check-in 😊\n\nNo pitch — curious lang kung kumusta na yung [their original goal]? Sana naga-crush mo na!",
          },
        ],
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
        followUpGoal: "Get a first reply and qualify them",
        followUpMessages: [
          {
            label: "Day 1 — First touch",
            body: "Hi {name}! 👋\n\nThanks for reaching out / your interest in [your offer]. Quick question to point you in the right direction — what's the main thing you're trying to solve right now?",
          },
          {
            label: "Day 3 — Friendly bump",
            body: "Hey {name}, just bumping this in case it got buried 📬\n\nWhenever you have a sec — would love to know what you're working on so I can be useful.",
          },
        ],
        followUpMessagesTaglish: [
          {
            label: "Day 1 — First touch",
            body: "Hi {name}! 👋\n\nSalamat sa pag-reach out / sa interest mo sa [your offer]. Quick question lang para ma-direct kita sa tamang path — ano yung pinaka-gusto mong ma-solve right now?",
          },
          {
            label: "Day 3 — Friendly bump",
            body: "Hey {name}, bumping lang ito in case nakalubog 📬\n\nWhenever you have a sec — gusto kong malaman anong pinag-uusapan mo so I can be useful.",
          },
        ],
      },
      {
        name: "Talking",
        color: "bg-electric-500/15",
        sortOrder: 20,
        daysBeforeNextTask: 2,
        aiContext: "we're in active conversation — keep momentum",
        followUpGoal: "Move from conversation to a clear next step",
        followUpMessages: [
          {
            label: "Day 1 — Next-step nudge",
            body: "Hey {name}! Loving the convo so far 🙌\n\nBased on what you've shared, here's what I think makes sense next:\n👉 [proposed next step — call, demo, proposal]\n\nDoes that work for you?",
          },
          {
            label: "Day 3 — Soft follow-up",
            body: "Hi {name}, no pressure — just circling back on the next step we discussed. Still good for you, or has something shifted?\n\nEither way I'm happy to adjust 😊",
          },
        ],
        followUpMessagesTaglish: [
          {
            label: "Day 1 — Next-step nudge",
            body: "Hey {name}! Nag-eenjoy ako sa convo natin 🙌\n\nBased sa shinare mo, ito yung sa tingin ko tamang next step:\n👉 [proposed next step — call, demo, proposal]\n\nWorks ba sayo yan?",
          },
          {
            label: "Day 3 — Soft follow-up",
            body: "Hi {name}, no pressure — just circling back sa next step na pinag-usapan natin. Pwede pa rin ba, or may nabago?\n\nEither way, happy to adjust 😊",
          },
        ],
      },
      {
        name: "Closing",
        color: "bg-gold-400/15",
        sortOrder: 30,
        daysBeforeNextTask: 2,
        aiContext: "pushing to close — clear call to action",
        followUpGoal: "Get a clean yes, no, or specific concern",
        followUpMessages: [
          {
            label: "Day 1 — Direct ask",
            body: "{name}, let's keep this simple — where are you at?\n\n✅ Yes, let's go\n🤔 Almost, but [concern]\n❌ Not the right fit\n\nAny of these is a fine answer — I just want to know how to support you.",
          },
          {
            label: "Day 3 — Final nudge",
            body: "Hey {name}, gentle final check 🙏\n\nIf you're a yes, here's how we lock it in:\n👉 [paste payment / signup link]\n\nIf you're a no or 'not yet', also totally fine — just let me know so I can close the loop respectfully.",
          },
        ],
        followUpMessagesTaglish: [
          {
            label: "Day 1 — Direct ask",
            body: "{name}, simple lang — nasaan ka na?\n\n✅ Yes, tara!\n🤔 Almost, kaso may [concern]\n❌ Hindi siya fit\n\nKahit alin sagot mo okay lang — gusto ko lang malaman paano kita susuportahan.",
          },
          {
            label: "Day 3 — Final nudge",
            body: "Hey {name}, gentle final check 🙏\n\nKung yes ka na, heto paano natin i-lock in:\n👉 [paste payment / signup link]\n\nKung no or 'not yet' okay lang din — message me lang para ma-close loop ko ng respectful.",
          },
        ],
      },
      {
        name: "Closed (won)",
        color: "bg-jade-500/15",
        sortOrder: 40,
        aiContext: "deal won — thank them + ask for referrals",
        followUpGoal: "Deliver wow factor & earn 1-2 referrals",
        followUpMessages: [
          {
            label: "Day 1 — Welcome",
            body: "🎉 {name}, thank you so much for trusting me with this!\n\nHere's everything you need to get started:\n👉 [paste onboarding / next step]\n\nDirect message me anytime — you're a priority from here on out.",
          },
          {
            label: "Day 30 — Referral ask",
            body: "Hey {name}! Quick question 😊\n\nIf you know 1-2 people who'd benefit from the same thing we did together, I'd be genuinely grateful for an intro. I'll treat them exactly the same way I treated you — promise.\n\nNo pressure at all if no one comes to mind!",
          },
        ],
        followUpMessagesTaglish: [
          {
            label: "Day 1 — Welcome",
            body: "🎉 {name}, salamat sobra sa tiwala mo!\n\nHeto lahat ng kailangan mo para mag-start:\n👉 [paste onboarding / next step]\n\nDirect message me anytime — priority kita from here on out.",
          },
          {
            label: "Day 30 — Referral ask",
            body: "Hey {name}! Quick question 😊\n\nKung may 1-2 na kakilala ka na pwedeng makinabang sa same na ginawa natin, malaking bagay sa akin kung ma-introduce mo sila. I'll treat them exactly the way I treated you — promise.\n\nNo pressure kung wala namang naiisip!",
          },
        ],
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
    /* Generate fresh ids for the stage AND every sample follow-up
       message (both EN + TL arrays) so the user can edit them
       independently without colliding with another user's instance. */
    stages: template.stages.map((s) => ({
      ...s,
      id: uid("stage"),
      followUpMessages: s.followUpMessages?.map((m) => ({
        ...m,
        id: uid("msg"),
      })),
      followUpMessagesTaglish: s.followUpMessagesTaglish?.map((m) => ({
        ...m,
        id: uid("msg"),
      })),
    })),
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
