import { BadgeCheck } from "lucide-react";
import { cn, getInitials } from "@/lib/utils";

interface AvatarProps {
  src?: string;
  name: string;
  size?: number;
  verified?: boolean;
  className?: string;
  ring?: boolean;
  /**
   * When true, the image loads eagerly with high fetch priority —
   * for above-the-fold avatars (profile page hero, training page
   * leader). Defaults to false so the dozens of avatars in lists
   * (Members, Learners, RSVPs, etc.) lazy-load and don't compete
   * with critical resources for bandwidth.
   */
  priority?: boolean;
}

/**
 * Uses a plain <img> on purpose — sources include blob: previews and
 * arbitrary user-uploaded URLs that next/image cannot optimise.
 */
export function Avatar({
  src,
  name,
  size = 56,
  verified,
  className,
  ring = true,
  priority,
}: AvatarProps) {
  return (
    <div
      className={cn("relative shrink-0", className)}
      style={{ width: size, height: size }}
    >
      <div
        className={cn(
          "h-full w-full overflow-hidden rounded-full",
          ring && "ring-2 ring-white/10",
        )}
      >
        {src ? (
          <img
            src={src}
            alt={name}
            className="h-full w-full object-cover"
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            {...(priority ? { fetchPriority: "high" as const } : {})}
            width={size}
            height={size}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-brand-gradient">
            <span
              className="font-display font-bold text-white"
              style={{ fontSize: size * 0.36 }}
            >
              {getInitials(name) || "?"}
            </span>
          </div>
        )}
      </div>
      {verified && (
        <span className="absolute -bottom-0.5 -right-0.5 rounded-full bg-ink-950 p-0.5">
          <BadgeCheck
            className="text-electric-400"
            style={{ width: size * 0.3, height: size * 0.3 }}
            fill="currentColor"
            stroke="#050507"
          />
        </span>
      )}
    </div>
  );
}
