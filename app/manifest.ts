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
    /* "related_applications" + "prefer_related_applications: false"
       enables navigator.getInstalledRelatedApps() on Chromium browsers
       so we can detect "already installed" more reliably than
       display-mode alone. The webapp URL refers to this PWA itself —
       Chrome matches the platform "webapp" entry to the WebAPK once
       installed. */
    related_applications: [
      {
        platform: "webapp",
        url: "https://www.crediblyai.com/manifest.webmanifest",
      },
    ],
    prefer_related_applications: false,
  };
}
