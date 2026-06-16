"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
/* framer-motion removed — step transitions now use a CSS fade-up
   on the keyed wrapper, which re-fires on step change because React
   tears down + remounts the div on key change. Same visual cue,
   ~50 KB lighter on the public funnel bundle. */
import { LogoMark } from "@/components/ui/Logo";
import {
  SectionRenderer,
  type LeadSubmitFn,
  type TrackFn,
} from "./ProfileSections";
import type { BookingSubmitFn } from "./AppointmentBooking";
import {
  buildThemeEffectClasses,
  buildThemeStyle,
  getThemeConfig,
} from "@/lib/themes";
import { createBooking, createLead, logEvent } from "@/lib/firebase/firestore";
import { cn, normalizeExternalUrl } from "@/lib/utils";
import type { Funnel } from "@/types";

const btnStyle: React.CSSProperties = {
  background: "var(--tp-btn)",
  color: "var(--tp-btn-text)",
  borderRadius: "var(--tp-btn-radius)",
  border: "1px solid var(--tp-btn-border)",
};

/**
 * Public, multi-step funnel renderer. Each step is a section-based page;
 * the step CTA (or an opt-in form submit) advances the visitor.
 */
export function FunnelView({
  funnel,
  profileId,
  ownerId,
  paymentMethods,
  live = false,
  showBranding = true,
}: {
  funnel: Funnel;
  profileId: string;
  ownerId: string;
  /** Owner's payment methods, threaded through to PaymentSection. */
  paymentMethods?: import("@/types").PaymentMethod[];
  live?: boolean;
  /**
   * Whether to render the "Made with Credibly" footer. Defaults to true
   * (the safe / open path). Set to false only when the owner's plan
   * grants the `remove_branding` feature — the public funnel page
   * resolves this server-side before render, same pattern as
   * PublicProfileView.
   */
  showBranding?: boolean;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const loggedSteps = useRef<Set<number>>(new Set());

  /* Log each step the visitor reaches — once per session — for drop-off. */
  useEffect(() => {
    if (!live || loggedSteps.current.has(stepIndex)) return;
    loggedSteps.current.add(stepIndex);
    logEvent({
      profileId,
      ownerId,
      type: "funnel_step",
      target: `${funnel.id}#${stepIndex}`,
    }).catch(() => null);
  }, [live, stepIndex, profileId, ownerId, funnel.id]);

  const tc = getThemeConfig(funnel.themeId);
  const themeStyle = buildThemeStyle(funnel.themeId);
  const effectClasses = buildThemeEffectClasses(funnel.themeId);

  const step = funnel.steps[stepIndex] ?? funnel.steps[0];
  const isLast = stepIndex >= funnel.steps.length - 1;

  const advance = () => {
    setStepIndex((i) => Math.min(i + 1, funnel.steps.length - 1));
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  };

  /* Analytics is intentionally a no-op for now (a later phase). */
  const track: TrackFn = () => {};

  /**
   * Save the lead, then advance UNLESS the caller passes
   * options.skipAdvance — which the LeadCapture section does when its
   * own postSubmitAction is "url" (redirect) or "stay" (success state
   * on the current page). The lead is always saved regardless of the
   * advance behaviour.
   */
  const onLead: LeadSubmitFn = async (data, options) => {
    if (live) {
      await createLead({
        profileId,
        ownerId,
        name: data.name,
        ...(data.email ? { email: data.email } : {}),
        ...(data.phone ? { phone: data.phone } : {}),
        source: `funnel:${funnel.slug}`,
      });
    }
    if (!options?.skipAdvance) advance();
  };

  const onBook: BookingSubmitFn = async (data) => {
    if (!live) return;
    await createBooking({
      profileId,
      ownerId,
      date: data.date,
      time: data.time,
      durationMin: data.durationMin,
      name: data.name,
      phone: data.phone,
      email: data.email,
      answers: data.answers,
    });
  };

  const cta = step.cta;
  const onCta = () => {
    if (!cta) return;
    if (cta.action === "url") {
      if (cta.url) {
        /* normalizeExternalUrl prevents `youtube.com` (no scheme)
           from being treated as a relative path by window.open. */
        const safe = normalizeExternalUrl(cta.url);
        if (safe !== "#") window.open(safe, "_blank", "noopener,noreferrer");
      }
    } else {
      advance();
    }
  };

  /* A "next" CTA on the final step would be a dead button — hide it. */
  const showCta = !!cta && !(isLast && cta.action === "next");
  const sections = step.sections.filter((s) => s.enabled);

  return (
    <div className={cn("min-h-full w-full", effectClasses)} style={themeStyle}>
      <div className="@container mx-auto max-w-md px-4 pb-14 pt-10 sm:max-w-2xl lg:max-w-5xl lg:px-6">
        {/* Progress */}
        {funnel.steps.length > 1 && (
          <div className="mb-7 flex justify-center gap-1.5">
            {funnel.steps.map((s, i) => (
              <span
                key={s.id}
                className="h-1.5 rounded-full transition-all"
                style={{
                  width: i === stepIndex ? "1.5rem" : "0.375rem",
                  background:
                    i <= stepIndex ? "var(--tp-accent)" : "var(--tp-text3)",
                }}
              />
            ))}
          </div>
        )}

        <div key={step.id} className="cr-fade-up space-y-7">
          {sections.map((section) => (
            <SectionRenderer
              key={section.id}
              section={section}
              themeConfig={tc}
              track={track}
              onLead={onLead}
              onBook={onBook}
              profileId={profileId}
              ownerId={ownerId}
              paymentMethods={paymentMethods}
              source={`funnel:${funnel.slug}`}
              /* Plumb through so CTA buttons with action="next" and
                 pricing-card CTAs with ctaAction="next" can advance. */
              onAdvance={advance}
            />
          ))}

          {showCta && cta && (
            <button
              type="button"
              onClick={onCta}
              className="tp-btn-el w-full px-5 py-4 text-sm font-semibold transition-transform active:scale-[0.98]"
              style={btnStyle}
            >
              {cta.label}
            </button>
          )}
        </div>

        {showBranding && (
          <Link
            href="/"
            className="mt-10 flex items-center justify-center gap-1.5 text-xs"
            style={{ color: "var(--tp-text3)" }}
          >
            <LogoMark className="h-4 w-4" />
            Made with{" "}
            <span className="font-semibold" style={{ color: "var(--tp-text2)" }}>
              Credibly
            </span>
          </Link>
        )}
      </div>
    </div>
  );
}
