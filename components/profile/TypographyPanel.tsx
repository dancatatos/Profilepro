"use client";

import { useState } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ChevronDown,
  Italic,
  RotateCcw,
  Type,
  Underline,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  FONT_FAMILY_OPTIONS,
  fontFamilyCssVar,
} from "@/lib/textStyle";
import type {
  TextAlign,
  TextColorToken,
  TextFontFamily,
  TextFontSize,
  TextFontWeight,
  TextLetterSpacing,
  TextStyle,
} from "@/types";

/**
 * Reusable typography editor — used both at section-level (below
 * the section title) and per-element (popover next to each text
 * field). Same shape either way: value in, changes out.
 *
 * Every field is optional; setting a field explicitly to "theme" is
 * how the caller clears an override without deleting the whole
 * TextStyle object (useful when other fields on the same override
 * are still active).
 */
export function TypographyPanel({
  value,
  onChange,
  compact,
}: {
  value: TextStyle | undefined;
  onChange: (next: TextStyle | undefined) => void;
  /** Popover mode — tighter padding, no collapse header. */
  compact?: boolean;
}) {
  const style = value ?? {};

  /* Convenience updater. Setting every field back to "theme"/undefined
     collapses the whole override to undefined so we don't persist an
     empty {} to Firestore. */
  const patch = (p: Partial<TextStyle>) => {
    const next = { ...style, ...p } as TextStyle;
    const hasAny =
      (next.fontFamily && next.fontFamily !== "theme") ||
      (next.fontSize && next.fontSize !== "theme") ||
      (next.fontWeight && next.fontWeight !== "theme") ||
      (next.color && next.color !== "theme") ||
      (next.align && next.align !== "theme") ||
      (next.letterSpacing && next.letterSpacing !== "theme") ||
      (next.lineHeight && next.lineHeight !== "theme") ||
      next.italic ||
      next.underline;
    onChange(hasAny ? next : undefined);
  };

  const reset = () => onChange(undefined);

  const [open, setOpen] = useState(compact ?? false);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border",
        compact
          ? "border-slate-200 bg-white"
          : "border-electric-500/40 bg-electric-500/[0.03]",
      )}
    >
      {!compact && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "flex w-full items-center justify-between px-3 py-2 text-left",
            "border-b border-transparent transition-colors",
            open && "border-electric-500/20 bg-electric-500/[0.04]",
          )}
          aria-expanded={open}
        >
          <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-electric-700">
            <Type className="h-3 w-3" />
            Section typography
          </span>
          <div className="flex items-center gap-2">
            {value && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  reset();
                }}
                className="flex items-center gap-1 text-[10px] font-medium text-slate-500 hover:text-slate-900"
              >
                <RotateCcw className="h-3 w-3" />
                Reset
              </button>
            )}
            <ChevronDown
              className={cn(
                "h-4 w-4 text-slate-400 transition-transform",
                open && "rotate-180",
              )}
            />
          </div>
        </button>
      )}

      {(open || compact) && (
        <div className={cn("space-y-3", compact ? "p-2.5" : "p-3")}>
          <FontFamilyPicker
            value={style.fontFamily}
            onChange={(v) => patch({ fontFamily: v })}
          />

          <div className="grid grid-cols-2 gap-2">
            <SizePicker
              value={style.fontSize}
              onChange={(v) => patch({ fontSize: v })}
            />
            <WeightPicker
              value={style.fontWeight}
              onChange={(v) => patch({ fontWeight: v })}
            />
          </div>

          <ColorPicker
            value={style.color}
            customColor={style.customColor}
            onChange={(color, customColor) =>
              patch({ color, customColor })
            }
          />

          <div className="grid grid-cols-[1fr_auto] gap-2">
            <AlignPicker
              value={style.align}
              onChange={(v) => patch({ align: v })}
            />
            <StyleToggles
              italic={style.italic}
              underline={style.underline}
              onChange={(italic, underline) => patch({ italic, underline })}
            />
          </div>

          <LetterSpacingPicker
            value={style.letterSpacing}
            onChange={(v) => patch({ letterSpacing: v })}
          />

          {compact && value && (
            <button
              type="button"
              onClick={reset}
              className="flex w-full items-center justify-center gap-1 rounded-lg border border-slate-200 py-1.5 text-[11px] font-medium text-slate-600 hover:bg-slate-50"
            >
              <RotateCcw className="h-3 w-3" />
              Reset to section default
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────────── Field pickers ─────────────── */

const LABEL_CLS =
  "mb-1 block text-[10px] font-medium uppercase tracking-wider text-slate-500";
const SEG_CLS =
  "flex items-center gap-0.5 rounded-lg border border-slate-200 bg-white p-0.5";
const SEG_BTN_CLS =
  "flex-1 rounded-md px-2 py-1 text-[11px] font-medium text-slate-600 transition-colors";
const SEG_BTN_ACTIVE_CLS = "bg-electric-500 text-white shadow-sm";

function FontFamilyPicker({
  value,
  onChange,
}: {
  value: TextFontFamily | undefined;
  onChange: (v: TextFontFamily) => void;
}) {
  const current = value ?? "theme";
  const selected =
    FONT_FAMILY_OPTIONS.find((o) => o.value === current) ??
    FONT_FAMILY_OPTIONS[0];
  return (
    <div>
      <label className={LABEL_CLS}>Font family</label>
      <div className="relative">
        <select
          value={current}
          onChange={(e) => onChange(e.target.value as TextFontFamily)}
          className="h-9 w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-8 text-sm text-slate-900 outline-none focus:border-electric-500 focus:ring-2 focus:ring-electric-500/15"
          style={{ fontFamily: fontFamilyCssVar(selected.value) }}
        >
          {FONT_FAMILY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
              {o.category !== "sans" ? ` (${o.category})` : ""}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      </div>
    </div>
  );
}

const SIZES: { value: TextFontSize; label: string }[] = [
  { value: "theme", label: "—" },
  { value: "xs", label: "XS" },
  { value: "sm", label: "S" },
  { value: "md", label: "M" },
  { value: "lg", label: "L" },
  { value: "xl", label: "XL" },
];

function SizePicker({
  value,
  onChange,
}: {
  value: TextFontSize | undefined;
  onChange: (v: TextFontSize) => void;
}) {
  const current = value ?? "theme";
  return (
    <div>
      <label className={LABEL_CLS}>Size</label>
      <div className={SEG_CLS}>
        {SIZES.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => onChange(s.value)}
            className={cn(
              SEG_BTN_CLS,
              current === s.value && SEG_BTN_ACTIVE_CLS,
            )}
            aria-label={`Size ${s.label}`}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}

const WEIGHTS: { value: TextFontWeight; label: string }[] = [
  { value: "theme", label: "—" },
  { value: "light", label: "L" },
  { value: "normal", label: "R" },
  { value: "medium", label: "M" },
  { value: "bold", label: "B" },
];

function WeightPicker({
  value,
  onChange,
}: {
  value: TextFontWeight | undefined;
  onChange: (v: TextFontWeight) => void;
}) {
  const current = value ?? "theme";
  return (
    <div>
      <label className={LABEL_CLS}>Weight</label>
      <div className={SEG_CLS}>
        {WEIGHTS.map((w) => (
          <button
            key={w.value}
            type="button"
            onClick={() => onChange(w.value)}
            className={cn(
              SEG_BTN_CLS,
              current === w.value && SEG_BTN_ACTIVE_CLS,
            )}
            style={{
              fontWeight:
                w.value === "light"
                  ? 300
                  : w.value === "medium"
                    ? 500
                    : w.value === "bold"
                      ? 700
                      : 400,
            }}
            aria-label={`Weight ${w.label}`}
          >
            {w.label}
          </button>
        ))}
      </div>
    </div>
  );
}

const COLOR_SWATCHES: {
  value: TextColorToken;
  bg: string;
  label: string;
}[] = [
  { value: "theme", bg: "linear-gradient(135deg,#f8fafc 25%,transparent 25%,transparent 75%,#f8fafc 75%),linear-gradient(135deg,#f8fafc 25%,transparent 25%,transparent 75%,#f8fafc 75%)", label: "Theme default" },
  { value: "primary", bg: "#0F172A", label: "Primary" },
  { value: "secondary", bg: "#475569", label: "Secondary" },
  { value: "muted", bg: "#94A3B8", label: "Muted" },
  { value: "accent", bg: "#2e6bff", label: "Accent" },
  { value: "white", bg: "#FFFFFF", label: "White" },
  { value: "black", bg: "#000000", label: "Black" },
];

function ColorPicker({
  value,
  customColor,
  onChange,
}: {
  value: TextColorToken | undefined;
  customColor: string | undefined;
  onChange: (color: TextColorToken, customColor?: string) => void;
}) {
  const current = value ?? "theme";
  return (
    <div>
      <label className={LABEL_CLS}>Color</label>
      <div className="flex flex-wrap items-center gap-1.5">
        {COLOR_SWATCHES.map((s) => {
          const active = current === s.value;
          return (
            <button
              key={s.value}
              type="button"
              onClick={() => onChange(s.value, undefined)}
              title={s.label}
              className={cn(
                "h-7 w-7 rounded-md border transition-all",
                active
                  ? "border-electric-500 ring-2 ring-electric-500/25"
                  : "border-slate-200 hover:border-slate-300",
              )}
              style={{
                background: s.bg,
                backgroundSize: s.value === "theme" ? "6px 6px" : undefined,
                backgroundPosition:
                  s.value === "theme" ? "0 0, 3px 3px" : undefined,
              }}
              aria-label={s.label}
            />
          );
        })}
        <label
          className={cn(
            "flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border text-[10px] font-semibold",
            current === "custom"
              ? "border-electric-500 ring-2 ring-electric-500/25 text-white"
              : "border-slate-200 text-slate-500 hover:border-slate-300",
          )}
          style={{
            background: current === "custom" ? customColor || "#000" : "#fff",
          }}
          title="Custom color"
        >
          {current !== "custom" && "+"}
          <input
            type="color"
            className="sr-only"
            value={customColor || "#000000"}
            onChange={(e) => onChange("custom", e.target.value)}
          />
        </label>
      </div>
    </div>
  );
}

function AlignPicker({
  value,
  onChange,
}: {
  value: TextAlign | undefined;
  onChange: (v: TextAlign) => void;
}) {
  const current = value ?? "theme";
  const opts: { value: TextAlign; Icon: typeof AlignLeft }[] = [
    { value: "left", Icon: AlignLeft },
    { value: "center", Icon: AlignCenter },
    { value: "right", Icon: AlignRight },
  ];
  return (
    <div>
      <label className={LABEL_CLS}>Align</label>
      <div className={SEG_CLS}>
        {opts.map((o) => {
          const active = current === o.value;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onChange(o.value)}
              className={cn(
                "flex h-7 w-full items-center justify-center rounded-md transition-colors",
                active
                  ? SEG_BTN_ACTIVE_CLS
                  : "text-slate-500 hover:text-slate-900",
              )}
              aria-label={`Align ${o.value}`}
            >
              <o.Icon className="h-3.5 w-3.5" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StyleToggles({
  italic,
  underline,
  onChange,
}: {
  italic: boolean | undefined;
  underline: boolean | undefined;
  onChange: (italic: boolean | undefined, underline: boolean | undefined) => void;
}) {
  return (
    <div>
      <label className={LABEL_CLS}>Style</label>
      <div className={SEG_CLS}>
        <button
          type="button"
          onClick={() => onChange(!italic, underline)}
          className={cn(
            "flex h-7 w-8 items-center justify-center rounded-md transition-colors",
            italic
              ? SEG_BTN_ACTIVE_CLS
              : "text-slate-500 hover:text-slate-900",
          )}
          aria-label="Italic"
          aria-pressed={italic ? "true" : "false"}
        >
          <Italic className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onChange(italic, !underline)}
          className={cn(
            "flex h-7 w-8 items-center justify-center rounded-md transition-colors",
            underline
              ? SEG_BTN_ACTIVE_CLS
              : "text-slate-500 hover:text-slate-900",
          )}
          aria-label="Underline"
          aria-pressed={underline ? "true" : "false"}
        >
          <Underline className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

const LETTER_OPTS: { value: TextLetterSpacing; label: string }[] = [
  { value: "theme", label: "—" },
  { value: "tight", label: "Tight" },
  { value: "normal", label: "Normal" },
  { value: "wide", label: "Wide" },
  { value: "wider", label: "Wider" },
];

function LetterSpacingPicker({
  value,
  onChange,
}: {
  value: TextLetterSpacing | undefined;
  onChange: (v: TextLetterSpacing) => void;
}) {
  const current = value ?? "theme";
  return (
    <div>
      <label className={LABEL_CLS}>Letter spacing</label>
      <div className={SEG_CLS}>
        {LETTER_OPTS.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn(
              SEG_BTN_CLS,
              current === o.value && SEG_BTN_ACTIVE_CLS,
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
