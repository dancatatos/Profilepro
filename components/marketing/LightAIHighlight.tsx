/**
 * LightAIHighlight — flagship section for the AI generation feature.
 *
 * Two-column composition: copy on the left with feature bullets,
 * a "chat preview" mockup card on the right showing an AI-generated
 * headline + the scores it ran for. The mockup card uses a soft
 * gradient background (white → lavender wash) so it feels distinct
 * from the surrounding white sections without being a hard color
 * change.
 */

import { Check, Sparkles } from "lucide-react";

const BULLETS = [
  "Conversational AI profile generator",
  "Native Taglish mode for Filipino marketers",
  "AI audit with credibility & conversion scores",
  "Rewrite bios, CTAs and recruiting pitches",
];

export function LightAIHighlight() {
  return (
    <section className="relative bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4">
        <div
          className="overflow-hidden rounded-[2rem] border border-stone-100 p-8 sm:p-12 lg:p-16"
          style={{
            background:
              "linear-gradient(135deg, #ffffff 0%, #f8f7fe 50%, #ece9fe 100%)",
          }}
        >
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            {/* Copy column */}
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-lavender-700 shadow-[var(--shadow-card-soft)]">
                <Sparkles className="h-3 w-3" />
                Gemini AI inside
              </span>
              <h2 className="mt-5 font-display text-3xl font-bold leading-[1.1] tracking-tight text-stone-900 sm:text-4xl lg:text-[2.5rem]">
                Your AI credibility copywriter
              </h2>
              <p className="mt-5 max-w-md text-base leading-relaxed text-stone-500 sm:text-lg">
                Generate persuasive, conversion-focused copy in seconds — in
                English or natural Taglish. AI audits your profile and tells
                you exactly how to improve.
              </p>
              <ul className="mt-7 space-y-3">
                {BULLETS.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 text-sm text-stone-700 sm:text-base"
                  >
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-mint-100">
                      <Check
                        className="h-3 w-3 text-mint-700"
                        strokeWidth={3}
                      />
                    </span>
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Chat mockup column */}
            <div className="relative">
              <div className="rounded-3xl border border-stone-100 bg-white p-5 shadow-[var(--shadow-card-soft)] sm:p-6">
                <div className="flex items-center gap-2 text-xs font-medium text-stone-500">
                  <Sparkles className="h-3.5 w-3.5 text-electric-500" />
                  Credibly AI
                </div>
                <p className="mt-4 rounded-2xl bg-stone-100 p-4 font-display text-base leading-relaxed text-stone-900 sm:text-lg">
                  &ldquo;Tinutulungan ko ang mga busy moms na magkaroon ng
                  extra income mula sa bahay — kahit walang experience.&rdquo;
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-mint-100 px-3 py-1 text-xs font-semibold text-mint-700">
                    <span className="font-mono">92</span> Credibility
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-lavender-100 px-3 py-1 text-xs font-semibold text-lavender-700">
                    <span className="font-mono">88</span> Conversion
                  </span>
                </div>
                <div className="mt-5 flex items-center gap-2 border-t border-stone-100 pt-4 text-[11px] text-stone-500">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-mint-700" />
                  Generated in 1.8 seconds
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
