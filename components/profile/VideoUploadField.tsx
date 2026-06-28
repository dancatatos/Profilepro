"use client";

import { useRef, useState } from "react";
import { Film, Loader2, Trash2 } from "lucide-react";
import { uploadVideo } from "@/lib/firebase/storage";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/store/uiStore";
import { cn } from "@/lib/utils";

type Folder = "hero" | "cover";

const MAX_BYTES = 25 * 1024 * 1024;

/**
 * Background-video uploader. Mirrors ImageUploadField's UX so owners
 * recognise it instantly: square preview tile + Upload/Replace/Remove
 * controls. Preview tile shows the video muted+looped as a thumb so
 * the owner can see what visitors will see (same playback shape we'll
 * use on the public profile).
 *
 * Cap: 25 MB MP4 / WebM. Bigger files crush mobile load time and the
 * autoplay buffer pause becomes visible — Storage rules enforce the
 * same cap server-side so devtools can't bypass it.
 */
export function VideoUploadField({
  value,
  onChange,
  label,
  folder = "hero",
  className,
}: {
  value?: string;
  onChange: (url: string) => void;
  label?: string;
  folder?: Folder;
  className?: string;
}) {
  const { account } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      toast.error("Pick a video file (MP4 or WebM).");
      e.target.value = "";
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Video must be under 25 MB. Try compressing or trim length.");
      e.target.value = "";
      return;
    }
    setBusy(true);
    try {
      const url = await uploadVideo(account?.uid || "demo", file, folder);
      onChange(url);
      toast.success("Video uploaded");
    } catch {
      toast.error("Upload failed — try again.");
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  };

  return (
    <div className={className}>
      {label && (
        <p className="mb-1.5 text-xs font-medium text-slate-600">{label}</p>
      )}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={cn(
            "relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50",
          )}
        >
          {value ? (
            <video
              src={value}
              autoPlay
              muted
              loop
              playsInline
              className="h-full w-full object-cover"
            />
          ) : (
            <Film className="h-6 w-6 text-slate-400" />
          )}
          {busy && (
            <span className="absolute inset-0 flex items-center justify-center bg-black/60">
              <Loader2 className="h-5 w-5 animate-spin text-slate-900" />
            </span>
          )}
        </button>
        <div className="flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
          >
            {value ? "Replace video" : "Upload video"}
          </button>
          {value && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="flex items-center gap-1 px-1 text-xs text-red-700/80"
            >
              <Trash2 className="h-3 w-3" />
              Remove
            </button>
          )}
          <p className="px-1 text-[10px] leading-tight text-slate-400">
            MP4 / WebM · &le; 25 MB · autoplays muted
          </p>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime"
        onChange={onFile}
        className="hidden"
      />
    </div>
  );
}
