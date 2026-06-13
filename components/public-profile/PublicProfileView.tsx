"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { BadgeCheck, MapPin } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { LogoMark } from "@/components/ui/Logo";
import {
  SectionRenderer,
  type LeadSubmitFn,
  type TrackFn,
} from "./ProfileSections";
import type { BookingSubmitFn } from "./AppointmentBooking";
import { buildThemeStyle, buildThemeEffectClasses, getThemeConfig } from "@/lib/themes";
import { createBooking, createLead, logEvent } from "@/lib/firebase/firestore";
import { cn } from "@/lib/utils";
import type { AnalyticsEventType, Profile } from "@/types";

/** Mask gradient that fades the hero cover photo into the theme background. */
const HERO_FADE =
  "linear-gradient(to bottom, #000 0%, #000 56%, transparent 100%)";

interface Props {
  profile: Profile;
  /** Live mode wires real analytics + lead capture. */
  live?: boolean;
  /**
   * Whether the "Made with Credibly" footer should be visible.
   * Defaults to true (the safe / open path). Set to false only when
   * the profile owner's plan grants the `remove_branding` feature —
   * the public profile page resolves this server-side before render.
   */
  showBranding?: boolean;
  className?: string;
}

export function PublicProfileView({
  profile,
  live = false,
  showBranding = true,
  className,
}: Props) {
  const tc = getThemeConfig(profile.themeId);
  const themeStyle = buildThemeStyle(profile.themeId);
  const effectClasses = buildThemeEffectClasses(profile.themeId);
  const viewed = useRef(false);

  useEffect(() => {
    if (!live || viewed.current) return;
    viewed.current = true;
    logEvent({
      profileId: profile.id,
      ownerId: profile.ownerId,
      type: "profile_view",
    }).catch(() => null);
  }, [live, profile.id, profile.ownerId]);

  const track: TrackFn = (type: AnalyticsEventType, target?: string) => {
    if (!live) return;
    logEvent({
      profileId: profile.id,
      ownerId: profile.ownerId,
      type,
      ...(target ? { target } : {}),
    }).catch(() => null);
  };

  const onLead: LeadSubmitFn = async (data) => {
    if (!live) return;
    await createLead({
      profileId: profile.id,
      ownerId: profile.ownerId,
      name: data.name,
      ...(data.email ? { email: data.email } : {}),
      ...(data.phone ? { phone: data.phone } : {}),
      source: data.source,
    });
  };

  const onBook: BookingSubmitFn = async (data) => {
    if (!live) return;
    await createBooking({
      profileId: profile.id,
      ownerId: profile.ownerId,
      date: data.date,
      time: data.time,
      durationMin: data.durationMin,
      name: data.name,
      phone: data.phone,
      email: data.email,
      answers: data.answers,
    });
  };

  const { header } = profile;
  const sections = profile.sections.filter((s) => s.enabled);
  const isLight = tc.colorScheme === "light";
  const isHero = tc.headerStyle === "hero";
  const initials =
    header.displayName
      .trim()
      .split(/\s+/)
      .map((w) => w[0] ?? "")
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";

  return (
    <div
      className={cn("min-h-full w-full", effectClasses, className)}
      style={themeStyle}
    >
      <div className="mx-auto max-w-md px-4 pb-14 pt-8">
        {/* Header — CSS fade-up replaces what framer-motion was doing.
            Same visual cue, ~50 KB lighter on the public profile bundle. */}
        <div className="cr-fade-up">
          {isHero ? (
            /* ── Hero cover-photo header ── */
            <div className="relative -mx-4 -mt-8">
              {header.avatarUrl ? (
                <div
                  className="aspect-[4/5] w-full bg-cover bg-center"
                  style={{
                    backgroundImage: `url("${header.avatarUrl}")`,
                    maskImage: HERO_FADE,
                    WebkitMaskImage: HERO_FADE,
                  }}
                />
              ) : (
                <div
                  className="flex aspect-[4/5] w-full items-center justify-center"
                  style={{
                    background: "var(--tp-card)",
                    maskImage: HERO_FADE,
                    WebkitMaskImage: HERO_FADE,
                  }}
                >
                  <span
                    className="font-display text-7xl font-bold"
                    style={{ color: "var(--tp-text3)" }}
                  >
                    {initials}
                  </span>
                </div>
              )}

              {/* Name overlaid where the photo fades out */}
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 px-5 pb-2.5">
                <h1
                  className="font-display text-[1.7rem] font-extrabold leading-[1.05]"
                  style={{
                    color: "var(--tp-text)",
                    textShadow: isLight
                      ? "0 1px 10px rgba(255,255,255,0.6)"
                      : "0 2px 16px rgba(0,0,0,0.55)",
                  }}
                >
                  {header.displayName}
                </h1>
                {header.verified && (
                  <BadgeCheck
                    className="h-5 w-5 shrink-0"
                    style={{ color: "var(--tp-accent)" }}
                  />
                )}
              </div>
            </div>
          ) : (
            /* ── Standard centered avatar ── */
            <div className="flex flex-col items-center text-center">
              <Avatar
                name={header.displayName}
                src={header.avatarUrl}
                size={104}
                verified={header.verified}
                priority
              />
              <h1
                className="mt-3.5 font-display text-xl font-bold"
                style={{ color: "var(--tp-text)" }}
              >
                {header.displayName}
              </h1>
            </div>
          )}

          {/* ── Shared sub-info ── */}
          <div
            className={cn(
              "flex flex-col items-center text-center",
              isHero && "mt-3",
            )}
          >
            {(header.company || header.location) && (
              <p
                className="mt-0.5 flex items-center gap-1 text-xs"
                style={{ color: "var(--tp-text3)" }}
              >
                {header.company}
                {header.company && header.location && " · "}
                {header.location && (
                  <>
                    <MapPin className="h-3 w-3" />
                    {header.location}
                  </>
                )}
              </p>
            )}

            <p
              className="mt-2.5 text-sm font-semibold"
              style={{ color: "var(--tp-accent)" }}
            >
              {header.headline}
            </p>

            <p
              className="mt-1.5 text-sm leading-relaxed"
              style={{ color: "var(--tp-text2)" }}
            >
              {header.bio}
            </p>

            {/* Social proof stats */}
            {header.socialProof.length > 0 && (
              <div className="mt-4 flex w-full gap-2">
                {header.socialProof.map((stat) => (
                  <div
                    key={stat.id}
                    className="flex-1 rounded-xl px-2 py-2.5"
                    style={{
                      background: "var(--tp-stat-card)",
                      border: "1px solid var(--tp-stat-border)",
                    }}
                  >
                    <p
                      className="font-display text-sm font-bold"
                      style={{ color: "var(--tp-text)" }}
                    >
                      {stat.value}
                    </p>
                    <p
                      className="text-[10px] leading-tight"
                      style={{ color: "var(--tp-text3)" }}
                    >
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sections — staggered fade-up via CSS delay classes.
            The 6th+ section gets the max delay (.2s) instead of
            growing forever, matching the cap framer-motion had. */}
        <div className="mt-7 space-y-7">
          {sections.map((section, i) => {
            const delayClass =
              i === 0
                ? "cr-fade-up"
                : i === 1
                  ? "cr-fade-up-delay-1"
                  : i === 2
                    ? "cr-fade-up-delay-2"
                    : i === 3
                      ? "cr-fade-up-delay-3"
                      : i === 4
                        ? "cr-fade-up-delay-4"
                        : "cr-fade-up-delay-5";
            return (
              <div key={section.id} className={delayClass}>
                <SectionRenderer
                  section={section}
                  themeConfig={tc}
                  track={track}
                  onLead={onLead}
                  onBook={onBook}
                  profileId={profile.id}
                  ownerId={profile.ownerId}
                  paymentMethods={profile.paymentMethods}
                  source="profile"
                />
              </div>
            );
          })}
        </div>

        {/* Branding footer — only shown when the owner's plan doesn't
            include the `remove_branding` feature. The flag is resolved
            server-side in app/[username]/page.tsx to keep the gating
            on the trusted side instead of relying on the client doing
            the lookup. */}
        {showBranding && (
          <Link
            href="/"
            className="mt-10 flex items-center justify-center gap-1.5 text-xs"
            style={{ color: isLight ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.28)" }}
          >
            <LogoMark className="h-4 w-4" />
            Made with{" "}
            <span
              className="font-semibold"
              style={{ color: isLight ? "rgba(0,0,0,0.40)" : "rgba(255,255,255,0.45)" }}
            >
              Credibly
            </span>
          </Link>
        )}
      </div>
    </div>
  );
}
