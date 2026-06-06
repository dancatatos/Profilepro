"use client";

import { Plus, Star, X } from "lucide-react";
import { useSections } from "./SectionsContext";
import { Select } from "@/components/ui/Select";
import { Icon } from "@/components/ui/Icon";
import { ImageUploadField } from "./ImageUploadField";
import dynamic from "next/dynamic";
import { SOCIAL_PLATFORMS } from "@/lib/constants";
import { useProfileStore } from "@/store/profileStore";
import { cn, uid } from "@/lib/utils";
import type {
  AboutSection,
  AppointmentSection,
  CountdownSection,
  CredibilitySection,
  CtaActionKind,
  CtaAlignment,
  HeroSection,
  ImageSection,
  BenefitsSection,
  FaqSection,
  LeadCapturePostSubmitAction,
  PricingCardSection,
  CtaSection,
  GallerySection,
  LeadCaptureSection,
  LeadFieldKey,
  PaymentSection,
  ProductsSection,
  ProfileSection,
  SocialsSection,
  TestimonialsSection,
  TextSection,
  VideoSection,
} from "@/types";

const FIELD =
  "h-10 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-electric-500/60";

const CTA_ICONS = [
  "Users", "Phone", "MessageCircle", "GraduationCap", "Calendar",
  "Play", "Store", "ShoppingBag", "Gift", "Video", "Mail", "Link",
];
const CRED_ICONS = [
  "Award", "Crown", "BadgeCheck", "TrendingUp", "Trophy",
  "Star", "Medal", "ShieldCheck", "Sparkles", "Target",
];

function RowCard({
  children,
  onRemove,
}: {
  children: React.ReactNode;
  onRemove: () => void;
}) {
  return (
    <div className="relative space-y-2 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
      <button
        onClick={onRemove}
        className="absolute right-2 top-2 rounded-md p-1 text-white/30 hover:text-red-400"
        aria-label="Remove"
      >
        <X className="h-4 w-4" />
      </button>
      {children}
    </div>
  );
}

function AddRow({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/15 py-2.5 text-xs font-medium text-white/55 hover:border-electric-500/40 hover:text-white"
    >
      <Plus className="h-4 w-4" />
      {label}
    </button>
  );
}

function IconPicker({
  icons,
  value,
  onChange,
}: {
  icons: string[];
  value: string;
  onChange: (icon: string) => void;
}) {
  return (
    <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
      {icons.map((name) => (
        <button
          key={name}
          onClick={() => onChange(name)}
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border",
            value === name
              ? "border-electric-500 bg-electric-500/15 text-electric-300"
              : "border-white/10 text-white/45",
          )}
        >
          <Icon name={name} className="h-4 w-4" />
        </button>
      ))}
    </div>
  );
}

/* ---------------- CTA ---------------- */

function CtaEditor({ section }: { section: CtaSection }) {
  const { updateSection: update } = useSections();
  const patch = (buttons: CtaSection["buttons"]) =>
    update(section.id, { buttons });
  const edit = (id: string, p: Partial<CtaSection["buttons"][number]>) =>
    patch(section.buttons.map((b) => (b.id === id ? { ...b, ...p } : b)));
  /* Section-level alignment — applies to the whole button row. Default
     stays "stretch" so existing CTAs look identical until the owner
     opts into a positional layout. */
  const align: CtaAlignment = section.align ?? "stretch";

  return (
    <div className="space-y-2.5">
      <div>
        <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-white/45">
          Button alignment
        </label>
        <Select
          value={align}
          onChange={(v) => update(section.id, { align: v as CtaAlignment })}
          options={[
            { value: "stretch", label: "Stretch (full width)" },
            { value: "left", label: "Left" },
            { value: "center", label: "Center" },
            { value: "right", label: "Right" },
          ]}
        />
      </div>
      {section.buttons.map((b) => {
        /* Default to "url" for buttons created before the field existed. */
        const action: CtaActionKind = b.action ?? "url";
        return (
        <RowCard
          key={b.id}
          onRemove={() => patch(section.buttons.filter((x) => x.id !== b.id))}
        >
          <input
            value={b.label}
            onChange={(e) => edit(b.id, { label: e.target.value })}
            placeholder="Button label"
            className={FIELD}
          />
          {/* URL only shown when action === "url" so the editor doesn't
              ask for a URL that won't be used. */}
          {action === "url" && (
            <input
              value={b.url}
              onChange={(e) => edit(b.id, { url: e.target.value })}
              placeholder="https://link.com"
              className={FIELD}
            />
          )}
          <IconPicker
            icons={CTA_ICONS}
            value={b.icon}
            onChange={(icon) => edit(b.id, { icon })}
          />
          {/* "After click" picker — the new control. Hint reminds the
              user that "next step" only works inside funnels. */}
          <div>
            <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-white/45">
              After click
            </label>
            <Select
              value={action}
              onChange={(v) =>
                edit(b.id, { action: v as CtaActionKind })
              }
              options={[
                { value: "url", label: "Open URL (new tab)" },
                { value: "next", label: "Go to next funnel step" },
                { value: "none", label: "Do nothing" },
              ]}
            />
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Select
              value={b.style}
              onChange={(v) =>
                edit(b.id, { style: v as CtaSection["buttons"][number]["style"] })
              }
              options={[
                { value: "gradient", label: "Gradient" },
                { value: "solid", label: "Solid" },
                { value: "outline", label: "Outline" },
              ]}
            />
            <Select
              value={b.accent}
              onChange={(v) =>
                edit(b.id, {
                  accent: v as CtaSection["buttons"][number]["accent"],
                })
              }
              options={[
                { value: "blue", label: "Blue" },
                { value: "jade", label: "Emerald" },
                { value: "gold", label: "Gold" },
                { value: "white", label: "White" },
              ]}
            />
          </div>
        </RowCard>
        );
      })}
      <AddRow
        label="Add button"
        onClick={() =>
          patch([
            ...section.buttons,
            {
              id: uid("btn"),
              label: "New button",
              url: "",
              icon: "Link",
              style: "solid",
              accent: "blue",
            },
          ])
        }
      />
    </div>
  );
}

