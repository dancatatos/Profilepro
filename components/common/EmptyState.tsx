import type { ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";

export function EmptyState({
  icon = "Inbox",
  title,
  description,
  action,
}: {
  icon?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-white/10 bg-white/[0.015] px-6 py-12 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.04]">
        <Icon name={icon} className="h-6 w-6 text-white/40" />
      </span>
      <h3 className="mt-4 font-display text-sm font-semibold text-white">
        {title}
      </h3>
      {description && (
        <p className="mt-1 max-w-xs text-xs text-white/45">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
