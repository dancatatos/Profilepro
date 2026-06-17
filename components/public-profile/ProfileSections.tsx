"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, MessageCircle, Send, Star } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { SocialIcon } from "@/components/ui/SocialIcon";
import { AppointmentBooking, type BookingSubmitFn } from "./AppointmentBooking";
import { PaymentSectionView } from "./PaymentSectionView";
import { RichTextRenderer } from "@/components/ui/RichTextRenderer";
import { CountdownTimer } from "./CountdownTimer";
import { ctaButtonClasses } from "@/lib/theme";
import { cn, isValidEmail, normalizeExternalUrl, toEmbedUrl } from "@/lib/utils";
import type {
  AnalyticsEventType,
  EmbedHtmlSection,
  FaqItem,
  LeadCustomAnswer,
  PaymentMethod,
  ProfileSection,
  VideoEmbed,
} from "@/types";
import type { ThemeConfig } from "@/lib/themes";

export type TrackFn = (type: AnalyticsEventType, target?: string) => void;
/**
 * Lead-form submit handler. The caller persists the lead, plus runs
 * any default post-save behavior (in funnels, auto-advance to the
 * next step). Pass `options.skipAdvance: true` when the calling
 * section opts into a custom post-submit action ("url" / "stay")
 * and you want to suppress the funnel auto-advance.
 */
export type LeadSubmitFn = (
  data: {
    name: string;
    email?: string;
    phone?: string;
    source: string;
    /**
     * Snapshots of the answers to any custom Lead Capture questions
     * the visitor filled in. Empty / absent when the form had no
     * custom questions or the visitor left them blank.
     */
    customAnswers?: LeadCustomAnswer[];
  },
  options?: { skipAdvance?: boolean },
) => Promise<void> | void;

interface RendererProps {
  section: ProfileSection;
  themeConfig: ThemeConfig;
  track: TrackFn;
  onLead: LeadSubmitFn;
  onBook: BookingSubmitFn;
  profileId: string;
  /**
   * Profile owner's uid + payment methods. Needed by the PaymentSection
   * viewer to scope receipt uploads to the right Firebase Storage path
   * and to display the right GCash / Maya / bank accounts. Optional so
   * existing callers that don't render payment sections still work.
   */
  ownerId?: string;
  paymentMethods?: PaymentMethod[];
  /** Where the section is rendered — funnel slug or "profile". */
  source?: string;
  /**
   * Funnel-only: advance to the next step. Passed by FunnelView so that
   * CTAButtons with action="next", PricingCard CTAs with ctaAction="next",
   * and LeadCapture sections with postSubmitAction="next" can navigate.
   * On the public profile (non-funnel) context this is undefined and
   * the "next" action gracefully falls back to "do nothing".
   */
  onAdvance?: () => void;
}

/* ──────────────────────────────────────────
   Theme-aware style helpers
────────────────────────────────────────── */

const V = {
  text: { color: "var(--tp-text)" } as React.CSSProperties,
  text2: { color: "var(--tp-text2)" } as React.CSSProperties,
  text3: { color: "var(--tp-text3)" } as React.CSSProperties,
  accent: { color: "var(--tp-accent)" } as React.CSSProperties,
  card: {
    background: "var(--tp-card)",
    border: "1px solid var(--tp-border)",
    borderRadius: "var(--tp-card-radius)",
    boxShadow: "var(--tp-shadow)",
  } as React.CSSProperties,
  btn: {
    background: "var(--tp-btn)",
    color: "var(--tp-btn-text)",
    borderRadius: "var(--tp-btn-radius)",
    border: "1px solid var(--tp-btn-border)",
  } as React.CSSProperties,
  social: {
    background: "var(--tp-social-bg)",
    border: "1px solid var(--tp-social-border)",
  } as React.CSSProperties,
  input: {
    background: "var(--tp-input-bg)",
    border: "1px solid var(--tp-input-border)",
    color: "var(--tp-text)",
  } as React.CSSProperties,
};

/* ──────────────────────────────────────────
   Section shell
────────────────────────────────────────── */

/* ──────────────────────────────────────────
   Per-section background overrides

   - Curated swatches are hardcoded clean colors that look on-brand
     on most themes. Each maps to a specific hex/rgba value so we
     can compute readable text colour against it client-side.
   - Custom values are passed through as-is (must be a valid CSS
     color).
   - When either cardBg or containerBg is set we compute the
     resolved bg's luminance and override --tp-text + --tp-text2 +
     --tp-text3 on the section wrapper so text auto-flips dark/light
     for readability. CSS variable cascade handles all child cards.
────────────────────────────────────────── */

const CURATED_BG_SWATCHES: Record<string, string> = {
  /* Light, neutral panels — work on any theme. */
  soft: "rgba(0,0,0,0.04)",
  subtle: "rgba(0,0,0,0.08)",
  /* Theme-tied (CSS var so it tracks theme changes). */
  accent: "var(--tp-accent)",
  inverse: "var(--tp-text)",
};

function resolveBgValue(value?: string): string | undefined {
  if (!value) return undefined;
  if (CURATED_BG_SWATCHES[value]) return CURATED_BG_SWATCHES[value];
  return value;
}

/* Lightweight client-side luminance check. Accepts hex (#FFB800),
   short hex (#FB0), or rgb(a) strings. Returns null for CSS vars or
   anything unparseable — caller skips text auto-flip in that case
   (the curated CSS-var swatches like "accent" + "inverse" rely on
   the renderer's pre-set text colours instead). */
function luminanceOf(color: string): number | null {
  const c = color.trim();
  let r = 0, g = 0, b = 0;
  if (c.startsWith("#")) {
    let hex = c.slice(1);
    if (hex.length === 3) hex = hex.split("").map((h) => h + h).join("");
    if (hex.length !== 6) return null;
    r = parseInt(hex.slice(0, 2), 16);
    g = parseInt(hex.slice(2, 4), 16);
    b = parseInt(hex.slice(4, 6), 16);
  } else if (c.startsWith("rgb")) {
    const nums = c.match(/[\d.]+/g);
    if (!nums || nums.length < 3) return null;
    r = Number(nums[0]); g = Number(nums[1]); b = Number(nums[2]);
  } else {
    return null;
  }
  /* Relative luminance per WCAG. Returns 0..1. */
  const norm = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * norm[0] + 0.7152 * norm[1] + 0.0722 * norm[2];
}