/* ---------------- Socials ---------------- */

function SocialsEditor({ section }: { section: SocialsSection }) {
  const { updateSection: update } = useSections();
  const patch = (links: SocialsSection["links"]) =>
    update(section.id, { links });

  return (
    <div className="space-y-2.5">
      {section.links.map((l) => (
        <RowCard
          key={l.id}
          onRemove={() => patch(section.links.filter((x) => x.id !== l.id))}
        >
          <Select
            value={l.platform}
            onChange={(v) =>
              patch(
                section.links.map((x) =>
                  x.id === l.id
                    ? { ...x, platform: v as SocialsSection["links"][number]["platform"] }
                    : x,
                ),
              )
            }
            options={SOCIAL_PLATFORMS.map((p) => ({
              value: p.platform,
              label: p.label,
            }))}
          />
          <input
            value={l.url}
            onChange={(e) =>
              patch(
                section.links.map((x) =>
                  x.id === l.id ? { ...x, url: e.target.value } : x,
                ),
              )
            }
            placeholder="Profile URL"
            className={FIELD}
          />
        </RowCard>
      ))}
      <AddRow
        label="Add social link"
        onClick={() =>
          patch([
            ...section.links,
            { id: uid("ln"), platform: "facebook", url: "" },
          ])
        }
      />
    </div>
  );
}

/* ---------------- About ---------------- */

function AboutEditor({ section }: { section: AboutSection }) {
  const { updateSection: update } = useSections();
  return (
    <textarea
      value={section.body}
      onChange={(e) => update(section.id, { body: e.target.value })}
      rows={6}
      placeholder="Tell your story — your mission, background and journey."
      className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-electric-500/60"
    />
  );
}

/* ---------------- Text block ---------------- */

/* Tiptap is heavy — load it only when a Text section is actually opened,
   so it never weighs down the profile builder's initial bundle. */
const RichTextEditor = dynamic(
  () => import("@/components/ui/RichTextEditor").then((m) => m.RichTextEditor),
  {
    ssr: false,
    loading: () => (
      <div className="h-40 rounded-xl border border-white/10 bg-white/[0.03]" />
    ),
  },
);

function TextEditor({ section }: { section: TextSection }) {
  const { updateSection: update } = useSections();
  return (
    <RichTextEditor
      value={section.doc}
      onChange={(doc) => update(section.id, { doc })}
    />
  );
}

/* ---------------- Countdown ---------------- */

function CountdownEditor({ section }: { section: CountdownSection }) {
  const { updateSection: update } = useSections();
  return (
    <div className="space-y-3">
      <input
        value={section.headline}
        onChange={(e) => update(section.id, { headline: e.target.value })}
        placeholder="Countdown headline"
        className={FIELD}
      />
      <div>
        <p className="mb-1.5 text-xs font-medium text-white/65">
          Counts down to
        </p>
        <input
          type="datetime-local"
          value={section.targetIso}
          onChange={(e) => update(section.id, { targetIso: e.target.value })}
          className={FIELD}
        />
      </div>
      <input
        value={section.expiredText}
        onChange={(e) => update(section.id, { expiredText: e.target.value })}
        placeholder="Message shown when the timer ends"
        className={FIELD}
      />
    </div>
  );
}

/* ---------------- Hero ---------------- */

