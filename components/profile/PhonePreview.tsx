"use client";

import { useProfileStore } from "@/store/profileStore";
import { PublicProfileView } from "@/components/public-profile/PublicProfileView";

/** Device-framed live preview of the profile being edited. */
export function PhonePreview({ height = 600 }: { height?: number }) {
  const profile = useProfileStore((s) => s.profile);
  if (!profile) return null;

  return (
    <div className="mx-auto w-[300px] max-w-full">
      <div className="relative rounded-[2.6rem] border-4 border-ink-700 bg-ink-950 p-2 shadow-glass">
        <div className="absolute left-1/2 top-2 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-ink-700" />
        <div
          className="no-scrollbar overflow-y-auto rounded-[2rem]"
          style={{ height }}
        >
          <PublicProfileView profile={profile} />
        </div>
      </div>
    </div>
  );
}
