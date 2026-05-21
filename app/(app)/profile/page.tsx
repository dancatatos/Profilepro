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
    <div className="space-y-5">
      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-2">
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

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        {/* Editors */}
        <div className="space-y-4">
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

        {/* Desktop live preview */}
        <div className="hidden lg:block">
          <div className="sticky top-20">
            <p className="mb-2.5 text-center text-xs font-medium text-white/40">
              Live preview
            </p>
            <PhonePreview height={620} />
          </div>
        </div>
      </div>

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
    </div>
  );
}
