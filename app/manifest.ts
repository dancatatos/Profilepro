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
    icons: [
      {
        src: "/icons/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
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
