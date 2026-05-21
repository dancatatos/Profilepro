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
import { getTheme } from "@/lib/theme";
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
  const theme = getTheme(profile.themeId);
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

  return (
    <div
      className={cn("min-h-full w-full", className)}
      style={{ background: theme.background }}
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
          <h1 className="mt-3.5 font-display text-xl font-bold text-white">
            {header.displayName}
          </h1>
          {(header.company || header.location) && (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-white/45">
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
          <p className="mt-2.5 text-sm font-medium text-electric-300">
            {header.headline}
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-white/55">
            {header.bio}
          </p>

          {header.socialProof.length > 0 && (
            <div className="mt-4 flex w-full gap-2">
              {header.socialProof.map((stat) => (
                <div
                  key={stat.id}
                  className="flex-1 rounded-xl border border-white/[0.07] bg-white/[0.03] px-2 py-2.5"
                >
                  <p className="font-display text-sm font-bold text-white">
                    {stat.value}
                  </p>
                  <p className="text-[10px] leading-tight text-white/45">
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
                theme={theme}
                track={track}
                onLead={onLead}
              />
            </motion.div>
          ))}
        </div>

        {/* Branding footer */}
        <Link
          href="/"
          className="mt-10 flex items-center justify-center gap-1.5 text-xs text-white/30"
        >
          <LogoMark className="h-4 w-4" />
          Made with <span className="font-semibold text-white/50">Credibly</span>
        </Link>
      </div>
    </div>
  );
}
