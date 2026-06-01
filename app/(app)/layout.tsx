"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useProfileStore } from "@/store/profileStore";
import { getProfile } from "@/lib/firebase/firestore";
import { createDefaultProfile, DEMO_PROFILE } from "@/lib/defaults";
import { FullScreenLoader } from "@/components/ui/Spinner";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { BottomNav } from "@/components/layout/BottomNav";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { account, loading } = useAuth();
  const router = useRouter();
  const profile = useProfileStore((s) => s.profile);
  const setProfile = useProfileStore((s) => s.setProfile);

  useEffect(() => {
    if (loading) return;
    if (!account) {
      router.replace("/login");
      return;
    }
    /* Affiliates have their own dashboard — bounce them out of the
       regular customer app so they don't see an empty profile builder. */
    if (account.role === "affiliate") {
      router.replace("/affiliate");
    }
  }, [loading, account, router]);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!account || profile) return;
      if (account.uid === "demo") {
        setProfile({ ...DEMO_PROFILE });
        return;
      }
      const existing = await getProfile(account.uid);
      if (!active) return;
      setProfile(
        existing ??
          createDefaultProfile(
            account.uid,
            account.username || "me",
            account.displayName,
          ),
      );
    })();
    return () => {
      active = false;
    };
  }, [account, profile, setProfile]);

  if (loading || !account) {
    return <FullScreenLoader label="Loading your workspace…" />;
  }

  return (
    /* Outer canvas = deepest black (ink-950). The nav rail blends into
       this; the content column lifts above it via .app-workspace. */
    <div className="min-h-dvh bg-ink-950">
      <Sidebar />
      {/* Content column — the elevated workspace zone. min-h-dvh so the
          lighter surface + ambient glow fill the viewport even on short
          pages, rather than the dark canvas peeking through below. */}
      <div className="app-workspace min-h-dvh lg:pl-64">
        <TopBar />
        <main className="relative z-[1] mx-auto max-w-5xl px-4 pb-28 pt-5 lg:px-8 lg:pb-12">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
