"use client";

import { useState } from "react";
import { MessageCircle, Send, Star } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { SocialIcon } from "@/components/ui/SocialIcon";
import { ctaButtonClasses } from "@/lib/theme";
import { cn, isValidEmail, toEmbedUrl } from "@/lib/utils";
import type {
  AnalyticsEventType,
  ProfileSection,
  ProfileTheme,
} from "@/types";

export type TrackFn = (type: AnalyticsEventType, target?: string) => void;
export type LeadSubmitFn = (data: {
  name: string;
  email?: string;
  phone?: string;
  source: string;
}) => Promise<void> | void;

interface RendererProps {
  section: ProfileSection;
  theme: ProfileTheme;
  track: TrackFn;
  onLead: LeadSubmitFn;
}

function SectionShell({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      {title && (
        <div className="mb-3 flex items-center gap-2">
          <span className="h-3.5 w-1 rounded-full bg-electric-500" />
          <h2 className="font-display text-sm font-bold uppercase tracking-wide text-white/70">
            {title}
          </h2>
        </div>
      )}
      {children}
    </section>
  );
}

/* ---------------- Lead capture form ---------------- */

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
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (section.fields.includes("name") && name.trim().length < 2)
      return setError("Please enter your name.");
    if (section.fields.includes("email") && !isValidEmail(email))
      return setError("Please enter a valid email.");

    setBusy(true);
    try {
      await onLead({ name: name.trim(), email, phone, source: section.id });
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
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
      <p className="font-display text-base font-semibold text-white">
        {section.headline}
      </p>
      {section.subtext && (
        <p className="mt-1 text-xs text-white/50">{section.subtext}</p>
      )}

      {done ? (
        <div className="mt-3 rounded-xl bg-jade-500/10 p-3 text-center text-sm text-jade-300">
          Thanks! Your details were sent. &#10003;
        </div>
      ) : (
        <form onSubmit={submit} className="mt-3 space-y-2.5">
          {section.fields.includes("name") && (
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-electric-500/60"
            />
          )}
          {section.fields.includes("email") && (
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Your email"
              className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-electric-500/60"
            />
          )}
          {section.fields.includes("phone") && (
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Your phone / mobile"
              className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-electric-500/60"
            />
          )}
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="h-11 w-full rounded-xl bg-brand-gradient text-sm font-semibold text-white disabled:opacity-60"
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
              href={c.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track("cta_click", `chat-${c.label}`)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] py-2.5 text-xs font-medium text-white"
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

/* ---------------- Section renderer ---------------- */

export function SectionRenderer({
  section,
  track,
  onLead,
}: RendererProps) {
  switch (section.type) {
    case "cta":
      return (
        <SectionShell title={section.title}>
          <div className="space-y-2.5">
            {section.buttons.map((b) => (
              <a
                key={b.id}
                href={b.url || "#"}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => track("cta_click", b.id)}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-2xl px-5 py-4 text-sm font-semibold shadow-card transition-transform active:scale-[0.98]",
                  ctaButtonClasses(b),
                )}
              >
                <Icon name={b.icon} className="h-4 w-4" />
                {b.label}
              </a>
            ))}
          </div>
        </SectionShell>
      );

    case "socials":
      return (
        <SectionShell title={section.title}>
          <div className="flex flex-wrap justify-center gap-3">
            {section.links.map((l) => (
              <a
                key={l.id}
                href={l.url || "#"}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => track("social_click", l.platform)}
                className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-white transition-transform active:scale-95"
              >
                <SocialIcon platform={l.platform} className="h-5 w-5" />
              </a>
            ))}
          </div>
        </SectionShell>
      );

    case "about":
      return (
        <SectionShell title={section.title}>
          <p className="whitespace-pre-line text-sm leading-relaxed text-white/65">
            {section.body}
          </p>
        </SectionShell>
      );

    case "credibility":
      return (
        <SectionShell title={section.title}>
          <div className="grid grid-cols-2 gap-2.5">
            {section.items.map((it) => (
              <div
                key={it.id}
                className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-3.5"
              >
                <Icon name={it.icon} className="h-5 w-5 text-gold-300" />
                <p className="mt-2 text-sm font-semibold leading-snug text-white">
                  {it.title}
                </p>
                {it.subtitle && (
                  <p className="mt-0.5 text-[11px] text-white/45">
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
        <SectionShell title={section.title}>
          <div className="space-y-2.5">
            {section.testimonials.map((t) => (
              <div
                key={t.id}
                className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4"
              >
                {t.kind === "image" && t.mediaUrl && (
                  <img
                    src={t.mediaUrl}
                    alt={t.authorName}
                    className="mb-3 w-full rounded-xl object-cover"
                  />
                )}
                {typeof t.rating === "number" && (
                  <div className="mb-1.5 flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          "h-3.5 w-3.5",
                          i < (t.rating ?? 0)
                            ? "fill-gold-400 text-gold-400"
                            : "text-white/15",
                        )}
                      />
                    ))}
                  </div>
                )}
                {t.quote && (
                  <p className="text-sm leading-relaxed text-white/75">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                )}
                <p className="mt-2 text-xs font-semibold text-white">
                  {t.authorName}
                  {t.authorRole && (
                    <span className="font-normal text-white/40">
                      {" "}
                      · {t.authorRole}
                    </span>
                  )}
                </p>
              </div>
            ))}
          </div>
        </SectionShell>
      );

    case "products":
      return (
        <SectionShell title={section.title}>
          <div className="grid gap-2.5">
            {section.products.map((p) => (
              <div
                key={p.id}
                className="overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.03]"
              >
                <div className="flex gap-3 p-3">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-brand-gradient">
                    {p.imageUrl && (
                      <img
                        src={p.imageUrl}
                        alt={p.title}
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white">
                      {p.title}
                    </p>
                    <p className="line-clamp-2 text-xs text-white/45">
                      {p.description}
                    </p>
                    {p.price && (
                      <p className="mt-0.5 text-xs font-semibold text-jade-400">
                        {p.price}
                      </p>
                    )}
                  </div>
                </div>
                <a
                  href={p.ctaUrl || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => track("cta_click", `product-${p.id}`)}
                  className="block border-t border-white/[0.06] py-2.5 text-center text-xs font-semibold text-electric-300"
                >
                  {p.ctaLabel}
                </a>
              </div>
            ))}
          </div>
        </SectionShell>
      );

    case "video":
      return (
        <SectionShell title={section.title}>
          <div className="space-y-3">
            {section.videos.map((v) =>
              v.provider === "tiktok" ? (
                <a
                  key={v.id}
                  href={v.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => track("cta_click", `video-${v.id}`)}
                  className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-3.5"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                    <Icon name="Play" className="h-4 w-4 text-white" />
                  </span>
                  <span className="text-sm font-medium text-white">
                    {v.title || "Watch on TikTok"}
                  </span>
                </a>
              ) : (
                <div
                  key={v.id}
                  className="aspect-video overflow-hidden rounded-2xl border border-white/[0.07]"
                >
                  <iframe
                    src={toEmbedUrl(v.provider, v.url)}
                    className="h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title={v.title || "Video"}
                  />
                </div>
              ),
            )}
          </div>
        </SectionShell>
      );

    case "gallery":
      return (
        <SectionShell title={section.title}>
          <div className="grid grid-cols-3 gap-2">
            {section.images.map((img) => (
              <div
                key={img.id}
                className="aspect-square overflow-hidden rounded-xl bg-white/[0.04]"
              >
                {img.url && (
                  <img
                    src={img.url}
                    alt={img.caption || "Gallery image"}
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
            ))}
          </div>
        </SectionShell>
      );

    case "leadCapture":
      return (
        <SectionShell title={section.title}>
          <LeadForm section={section} track={track} onLead={onLead} />
        </SectionShell>
      );

    default:
      return null;
  }
}
