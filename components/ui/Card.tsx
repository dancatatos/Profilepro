import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Use the lighter glass treatment for nested surfaces. */
  inset?: boolean;
}

/**
 * Glassmorphism surface used across the dashboard. forwardRef so
 * callers can measure or animate the underlying div (e.g. the QR page
 * uses a ResizeObserver to compute a responsive QR size from the
 * card's actual width).
 */
export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { inset, className, children, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        "rounded-2xl",
        inset ? "border border-white/[0.05] bg-white/[0.02]" : "glass-card",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
});

export function CardHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-3", className)}>
      <div className="min-w-0">
        <h3 className="font-display text-sm font-semibold text-white">
          {title}
        </h3>
        {subtitle && (
          <p className="mt-0.5 text-xs text-white/45">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}