function HeroEditor({ section }: { section: HeroSection }) {
  const { updateSection: update } = useSections();
  return (
    <div className="space-y-3">
      <input
        value={section.headline}
        onChange={(e) => update(section.id, { headline: e.target.value })}
        placeholder="Big bold headline"
        className={FIELD}
      />
      <textarea
        value={section.subtext}
        onChange={(e) => update(section.id, { subtext: e.target.value })}
        rows={2}
        placeholder="Short subhead"
        className="w-full resize-none rounded-lg border border-white/10 bg-white/[0.03] p-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-electric-500/60"
      />
      <ImageUploadField
        value={section.backgroundUrl}
        onChange={(url) => update(section.id, { backgroundUrl: url })}
        folder="hero"
      />
    </div>
  );
}

/* ---------------- Benefits ---------------- */

const BENEFIT_ICONS = [
  "Check",
  "Star",
  "Sparkles",
  "ShieldCheck",
  "Heart",
  "ThumbsUp",
  "Trophy",
  "Zap",
  "Target",
  "Rocket",
];

function BenefitsEditor({ section }: { section: BenefitsSection }) {
  const { updateSection: update } = useSections();
  const patch = (items: BenefitsSection["items"]) =>
    update(section.id, { items });
  const edit = (id: string, p: Partial<BenefitsSection["items"][number]>) =>
    patch(section.items.map((i) => (i.id === id ? { ...i, ...p } : i)));

  return (
    <div className="space-y-2.5">
      {section.items.map((it) => (
        <RowCard
          key={it.id}
          onRemove={() => patch(section.items.filter((x) => x.id !== it.id))}
        >
          <input
            value={it.title}
            onChange={(e) => edit(it.id, { title: e.target.value })}
            placeholder="Benefit title"
            className={FIELD}
          />
          <input
            value={it.detail || ""}
            onChange={(e) => edit(it.id, { detail: e.target.value })}
            placeholder="Detail (optional)"
            className={FIELD}
          />
          <IconPicker
            icons={BENEFIT_ICONS}
            value={it.icon || "Check"}
            onChange={(icon) => edit(it.id, { icon })}
          />
        </RowCard>
      ))}
      <AddRow
        label="Add benefit"
        onClick={() =>
          patch([
            ...section.items,
            { id: uid("bn"), title: "New benefit", icon: "Check" },
          ])
        }
      />
    </div>
  );
}

/* ---------------- FAQ ---------------- */

function FaqEditor({ section }: { section: FaqSection }) {
  const { updateSection: update } = useSections();
  const patch = (items: FaqSection["items"]) => update(section.id, { items });
  const edit = (id: string, p: Partial<FaqSection["items"][number]>) =>
    patch(section.items.map((i) => (i.id === id ? { ...i, ...p } : i)));

  return (
    <div className="space-y-2.5">
      {section.items.map((it) => (
        <RowCard
          key={it.id}
          onRemove={() => patch(section.items.filter((x) => x.id !== it.id))}
        >
          <input
            value={it.question}
            onChange={(e) => edit(it.id, { question: e.target.value })}
            placeholder="Question"
            className={FIELD}
          />
          <textarea
            value={it.answer}
            onChange={(e) => edit(it.id, { answer: e.target.value })}
            rows={2}
            placeholder="Answer"
            className="w-full resize-none rounded-lg border border-white/10 bg-white/[0.03] p-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-electric-500/60"
          />
        </RowCard>
      ))}
      <AddRow
        label="Add question"
        onClick={() =>
          patch([
            ...section.items,
            { id: uid("fq"), question: "", answer: "" },
          ])
        }
      />
    </div>
  );
}

/* ---------------- Pricing card ---------------- */

