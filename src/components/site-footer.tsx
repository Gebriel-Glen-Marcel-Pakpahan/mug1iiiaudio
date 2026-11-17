import Link from "next/link";
import { Logo } from "./logo";
import { config } from "@/lib/config";

const COLUMNS = [
  {
    title: "Toko",
    links: [
      { href: "/", label: "Katalog" },
      { href: "/jelajah", label: "Jelajah genre" },
      { href: "/request", label: "Request album" },
      { href: "/keranjang", label: "Keranjang" },
      { href: "/pesanan", label: "Pesanan saya" },
    ],
  },
  {
    title: "Bantuan",
    links: [
      { href: "/cara-unduh", label: "Cara mengunduh" },
      { href: "/faq", label: "FAQ" },
      { href: "/kebijakan", label: "Kebijakan & garansi" },
      { href: "/kontak", label: "Kontak" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="relative mt-24 border-t border-white/[0.07] bg-carbon-950">
      <div className="absolute inset-x-0 top-0 h-px bg-gold-line" />
      <div className="shell py-16">
        <div className="grid gap-12 lg:grid-cols-[1.6fr_1fr_1fr_1.2fr]">
          <div>
            <Logo />
            <p className="mt-6 max-w-xs text-sm leading-relaxed text-ink-mute">
              Arsip album high audio pilihan. Satu pembayaran, akses permanen ke folder
              pribadi Anda di Google Drive.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {["FLAC 16-BIT LOSSLESS", "FLAC 24-BIT HI-RES", "RP 500 / LAGU"].map((f) => (
                <span key={f} className="chip">
                  {f}
                </span>
              ))}
            </div>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="font-mono text-2xs uppercase tracking-label text-ink-faint">
                {col.title}
              </h3>
              <ul className="mt-5 space-y-3">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-sm text-ink-soft transition-colors hover:text-gold-bright"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h3 className="font-mono text-2xs uppercase tracking-label text-ink-faint">
              Bantuan & Komunitas
            </h3>
            <ul className="mt-5 space-y-3 text-sm text-ink-soft">
              <li>
                <a
                  href={config.brand.supportWhatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-gold-bright"
                >
                  WhatsApp: {config.brand.supportWhatsapp}
                </a>
              </li>
              <li>
                <a
                  href={config.brand.supportDiscord}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-gold-bright"
                >
                  Discord Server Komunitas
                </a>
              </li>
              <li className="text-ink-mute">{config.brand.supportHours}</li>
            </ul>
            <p className="mt-6 max-w-[18rem] text-xs leading-relaxed text-ink-faint">
              Harga bersih Rp 500 / lagu per album. Akses Google Drive diberikan langsung ke akun Anda setelah pembayaran QRIS.
            </p>
          </div>
        </div>

        <div className="mt-10 border-t border-white/[0.06] pt-6">
          <p className="text-xs leading-relaxed text-ink-faint">
            <strong className="text-ink-mute">Disclaimer Hak Cipta:</strong> Seluruh hak cipta rekaman, lirik, dan karya musik sepenuhnya merupakan hak milik pencipta, musisi, dan label rekaman terkait. Platform ini beroperasi sebagai komunitas kurasi dan arsip preservasi audio digital; biaya yang dibayarkan adalah kontribusi untuk pemeliharaan server, penyimpanan cloud, dan kurasi koleksi.
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-4 border-t border-white/[0.06] pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-2xs uppercase tracking-label text-ink-faint">
            © {new Date().getFullYear()} {config.brand.name} — Arsip Lossless
          </p>
          <p className="font-mono text-2xs uppercase tracking-label text-ink-faint">
            Pembayaran QRIS · Midtrans
          </p>
        </div>
      </div>
    </footer>
  );
}
