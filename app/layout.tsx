import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { LAUNCH_AREA } from "@/lib/constants";
import { SITE_URL } from "@/lib/env";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "VettedPages — Local pros your neighbors actually trust",
    template: "%s · VettedPages",
  },
  description: `VettedPages is building the vetted list of local pros for ${LAUNCH_AREA} — every business screened before it's listed, every review verified. Join the local list.`,
  openGraph: {
    title: "VettedPages — Local pros your neighbors actually trust",
    description: `One vetted local list of roofers, plumbers, HVAC, lawn care, cleaners & handymen for ${LAUNCH_AREA}. Every business screened, every review verified.`,
    type: "website",
    url: SITE_URL,
    siteName: "VettedPages",
  },
  twitter: {
    card: "summary_large_image",
    title: "VettedPages — Local pros your neighbors actually trust",
    description: `Help us build the vetted list of local pros for ${LAUNCH_AREA}.`,
  },
};

export const viewport: Viewport = {
  themeColor: "#0e1a17",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Header />
        <main className="min-h-[60vh]">{children}</main>
        <Footer />
        <Analytics />
      </body>
    </html>
  );
}
