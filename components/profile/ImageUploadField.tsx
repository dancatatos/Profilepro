"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { uploadImage } from "@/lib/firebase/storage";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/store/uiStore";
import { cn } from "@/lib/utils";

type Folder =
  | "avatars"
  | "covers"
  | "gallery"
  | "products"
  | "media"
  | "hero"
  | "university";

export function ImageUploadField({
  value,
  onChange,
  label,
  folder = "media",
  round = false,
  className,
}: {
  value?: string;
  onChange: (url: string) => void;
  label?: string;
  folder?: Folder;
  round?: boolean;
  className?: string;
}) {
  const { account } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB.");
      return;
    }
    setBusy(true);
    try {
      const url = await uploadImage(account?.uid || "demo", file, folder);
      onChange(url);
      toast.success("Image uploaded");
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
            "relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden border border-slate-200 bg-slate-50",
            round ? "rounded-full" : "rounded-2xl",
          )}
        >
          {value ? (
            <img src={value} alt="" className="h-full w-full object-cover" />
          ) : (
            <ImagePlus className="h-6 w-6 text-slate-400" />
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
            {value ? "Replace" : "Upload"}
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
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={onFile}
        className="hidden"
      />
    </div>
  );
}
