"use client";

import { useEffect, useState } from "react";
import { Check, Globe, Loader2, X } from "lucide-react";
import { useProfileStore } from "@/store/profileStore";
import { useAuth } from "@/hooks/useAuth";
import { isUsernameAvailable } from "@/lib/firebase/firestore";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import { Input, Textarea } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { getAppOrigin, slugify } from "@/lib/utils";

const RESERVED = new Set([
  "login", "signup", "dashboard", "profile", "admin", "api", "settings",
  "billing", "templates", "qr", "card", "leads", "analytics", "university",
  "media", "demo", "forgot-password", "u", "app", "affiliate", "r",
]);

type Availability = "idle" | "checking" | "ok" | "taken" | "reserved";

export function PublishSettings() {
  const profile = useProfileStore((s) => s.profile);
  const setUsername = useProfileStore((s) => s.setUsername);
  const setStatus = useProfileStore((s) => s.setStatus);
  const updateSeo = useProfileStore((s) => s.updateSeo);
  const { account } = useAuth();
  const [availability, setAvailability] = useState<Availability>("idle");

  const username = profile?.username || "";

  useEffect(() => {
    if (!username) return;
    if (RESERVED.has(username)) {
      setAvailability("reserved");
      return;
    }
    setAvailability("checking");
    const t = setTimeout(async () => {
      try {
        const ok = await isUsernameAvailable(username, account?.uid || "demo");
        setAvailability(ok ? "ok" : "taken");
      } catch {
        setAvailability("idle");
      }
    }, 500);
    return () => clearTimeout(t);
  }, [username, account?.uid]);

  if (!profile) return null;

  return (
    <div className="space-y-4">
      {/* Username */}
      <div>
        <Input
          label="Profile URL"
          value={username}
          onChange={(e) => setUsername(slugify(e.target.value))}
          placeholder="your-name"
          leftIcon={<Globe className="h-4 w-4" />}
          rightSlot={
            availability === "checking" ? (
              <span className="p-2.5">
                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
              </span>
            ) : availability === "ok" ? (
              <span className="p-2.5">
                <Check className="h-4 w-4 text-jade-600" />
              </span>
            ) : availability === "taken" || availability === "reserved" ? (
              <span className="p-2.5">
                <X className="h-4 w-4 text-red-600" />
              </span>
            ) : null
          }
        />
        <p className="mt-1.5 text-xs text-slate-400">
          {getAppOrigin().replace(/^https?:\/\//, "")}/
          <span className="text-electric-700">{username || "your-name"}</span>
          {availability === "taken" && (
            <span className="ml-2 text-red-600">Already taken</span>
          )}
          {availability === "reserved" && (
            <span className="ml-2 text-red-600">Reserved word</span>
          )}
        </p>
      </div>

      {/* SEO */}
      <Input
        label="SEO title"
        value={profile.seo.title}
        onChange={(e) => updateSeo({ title: e.target.value })}
        placeholder="How your profile appears in search & shares"
      />
      <Textarea
        label="SEO description"
        value={profile.seo.description}
        onChange={(e) => updateSeo({ description: e.target.value })}
        rows={2}
        placeholder="A short description for search engines & social previews"
      />

      {/* Publish */}
      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3.5">
        <div>
          <p className="text-sm font-medium text-slate-900">
            {profile.status === "published" ? "Published" : "Draft"}
          </p>
          <p className="text-xs text-slate-400">
            {profile.status === "published"
              ? "Your profile is live and shareable."
              : "Only you can see this profile."}
          </p>
        </div>
        <Switch
          checked={profile.status === "published"}
          onChange={(v) => setStatus(v ? "published" : "draft")}
        />
      </div>

      {!isFirebaseConfigured && (
        <p className="rounded-lg bg-gold-400/10 px-3 py-2 text-xs text-amber-700">
          Demo mode — connect Firebase in <code>.env.local</code> to save &amp;
          publish for real.
        </p>
      )}
    </div>
  );
}
