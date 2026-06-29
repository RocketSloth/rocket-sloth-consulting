import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { SITE_URL } from "@/lib/env";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "RocketSloth.Space — Vetted local home & trade pros",
    template: "%s · RocketSloth.Space",
  },
  description:
    "Find vetted local home & trade companies, with reviews backed by real proof of work. Every business is screened and every review requires a receipt plus before & after photos.",
  openGraph: {
    title: "RocketSloth.Space — Vetted local home & trade pros",
    description:
      "A directory of screened local pros, with reviews you can actually trust.",
    type: "website",
    url: SITE_URL,
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
      </body>
    </html>
  );
}
