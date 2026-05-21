"use client";

import { useState } from "react";
import { Eye, Save, Share2, Sparkles } from "lucide-react";
import { useProfileStore } from "@/store/profileStore";
import { saveProfile } from "@/lib/firebase/firestore";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { HeaderEditor } from "@/components/profile/HeaderEditor";
import { ThemePicker } from "@/components/profile/ThemePicker";
import { SectionsManager } from "@/components/profile/SectionsManager";
import { PublishSettings } from "@/components/profile/PublishSettings";
import { PhonePreview } from "@/components/profile/PhonePreview";
import { AIGenerateModal } from "@/components/profile/AIGenerateModal";
import { ShareModal } from "@/components/share/ShareModal";
import { FullScreenLoader } from "@/components/ui/Spinner";
import { APP } from "@/lib/constants";
import { toast } from "@/store/uiStore";

export default function ProfileBuilderPage() {
  const profile = useProfileStore((s) => s.profile);
  const dirty = useProfileStore((s) => s.dirty);
  const markSaved = useProfileStore((s) => s.markSaved);

  const [saving, setSaving] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  if (!profile) return <FullScreenLoader label="Loading your profile…" />;

  const profileUrl = `${APP.url}/${profile.username}`;

  const save = async () => {
    setSaving(true);
    try {
      await saveProfile(profile);
      markSaved();
      toast.success(
        isFirebaseConfigured ? "Profile saved" : "Saved locally (demo mode)",
      );
    } catch {
      toast.error("Couldn't save — please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* ── Action bar ── */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="mr-auto">
          <h1 className="font-display text-xl font-bold text-white">
            Profile Builder
          </h1>
          <p className="text-xs text-white/45">
            {dirty ? "Unsaved changes" : "All changes saved"}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAiOpen(true)}
          leftIcon={<Sparkles className="h-4 w-4 text-electric-400" />}
        >
          AI Generate
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPreviewOpen(true)}
          leftIcon={<Eye className="h-4 w-4" />}
          className="lg:hidden"
        >
          Preview
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShareOpen(true)}
          leftIcon={<Share2 className="h-4 w-4" />}
        >
          Share
        </Button>
        <Button
          size="sm"
          onClick={save}
          loading={saving}
          leftIcon={<Save className="h-4 w-4" />}
        >
          Save{dirty ? "" : "d"}
        </Button>
      </div>

      {/* ── Split-pane ──
          Breaks out of the max-w-5xl horizontal padding so neither pane
          causes horizontal overflow. The left pane scrolls independently;
          the right pane is always visible without any page-level scroll.
      ─────────────────────────────────────────────────────────────────── */}
      <div className="-mx-4 lg:-mx-8 lg:flex lg:h-[calc(100dvh-9.5rem)] lg:overflow-hidden">

        {/* Left: scrollable editor */}
        <div className="space-y-4 px-4 pb-28 lg:flex-1 lg:min-w-0 lg:overflow-y-auto lg:px-8 lg:pb-10 lg:pt-1">
          <Card className="p-4">
            <CardHeader
              title="Profile Header"
              subtitle="The first thing prospects see"
            />
            <div className="mt-4">
              <HeaderEditor />
            </div>
          </Card>

          <Card className="p-4">
            <CardHeader
              title="Sections"
              subtitle="Drag to reorder · toggle to show/hide"
            />
            <div className="mt-4">
              <SectionsManager />
            </div>
          </Card>

          <Card className="p-4">
            <CardHeader title="Theme" subtitle="Pick your profile look" />
            <div className="mt-4">
              <ThemePicker />
            </div>
          </Card>

          <Card className="p-4">
            <CardHeader
              title="Publish & Settings"
              subtitle="Your URL, SEO and visibility"
            />
            <div className="mt-4">
              <PublishSettings />
            </div>
          </Card>
        </div>

        {/* Right: phone preview — always in view, no page scroll needed */}
        <div className="hidden lg:flex lg:w-[320px] lg:shrink-0 lg:flex-col lg:items-center lg:overflow-y-auto lg:border-l lg:border-white/[0.06] lg:px-4 lg:py-5">
          <p className="mb-2.5 text-center text-xs font-medium text-white/40">
            Live preview
          </p>
          <PhonePreview height={580} />
        </div>
      </div>

      {/* ── Modals ── */}
      <AIGenerateModal open={aiOpen} onClose={() => setAiOpen(false)} />
      <ShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        url={profileUrl}
        title={profile.header.displayName}
      />
      <Modal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title="Live preview"
      >
        <div className="pb-3">
          <PhonePreview height={560} />
        </div>
      </Modal>
    </>
  );
}
