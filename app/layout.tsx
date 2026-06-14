import type { Metadata, Viewport } from "next";
import { Caveat, Inter, JetBrains_Mono, Schibsted_Grotesk } from "next/font/google";
import { Providers } from "@/components/providers/Providers";
import { APP } from "@/lib/constants";
import { getMarketingContent } from "@/lib/firebase/firestore";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

/* Display family — swapped from Space Grotesk to Schibsted Grotesk per
   the new homepage design spec. Distinctive but not weird; warmer
   terminals than Space Grotesk give it editorial credibility that
   signals "this brand has substance" without being cold. */
const display = Schibsted_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  variable: "--font-display",
  display: "swap",
});

/* Mono — used for numbers in social-proof stats + pricing,
   gives them deliberate visual weight + a "designed" feel. */
const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-mono",
  display: "swap",
});

/* Marker pen — used ONLY for the "real customer" annotation next to
   the hero phone mockup. Caveat is hand-drawn casual, deliberately
   not part of the brand palette — feels like a human marked it up. */
const marker = Caveat({
  subsets: ["latin"],
  weight: ["500"],
  variable: "--font-marker",
  display: "swap",
});

/* Title + description + favicon + OG image are pulled from the
   admin-managed settings/marketing doc when set, with hardcoded
   fallbacks so the site renders fine before the admin saves anything.
   Revalidated every 5 minutes — the cost is one Firestore read on
   cold-cache requests. */
export async function generateMetadata(): Promise<Metadata> {
  const override = await getMarketingContent().catch(() => null);
  const seo = override?.homepage?.seo;
  const branding = override?.homepage?.branding;

  const defaultTitle =
    seo?.title?.trim() || "Credibly — Build Your Credibility Profile In Minutes";
  const description = seo?.description?.trim() || APP.description;
  const ogImage = seo?.ogImageUrl?.trim();
  const favicon = branding?.faviconUrl?.trim();

  return {
    metadataBase: new URL(APP.url),
    title: {
      default: defaultTitle,
      template: "%s · Credibly",
    },
    description,
    applicationName: APP.name,
    keywords: [
      "credibility profile",
      "link in bio",
      "network marketing",
      "digital business card",
      "personal branding",
      "recruiting profile",
    ],
    authors: [{ name: "Credibly" }],
    ...(favicon ? { icons: { icon: favicon, apple: favicon } } : {}),
    appleWebApp: {
      capable: true,
      title: APP.name,
      statusBarStyle: "black-translucent",
    },
    formatDetection: { telephone: false },
    openGraph: {
      type: "website",
      siteName: APP.name,
      title: defaultTitle,
      description,
      url: APP.url,
      ...(ogImage ? { images: [{ url: ogImage }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: defaultTitle,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#050507",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${display.variable} ${mono.variable} ${marker.variable}`}
    >
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
