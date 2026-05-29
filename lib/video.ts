/**
 * Video URL helpers — Credibly University accepts share URLs from
 * YouTube and Adilo, plus direct MP4 links. Admins paste whatever
 * the host gives them; the player uses this module to figure out
 * which iframe shape to render.
 *
 * Returning `null` means "we couldn't recognise this URL as
 * embeddable" — the player will fall back to a plain link.
 */

export type VideoProvider = "youtube" | "adilo" | "vimeo" | "mp4";

export interface NormalizedVideo {
  provider: VideoProvider;
  /** URL safe to use directly as the iframe `src` (or `<video src>` for MP4). */
  embedUrl: string;
  /** Original URL the admin pasted, for "open in new tab" links. */
  sourceUrl: string;
}

/**
 * Parse any of the common YouTube share-URL shapes into a video id.
 * Handles youtu.be/<id>, /watch?v=<id>, /shorts/<id>, /embed/<id>.
 */
function youtubeVideoId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") {
      return u.pathname.slice(1).split("/")[0] || null;
    }
    if (u.hostname.endsWith("youtube.com")) {
      if (u.pathname === "/watch") return u.searchParams.get("v");
      const parts = u.pathname.split("/").filter(Boolean);
      if (parts[0] === "shorts" || parts[0] === "embed") return parts[1] ?? null;
    }
  } catch {
    /* not a URL */
  }
  return null;
}

/**
 * Adilo embed URLs come in two shapes:
 *   https://adilo.bigcommand.com/watch/<HASH>     (share link)
 *   https://adilo.bigcommand.com/embed/<HASH>     (embed)
 * Either shape can be rewritten to /embed/<HASH> for the iframe src.
 */
function adiloEmbed(url: string): string | null {
  try {
    const u = new URL(url);
    if (!u.hostname.includes("adilo") && !u.hostname.includes("bigcommand"))
      return null;
    const parts = u.pathname.split("/").filter(Boolean);
    const idx = parts.findIndex((p) => p === "watch" || p === "embed");
    if (idx === -1 || !parts[idx + 1]) return null;
    return `https://${u.hostname}/embed/${parts[idx + 1]}`;
  } catch {
    return null;
  }
}

/**
 * Vimeo: accept /<numericId> and /video/<numericId>, output the
 * official player.vimeo.com embed shape.
 */
function vimeoEmbed(url: string): string | null {
  try {
    const u = new URL(url);
    if (!u.hostname.includes("vimeo.com")) return null;
    const parts = u.pathname.split("/").filter(Boolean);
    const id = parts[parts.length - 1];
    if (!/^\d+$/.test(id)) return null;
    return `https://player.vimeo.com/video/${id}`;
  } catch {
    return null;
  }
}

/**
 * Main entry point — try each provider in turn, return the first match.
 * Falls back to treating the URL as a direct MP4 if it ends in `.mp4`.
 */
export function normalizeVideoUrl(raw: string): NormalizedVideo | null {
  const url = raw?.trim();
  if (!url) return null;

  const yt = youtubeVideoId(url);
  if (yt) {
    return {
      provider: "youtube",
      /* `rel=0` disables external "more videos" suggestions at the end,
         which is the main reason we recommend Adilo for paid lessons but
         still want a clean experience for free-preview YouTube lessons. */
      embedUrl: `https://www.youtube.com/embed/${yt}?rel=0&modestbranding=1`,
      sourceUrl: url,
    };
  }

  const adilo = adiloEmbed(url);
  if (adilo) return { provider: "adilo", embedUrl: adilo, sourceUrl: url };

  const vimeo = vimeoEmbed(url);
  if (vimeo) return { provider: "vimeo", embedUrl: vimeo, sourceUrl: url };

  if (/\.mp4($|\?)/i.test(url)) {
    return { provider: "mp4", embedUrl: url, sourceUrl: url };
  }

  return null;
}
