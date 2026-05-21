"use client";

import { Images, ImageUp, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function MediaPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Media Library"
        subtitle="All your photos & video assets in one place."
      />

      <Card className="flex flex-col items-center px-6 py-12 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-electric-500/12">
          <Images className="h-7 w-7 text-electric-400" />
        </span>
        <h2 className="mt-4 font-display text-base font-semibold text-white">
          Upload images right where you need them
        </h2>
        <p className="mt-1.5 max-w-sm text-sm text-white/50">
          For now, upload profile photos, product images and gallery shots
          directly inside the Profile Builder. A central media library with
          reuse &amp; tagging is on the roadmap.
        </p>
        <Button href="/profile" className="mt-5" leftIcon={<ImageUp className="h-4 w-4" />}>
          Go to Profile Builder
        </Button>
      </Card>

      <Card className="flex items-center gap-3 p-4">
        <Sparkles className="h-5 w-5 shrink-0 text-jade-400" />
        <p className="text-xs text-white/55">
          Coming soon: AI image generation, background removal and one-click
          optimisation — powered by Firebase AI Logic.
        </p>
      </Card>
    </div>
  );
}
