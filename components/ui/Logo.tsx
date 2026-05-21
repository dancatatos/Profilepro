import { cn } from "@/lib/utils";

/** Credibly shield-check mark. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 512 512" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="logoAc" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5b8cff" />
          <stop offset="1" stopColor="#1a52e0" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="116" fill="#0f0f13" />
      <path
        d="M256 92 L388 138 V236 c0 102 -66 160 -132 196 C190 396 124 338 124 236 V138 Z"
        fill="url(#logoAc)"
      />
      <path
        d="M206 254 l34 34 l66 -74"
        fill="none"
        stroke="#ffffff"
        strokeWidth="30"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({
  className,
  showText = true,
}: {
  className?: string;
  showText?: boolean;
}) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <LogoMark className="h-8 w-8" />
      {showText && (
        <span className="font-display text-lg font-bold tracking-tight text-white">
          Credibly
        </span>
      )}
    </span>
  );
}
