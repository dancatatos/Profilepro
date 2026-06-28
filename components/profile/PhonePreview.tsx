"use client";

import { useProfileStore } from "@/store/profileStore";
import { PublicProfileView } from "@/components/public-profile/PublicProfileView";
import { usePlanAccess } from "@/components/providers/PlanProvider";

/** Device-framed live preview of the profile being edited. */
export function PhonePreview({ height = 600 }: { height?: number }) {
  const profile = useProfileStore((s) => s.profile);
  const { hasFeature } = usePlanAccess();
  if (!profile) return null;

  /* Mirror what visitors actually see — if the current user's plan
     includes remove_branding, hide the Credibly footer in the preview
     too. Otherwise the user might be confused thinking the footer is
     still visible to visitors after they upgraded. */
  const showBranding = !hasFeature("remove_branding");

  return (
    <div className="mx-auto w-[300px] max-w-full">
      <div className="relative rounded-[2.6rem] border-4 border-ink-700 bg-slate-50 p-2 shadow-glass">
        <div className="absolute left-1/2 top-2 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-ink-700" />
        {/* overflow-hidden (not just overflow-y-auto) so any 100vw
            breakout inside the preview — Cover sections in particular
            — stay contained to the phone frame and don't bleed across
            the dashboard, covering the sidebar nav. */}
        <div
          className="no-scrollbar overflow-y-auto overflow-x-hidden rounded-[2rem]"
          style={{ height }}
        >
          <PublicProfileView profile={profile} showBranding={showBranding} />
        </div>
      </div>
    </div>
  );
}