function PricingCardEditor({ section }: { section: PricingCardSection }) {
  const { updateSection: update } = useSections();
  const patchFeatures = (features: PricingCardSection["features"]) =>
    update(section.id, { features });
  const editFeature = (id: string, text: string) =>
    patchFeatures(
      section.features.map((f) => (f.id === id ? { ...f, text } : f)),
    );

  return (
    <div className="space-y-3">
      <input
        value={section.headline}
        onChange={(e) => update(section.id, { headline: e.target.value })}
        placeholder="Headline (e.g. Get instant access)"
        className={FIELD}
      />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input
          value={section.price}
          onChange={(e) => update(section.id, { price: e.target.value })}
          placeholder="Price (e.g. ₱1,997)"
          className={FIELD}
        />
        <input
          value={section.priceNote || ""}
          onChange={(e) => update(section.id, { priceNote: e.target.value })}
          placeholder="Note (e.g. one-time)"
          className={FIELD}
        />
      </div>
      <div>
        <p className="mb-1.5 text-xs font-medium text-white/65">
          What&apos;s included
        </p>
        <div className="space-y-2">
          {section.features.map((f) => (
            <div key={f.id} className="flex items-center gap-2">
              <input
                value={f.text}
                onChange={(e) => editFeature(f.id, e.target.value)}
                placeholder="Feature included"
                className={cn(FIELD, "h-9 flex-1 text-xs")}
              />
              <button
                onClick={() =>
                  patchFeatures(section.features.filter((x) => x.id !== f.id))
                }
                aria-label="Remove feature"
                className="shrink-0 rounded-md p-1.5 text-white/30 hover:text-red-400"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
          <AddRow
            label="Add feature"
            onClick={() =>
              patchFeatures([
                ...section.features,
                { id: uid("pf"), text: "" },
              ])
            }
          />
        </div>
      </div>
      {(() => {
        const ctaAction: CtaActionKind = section.ctaAction ?? "url";
        return (
          <>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <input
                value={section.ctaLabel}
                onChange={(e) =>
                  update(section.id, { ctaLabel: e.target.value })
                }
                placeholder="Button label"
                className={FIELD}
              />
              <Select
                value={ctaAction}
                onChange={(v) =>
                  update(section.id, { ctaAction: v as CtaActionKind })
                }
                options={[
                  { value: "url", label: "Open URL (new tab)" },
                  { value: "next", label: "Go to next funnel step" },
                  { value: "none", label: "Do nothing" },
                ]}
              />
            </div>
            {ctaAction === "url" && (
              <input
                value={section.ctaUrl}
                onChange={(e) =>
                  update(section.id, { ctaUrl: e.target.value })
                }
                placeholder="Link / checkout URL"
                className={FIELD}
              />
            )}
          </>
        );
      })()}
    </div>
  );
}

/* ---------------- Credibility ---------------- */

function CredibilityEditor({ section }: { section: CredibilitySection }) {
  const { updateSection: update } = useSections();
  const patch = (items: CredibilitySection["items"]) =>
    update(section.id, { items });
  const edit = (id: string, p: Partial<CredibilitySection["items"][number]>) =>
    patch(section.items.map((i) => (i.id === id ? { ...i, ...p } : i)));

  return (
    <div className="space-y-2.5">
      {section.items.map((it) => (
        <RowCard
          key={it.id}
          onRemove={() => patch(section.items.filter((x) => x.id !== it.id))}
        >
          <input
            value={it.title}
            onChange={(e) => edit(it.id, { title: e.target.value })}
            placeholder="Achievement title"
            className={FIELD}
          />
          <input
            value={it.subtitle || ""}
            onChange={(e) => edit(it.id, { subtitle: e.target.value })}
            placeholder="Short detail (optional)"
            className={FIELD}
          />
          <IconPicker
            icons={CRED_ICONS}
            value={it.icon}
            onChange={(icon) => edit(it.id, { icon })}
          />
        </RowCard>
      ))}
      <AddRow
        label="Add achievement"
        onClick={() =>
          patch([
            ...section.items,
            { id: uid("cr"), title: "New achievement", icon: "Award" },
          ])
        }
      />
    </div>
  );
}

/* ---------------- Testimonials ---------------- */

function TestimonialsEditor({ section }: { section: TestimonialsSection }) {
  const { updateSection: update } = useSections();
  const patch = (testimonials: TestimonialsSection["testimonials"]) =>
    update(section.id, { testimonials });
  const edit = (
    id: string,
    p: Partial<TestimonialsSection["testimonials"][number]>,
  ) => patch(section.testimonials.map((t) => (t.id === id ? { ...t, ...p } : t)));

  return (
    <div className="space-y-2.5">
      {section.testimonials.map((t) => (
        <RowCard
          key={t.id}
          onRemove={() =>
            patch(section.testimonials.filter((x) => x.id !== t.id))
          }
        >
          <textarea
            value={t.quote || ""}
            onChange={(e) => edit(t.id, { quote: e.target.value })}
            rows={2}
            placeholder="Their testimonial quote"
            className="w-full resize-none rounded-lg border border-white/10 bg-white/[0.03] p-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-electric-500/60"
          />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <input
              value={t.authorName}
              onChange={(e) => edit(t.id, { authorName: e.target.value })}
              placeholder="Author name"
              className={FIELD}
            />
            <input
              value={t.authorRole || ""}
              onChange={(e) => edit(t.id, { authorRole: e.target.value })}
              placeholder="Role (optional)"
              className={FIELD}
            />
          </div>
          <div className="flex gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <button
                key={i}
                onClick={() => edit(t.id, { rating: i + 1 })}
                aria-label={`${i + 1} stars`}
              >
                <Star
                  className={cn(
                    "h-5 w-5",
                    i < (t.rating ?? 0)
                      ? "fill-gold-400 text-gold-400"
                      : "text-white/20",
                  )}
                />
              </button>
            ))}
          </div>
        </RowCard>
      ))}
      <AddRow
        label="Add testimonial"
        onClick={() =>
          patch([
            ...section.testimonials,
            {
              id: uid("ts"),
              kind: "text",
              authorName: "Client name",
              quote: "",
              rating: 5,
            },
          ])
        }
      />
    </div>
  );
}

/* ---------------- Products ---------------- */

