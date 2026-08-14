"use client";

import { useState, type ReactNode } from "react";
import { Type } from "lucide-react";
import { cn } from "@/lib/utils";
import { TypographyPanel } from "./TypographyPanel";
import type { TextStyle } from "@/types";

/**
 * Wrapper for a single text field that adds a per-element typography
 * override. Renders a small "T" chip inline with the field's label;
 * click toggles a compact TypographyPanel below the field. Chip glows
 * electric when an override is set, so leaders can see at-a-glance
 * which fields have per-element styling on them.
 *
 * The field itself is passed as `children` — this wrapper adds ONLY
 * the label row + optional override panel, so callers can drop their
 * existing input/textarea inside without restructuring.
 *
 * Typical use in a section editor:
 *
 *   <ElementTypographyOverride
 *     label="Headline"
 *     value={section.headlineStyle}
 *     onChange={(headlineStyle) => update(section.id, { headlineStyle })}
 *   >
 *     <input ... />
 *   </ElementTypographyOverride>
 */
export function ElementTypographyOverride({
  label,
  value,
  onChange,
  children,
}: {
  /** Small label shown left of the T chip (e.g. "Headline", "Subtext"). */
  label: string;
  /** Current per-element style; undefined = inherits section default. */
  value: TextStyle | undefined;
  onChange: (next: TextStyle | undefined) => void;
  /** The actual text input for this field. */
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const hasOverride = value !== undefined;

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <label className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
          {label}
        </label>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-medium transition-colors",
            hasOverride
              ? "border-electric-500/40 bg-electric-500/10 text-electric-700"
              : "border-slate-200 bg-white text-slate-500 hover:text-slate-900",
          )}
          aria-expanded={open}
          aria-label={
            hasOverride
              ? `Edit ${label} typography override`
              : `Add ${label} typography override`
          }
        >
          <Type className="h-3 w-3" />
          {hasOverride ? "Override" : "Style"}
        </button>
      </div>
      {children}
      {open && (
        <div className="mt-2">
          <TypographyPanel value={value} onChange={onChange} compact />
        </div>
      )}
    </div>
  );
}
