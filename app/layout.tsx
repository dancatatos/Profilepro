import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { Providers } from "@/components/providers/Providers";
import { APP } from "@/lib/constants";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(APP.url),
  title: {
    default: "Credibly — Build Your Credibility Profile In Minutes",
    template: "%s · Credibly",
  },
  description: APP.description,
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
  appleWebApp: {
    capable: true,
    title: APP.name,
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
  openGraph: {
    type: "website",
    siteName: APP.name,
    title: "Credibly — Build Your Credibility Profile In Minutes",
    description: APP.description,
    url: APP.url,
  },
  twitter: {
    card: "summary_large_image",
    title: "Credibly",
    description: APP.description,
  },
};

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
    <html lang="en" className={`${inter.variable} ${display.variable}`}>
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
