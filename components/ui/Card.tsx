import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Use the lighter inset treatment for nested surfaces (subtler bg). */
  inset?: boolean;
}

/**
 * Premium SaaS card surface — white background with a soft 1px slate
 * border and the layered soft-card shadow from globals.css. Sits on
 * the slate-50 workspace canvas. Inset variant uses slate-50 + a
 * lighter border for nested rows (lists inside a card, etc.).
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
        inset
          ? "border border-slate-200 bg-slate-50"
          : "border border-slate-200 bg-white shadow-card-soft",
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
        <h3 className="font-display text-sm font-semibold text-slate-900">
          {title}
        </h3>
        {subtitle && (
          <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}
