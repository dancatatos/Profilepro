"use client";

import {
  SectionRenderer,
  type LeadSubmitFn,
  type TrackFn,
} from "@/components/public-profile/ProfileSections";
import type { BookingSubmitFn } from "@/components/public-profile/AppointmentBooking";
import { useCrediblyLinks } from "@/components/public-profile/useCrediblyLinks";
import { useProfileStore } from "@/store/profileStore";
import {
  buildThemeEffectClasses,
  buildThemeStyle,
  getThemeConfig,
} from "@/lib/themes";
import { cn } from "@/lib/utils";
import type { Funnel } from "@/types";

const btnStyle: React.CSSProperties = {
  background: "var(--tp-btn)",
  color: "var(--tp-btn-text)",
  borderRadius: "var(--tp-btn-radius)",
  border: "1px solid var(--tp-btn-border)",
};

/* In preview, all callbacks are no-ops — we render the step's look,
   nothing actually submits, advances or logs analytics. */
const NOOP_TRACK: TrackFn = () => {};
const NOOP_LEAD: LeadSubmitFn = async () => {};
const NOOP_BOOK: BookingSubmitFn = async () => {};

/**
 * Phone-framed preview of one funnel step — used by the funnel builder's
 * side-by-side pane and mobile preview modal.
 */
export function FunnelPhonePreview({
  funnel,
  currentStepId,
  height = 600,
}: {
  funnel: Funnel;
  currentStepId: string;
  height?: number;
}) {
  /* Payment sections need the owner's payment methods to render the
     account-number chips. Pull from the profileStore (single source of
     truth — the same store the profile editor writes to). */
  const profile = useProfileStore((s) => s.profile);
  const tc = getThemeConfig(funnel.themeId);
  const themeStyle = buildThemeStyle(funnel.themeId);
  const effectClasses = buildThemeEffectClasses(funnel.themeId);

  const stepIndex = Math.max(
    0,
    funnel.steps.findIndex((s) => s.id === currentStepId),
  );
  const step = funnel.steps[stepIndex] ?? funnel.steps[0];
  /* Compute sections safely BEFORE the early-return so the hook
     below isn't called conditionally (violates rules of hooks). */
  const sections = step?.sections.filter((s) => s.enabled) ?? [];

  /* Resolve Credibly Link CTAs against the profile owner so buttons
     with action="credibly" actually render in the preview. Without
     this the resolver map is undefined → button hides. */
  const crediblyLinks = useCrediblyLinks(
    profile?.ownerId,
    sections,
    profile?.username,
  );

  if (!step) return null;

  const isLast = stepIndex >= funnel.steps.length - 1;
  const cta = step.cta;
  const showCta = !!cta && !(isLast && cta.action === "next");

  return (
    <div className="mx-auto w-[300px] max-w-full">
      <div className="relative rounded-[2.6rem] border-4 border-ink-700 bg-ink-950 p-2 shadow-glass">
        <div className="absolute left-1/2 top-2 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-ink-700" />
        <div
          className="no-scrollbar overflow-y-auto rounded-[2rem]"
          style={{ height }}
        >
          <div
            className={cn("min-h-full w-full", effectClasses)}
            style={themeStyle}
          >
            <div className="mx-auto max-w-md px-4 pb-10 pt-8">
              {funnel.steps.length > 1 && (
                <div className="mb-6 flex justify-center gap-1.5">
                  {funnel.steps.map((s, i) => (
                    <span
                      key={s.id}
                      className="h-1.5 rounded-full transition-all"
                      style={{
                        width: i === stepIndex ? "1.5rem" : "0.375rem",
                        background:
                          i <= stepIndex
                            ? "var(--tp-accent)"
                            : "var(--tp-text3)",
                      }}
                    />
                  ))}
                </div>
              )}
              <div className="space-y-7">
                {sections.map((section) => (
                  <SectionRenderer
                    key={section.id}
                    section={section}
                    themeConfig={tc}
                    track={NOOP_TRACK}
                    onLead={NOOP_LEAD}
                    onBook={NOOP_BOOK}
                    profileId={profile?.id ?? "preview"}
                    ownerId={profile?.ownerId ?? "preview"}
                    paymentMethods={profile?.paymentMethods}
                    source={`funnel:${funnel.slug}`}
                    /* No-op advance — preview doesn't navigate. The
                       CTA buttons still call onAdvance() so they're
                       visibly tappable instead of inert, but nothing
                       moves the visible step. */
                    onAdvance={() => {}}
                    crediblyLinks={crediblyLinks}
                  />
                ))}
                {showCta && cta && (
                  <button
                    type="button"
                    className="tp-btn-el w-full px-5 py-4 text-sm font-semibold"
                    style={btnStyle}
                    onClick={(e) => e.preventDefault()}
                  >
                    {cta.label}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
