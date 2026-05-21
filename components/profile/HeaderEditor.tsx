"use client";

import { BadgeCheck, Plus, X } from "lucide-react";
import { useProfileStore } from "@/store/profileStore";
import { Input, Textarea } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { ImageUploadField } from "./ImageUploadField";
import { uid } from "@/lib/utils";

export function HeaderEditor() {
  const profile = useProfileStore((s) => s.profile);
  const updateHeader = useProfileStore((s) => s.updateHeader);
  if (!profile) return null;
  const h = profile.header;

  const setStat = (id: string, patch: Partial<{ label: string; value: string }>) =>
    updateHeader({
      socialProof: h.socialProof.map((s) =>
        s.id === id ? { ...s, ...patch } : s,
      ),
    });

  return (
    <div className="space-y-4">
      <ImageUploadField
        label="Profile photo"
        value={h.avatarUrl}
        onChange={(url) => updateHeader({ avatarUrl: url })}
        folder="avatars"
        round
      />

      <Input
        label="Full name"
        value={h.displayName}
        onChange={(e) => updateHeader({ displayName: e.target.value })}
        placeholder="Your name"
      />

      <Input
        label="Headline"
        value={h.headline}
        onChange={(e) => updateHeader({ headline: e.target.value })}
        placeholder="I help [who] achieve [result]"
        hint="One line that builds instant trust."
      />

      <Textarea
        label="Bio"
        value={h.bio}
        onChange={(e) => updateHeader({ bio: e.target.value })}
        placeholder="A short, credible bio prospects will read first."
        rows={3}
      />

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Company / brand"
          value={h.company || ""}
          onChange={(e) => updateHeader({ company: e.target.value })}
          placeholder="Optional"
        />
        <Input
          label="Location"
          value={h.location || ""}
          onChange={(e) => updateHeader({ location: e.target.value })}
          placeholder="Optional"
        />
      </div>

      <div className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.02] p-3.5">
        <div className="flex items-center gap-2.5">
          <BadgeCheck className="h-5 w-5 text-electric-400" />
          <div>
            <p className="text-sm font-medium text-white">
              Verification badge
            </p>
            <p className="text-xs text-white/40">
              Adds a trust badge to your photo.
            </p>
          </div>
        </div>
        <Switch
          checked={h.verified}
          onChange={(v) => updateHeader({ verified: v })}
        />
      </div>

      {/* Social proof stats */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-medium text-white/65">
            Social proof stats
          </p>
          {h.socialProof.length < 4 && (
            <button
              onClick={() =>
                updateHeader({
                  socialProof: [
                    ...h.socialProof,
                    { id: uid("st"), label: "New stat", value: "0" },
                  ],
                })
              }
              className="flex items-center gap-1 text-xs font-medium text-electric-400"
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </button>
          )}
        </div>
        <div className="space-y-2">
          {h.socialProof.map((stat) => (
            <div key={stat.id} className="flex items-center gap-2">
              <input
                value={stat.value}
                onChange={(e) => setStat(stat.id, { value: e.target.value })}
                placeholder="6+"
                className="h-10 w-20 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 text-center text-sm text-white outline-none focus:border-electric-500/60"
              />
              <input
                value={stat.label}
                onChange={(e) => setStat(stat.id, { label: e.target.value })}
                placeholder="Years experience"
                className="h-10 flex-1 rounded-lg border border-white/10 bg-white/[0.03] px-3 text-sm text-white outline-none focus:border-electric-500/60"
              />
              <button
                onClick={() =>
                  updateHeader({
                    socialProof: h.socialProof.filter(
                      (s) => s.id !== stat.id,
                    ),
                  })
                }
                className="rounded-lg p-2 text-white/35 hover:text-red-400"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
