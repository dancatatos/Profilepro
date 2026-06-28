"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AnimatePresence,
  motion,
  Reorder,
  useDragControls,
} from "framer-motion";
import { ChevronDown, GripVertical, Lock, Plus, Trash2 } from "lucide-react";
import { usePlanAccess } from "@/components/providers/PlanProvider";
import { useSections } from "./SectionsContext";
import { SectionEditor } from "./SectionEditor";
import { Switch } from "@/components/ui/Switch";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { SECTION_CATALOG, type SectionMeta } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { ProfileSection } from "@/types";

const FIELD =
  "h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 placeholder:text-slate-300 outline-none focus:border-electric-500/60";

function metaFor(type: ProfileSection["type"]): SectionMeta {
  return (
    SECTION_CATALOG.find((s) => s.type === type) ?? SECTION_CATALOG[0]
  );
}

function SectionCard({ section }: { section: ProfileSection }) {
  const controls = useDragControls();
  const [open, setOpen] = useState(false);
  const { toggleSection, removeSection, updateSection } = useSections();
  const meta = metaFor(section.type);

  return (
    <Reorder.Item
      value={section}
      dragListener={false}
      dragControls={controls}
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
    >
      <div className="flex items-center gap-2 p-2.5">
        <button
          onPointerDown={(e) => controls.start(e)}
          className="cursor-grab touch-none p-1 text-slate-300 active:cursor-grabbing"
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <span
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg",
            section.enabled ? "bg-electric-500/12" : "bg-slate-100",
          )}
        >
          <Icon
            name={meta.icon}
            className={cn(
              "h-4 w-4",
              section.enabled ? "text-electric-600" : "text-slate-300",
            )}
          />
        </span>
        <button
          onClick={() => setOpen((o) => !o)}
          className="min-w-0 flex-1 text-left"
        >
          <p className="truncate text-sm font-medium text-slate-900">
            {section.title || meta.label}
          </p>
          <p className="truncate text-xs text-slate-400">{meta.label}</p>
        </button>
        <Switch
          checked={section.enabled}
          onChange={() => toggleSection(section.id)}
        />
        <button
          onClick={() => setOpen((o) => !o)}
          className="p-1.5 text-slate-400"
          aria-label="Expand"
        >
          <ChevronDown
            className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
          />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="space-y-3 border-t border-slate-200 p-3">
              <input
                value={section.title || ""}
                onChange={(e) =>
                  updateSection(section.id, { title: e.target.value })
                }
                placeholder="Section heading"
                className={FIELD}
              />
              <SectionEditor section={section} />
              <BackgroundEditor
                section={section}
                onChange={(patch) => updateSection(section.id, patch)}
              />
              <button
                onClick={() => removeSection(section.id)}
                className="flex items-center gap-1.5 text-xs font-medium text-red-700"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove section
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Reorder.Item>
  );
}

export function SectionsManager() {
  const { sections, setSections, addSection } = useSections();
  const { hasFeature } = usePlanAccess();
  const [addOpen, setAddOpen] = useState(false);

  /* The only gated section type in this picker is the appointment
     scheduler — name kept as isPro to minimise churn in the JSX below. */
  const isPro = hasFeature("appointments");

  return (
    <div className="space-y-2.5">
      <Reorder.Group
        axis="y"
        values={sections}
        onReorder={setSections}
        className="space-y-2.5"
      >
        {sections.map((section) => (
          <SectionCard key={section.id} section={section} />
        ))}
      </Reorder.Group>

      <button
        onClick={() => setAddOpen(true)}
        className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-slate-300 py-3 text-sm font-medium text-slate-500 hover:border-electric-500/40 hover:text-slate-900"
      >
        <Plus className="h-4 w-4" />
        Add section
      </button>

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add a section"
        description="Pick a block to add to your profile."
      >
        <div className="grid gap-2 pb-2">
          {SECTION_CATALOG.map((s) => {
            /* The Appointment Scheduler is a Pro / Team feature. */
            if (s.type === "appointment" && !isPro) {
              return (
                <Link
                  key={s.type}
                  href="/billing"
                  onClick={() => setAddOpen(false)}
                  className="flex items-center gap-3 rounded-xl border border-gold-400/20 bg-gold-400/[0.04] p-3 text-left transition-colors hover:border-gold-400/45"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-400/12">
                    <Icon name={s.icon} className="h-5 w-5 text-amber-700" />
                  </span>
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-sm font-medium text-slate-900">
                      {s.label}
                      <span className="rounded bg-gold-400/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-700">
                        Pro
                      </span>
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {s.description}
                    </p>
                  </div>
                  <Lock className="ml-auto h-4 w-4 shrink-0 text-amber-700/70" />
                </Link>
              );
            }
            return (
              <button
                key={s.type}
                onClick={() => {
                  addSection(s.type);
                  setAddOpen(false);
                }}
                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-left hover:border-electric-500/40"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-electric-500/12">
                  <Icon name={s.icon} className="h-5 w-5 text-electric-600" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900">{s.label}</p>
                  <p className="truncate text-xs text-slate-500">
                    {s.description}
                  </p>
                </div>
                <Plus className="ml-auto h-4 w-4 text-slate-300" />
              </button>
            );
          })}
        </div>
      </Modal>
    </div>
  );
}

