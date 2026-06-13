"use client";

/**
 * LightFAQ — pill-tab category filter + expandable rows.
 *
 * The category tabs are derived from a simple keyword match against
 * each FAQ item's question (Plan/Price/AI/Privacy). When admin
 * eventually wants explicit categories, we add a category field on
 * MarketingFaqItem and tab on that — for now the heuristic ships
 * value with zero migration.
 */

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MarketingFaqItem } from "@/types";

type Tab = "all" | "plans" | "ai" | "privacy" | "general";

const TAB_LABELS: Record<Tab, string> = {
  all: "All",
  plans: "Plans",
  ai: "AI",
  privacy: "Privacy",
  general: "General",
};

function categorize(question: string): Tab {
  const q = question.toLowerCase();
  if (/\b(plan|price|trial|free|pro|team|cancel|billing|card)\b/.test(q))
    return "plans";
  if (/\b(ai|gemini|tagalog|taglish|generate|copy|audit)\b/.test(q))
    return "ai";
  if (/\b(data|safe|privacy|dpa|secure|gdpr)\b/.test(q)) return "privacy";
  return "general";
}

export function LightFAQ({
  title,
  items,
}: {
  title: string;
  items: MarketingFaqItem[];
}) {
  const [tab, setTab] = useState<Tab>("all");
  const [openId, setOpenId] = useState<string | null>(null);

  /* Compute which tabs actually have content + filter the visible
     items to the active tab. Avoids showing tabs with no FAQs. */
  const { visibleTabs, filtered } = useMemo(() => {
    const present = new Set<Tab>();
    for (const item of items) present.add(categorize(item.question));
    const order: Tab[] = ["all", "general", "plans", "ai", "privacy"];
    const visibleTabs = order.filter(
      (t) => t === "all" || present.has(t),
    );
    const filtered =
      tab === "all"
        ? items
        : items.filter((i) => categorize(i.question) === tab);
    return { visibleTabs, filtered };
  }, [items, tab]);

  if (items.length === 0) return null;

  return (
    <section id="faq" className="relative bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-4">
        <div className="text-center">
          <span className="inline-block rounded-full bg-stone-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-700">
            FAQ
          </span>
          <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl lg:text-[2.75rem]">
            {title}
          </h2>
        </div>

        {/* Category pills */}
        {visibleTabs.length > 1 && (
          <div className="mt-10 flex flex-wrap justify-center gap-2">
            {visibleTabs.map((t) => {
              const active = t === tab;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setTab(t);
                    setOpenId(null);
                  }}
                  className={cn(
                    "rounded-full px-4 py-2 text-xs font-semibold transition-all",
                    active
                      ? "bg-electric-500 text-white shadow-[var(--shadow-pill-cta)]"
                      : "bg-stone-100 text-stone-700 hover:bg-stone-200",
                  )}
                >
                  {TAB_LABELS[t]}
                </button>
              );
            })}
          </div>
        )}

        {/* Rows */}
        <div className="mt-8 space-y-2.5">
          {filtered.map((item) => {
            const open = openId === item.id;
            return (
              <div
                key={item.id}
                className={cn(
                  "rounded-2xl transition-all",
                  open
                    ? "border border-stone-100 bg-white shadow-[var(--shadow-card-soft)]"
                    : "bg-stone-100/70",
                )}
              >
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : item.id)}
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                  aria-expanded={open}
                >
                  <p className="text-sm font-semibold text-stone-900 sm:text-base">
                    {item.question}
                  </p>
                  <span
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-transform",
                      open
                        ? "rotate-45 bg-electric-500 text-white"
                        : "bg-white text-stone-700",
                    )}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </span>
                </button>
                {open && (
                  <div className="border-t border-stone-100 px-6 py-5 text-sm leading-relaxed text-stone-700">
                    {item.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <p className="mt-8 text-center text-sm text-stone-500">
          Didn&apos;t find your answer?{" "}
          <a
            href="mailto:support@crediblyai.com"
            className="font-semibold text-electric-500 hover:text-electric-600"
          >
            Contact us →
          </a>
        </p>
      </div>
    </section>
  );
}