function ProductsEditor({ section }: { section: ProductsSection }) {
  const { updateSection: update } = useSections();
  const patch = (products: ProductsSection["products"]) =>
    update(section.id, { products });
  const edit = (id: string, p: Partial<ProductsSection["products"][number]>) =>
    patch(section.products.map((x) => (x.id === id ? { ...x, ...p } : x)));

  return (
    <div className="space-y-2.5">
      {section.products.map((p) => (
        <RowCard
          key={p.id}
          onRemove={() => patch(section.products.filter((x) => x.id !== p.id))}
        >
          <ImageUploadField
            value={p.imageUrl}
            onChange={(url) => edit(p.id, { imageUrl: url })}
            folder="products"
          />
          <input
            value={p.title}
            onChange={(e) => edit(p.id, { title: e.target.value })}
            placeholder="Product / service name"
            className={FIELD}
          />
          <textarea
            value={p.description}
            onChange={(e) => edit(p.id, { description: e.target.value })}
            rows={2}
            placeholder="Short description"
            className="w-full resize-none rounded-lg border border-white/10 bg-white/[0.03] p-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-electric-500/60"
          />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <input
              value={p.price || ""}
              onChange={(e) => edit(p.id, { price: e.target.value })}
              placeholder="Price (optional)"
              className={FIELD}
            />
            <input
              value={p.ctaLabel}
              onChange={(e) => edit(p.id, { ctaLabel: e.target.value })}
              placeholder="Button label"
              className={FIELD}
            />
          </div>
          <input
            value={p.ctaUrl}
            onChange={(e) => edit(p.id, { ctaUrl: e.target.value })}
            placeholder="Link / affiliate URL"
            className={FIELD}
          />
        </RowCard>
      ))}
      <AddRow
        label="Add product"
        onClick={() =>
          patch([
            ...section.products,
            {
              id: uid("pr"),
              title: "New product",
              description: "",
              ctaLabel: "Learn More",
              ctaUrl: "",
            },
          ])
        }
      />
    </div>
  );
}

/* ---------------- Video ---------------- */

function VideoEditor({ section }: { section: VideoSection }) {
  const { updateSection: update } = useSections();
  const patch = (videos: VideoSection["videos"]) =>
    update(section.id, { videos });
  const edit = (id: string, p: Partial<VideoSection["videos"][number]>) =>
    patch(section.videos.map((v) => (v.id === id ? { ...v, ...p } : v)));

  return (
    <div className="space-y-2.5">
      {section.videos.map((v) => (
        <RowCard
          key={v.id}
          onRemove={() => patch(section.videos.filter((x) => x.id !== v.id))}
        >
          <Select
            value={v.provider}
            onChange={(val) =>
              edit(v.id, { provider: val as VideoSection["videos"][number]["provider"] })
            }
            options={[
              { value: "youtube", label: "YouTube" },
              { value: "tiktok", label: "TikTok" },
              { value: "facebook", label: "Facebook" },
            ]}
          />
          <input
            value={v.url}
            onChange={(e) => edit(v.id, { url: e.target.value })}
            placeholder="Video URL"
            className={FIELD}
          />
          <input
            value={v.title || ""}
            onChange={(e) => edit(v.id, { title: e.target.value })}
            placeholder="Title (optional)"
            className={FIELD}
          />
        </RowCard>
      ))}
      <AddRow
        label="Add video"
        onClick={() =>
          patch([
            ...section.videos,
            { id: uid("vid"), provider: "youtube", url: "" },
          ])
        }
      />
    </div>
  );
}

/* ---------------- Gallery ---------------- */

function GalleryEditor({ section }: { section: GallerySection }) {
  const { updateSection: update } = useSections();
  const patch = (images: GallerySection["images"]) =>
    update(section.id, { images });

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-2 gap-2.5">
        {section.images.map((img) => (
          <RowCard
            key={img.id}
            onRemove={() => patch(section.images.filter((x) => x.id !== img.id))}
          >
            <ImageUploadField
              value={img.url}
              onChange={(url) =>
                patch(
                  section.images.map((x) =>
                    x.id === img.id ? { ...x, url } : x,
                  ),
                )
              }
              folder="gallery"
            />
          </RowCard>
        ))}
      </div>
      <AddRow
        label="Add photo"
        onClick={() =>
          patch([...section.images, { id: uid("img"), url: "" }])
        }
      />
    </div>
  );
}

/* ---------------- Single image ---------------- */

