"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { MapPin } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { LogoMark } from "@/components/ui/Logo";
import {
  SectionRenderer,
  type LeadSubmitFn,
  type TrackFn,
} from "./ProfileSections";
import { buildThemeStyle, buildThemeEffectClasses, getThemeConfig } from "@/lib/themes";
import { createLead, logEvent } from "@/lib/firebase/firestore";
import { cn } from "@/lib/utils";
import type { AnalyticsEventType, Profile } from "@/types";

interface Props {
  profile: Profile;
  /** Live mode wires real analytics + lead capture. */
  live?: boolean;
  className?: string;
}

export function PublicProfileView({ profile, live = false, className }: Props) {
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

  const { header } = profile;
  const sections = profile.sections.filter((s) => s.enabled);
  const isLight = tc.colorScheme === "light";

  return (
    <div
      className={cn("min-h-full w-full", effectClasses, className)}
      style={themeStyle}
    >
      <div className="mx-auto max-w-md px-4 pb-14 pt-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center text-center"
        >
          <Avatar
            name={header.displayName}
            src={header.avatarUrl}
            size={104}
            verified={header.verified}
          />

          <h1
            className="mt-3.5 font-display text-xl font-bold"
            style={{ color: "var(--tp-text)" }}
          >
            {header.displayName}
          </h1>

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
        </motion.div>

        {/* Sections */}
        <div className="mt-7 space-y-7">
          {sections.map((section, i) => (
            <motion.div
              key={section.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.4, delay: Math.min(i * 0.04, 0.2) }}
            >
              <SectionRenderer
                section={section}
                themeConfig={tc}
                track={track}
                onLead={onLead}
              />
            </motion.div>
          ))}
        </div>

        {/* Branding footer */}
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
      </div>
    </div>
  );
}
