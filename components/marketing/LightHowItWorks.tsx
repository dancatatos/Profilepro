/**
 * LightHowItWorks — 3-step path to live profile.
 *
 * Three pastel cards in a row, each with a big mono step number,
 * eyebrow chip, headline and one-line description. Subtle dashed
 * connector lines between steps on desktop give the "journey"
 * feel without the gimmicky animated arrows competitors use.
 */

interface Step {
  n: number;
  title: string;
  desc: string;
}

const THEMES = [
  {
    card: "bg-lavender-100 border-lavender-200",
    chip: "bg-lavender-200 text-lavender-700",
    num: "text-lavender-700",
  },
  {
    card: "bg-cream-100 border-cream-200",
    chip: "bg-cream-200 text-cream-700",
    num: "text-cream-700",
  },
  {
    card: "bg-mint-100 border-mint-200",
    chip: "bg-mint-200 text-mint-700",
    num: "text-mint-700",
  },
] as const;

export function LightHowItWorks({ steps }: { steps: Step[] }) {
  return (
    <section id="how" className="relative bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-block rounded-full bg-electric-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-electric-500">
            How it works
          </span>
          <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl lg:text-[2.75rem]">
            Live in 3 simple steps
          </h2>
        </div>

        <div className="relative mt-14 grid gap-5 md:grid-cols-3">
          {steps.slice(0, 3).map((s, i) => {
            const t = THEMES[i] ?? THEMES[0];
            return (
              <div
                key={s.n}
                className={`relative rounded-3xl border p-7 ${t.card}`}
              >
                <span
                  className={`inline-flex h-8 items-center justify-center rounded-full px-3 text-[10px] font-bold tracking-wider ${t.chip}`}
                >
                  STEP {s.n}
                </span>
                <p
                  className={`mt-4 font-mono text-5xl font-bold tracking-tight ${t.num}`}
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  0{s.n}
                </p>
                <h3 className="mt-3 font-display text-lg font-bold text-stone-900">
                  {s.title}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-stone-500">
                  {s.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
