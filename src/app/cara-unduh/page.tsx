import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Download, Laptop, Music4, Smartphone, Speaker } from "lucide-react";

export const metadata: Metadata = {
  title: "Cara Mengunduh",
  description:
    "Panduan langkah demi langkah membuka folder Google Drive, mengunduh album lossless, dan kompatibilitas format FLAC, WAV, ALAC, DSD.",
};

const STEPS = [
  {
    n: "01",
    title: "Buka tautan dari email atau Pesanan Saya",
    body: "Setelah pembayaran terverifikasi, tautan folder dikirim ke email Anda dan selalu bisa diakses ulang dari halaman Pesanan Saya.",
  },
  {
    n: "02",
    title: "Masuk dengan email Google yang sama",
    body: "Izin diberikan per alamat email. Jika Anda masuk dengan akun lain, Google Drive akan menampilkan pesan bahwa Anda tidak memiliki akses.",
  },
  {
    n: "03",
    title: "Folder album terbuka di Google Drive",
    body: "Di dalamnya ada file audio, cover art, dan catatan rilis. Anda dapat mengunduh satu per satu atau seluruh folder sebagai ZIP.",
  },
  {
    n: "04",
    title: "Pilih file lalu tekan Download",
    body: "Google Drive akan menyiapkan file. Untuk album berukuran beberapa GB, proses kompresi ZIP dapat memakan waktu.",
  },
];

const COMPAT = [
  {
    icon: Laptop,
    fmt: "FLAC",
    rate: "24-bit · 96–192 kHz",
    body: "Android, Windows, macOS, dan hampir semua pemutar modern. Format terbaik untuk arsip jangka panjang.",
  },
  {
    icon: Speaker,
    fmt: "WAV",
    rate: "24–32-bit · 192–384 kHz",
    body: "Didukung luas di semua sistem operasi dan DAW. Ukuran paling besar karena tanpa kompresi.",
  },
  {
    icon: Smartphone,
    fmt: "ALAC",
    rate: "24-bit · 96–192 kHz",
    body: "Apple Lossless — sinkron sempurna dengan iPhone, iPad, iTunes, dan aplikasi Music di macOS.",
  },
  {
    icon: Music4,
    fmt: "DSD",
    rate: "1-bit · DSD64–256",
    body: "Memerlukan DAC yang mendukung DSD dan pemutar khusus seperti Foobar2000, JRiver, atau HiBy Music.",
  },
];

export default function CaraUnduhPage() {
  return (
    <div className="shell py-14">
      <div className="max-w-2xl">
        <p className="eyebrow">Panduan</p>
        <h1 className="display mt-3 text-4xl text-ink md:text-5xl">Cara mengunduh</h1>
        <p className="mt-4 text-sm leading-relaxed text-ink-mute">
          File Anda tidak diunduh dari server kami, melainkan dari folder Google Drive pribadi
          yang izinnya diberikan langsung ke akun Anda. Berikut alurnya.
        </p>
      </div>

      <div className="mt-12 grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:gap-16">
        <ol className="space-y-0">
          {STEPS.map((step, i) => (
            <li key={step.n} className="relative flex gap-6 pb-10 last:pb-0">
              {i < STEPS.length - 1 && (
                <span className="absolute left-6 top-12 h-[calc(100%-3rem)] w-px bg-white/10" />
              )}
              <span className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center border border-white/12 bg-carbon-900 font-mono text-2xs text-gold">
                {step.n}
              </span>
              <div className="pt-1">
                <h2 className="font-display text-xl text-ink">{step.title}</h2>
                <p className="mt-2 max-w-lg text-sm leading-relaxed text-ink-mute">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="plate p-6">
            <div className="flex items-center gap-2">
              <Download size={14} className="text-gold" />
              <h2 className="font-mono text-2xs uppercase tracking-label text-ink-mute">
                Catatan penting
              </h2>
            </div>
            <ul className="mt-4 space-y-3.5">
              {[
                "Tautan hanya dapat dibuka oleh email Google yang terdaftar — bukan tautan publik.",
                "Jangan gunakan mode incognito jika Anda belum masuk ke akun Google yang benar.",
                "Untuk album &gt; 4 GB, Google Drive mungkin meminta Anda mengunduh per file.",
                "Unduhan tanpa batas selama akses aktif. Simpan cadangan lokal Anda sendiri.",
              ].map((t) => (
                <li key={t} className="flex gap-2.5 text-[0.8125rem] leading-relaxed text-ink-mute">
                  <span className="mt-2 h-1 w-1 shrink-0 bg-gold/60" />
                  <span dangerouslySetInnerHTML={{ __html: t }} />
                </li>
              ))}
            </ul>

            <div className="mt-6 border-t border-white/[0.07] pt-5">
              <p className="text-[0.75rem] leading-relaxed text-ink-faint">
                Tautan tidak bisa dibuka padahal email sudah benar? Ajukan garansi dari halaman
                detail pesanan — kami perbaiki tanpa biaya tambahan.
              </p>
              <Link href="/pesanan" className="btn-outline btn-sm mt-4 w-full justify-center">
                Buka Pesanan Saya
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        </aside>
      </div>

      <section className="mt-20 border-t border-white/[0.07] pt-14">
        <div className="mb-8">
          <p className="eyebrow">Kompatibilitas</p>
          <h2 className="display mt-2 text-3xl text-ink">Format & perangkat</h2>
        </div>
        <div className="grid gap-px overflow-hidden border border-white/[0.08] bg-white/[0.06] sm:grid-cols-2">
          {COMPAT.map(({ icon: Icon, fmt, rate, body }) => (
            <div key={fmt} className="bg-carbon-900 p-6">
              <div className="flex items-center justify-between">
                <span className="font-display text-xl text-gold-bright">{fmt}</span>
                <Icon size={16} className="text-ink-faint" strokeWidth={1.4} />
              </div>
              <p className="mt-1 font-mono text-[0.5625rem] uppercase tracking-label text-ink-faint">
                {rate}
              </p>
              <p className="mt-4 text-[0.8125rem] leading-relaxed text-ink-mute">{body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
