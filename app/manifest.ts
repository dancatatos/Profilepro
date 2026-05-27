import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Credibly — AI Credibility Profiles",
    short_name: "Credibly",
    description:
      "Build a professional online credibility profile in minutes. AI-powered profiles for network marketers, recruiters, coaches and online sellers.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "portrait",
    background_color: "#050507",
    theme_color: "#050507",
    categories: ["business", "productivity", "social"],
    /* IMPORTANT — Chrome on Android REQUIRES at least one PNG icon of
       192x192 AND one of 512x512 to mark the site as installable. SVG
       icons satisfy iOS Safari but silently fail Chrome's install
       criteria, which is why `beforeinstallprompt` was never firing
       and "Install app" was missing from Chrome's 3-dot menu.
       PNG icons listed FIRST so Chrome picks them; SVG kept as a
       scalable any-size fallback for browsers that support it. */
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
    shortcuts: [
      { name: "My Profile", url: "/profile" },
      { name: "Credibly University", url: "/university" },
      { name: "QR Code", url: "/qr" },
    ],
    /* NOTE: related_applications + prefer_related_applications
       deliberately removed. The previous self-referential entry
       (platform: "webapp" pointing back at our own manifest) was a
       hack to power navigator.getInstalledRelatedApps() detection,
       but it appears to interfere with Chrome's install-prompt
       heuristic on some Android builds — Chrome may interpret the
       self-reference as "user can install something else from here"
       and suppress the prompt entirely. Without this block, Chrome
       just uses its standard installability check. */
  };
}