/* ──────────────────────────────────────────
   Per-section background editor

   Collapsible panel at the bottom of every section editor. Owner
   can override the card tile bg AND/OR the section's full-width
   container stripe bg. Two layers because they're independent
   concerns — see SectionShell in ProfileSections.tsx.
────────────────────────────────────────── */

interface BgSwatch {
  value: string;
  label: string;
  swatch: string; /* CSS background for the swatch preview chip. */
}

/* Curated palette — chosen for premium feel + works on most themes.
   "Theme" values map to CSS vars so they track the active theme. */
const BG_SWATCHES: BgSwatch[] = [
  { value: "soft", label: "Soft", swatch: "rgba(120,120,120,0.10)" },
  { value: "subtle", label: "Subtle", swatch: "rgba(120,120,120,0.20)" },
  { value: "accent", label: "Accent", swatch: "linear-gradient(135deg,#2E6BFF,#1A52E0)" },
  { value: "#FFFBEB", label: "Cream", swatch: "#FFFBEB" },
  { value: "#FEF3C7", label: "Butter", swatch: "#FEF3C7" },
  { value: "#FCE7F3", label: "Blush", swatch: "#FCE7F3" },
  { value: "#DBEAFE", label: "Sky", swatch: "#DBEAFE" },
  { value: "#D1FAE5", label: "Mint", swatch: "#D1FAE5" },
  { value: "#EDE9FE", label: "Lavender", swatch: "#EDE9FE" },
  { value: "#1F2937", label: "Ink", swatch: "#1F2937" },
  { value: "#0A0A0A", label: "Black", swatch: "#0A0A0A" },
];

function BackgroundEditor({
  section,
  onChange,
}: {
  section: { cardBg?: string; containerBg?: string };
  onChange: (patch: { cardBg?: string; containerBg?: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const hasOverrides = Boolean(section.cardBg || section.containerBg);

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="h-4 w-4 shrink-0 rounded border border-slate-300"
            style={{
              background:
                section.containerBg
                  ? (BG_SWATCHES.find((s) => s.value === section.containerBg)?.swatch ||
                    section.containerBg)
                  : section.cardBg
                    ? (BG_SWATCHES.find((s) => s.value === section.cardBg)?.swatch ||
                      section.cardBg)
                    : "transparent",
            }}
          />
          <span className="text-xs font-medium text-slate-600">
            Background {hasOverrides && <span className="text-electric-700">· overridden</span>}
          </span>
        </div>
        <span className="text-xs text-slate-500">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="space-y-4 border-t border-slate-200 p-3">
          <BgSwatchRow
            label="Section container (full stripe)"
            hint="Paints a colored band behind the whole section."
            value={section.containerBg}
            onChange={(v) => onChange({ containerBg: v })}
          />
          <BgSwatchRow
            label="Card tile"
            hint="Overrides the card colour for content inside this section."
            value={section.cardBg}
            onChange={(v) => onChange({ cardBg: v })}
          />
          <p className="text-[10px] text-slate-400">
            Text colour auto-flips light or dark for readability based on
            the chosen background.
          </p>
        </div>
      )}
    </div>
  );
}

function BgSwatchRow({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value?: string;
  onChange: (next: string | undefined) => void;
}) {
  const [customMode, setCustomMode] = useState(
    value !== undefined && !BG_SWATCHES.some((s) => s.value === value),
  );

  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className="mt-0.5 text-[10px] text-slate-400">{hint}</p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {/* None button — clears the override. */}
        <button
          type="button"
          onClick={() => {
            onChange(undefined);
            setCustomMode(false);
          }}
          className={cn(
            "rounded-md border px-2 py-1 text-[11px] font-medium",
            !value
              ? "border-electric-500/50 bg-electric-500/15 text-electric-700"
              : "border-slate-200 bg-slate-50 text-slate-500 hover:text-slate-900",
          )}
        >
          None
        </button>
        {BG_SWATCHES.map((sw) => (
          <button
            key={sw.value}
            type="button"
            onClick={() => {
              onChange(sw.value);
              setCustomMode(false);
            }}
            title={sw.label}
            className={cn(
              "h-7 w-7 rounded-md border transition-transform hover:scale-110",
              value === sw.value
                ? "border-electric-500 ring-2 ring-electric-500/30"
                : "border-slate-300",
            )}
            style={{ background: sw.swatch }}
          />
        ))}
        <button
          type="button"
          onClick={() => setCustomMode((v) => !v)}
          className={cn(
            "rounded-md border px-2 py-1 text-[11px] font-medium",
            customMode
              ? "border-electric-500/50 bg-electric-500/15 text-electric-700"
              : "border-slate-200 bg-slate-50 text-slate-500 hover:text-slate-900",
          )}
        >
          Custom
        </button>
      </div>
      {customMode && (
        <div className="mt-2 flex items-center gap-2">
          <input
            type="color"
            value={
              value && value.startsWith("#") && value.length === 7
                ? value
                : "#FFFFFF"
            }
            onChange={(e) => onChange(e.target.value)}
            className="h-9 w-12 cursor-pointer rounded-md border border-slate-200 bg-transparent"
          />
          <input
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value || undefined)}
            placeholder="Any CSS color: #FFB800, rgba(0,0,0,0.5), transparent"
            className={FIELD}
          />
        </div>
      )}
    </div>
  );
}
