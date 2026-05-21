"use client";

import { Plus, Star, X } from "lucide-react";
import { useProfileStore } from "@/store/profileStore";
import { Select } from "@/components/ui/Select";
import { Icon } from "@/components/ui/Icon";
import { ImageUploadField } from "./ImageUploadField";
import { SOCIAL_PLATFORMS } from "@/lib/constants";
import { cn, uid } from "@/lib/utils";
import type {
  AboutSection,
  CredibilitySection,
  CtaSection,
  GallerySection,
  LeadCaptureSection,
  LeadFieldKey,
  ProductsSection,
  ProfileSection,
  SocialsSection,
  TestimonialsSection,
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
  const update = useProfileStore((s) => s.updateSection);
  const patch = (buttons: CtaSection["buttons"]) =>
    update(section.id, { buttons });
  const edit = (id: string, p: Partial<CtaSection["buttons"][number]>) =>
    patch(section.buttons.map((b) => (b.id === id ? { ...b, ...p } : b)));

  return (
    <div className="space-y-2.5">
      {section.buttons.map((b) => (
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
          <input
            value={b.url}
            onChange={(e) => edit(b.id, { url: e.target.value })}
            placeholder="https://link.com"
            className={FIELD}
          />
          <IconPicker
            icons={CTA_ICONS}
            value={b.icon}
            onChange={(icon) => edit(b.id, { icon })}
          />
          <div className="grid grid-cols-2 gap-2">
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
      ))}
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
  const update = useProfileStore((s) => s.updateSection);
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
  const update = useProfileStore((s) => s.updateSection);
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

/* ---------------- Credibility ---------------- */

function CredibilityEditor({ section }: { section: CredibilitySection }) {
  const update = useProfileStore((s) => s.updateSection);
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
  const update = useProfileStore((s) => s.updateSection);
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
          <div className="grid grid-cols-2 gap-2">
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
  const update = useProfileStore((s) => s.updateSection);
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
          <div className="grid grid-cols-2 gap-2">
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
  const update = useProfileStore((s) => s.updateSection);
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
  const update = useProfileStore((s) => s.updateSection);
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

/* ---------------- Lead capture ---------------- */

function LeadCaptureEditor({ section }: { section: LeadCaptureSection }) {
  const update = useProfileStore((s) => s.updateSection);
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
    case "leadCapture":
      return <LeadCaptureEditor section={section} />;
    default:
      return null;
  }
}