function SectionShell({
  title,
  children,
  narrow,
  section,
}: {
  title?: string;
  children: React.ReactNode;
  /** Cap section to a readable/form-friendly width on wider containers. */
  narrow?: "md" | "2xl";
  /** Section data — used to read optional cardBg/containerBg overrides. */
  section?: { cardBg?: string; containerBg?: string };
}) {
  const narrowCls =
    narrow === "md"
      ? "mx-auto max-w-md"
      : narrow === "2xl"
        ? "mx-auto max-w-2xl"
        : "";

  const resolvedCardBg = resolveBgValue(section?.cardBg);
  const resolvedContainerBg = resolveBgValue(section?.containerBg);

  /* Auto-flip text colour for readability whenever EITHER bg is set.
     containerBg takes priority because the title sits on it. Curated
     CSS-var swatches return null from luminanceOf → we leave the
     theme's text colour alone for those (they're designed to remain
     readable against the theme). */
  const bgForLuminance = resolvedContainerBg ?? resolvedCardBg;
  const lum = bgForLuminance ? luminanceOf(bgForLuminance) : null;
  const cssVars: Record<string, string> = {};
  if (resolvedCardBg) cssVars["--tp-card"] = resolvedCardBg;
  if (lum !== null) {
    const isDarkBg = lum < 0.5;
    cssVars["--tp-text"] = isDarkBg ? "#FFFFFF" : "#0A0A0A";
    cssVars["--tp-text2"] = isDarkBg
      ? "rgba(255,255,255,0.78)"
      : "rgba(10,10,10,0.78)";
    cssVars["--tp-text3"] = isDarkBg
      ? "rgba(255,255,255,0.50)"
      : "rgba(10,10,10,0.55)";
  }

  const titleNode = title ? (
    <div className="mb-3 flex items-center gap-2">
      <span
        className="h-3.5 w-1 rounded-full"
        style={{ background: "var(--tp-marker)" }}
      />
      <h2
        className="font-display text-sm font-bold uppercase tracking-wide"
        style={{ color: "var(--tp-text3)" }}
      >
        {title}
      </h2>
    </div>
  ) : null;

  /* containerBg paints a full-width stripe behind the section. To do
     it cleanly we escape the parent's px-4 / lg:px-6 padding with
     negative margins, then add the same padding back on the inside
     so child content keeps its alignment. */
  if (resolvedContainerBg) {
    return (
      <section
        className={cn(
          "-mx-4 px-4 py-5 lg:-mx-6 lg:px-6 lg:py-7",
          narrowCls,
        )}
        style={{ ...cssVars, background: resolvedContainerBg }}
      >
        {titleNode}
        {children}
      </section>
    );
  }

  /* No containerBg → keep the original transparent-section behaviour
     but still apply cardBg if set (via the cascaded CSS var). */
  return (
    <section
      className={narrowCls || undefined}
      style={Object.keys(cssVars).length > 0 ? cssVars : undefined}
    >
      {titleNode}
      {children}
    </section>
  );
}

/* ──────────────────────────────────────────
   Lead capture form
────────────────────────────────────────── */

