import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SessionProvider } from "@/components/session-provider";

export const metadata: Metadata = {
  metadataBase: new URL("http://localhost:3000"),
  title: {
    default: "MUG1III AUDIO — Album Lossless, Akses Permanen",
    template: "%s — MUG1III AUDIO",
  },
  description:
    "Arsip kurasi musik high audio: FLAC CD Lossless 16-bit dan Studio Master 24-bit (Rp 500/lagu). Beli sekali lewat QRIS, akses langsung ke Google Drive Anda. Preview 30 detik untuk setiap album.",
  keywords: [
    "album lossless",
    "FLAC Indonesia",
    "FLAC 24-bit",
    "beli album flac",
    "audiophile",
    "MUG1III AUDIO",
  ],
  openGraph: {
    title: "MUG1III AUDIO — Album Lossless, Akses Permanen",
    description:
      "FLAC CD Lossless & Hi-Res Master. Beli sekali lewat QRIS (Rp 500/lagu), akses permanen ke folder album di Google Drive Anda.",
    type: "website",
    locale: "id_ID",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0B0B0F",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600&family=Outfit:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,600;0,700;1,600&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-carbon-900 font-sans antialiased">
        <a href="#konten" className="skip-link">
          Lompat ke konten utama
        </a>
        <SessionProvider>
          <SiteHeader />
          <main id="konten">{children}</main>
          <SiteFooter />
        </SessionProvider>
      </body>
    </html>
  );
}