function ImageEditor({ section }: { section: ImageSection }) {
  const { updateSection: update } = useSections();
  const patch = (p: Partial<ImageSection>) => update(section.id, p);
  const align = section.align ?? "center";
  const maxWidth = section.maxWidth ?? "md";

  return (
    <div className="space-y-2.5">
      <ImageUploadField
        value={section.url ?? ""}
        onChange={(url) => patch({ url })}
        folder="media"
      />
      <input
        value={section.caption ?? ""}
        onChange={(e) => patch({ caption: e.target.value })}
        placeholder="Caption (optional)"
        className={FIELD}
      />
      <input
        value={section.linkUrl ?? ""}
        onChange={(e) => patch({ linkUrl: e.target.value })}
        placeholder="Link URL (optional — makes the image clickable)"
        className={FIELD}
      />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-white/45">
            Alignment
          </label>
          <Select
            value={align}
            onChange={(v) =>
              patch({ align: v as ImageSection["align"] })
            }
            options={[
              { value: "left", label: "Left" },
              { value: "center", label: "Center" },
              { value: "right", label: "Right" },
            ]}
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-white/45">
            Max width
          </label>
          <Select
            value={maxWidth}
            onChange={(v) =>
              patch({ maxWidth: v as ImageSection["maxWidth"] })
            }
            options={[
              { value: "sm", label: "Small" },
              { value: "md", label: "Medium" },
              { value: "lg", label: "Large" },
              { value: "full", label: "Full width" },
            ]}
          />
        </div>
      </div>
    </div>
  );
}

/* ---------------- Lead capture ---------------- */