function LeadForm({
  section,
  track,
  onLead,
}: {
  section: Extract<ProfileSection, { type: "leadCapture" }>;
  track: TrackFn;
  onLead: LeadSubmitFn;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  /* Per-question answer state, keyed by question id. Only enabled
     questions appear on the form; the rest are skipped at render. */
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const activeQuestions = (section.questions ?? []).filter((q) => q.enabled);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (section.fields.includes("name") && name.trim().length < 2)
      return setError("Please enter your name.");
    if (section.fields.includes("email") && !isValidEmail(email))
      return setError("Please enter a valid email.");

    /* Snapshot the question text alongside the answer so renaming the
       question in the editor later doesn't lose context for this lead. */
    const customAnswers: LeadCustomAnswer[] = activeQuestions
      .map((q) => ({
        questionId: q.id,
        question: q.question,
        answer: (answers[q.id] ?? "").trim(),
      }))
      .filter((a) => a.answer.length > 0);

    setBusy(true);
    try {
      await onLead({
        name: name.trim(),
        email,
        phone,
        source: section.id,
        ...(customAnswers.length > 0 ? { customAnswers } : {}),
      });
      track("lead_submit", section.id);
      setDone(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const channels = [
    { url: section.channels.messengerUrl, label: "Messenger", icon: <MessageCircle className="h-4 w-4" /> },
    { url: section.channels.whatsappUrl, label: "WhatsApp", icon: <MessageCircle className="h-4 w-4" /> },
    { url: section.channels.telegramUrl, label: "Telegram", icon: <Send className="h-4 w-4" /> },
  ].filter((c) => c.url);

  return (
    <div className="rounded-2xl p-4" style={V.card}>
      <p className="font-display text-base font-semibold" style={V.text}>
        {section.headline}
      </p>
      {section.subtext && (
        <p className="mt-1 text-xs" style={V.text3}>
          {section.subtext}
        </p>
      )}

      {done ? (
        <div
          className="mt-3 rounded-xl p-3 text-center text-sm"
          style={{ background: "var(--tp-success-bg)", color: "var(--tp-success-text)" }}
        >
          Thanks! Your details were sent. ✓
        </div>
      ) : (
        <form onSubmit={submit} className="mt-3 space-y-2.5">
          {section.fields.includes("name") && (
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="h-11 w-full rounded-xl px-3.5 text-sm outline-none placeholder:opacity-40"
              style={V.input}
            />
          )}
          {section.fields.includes("email") && (
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Your email"
              className="h-11 w-full rounded-xl px-3.5 text-sm outline-none placeholder:opacity-40"
              style={V.input}
            />
          )}
          {section.fields.includes("phone") && (
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Your phone / mobile"
              className="h-11 w-full rounded-xl px-3.5 text-sm outline-none placeholder:opacity-40"
              style={V.input}
            />
          )}
          {activeQuestions.map((q) => (
            <div key={q.id} className="space-y-1.5">
              <label
                className="block text-xs font-medium"
                style={V.text2}
              >
                {q.question}
              </label>
              <textarea
                value={answers[q.id] ?? ""}
                onChange={(e) =>
                  setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                }
                rows={3}
                className="min-h-[72px] w-full rounded-xl px-3.5 py-2.5 text-sm outline-none placeholder:opacity-40"
                style={V.input}
              />
            </div>
          ))}
          {error && (
            <p className="text-xs text-red-400">{error}</p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="tp-btn-el h-11 w-full text-sm font-semibold disabled:opacity-60 transition-opacity"
            style={V.btn}
          >
            {busy ? "Sending…" : "Send my details"}
          </button>
        </form>
      )}

      {channels.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {channels.map((c) => (
            <a
              key={c.label}
              href={normalizeExternalUrl(c.url)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track("cta_click", `chat-${c.label}`)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-medium transition-opacity active:opacity-70"
              style={{ ...V.card, ...V.text2 }}
            >
              {c.icon}
              {c.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────
   Embedded HTML — sandboxed iframe with optional
   auto-resize so the embed flows with the page
   instead of looking like a boxed iframe.
────────────────────────────────────────── */

function EmbedHtmlView({ section }: { section: EmbedHtmlSection }) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  /* Stable per-instance id used to filter postMessage events so two
     embeds on the same page can't trigger each other's resize. */
  const channelId = useId();
  /* Auto mode tracks the iframe's content height live via postMessage.
     Initial value 0 = "haven't measured yet" — we hide the iframe in
     auto mode until the first measurement to avoid a 0px flash. */
  const [autoHeight, setAutoHeight] = useState<number>(0);

  const html = (section.html || "").trim();
  const mode: NonNullable<EmbedHtmlSection["height"]> =
    section.height ?? "md"; /* Existing embeds with no field stay at md. */
  const isAuto = mode === "auto";

  /* Fixed height presets — used when mode is sm/md/lg/xl. */
  const fixedHeight =
    mode === "sm"
      ? 320
      : mode === "lg"
        ? 720
        : mode === "xl"
          ? 1000
          : 480;

  /* Listen for resize messages from the iframe and update height. */
  useEffect(() => {
    if (!isAuto) return;
    const onMessage = (e: MessageEvent) => {
      /* Only accept messages tagged with our channel id. Iframe is
         sandboxed without allow-same-origin so e.origin is "null" —
         we can't filter by origin, but the channelId tag prevents
         cross-embed interference. */
      const data = e.data as { _credibly?: string; height?: number } | null;
      if (!data || data._credibly !== channelId) return;
      const h = Math.max(0, Math.floor(Number(data.height) || 0));
      if (h > 0) setAutoHeight(h);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [isAuto, channelId]);

  if (!html) return null;

  /* Wrap the user's snippet in a minimal HTML doc. In auto mode we
     also inject a tiny script that uses ResizeObserver to post the
     content height to the parent on every resize. The script is
     placed FIRST so it's installed before the user's HTML runs and
     any `</body>` in their pasted code can't break us out. */
  const autoScript = isAuto
    ? `<script>(function(){var id=${JSON.stringify(channelId)};function send(){var h=Math.max(document.documentElement.scrollHeight,document.body?document.body.scrollHeight:0);parent.postMessage({_credibly:id,height:h},'*')}if(document.body){send()}else{document.addEventListener('DOMContentLoaded',send)}window.addEventListener('load',send);try{var ro=new ResizeObserver(send);ro.observe(document.documentElement);if(document.body)ro.observe(document.body);}catch(e){}setInterval(send,1500)})();</script>`
    : "";

  /* Drop body padding in auto mode so the embed truly flows; keep
     small inset in fixed-height mode to mimic the original card
     framing. */
  const bodyPadding = isAuto ? "0" : "8px";

  const srcdoc = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><base target="_blank"><style>html,body{margin:0;padding:0;background:transparent;color:inherit;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif}body{padding:${bodyPadding}}*{box-sizing:border-box;max-width:100%}</style>${autoScript}</head><body>${html}</body></html>`;

  /* Auto mode: iframe height grows to autoHeight. While waiting for
     first measurement, use a minimum 40px to prevent layout shift.
     Fixed mode: original look — card bg + radius + fixed height. */
  const iframeStyle: React.CSSProperties = isAuto
    ? {
        width: "100%",
        height: `${autoHeight || 40}px`,
        border: 0,
        background: "transparent",
        display: "block",
        opacity: autoHeight > 0 ? 1 : 0,
        transition: "opacity 180ms ease",
      }
    : {
        width: "100%",
        height: `${fixedHeight}px`,
        border: 0,
        borderRadius: "var(--tp-card-radius)",
        background: "var(--tp-card)",
      };

  return (
    <>
      <iframe
        ref={iframeRef}
        srcDoc={srcdoc}
        sandbox="allow-scripts allow-popups allow-forms allow-popups-to-escape-sandbox"
        referrerPolicy="no-referrer"
        loading="lazy"
        style={iframeStyle}
        title={section.title || "Embedded content"}
      />
      {section.caption && (
        <p
          className="mt-2 text-center text-xs"
          style={{ color: "var(--tp-muted)" }}
        >
          {section.caption}
        </p>
      )}
    </>
  );
}

/* ──────────────────────────────────────────
   FAQ accordion
────────────────────────────────────────── */

function FaqList({ items }: { items: FaqItem[] }) {
  const [openId, setOpenId] = useState<string | null>(items[0]?.id ?? null);
  return (
    <div className="space-y-2">
      {items.map((it) => {
        const isOpen = openId === it.id;
        return (
          <div key={it.id} className="overflow-hidden" style={V.card}>
            <button
              type="button"
              onClick={() => setOpenId(isOpen ? null : it.id)}
              className="flex w-full items-center justify-between gap-3 p-4 text-left"
            >
              <p className="text-sm font-medium" style={V.text}>
                {it.question}
              </p>
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 transition-transform",
                  isOpen && "rotate-180",
                )}
                style={V.text3}
              />
            </button>
            {isOpen && (
              <p
                className="whitespace-pre-line px-4 pb-4 text-sm leading-relaxed"
                style={V.text2}
              >
                {it.answer}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ──────────────────────────────────────────
   Section renderer
────────────────────────────────────────── */

export function SectionRenderer({
  section,
  track,
  onLead,
  onBook,
  profileId,
  ownerId,
  paymentMethods,
  source,
  onAdvance,
}: RendererProps) {
  switch (section.type) {
    case "cta": {
      /* "stretch" (the original) keeps buttons full-width. The three
         positional values size the button to its content and pin it
         to that horizontal edge. Wrapper changes layout direction
         accordingly so buttons don't fight each other. */
      const align = section.align ?? "stretch";
      const wrapperClass =
        align === "stretch"
          ? "space-y-2.5"
          : cn(
              "flex flex-col gap-2.5",
              align === "left" && "items-start",
              align === "center" && "items-center",
              align === "right" && "items-end",
            );
      return (
        <SectionShell title={section.title} narrow="md" section={section}>
          <div className={wrapperClass}>
            {section.buttons.map((b) => {
              /* Default to "url" for buttons created before the action
                 field existed. Honor the three explicit modes otherwise. */
              const action: "url" | "next" | "none" = b.action ?? "url";
              const baseClasses = cn(
                "flex items-center justify-center gap-2 px-5 py-4 text-sm font-semibold shadow-card transition-transform active:scale-[0.98]",
                ctaButtonClasses(b),
              );
              const baseStyle = {
                borderRadius: "var(--tp-btn-radius)",
              };

              /* "url" → render as anchor so visitors can still
                 right-click / long-press to copy the link. */
              if (action === "url") {
                return (
                  <a
                    key={b.id}
                    href={normalizeExternalUrl(b.url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => track("cta_click", b.id)}
                    className={baseClasses}
                    style={baseStyle}
                  >
                    <Icon name={b.icon} className="h-4 w-4" />
                    {b.label}
                  </a>
                );
              }

              /* "next" → advance funnel if available, else do nothing.
                 "none" → just log the click. Both render as buttons. */
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => {
                    track("cta_click", b.id);
                    if (action === "next" && onAdvance) onAdvance();
                  }}
                  className={baseClasses}
                  style={baseStyle}
                >
                  <Icon name={b.icon} className="h-4 w-4" />
                  {b.label}
                </button>
              );
            })}
          </div>
        </SectionShell>
      );
    }

    case "socials":
      return (
        <SectionShell title={section.title} section={section}>
          <div className="flex flex-wrap justify-center gap-3">
            {section.links.map((l) => (
              <a
                key={l.id}
                href={normalizeExternalUrl(l.url)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => track("social_click", l.platform)}
                className="flex h-12 w-12 items-center justify-center rounded-full transition-transform active:scale-95"
                style={V.social}
              >
                <SocialIcon
                  platform={l.platform}
                  className="h-5 w-5"
                  style={{ color: "var(--tp-text)" }}
                />
              </a>
            ))}
          </div>
        </SectionShell>
      );

    case "about":
      return (
        <SectionShell title={section.title} narrow="2xl" section={section}>
          <p
            className="whitespace-pre-line text-sm leading-relaxed"
            style={V.text2}
          >
            {section.body}
          </p>
        </SectionShell>
      );

    case "text":
      return (
        <SectionShell title={section.title} narrow="2xl" section={section}>
          <div className="text-sm leading-relaxed" style={V.text2}>
            <RichTextRenderer doc={section.doc} />
          </div>
        </SectionShell>
      );

    case "countdown":
      return (
        <SectionShell title={section.title} section={section}>
          <div className="p-4 text-center" style={V.card}>
            {section.headline && (
              <p className="mb-3 text-sm font-medium" style={V.text2}>
                {section.headline}
              </p>
            )}
            <CountdownTimer
              targetIso={section.targetIso}
              expiredText={section.expiredText}
            />
          </div>
        </SectionShell>
      );

    case "hero": {
      /* Existing heroes (no layout field) keep their stacked card look.
         New heroes default to "overlay" — image full-bleed with text
         on top, or pure full-bleed image when text fields are empty. */
      const layout = section.layout ?? "stacked";

      if (layout === "stacked") {
        return (
          <SectionShell title={section.title} section={section}>
            <div
              className="overflow-hidden"
              style={{ ...V.card, padding: 0 }}
            >
              {section.backgroundUrl && (
                <div
                  className="aspect-[16/9] bg-cover bg-center"
                  style={{ backgroundImage: `url("${section.backgroundUrl}")` }}
                />
              )}
              <div className="px-5 py-6 text-center">
                <h2
                  className="font-display text-2xl font-bold leading-tight"
                  style={V.text}
                >
                  {section.headline}
                </h2>
                {section.subtext && (
                  <p
                    className="mt-2 text-sm leading-relaxed"
                    style={V.text2}
                  >
                    {section.subtext}
                  </p>
                )}
              </div>
            </div>
          </SectionShell>
        );
      }

      /* ── Overlay layout ────────────────────────────────────────
         Image is full-bleed inside the section shell with optional
         gradient overlay + headline / subhead / CTA layered on top.
         When all three text fields + CTA are empty, renders as a
         clean image-only block — user's "no headline = full-bleed
         image" shortcut. */
      const aspect = section.aspectRatio ?? "16:9";
      const aspectClass =
        aspect === "16:9"
          ? "aspect-video"
          : aspect === "4:3"
            ? "aspect-[4/3]"
            : aspect === "1:1"
              ? "aspect-square"
              : aspect === "21:9"
                ? "aspect-[21/9]"
                : "aspect-[3/4]";

      const overlayLevel = section.overlay ?? "medium";
      const overlayGradient =
        overlayLevel === "none"
          ? null
          : overlayLevel === "light"
            ? "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.25) 100%)"
            : overlayLevel === "medium"
              ? "linear-gradient(180deg, rgba(0,0,0,0.10) 0%, rgba(0,0,0,0.55) 100%)"
              : "linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.78) 100%)";

      const align = section.align ?? "cc";
      /* 9-position grid as Tailwind flex utilities. */
      const verticalCls =
        align.startsWith("t")
          ? "items-start"
          : align.startsWith("b")
            ? "items-end"
            : "items-center";
      const horizontalCls =
        align.endsWith("l")
          ? "justify-start text-left"
          : align.endsWith("r")
            ? "justify-end text-right"
            : "justify-center text-center";

      const isLight = (section.textColor ?? "light") === "light";
      const textCol = isLight ? "#FFFFFF" : "#0A0A0A";
      const textShadow = isLight
        ? "0 2px 18px rgba(0,0,0,0.55)"
        : "0 1px 12px rgba(255,255,255,0.45)";

      const hasContent = Boolean(
        section.headline?.trim() ||
          section.subtext?.trim() ||
          section.ctaLabel?.trim(),
      );

      return (
        <SectionShell title={section.title} section={section}>
          <div
            className={cn(
              "relative -mx-4 overflow-hidden sm:mx-0",
              aspectClass,
            )}
            style={{
              backgroundImage: section.backgroundUrl
                ? `url("${section.backgroundUrl}")`
                : undefined,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundColor: section.backgroundUrl
                ? undefined
                : "var(--tp-card)",
              borderRadius: "var(--tp-card-radius)",
            }}
          >
            {hasContent && overlayGradient && (
              <div
                aria-hidden
                className="absolute inset-0"
                style={{ background: overlayGradient }}
              />
            )}
            {hasContent && (
              <div
                className={cn(
                  "absolute inset-0 flex flex-col gap-3 p-6 sm:p-10",
                  verticalCls,
                  horizontalCls,
                )}
              >
                <div className={cn("max-w-2xl", horizontalCls.includes("text-center") && "mx-auto")}>
                  {section.headline?.trim() && (
                    <h2
                      className="font-display text-3xl font-bold leading-[1.1] sm:text-4xl lg:text-5xl"
                      style={{ color: textCol, textShadow }}
                    >
                      {section.headline}
                    </h2>
                  )}
                  {section.subtext?.trim() && (
                    <p
                      className="mt-3 text-sm leading-relaxed sm:text-base"
                      style={{ color: textCol, textShadow, opacity: 0.92 }}
                    >
                      {section.subtext}
                    </p>
                  )}
                  {section.ctaLabel?.trim() && section.ctaUrl?.trim() && (
                    <a
                      href={normalizeExternalUrl(section.ctaUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => track("cta_click", `hero-${section.id}`)}
                      className="mt-5 inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold transition-transform active:scale-[0.98]"
                      style={V.btn}
                    >
                      {section.ctaLabel}
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </SectionShell>
      );
    }

    case "cover": {
      /* Cover — full container-width image background with optional
         text overlay. No viewport-escape tricks (those broke things
         last time); just spans 100% of the funnel/profile container
         width at every breakpoint. Aspect ratio drives the height.
         Responsive by definition because the container itself caps
         per breakpoint (mobile=md, tablet=2xl, desktop=5xl).
         If imageUrl + all text fields are empty, renders a soft
         placeholder so the editor preview doesn't look broken. */
      const aspect = section.aspectRatio ?? "16:9";
      const aspectClass =
        aspect === "16:9"
          ? "aspect-video"
          : aspect === "4:3"
            ? "aspect-[4/3]"
            : aspect === "1:1"
              ? "aspect-square"
              : aspect === "21:9"
                ? "aspect-[21/9]"
                : "aspect-[3/4]";

      const overlayLevel = section.overlay ?? "medium";
      const overlayGradient =
        overlayLevel === "none"
          ? null
          : overlayLevel === "light"
            ? "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.25) 100%)"
            : overlayLevel === "medium"
              ? "linear-gradient(180deg, rgba(0,0,0,0.10) 0%, rgba(0,0,0,0.55) 100%)"
              : "linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.78) 100%)";

      const align = section.align ?? "cc";
      const verticalCls =
        align.startsWith("t")
          ? "items-start"
          : align.startsWith("b")
            ? "items-end"
            : "items-center";
      const horizontalCls =
        align.endsWith("l")
          ? "justify-start text-left"
          : align.endsWith("r")
            ? "justify-end text-right"
            : "justify-center text-center";

      const isLight = (section.textColor ?? "light") === "light";
      const textCol = isLight ? "#FFFFFF" : "#0A0A0A";
      const textShadow = isLight
        ? "0 2px 18px rgba(0,0,0,0.55)"
        : "0 1px 12px rgba(255,255,255,0.45)";

      const hasContent = Boolean(
        section.headline?.trim() ||
          section.subhead?.trim() ||
          section.ctaLabel?.trim(),
      );

      return (
        <SectionShell title={section.title} section={section}>
          <div
            className={cn("relative overflow-hidden", aspectClass)}
            style={{
              /* Full-viewport breakout: width: 100vw + symmetric
                 negative margins anchor the element to the viewport
                 regardless of how narrow the parent container is. The
                 parent route (PublicProfileView / FunnelView) sets
                 overflow-x: clip so the 100vw doesn't trigger a
                 horizontal scrollbar (vw includes scrollbar width on
                 desktop). Scoped to just those routes — body is left
                 alone so the rest of the app is unaffected. */
              width: "100vw",
              marginLeft: "calc(50% - 50vw)",
              marginRight: "calc(50% - 50vw)",
              backgroundImage: section.imageUrl
                ? `url("${section.imageUrl}")`
                : undefined,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundColor: section.imageUrl
                ? undefined
                : "var(--tp-card)",
            }}
          >
            {!section.imageUrl && !hasContent && (
              <div
                className="absolute inset-0 flex items-center justify-center text-xs opacity-50"
                style={V.text3}
              >
                Cover — add an image in the editor
              </div>
            )}
            {hasContent && overlayGradient && section.imageUrl && (
              <div
                aria-hidden
                className="absolute inset-0"
                style={{ background: overlayGradient }}
              />
            )}
            {hasContent && (
              <div
                className={cn(
                  "absolute inset-0 flex flex-col gap-3 p-6 sm:p-10",
                  verticalCls,
                  horizontalCls,
                )}
              >
                <div
                  className={cn(
                    "max-w-2xl",
                    horizontalCls.includes("text-center") && "mx-auto",
                  )}
                >
                  {section.headline?.trim() && (
                    <h2
                      className="font-display text-3xl font-bold leading-[1.1] sm:text-4xl lg:text-5xl"
                      style={{ color: textCol, textShadow }}
                    >
                      {section.headline}
                    </h2>
                  )}
                  {section.subhead?.trim() && (
                    <p
                      className="mt-3 text-sm leading-relaxed sm:text-base"
                      style={{ color: textCol, textShadow, opacity: 0.92 }}
                    >
                      {section.subhead}
                    </p>
                  )}
                  {section.ctaLabel?.trim() && section.ctaUrl?.trim() && (
                    <a
                      href={normalizeExternalUrl(section.ctaUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => track("cta_click", `cover-${section.id}`)}
                      className="mt-5 inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold transition-transform active:scale-[0.98]"
                      style={V.btn}
                    >
                      {section.ctaLabel}
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </SectionShell>
      );
    }

    case "benefits":
      return (
        <SectionShell title={section.title} section={section}>
          <div className="grid gap-2.5 @xl:grid-cols-2 @3xl:grid-cols-3">
            {section.items.map((it) => (
              <div
                key={it.id}
                className="flex items-start gap-3 p-3.5"
                style={V.card}
              >
                <Icon
                  name={it.icon || "Check"}
                  className="h-5 w-5 shrink-0"
                  style={{ color: "var(--tp-accent)" }}
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold" style={V.text}>
                    {it.title}
                  </p>
                  {it.detail && (
                    <p className="mt-0.5 text-xs" style={V.text3}>
                      {it.detail}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </SectionShell>
      );

    case "faq":
      return (
        <SectionShell title={section.title} narrow="2xl" section={section}>
          <FaqList items={section.items} />
        </SectionShell>
      );

    case "pricingCard":
      return (
        <SectionShell title={section.title} narrow="md" section={section}>
          <div className="overflow-hidden p-5" style={V.card}>
            <p
              className="text-center font-display text-base font-semibold"
              style={V.text}
            >
              {section.headline}
            </p>
            <div className="my-3 flex items-baseline justify-center gap-2">
              <span
                className="font-display text-3xl font-bold"
                style={V.text}
              >
                {section.price}
              </span>
              {section.priceNote && (
                <span className="text-xs" style={V.text3}>
                  · {section.priceNote}
                </span>
              )}
            </div>
            {section.features.length > 0 && (
              <ul className="my-4 space-y-2">
                {section.features.map((f) => (
                  <li
                    key={f.id}
                    className="flex items-start gap-2 text-sm"
                    style={V.text2}
                  >
                    <Check
                      className="mt-0.5 h-4 w-4 shrink-0"
                      style={{ color: "var(--tp-accent)" }}
                    />
                    <span>{f.text}</span>
                  </li>
                ))}
              </ul>
            )}
            {section.ctaLabel && (() => {
              const action: "url" | "next" | "none" = section.ctaAction ?? "url";
              const btnClasses =
                "tp-btn-el block w-full px-5 py-3.5 text-center text-sm font-semibold transition-transform active:scale-[0.98]";
              const btnStyle = {
                background: "var(--tp-btn)",
                color: "var(--tp-btn-text)",
                borderRadius: "var(--tp-btn-radius)",
                border: "1px solid var(--tp-btn-border)",
              };
              if (action === "url") {
                return (
                  <a
                    href={normalizeExternalUrl(section.ctaUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => track("cta_click", `pricing-${section.id}`)}
                    className={btnClasses}
                    style={btnStyle}
                  >
                    {section.ctaLabel}
                  </a>
                );
              }
              return (
                <button
                  type="button"
                  onClick={() => {
                    track("cta_click", `pricing-${section.id}`);
                    if (action === "next" && onAdvance) onAdvance();
                  }}
                  className={btnClasses}
                  style={btnStyle}
                >
                  {section.ctaLabel}
                </button>
              );
            })()}
          </div>
        </SectionShell>
      );

    case "credibility":
      return (
        <SectionShell title={section.title} section={section}>
          <div className="grid grid-cols-2 gap-2.5 @2xl:grid-cols-3 @3xl:grid-cols-4">
            {section.items.map((it) => (
              <div key={it.id} className="p-3.5" style={V.card}>
                <Icon
                  name={it.icon}
                  className="h-5 w-5"
                  style={{ color: "var(--tp-accent)" }}
                />
                <p
                  className="mt-2 text-sm font-semibold leading-snug"
                  style={V.text}
                >
                  {it.title}
                </p>
                {it.subtitle && (
                  <p className="mt-0.5 text-[11px]" style={V.text3}>
                    {it.subtitle}
                  </p>
                )}
              </div>
            ))}
          </div>
        </SectionShell>
      );

    case "testimonials":
      return (
        <SectionShell title={section.title} section={section}>
          <div className="grid gap-2.5 @xl:grid-cols-2 @3xl:grid-cols-3">
            {section.testimonials.map((t) => (
              /* min-w-0 + overflow-hidden so the card can never grow
                 past its grid cell — long author names / unbroken
                 quote text don't push the layout horizontally and
                 cut off content on mobile. */
              <div
                key={t.id}
                className="min-w-0 overflow-hidden p-4"
                style={V.card}
              >
                {t.kind === "image" && t.mediaUrl && (
                  <img
                    src={t.mediaUrl}
                    alt={t.authorName}
                    className="mb-3 w-full rounded-xl object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                )}
                {/* Author header — avatar + name + role on top, the
                    classic testimonial layout. Avatar is optional;
                    rendered as a circular ringed photo OR initials
                    fallback if the owner didn't upload one. */}
                <div className="mb-3 flex items-center gap-3">
                  {t.authorAvatarUrl ? (
                    <img
                      src={t.authorAvatarUrl}
                      alt={t.authorName}
                      className="h-12 w-12 shrink-0 rounded-full object-cover ring-2"
                      style={{
                        borderColor: "var(--tp-accent)",
                        // ring-2 uses the ring color; set via boxShadow
                        // for theme awareness.
                        boxShadow: "0 0 0 2px var(--tp-accent)",
                      }}
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <span
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
                      style={{
                        background: "var(--tp-social-bg)",
                        color: "var(--tp-text2)",
                        boxShadow: "0 0 0 2px var(--tp-accent)",
                      }}
                    >
                      {t.authorName
                        .trim()
                        .split(/\s+/)
                        .map((w) => w[0] ?? "")
                        .slice(0, 2)
                        .join("")
                        .toUpperCase() || "?"}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p
                      className="truncate text-sm font-semibold"
                      style={V.text}
                    >
                      {t.authorName}
                    </p>
                    {t.authorRole && (
                      <p className="truncate text-xs" style={V.text3}>
                        {t.authorRole}
                      </p>
                    )}
                  </div>
                </div>
                {typeof t.rating === "number" && (
                  <div className="mb-1.5 flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          "h-3.5 w-3.5",
                          i < (t.rating ?? 0)
                            ? "fill-current"
                            : "opacity-20",
                        )}
                        style={
                          i < (t.rating ?? 0)
                            ? { color: "var(--tp-accent)" }
                            : { color: "var(--tp-text3)" }
                        }
                      />
                    ))}
                  </div>
                )}
                {t.quote && (
                  <p
                    className="break-words text-sm leading-relaxed"
                    style={V.text2}
                  >
                    &ldquo;{t.quote}&rdquo;
                  </p>
                )}
              </div>
            ))}
          </div>
        </SectionShell>
      );

    case "products":
      /* Showcase layout: hero image on top, title + description
         centered, pill-style CTA at the bottom. Replaces the older
         horizontal image+text+link card. Image is set to aspect-[4/5]
         (portrait-leaning) which works for product photos, lifestyle
         shots, course covers — the screenshot reference style. */
      return (
        <SectionShell title={section.title} section={section}>
          <div className="grid gap-3 @xl:grid-cols-2 @3xl:grid-cols-3 @5xl:grid-cols-4">
            {section.products.map((p) => (
              <div
                key={p.id}
                className="min-w-0 overflow-hidden p-3 sm:p-4"
                style={V.card}
              >
                {/* Hero image — generous, rounded, dominant. Empty
                    state keeps a soft tinted placeholder so the
                    layout doesn't collapse when imageUrl is missing. */}
                <div
                  className="aspect-[4/5] overflow-hidden rounded-2xl"
                  style={{ background: "var(--tp-input-bg)" }}
                >
                  {p.imageUrl && (
                    <img
                      src={p.imageUrl}
                      alt={p.title}
                      className="h-full w-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  )}
                </div>
                <div className="px-1 pt-4 text-center">
                  <p
                    className="font-display text-lg font-bold leading-tight"
                    style={V.accent}
                  >
                    {p.title}
                  </p>
                  {p.description && (
                    <p
                      className="mt-1 line-clamp-2 text-xs leading-relaxed"
                      style={V.text3}
                    >
                      {p.description}
                    </p>
                  )}
                  {p.price && (
                    <p
                      className="mt-1.5 text-sm font-semibold"
                      style={V.accent}
                    >
                      {p.price}
                    </p>
                  )}
                </div>
                {p.ctaLabel?.trim() && p.ctaUrl?.trim() && (
                  <a
                    href={normalizeExternalUrl(p.ctaUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => track("cta_click", `product-${p.id}`)}
                    className="mt-4 block w-full rounded-full py-2.5 text-center text-sm font-semibold uppercase tracking-wide transition-transform active:scale-[0.98]"
                    style={V.btn}
                  >
                    {p.ctaLabel}
                  </a>
                )}
              </div>
            ))}
          </div>
        </SectionShell>
      );

    case "video": {
      /* Layout resolution. `auto` (or unset) inspects the video count:
         1 = hero, 2-3 = row, 4+ = grid. Explicit values bypass the
         heuristic so power users can pin a layout regardless of count
         (e.g. "always show as Reels strip, no matter how many"). */
      const explicit = section.layout && section.layout !== "auto"
        ? section.layout
        : null;
      const auto =
        section.videos.length === 1
          ? "hero"
          : section.videos.length <= 3
            ? "row"
            : "grid";
      const layout = explicit ?? auto;

      /* Render one video into a card. Aspect ratio is "video" (16:9)
         by default; reels mode passes "portrait" for 9:16. TikTok
         link-only items render as a tappable row card regardless of
         layout (we don't have embed permission for TikTok previews). */
      const renderCard = (v: VideoEmbed, aspect: "video" | "portrait") => {
        if (v.provider === "tiktok") {
          return (
            <a
              key={v.id}
              href={normalizeExternalUrl(v.url)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track("cta_click", `video-${v.id}`)}
              className="flex h-full items-center gap-3 p-3.5"
              style={V.card}
            >
              <span
                className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ background: "var(--tp-social-bg)" }}
              >
                <Icon name="Play" className="h-4 w-4" style={V.text} />
              </span>
              <span className="text-sm font-medium" style={V.text}>
                {v.title || "Watch on TikTok"}
              </span>
            </a>
          );
        }
        return (
          <div
            key={v.id}
            className={cn(
              "overflow-hidden",
              aspect === "portrait" ? "aspect-[9/16]" : "aspect-video",
            )}
            style={{ ...V.card, padding: 0 }}
          >
            <iframe
              src={toEmbedUrl(v.provider, v.url)}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={v.title || "Video"}
            />
          </div>
        );
      };

      if (layout === "hero") {
        const [first, ...rest] = section.videos;
        return (
          <SectionShell title={section.title} section={section}>
            {first && renderCard(first, "video")}
            {rest.length > 0 && (
              <div className="mt-3 grid grid-cols-1 gap-3 @xl:grid-cols-2 @3xl:grid-cols-3">
                {rest.map((v) => renderCard(v, "video"))}
              </div>
            )}
          </SectionShell>
        );
      }

      if (layout === "row") {
        return (
          <SectionShell title={section.title} section={section}>
            <div className="space-y-3">
              {section.videos.map((v) => renderCard(v, "video"))}
            </div>
          </SectionShell>
        );
      }

      if (layout === "reels") {
        return (
          <SectionShell title={section.title} section={section}>
            <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
              {section.videos.map((v) => (
                <div
                  key={v.id}
                  className="w-[180px] shrink-0 sm:w-[220px]"
                >
                  {renderCard(v, "portrait")}
                </div>
              ))}
            </div>
          </SectionShell>
        );
      }

      /* "grid" — responsive 2-3 col grid. Default for 4+ videos. */
      return (
        <SectionShell title={section.title} section={section}>
          <div className="grid grid-cols-1 gap-3 @xl:grid-cols-2 @4xl:grid-cols-3">
            {section.videos.map((v) => renderCard(v, "video"))}
          </div>
        </SectionShell>
      );
    }

    case "gallery":
      return (
        <SectionShell title={section.title} section={section}>
          <div className="grid grid-cols-3 gap-2 @2xl:grid-cols-4 @4xl:grid-cols-5">
            {section.images.map((img) => (
              <div
                key={img.id}
                className="aspect-square overflow-hidden"
                style={{
                  borderRadius: "var(--tp-card-radius)",
                  background: "var(--tp-card)",
                }}
              >
                {img.url && (
                  <img
                    src={img.url}
                    alt={img.caption || "Gallery image"}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                )}
              </div>
            ))}
          </div>
        </SectionShell>
      );

    case "embedHtml":
      return (
        <SectionShell title={section.title} section={section}>
          <EmbedHtmlView section={section} />
        </SectionShell>
      );

    case "image": {
      if (!section.url) return null;
      const align = section.align ?? "center";
      const maxWidth = section.maxWidth ?? "md";
      const wrapperClass = cn(
        "flex flex-col",
        align === "left" && "items-start",
        align === "center" && "items-center",
        align === "right" && "items-end",
      );
      const widthClass = cn(
        "w-full",
        maxWidth === "sm" && "max-w-[240px]",
        maxWidth === "md" && "max-w-[420px]",
        maxWidth === "lg" && "max-w-[640px]",
        // "full" → no cap
      );
      const imgEl = (
        <img
          src={section.url}
          alt={section.caption || section.title || "Image"}
          className={cn("h-auto w-full object-cover", widthClass)}
          style={{ borderRadius: "var(--tp-card-radius)" }}
          loading="lazy"
          decoding="async"
        />
      );
      return (
        <SectionShell title={section.title} section={section}>
          <div className={wrapperClass}>
            {section.linkUrl ? (
              <a
                href={normalizeExternalUrl(section.linkUrl)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => track("cta_click", section.id)}
                className={widthClass}
              >
                {imgEl}
              </a>
            ) : (
              imgEl
            )}
            {section.caption && (
              <p
                className={cn(
                  "mt-2 text-xs",
                  align === "left" && "text-left",
                  align === "center" && "text-center",
                  align === "right" && "text-right",
                )}
                style={{ color: "var(--tp-muted)" }}
              >
                {section.caption}
              </p>
            )}
          </div>
        </SectionShell>
      );
    }

    case "leadCapture":
      return (
        <SectionShell title={section.title} narrow="md" section={section}>
          <LeadForm
            section={section}
            track={track}
            /* Wrap onLead so the section's postSubmitAction fires after
               the save. Pass skipAdvance to suppress FunnelView's
               auto-advance when the section opts into "url" or "stay". */
            onLead={async (data) => {
              const action = section.postSubmitAction ?? "next";
              const skip = action !== "next";
              await onLead(data, { skipAdvance: skip });
              if (action === "url" && section.postSubmitUrl) {
                if (typeof window !== "undefined") {
                  window.location.href = section.postSubmitUrl;
                }
              }
              /* "stay" → LeadForm renders its own success state, nothing
                 else to do here. */
            }}
          />
        </SectionShell>
      );

    case "appointment":
      return (
        <SectionShell title={section.title} section={section}>
          <AppointmentBooking
            section={section}
            profileId={profileId}
            onBook={onBook}
            onTrack={() => track("lead_submit", section.id)}
          />
        </SectionShell>
      );

    case "payment":
      /* Render even when ownerId is missing — PaymentSectionView has
         its own empty state ("Payment methods not configured yet")
         which is more useful than silently hiding the section. */
      return (
        <SectionShell title={section.title} narrow="md" section={section}>
          <PaymentSectionView
            section={section}
            owner={{
              id: profileId,
              ownerId: ownerId ?? profileId,
              paymentMethods: paymentMethods ?? [],
            }}
            source={source ?? "profile"}
          />
        </SectionShell>
      );

    default:
      return null;
  }
}