function LeadCaptureEditor({ section }: { section: LeadCaptureSection }) {
  const { updateSection: update } = useSections();
  const fields: LeadFieldKey[] = ["name", "email", "phone"];

  const toggleField = (f: LeadFieldKey) => {
    const next = section.fields.includes(f)
      ? section.fields.filter((x) => x !== f)
      : [...section.fields, f];
    update(section.id, { fields: next });
  };

  return (
    <div className="space-y-3">
      <input
        value={section.headline}
        onChange={(e) => update(section.id, { headline: e.target.value })}
        placeholder="Form headline"
        className={FIELD}
      />
      <input
        value={section.subtext || ""}
        onChange={(e) => update(section.id, { subtext: e.target.value })}
        placeholder="Supporting text (optional)"
        className={FIELD}
      />
      <div>
        <p className="mb-1.5 text-xs font-medium text-white/65">
          Form fields
        </p>
        <div className="flex gap-2">
          {fields.map((f) => (
            <button
              key={f}
              onClick={() => toggleField(f)}
              className={cn(
                "flex-1 rounded-lg border py-2 text-xs font-medium capitalize",
                section.fields.includes(f)
                  ? "border-electric-500 bg-electric-500/15 text-electric-300"
                  : "border-white/10 text-white/45",
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-xs font-medium text-white/65">Chat channels</p>
        <input
          value={section.channels.messengerUrl || ""}
          onChange={(e) =>
            update(section.id, {
              channels: { ...section.channels, messengerUrl: e.target.value },
            })
          }
          placeholder="Messenger link (m.me/...)"
          className={FIELD}
        />
        <input
          value={section.channels.whatsappUrl || ""}
          onChange={(e) =>
            update(section.id, {
              channels: { ...section.channels, whatsappUrl: e.target.value },
            })
          }
          placeholder="WhatsApp link (wa.me/...)"
          className={FIELD}
        />
        <input
          value={section.channels.telegramUrl || ""}
          onChange={(e) =>
            update(section.id, {
              channels: { ...section.channels, telegramUrl: e.target.value },
            })
          }
          placeholder="Telegram link (t.me/...)"
          className={FIELD}
        />
      </div>

      {/* After-submission behavior — the parallel of the CTA "After
          click" picker. Inside funnels the default is to auto-advance;
          on profiles the section just shows its own success state. */}
      {(() => {
        const action: LeadCapturePostSubmitAction =
          section.postSubmitAction ?? "next";
        return (
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
            <p className="mb-2 text-xs font-medium text-white/65">
              After submission
            </p>
            <Select
              value={action}
              onChange={(v) =>
                update(section.id, {
                  postSubmitAction: v as LeadCapturePostSubmitAction,
                })
              }
              options={[
                { value: "next", label: "Go to next funnel step (default)" },
                { value: "url", label: "Redirect to a custom URL" },
                { value: "stay", label: "Stay here & show success message" },
              ]}
            />
            {action === "url" && (
              <input
                value={section.postSubmitUrl ?? ""}
                onChange={(e) =>
                  update(section.id, { postSubmitUrl: e.target.value })
                }
                placeholder="https://your-thank-you-page.com"
                className={cn(FIELD, "mt-2")}
              />
            )}
            <p className="mt-2 text-[10px] text-white/35">
              The lead is always saved before this action fires.
            </p>
          </div>
        );
      })()}
    </div>
  );
}

/* ---------------- Appointment scheduler ---------------- */

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function AppointmentEditor({ section }: { section: AppointmentSection }) {
  const { updateSection: update } = useSections();

  const toggleDay = (d: number) => {
    const next = section.availableDays.includes(d)
      ? section.availableDays.filter((x) => x !== d)
      : [...section.availableDays, d].sort((a, b) => a - b);
    update(section.id, { availableDays: next });
  };

  const patchQuestions = (questions: AppointmentSection["questions"]) =>
    update(section.id, { questions });
  const editQuestion = (
    id: string,
    p: Partial<AppointmentSection["questions"][number]>,
  ) =>
    patchQuestions(
      section.questions.map((q) => (q.id === id ? { ...q, ...p } : q)),
    );

  return (
    <div className="space-y-3">
      <input
        value={section.headline}
        onChange={(e) => update(section.id, { headline: e.target.value })}
        placeholder="Booking headline"
        className={FIELD}
      />
      <input
        value={section.subtext || ""}
        onChange={(e) => update(section.id, { subtext: e.target.value })}
        placeholder="Supporting text (optional)"
        className={FIELD}
      />

      <div>
        <p className="mb-1.5 text-xs font-medium text-white/65">
          Available days
        </p>
        <div className="flex gap-1.5">
          {WEEKDAYS.map((label, i) => (
            <button
              key={label}
              onClick={() => toggleDay(i)}
              className={cn(
                "flex-1 rounded-lg border py-2 text-[11px] font-medium",
                section.availableDays.includes(i)
                  ? "border-electric-500 bg-electric-500/15 text-electric-300"
                  : "border-white/10 text-white/45",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div>
          <p className="mb-1.5 text-xs font-medium text-white/65">From</p>
          <input
            type="time"
            value={section.startTime}
            onChange={(e) => update(section.id, { startTime: e.target.value })}
            className={FIELD}
          />
        </div>
        <div>
          <p className="mb-1.5 text-xs font-medium text-white/65">To</p>
          <input
            type="time"
            value={section.endTime}
            onChange={(e) => update(section.id, { endTime: e.target.value })}
            className={FIELD}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div>
          <p className="mb-1.5 text-xs font-medium text-white/65">
            Slot length
          </p>
          <Select
            value={String(section.slotMinutes)}
            onChange={(v) => update(section.id, { slotMinutes: Number(v) })}
            options={[
              { value: "15", label: "15 minutes" },
              { value: "30", label: "30 minutes" },
              { value: "45", label: "45 minutes" },
              { value: "60", label: "60 minutes" },
            ]}
          />
        </div>
        <div>
          <p className="mb-1.5 text-xs font-medium text-white/65">
            Booking window
          </p>
          <Select
            value={String(section.bookingWindowDays)}
            onChange={(v) =>
              update(section.id, { bookingWindowDays: Number(v) })
            }
            options={[
              { value: "7", label: "Next 7 days" },
              { value: "14", label: "Next 14 days" },
              { value: "30", label: "Next 30 days" },
              { value: "60", label: "Next 60 days" },
            ]}
          />
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-xs font-medium text-white/65">
          Intake questions · optional for visitors · max 5
        </p>
        <div className="space-y-2">
          {section.questions.map((q) => (
            <div key={q.id} className="flex items-center gap-2">
              <button
                onClick={() => editQuestion(q.id, { enabled: !q.enabled })}
                aria-label="Toggle question"
                className={cn(
                  "relative h-5 w-9 shrink-0 rounded-full transition-colors",
                  q.enabled ? "bg-jade-500" : "bg-white/15",
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform",
                    q.enabled ? "translate-x-[1.125rem]" : "translate-x-0.5",
                  )}
                />
              </button>
              <input
                value={q.question}
                onChange={(e) =>
                  editQuestion(q.id, { question: e.target.value })
                }
                placeholder="Question to ask the visitor"
                className={cn(FIELD, "h-9 flex-1 text-xs")}
              />
              <button
                onClick={() =>
                  patchQuestions(
                    section.questions.filter((x) => x.id !== q.id),
                  )
                }
                aria-label="Remove question"
                className="shrink-0 rounded-md p-1.5 text-white/30 hover:text-red-400"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
          {section.questions.length < 5 && (
            <AddRow
              label="Add question"
              onClick={() =>
                patchQuestions([
                  ...section.questions,
                  { id: uid("q"), question: "", enabled: true },
                ])
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Dispatcher ---------------- */

export function SectionEditor({ section }: { section: ProfileSection }) {
  switch (section.type) {
    case "cta":
      return <CtaEditor section={section} />;
    case "socials":
      return <SocialsEditor section={section} />;
    case "about":
      return <AboutEditor section={section} />;
    case "text":
      return <TextEditor section={section} />;
    case "countdown":
      return <CountdownEditor section={section} />;
    case "hero":
      return <HeroEditor section={section} />;
    case "benefits":
      return <BenefitsEditor section={section} />;
    case "faq":
      return <FaqEditor section={section} />;
    case "pricingCard":
      return <PricingCardEditor section={section} />;
    case "credibility":
      return <CredibilityEditor section={section} />;
    case "testimonials":
      return <TestimonialsEditor section={section} />;
    case "products":
      return <ProductsEditor section={section} />;
    case "video":
      return <VideoEditor section={section} />;
    case "gallery":
      return <GalleryEditor section={section} />;
    case "image":
      return <ImageEditor section={section} />;
    case "leadCapture":
      return <LeadCaptureEditor section={section} />;
    case "appointment":
      return <AppointmentEditor section={section} />;
    case "payment":
      return <PaymentEditor section={section} />;
    default:
      return null;
  }
}

/* ── Payment section editor ─────────────────────────────────────── */

function PaymentEditor({ section }: { section: PaymentSection }) {
  const { updateSection: update } = useSections();
  const profile = useProfileStore((s) => s.profile);
  const allMethods = profile?.paymentMethods ?? [];
  const patch = (p: Partial<PaymentSection>) => update(section.id, p);
  const toggleMethod = (id: string) => {
    const next = new Set(section.enabledMethodIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    patch({ enabledMethodIds: Array.from(next) });
  };
  const toggleField = (field: LeadFieldKey) => {
    const next = new Set(section.fields);
    if (next.has(field)) next.delete(field);
    else next.add(field);
    patch({ fields: Array.from(next) });
  };

  return (
    <div className="space-y-3">
      <input
        value={section.headline}
        onChange={(e) => patch({ headline: e.target.value })}
        placeholder="Headline (e.g. Secure your seat — ₱500)"
        className={FIELD}
      />
      <textarea
        value={section.subtext ?? ""}
        onChange={(e) => patch({ subtext: e.target.value })}
        placeholder="Brief explanation of what they're paying for"
        rows={2}
        className="w-full resize-none rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-electric-500/60"
      />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_120px]">
        <input
          type="number"
          min={0}
          value={String(section.amount)}
          onChange={(e) => patch({ amount: Number(e.target.value) || 0 })}
          placeholder="Amount"
          className={FIELD}
        />
        <select
          value={section.currency}
          onChange={(e) =>
            patch({ currency: e.target.value as "PHP" | "USD" })
          }
          className={FIELD}
        >
          <option value="PHP">PHP (₱)</option>
          <option value="USD">USD ($)</option>
        </select>
      </div>
      <label className="flex items-center gap-2 text-xs text-white/65">
        <input
          type="checkbox"
          checked={section.allowCustomAmount ?? false}
          onChange={(e) => patch({ allowCustomAmount: e.target.checked })}
          className="h-4 w-4 rounded border-white/20 bg-white/[0.04] accent-electric-500"
        />
        Allow visitor to enter a custom amount (e.g. donations)
      </label>

      {/* Methods picker — choose which of the profile's methods this
          section shows. Empty selection = show all enabled methods. */}
      <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
        <p className="mb-2 text-xs font-medium text-white/65">
          Show these payment methods
        </p>
        {allMethods.length === 0 ? (
          <div className="rounded-lg border border-amber-500/25 bg-amber-500/[0.05] p-3 text-[11px]">
            <p className="font-medium text-amber-200">
              ⚠ No payment methods configured yet
            </p>
            <p className="mt-1 text-white/65">
              Add your GCash / Maya / bank accounts on the{" "}
              <a
                href="/profile#payment-methods"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-electric-300 underline underline-offset-2 hover:text-electric-200"
              >
                Payment Methods card in your Profile Builder
              </a>
              , then come back — they&apos;ll appear here automatically.
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-1.5">
              {allMethods.map((m) => {
                const on =
                  section.enabledMethodIds.length === 0 ||
                  section.enabledMethodIds.includes(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggleMethod(m.id)}
                    className={cn(
                      "rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors",
                      on
                        ? "border-electric-500/50 bg-electric-500/15 text-electric-300"
                        : "border-white/10 bg-white/[0.04] text-white/55 hover:bg-white/[0.08]",
                    )}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[11px] text-white/35">
              {section.enabledMethodIds.length === 0
                ? "Showing ALL active payment methods. Pick specific ones to limit this section."
                : `Showing ${section.enabledMethodIds.length} method(s).`}
            </p>
          </>
        )}
      </div>

      {/* Fields to collect */}
      <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
        <p className="mb-2 text-xs font-medium text-white/65">
          Collect from visitor
        </p>
        <div className="flex flex-wrap gap-1.5">
          {(["name", "email", "phone"] as LeadFieldKey[]).map((f) => {
            const on = section.fields.includes(f);
            return (
              <button
                key={f}
                type="button"
                onClick={() => toggleField(f)}
                className={cn(
                  "rounded-lg border px-2.5 py-1 text-xs font-medium capitalize transition-colors",
                  on
                    ? "border-electric-500/50 bg-electric-500/15 text-electric-300"
                    : "border-white/10 bg-white/[0.04] text-white/55 hover:bg-white/[0.08]",
                )}
              >
                {f}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] text-white/35">
          Receipt screenshot is always required.
        </p>
      </div>

      <textarea
        value={section.successMessage ?? ""}
        onChange={(e) => patch({ successMessage: e.target.value })}
        placeholder="Thank-you message shown after submission"
        rows={2}
        className="w-full resize-none rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-electric-500/60"
      />
    </div>
  );
}
